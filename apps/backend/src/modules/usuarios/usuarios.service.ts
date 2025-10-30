import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncUsuarioDto } from './dto/sync-usuario.dto';
import { Firestore } from 'firebase-admin/firestore';
import * as bcrypt from 'bcryptjs';
import { FIREBASE_DB } from '../firebase/firebase.constants';

type EstadoCuenta = 'online' | 'offline';

@Injectable()
export class UsuarioService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(FIREBASE_DB) private readonly db: Firestore,
    ) { }

    /**
     * Crea/actualiza el usuario en Prisma y asegura el documento en Firestore (lado servidor).
     * Idempotente por firebase_uid (estable). El correo puede cambiar sin romper integridad.
     */
    async syncFromFirebase(uid: string, dto: SyncUsuarioDto) {
        const email = dto.email.trim().toLowerCase();
        const baseUsername = (email.split('@')[0] || uid).toLowerCase();
        const nombreCompleto = `${dto.name} ${dto.apellido ?? ''}`.trim();
        const fechaNacimientoDate = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;

        // 1) Firestore (admin) — espejo para el cliente
        await this.db.collection('usuarios').doc(uid).set(
            {
                uid,
                email,
                nombre: dto.name,
                apellido: dto.apellido ?? '',
                cedula: dto.cedula ?? '',
                celular: dto.celular ?? '',
                direccion: dto.direccion ?? '',
                fechaNacimiento: dto.fechaNacimiento ?? '',
                genero: dto.genero ?? '',
                rol: 'user',
                estado_de_cuenta: 'offline',
                moneda: 'COP',
                saldo: 0,
                saldoReal: 0,
                promoIVA: 0,
                bonosPendientes: 0,
                updatedAt: new Date(),
            },
            { merge: true },
        );

        // 2) Prisma — upsert por firebase_uid (no por correo)
        const hash = await bcrypt.hash(uid, 10); // marcador; NO se usa para login
        const username = await this.ensureUsername(dto.usuario || baseUsername);

        const upserted = await this.prisma.usuario.upsert({
            where: { firebase_uid: uid },
            create: {
                firebase_uid: uid,
                correo: email,
                nombre_completo: nombreCompleto,
                usuario: username,
                contrasena: hash,
                cedula: dto.cedula ?? '',
                rol: 'user',
                estado_de_cuenta: 'offline',
                moneda: 'COP',
                fecha_registro: new Date(),
                wallet: { create: { balance: 0 } },
                // opcionales
                apellido: dto.apellido ?? null,
                celular: dto.celular ?? null,
                direccion: dto.direccion ?? null,
                fecha_nacimiento: fechaNacimientoDate,
                genero: dto.genero ?? null,
            },
            update: {
                // si cambió el correo en Firebase, mantenlo consistente
                correo: email,
                nombre_completo: nombreCompleto,
                cedula: dto.cedula ?? '',
                apellido: dto.apellido ?? null,
                celular: dto.celular ?? null,
                direccion: dto.direccion ?? null,
                fecha_nacimiento: fechaNacimientoDate,
                genero: dto.genero ?? null,
                // no tocamos fecha_ultimo_ingreso aquí
            },
            select: { id: true, usuario: true },
        });

        // Reflejar username decidido en Firestore (opcional pero útil para la UI)
        await this.db.collection('usuarios').doc(uid).set({ usuario: upserted.usuario }, { merge: true });

        return { ok: true, id: upserted.id, usuario: upserted.usuario };
    }

    /**
     * Marca estado online/offline en Firestore y Prisma.
     * Actualiza Prisma por firebase_uid directamente (sin depender del email).
     */
    async updateEstadoCuenta(uid: string, estado: EstadoCuenta) {
        // Firestore primero (para la UI en tiempo real)
        const userRef = this.db.collection('usuarios').doc(uid);
        await userRef.set({ estado_de_cuenta: estado, updatedAt: new Date() }, { merge: true });

        // Prisma por firebase_uid (tolerante si aún no existe)
        await this.prisma.usuario
            .update({
                where: { firebase_uid: uid },
                data: {
                    estado_de_cuenta: estado,
                    ...(estado === 'online' ? { fecha_ultimo_ingreso: new Date() } : {}),
                },
            })
            .catch(() => null);

        return { ok: true };
    }

    /**
     * Asegura un nombre de usuario único en Prisma.
     */
    async ensureUsername(baseRaw: string): Promise<string> {
        const base = (baseRaw || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        const valid = base.length >= 3 && base.length <= 20 && /^[a-z0-9_.-]+$/.test(base);
        const seed = valid ? base : 'user';

        const exists = await this.prisma.usuario.findUnique({
            where: { usuario: seed },
            select: { id: true },
        });
        if (!exists) return seed;

        for (let i = 1; i <= 999; i++) {
            const candidate = `${seed}${i}`;
            const hit = await this.prisma.usuario.findUnique({
                where: { usuario: candidate },
                select: { id: true },
            });
            if (!hit) return candidate;
        }
        return `${seed}-${Date.now().toString(36)}`;
    }

    /**
     * Permite fijar/actualizar "usuario" único.
     * Busca por firebase_uid (ya no por correo).
     */
    async setUsername(uid: string, desired: string) {
        const clean = (desired || '').toLowerCase().trim();
        if (!/^[a-z0-9_.-]{3,20}$/.test(clean) || ['admin', 'root', 'support'].includes(clean)) {
            throw new BadRequestException('Username inválido. Usa 3–20 letras/números/._-');
        }

        // Unicidad
        const taken = await this.prisma.usuario.findUnique({
            where: { usuario: clean },
            select: { id: true },
        });
        if (taken) throw new BadRequestException('Ese usuario ya está en uso');

        const updated = await this.prisma.usuario.update({
            where: { firebase_uid: uid },
            data: { usuario: clean },
            select: { usuario: true },
        });

        await this.db.collection('usuarios').doc(uid).set({ usuario: updated.usuario }, { merge: true });
        return { ok: true, usuario: updated.usuario };
    }

    /** Resolver email por username (para login por usuario) */
    async getEmailByUsername(usuario: string) {
        const u = (usuario || '').trim().toLowerCase();
        const hit = await this.prisma.usuario.findUnique({
            where: { usuario: u },
            select: { correo: true },
        });
        return hit?.correo ?? null;
    }

    /** Resolver email por celular */
    async getEmailByCelular(celular: string) {
        const c = (celular || '').trim();
        if (!c) return null;
        const hit = await this.prisma.usuario.findFirst({
            where: { celular: c },
            select: { correo: true },
        });
        return hit?.correo ?? null;
    }
}
