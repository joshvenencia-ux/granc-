import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decToNumber, toDec } from '../common/money';
import { FirestoreSyncService } from '../modules/firebase/firestore-sync.service';

@Injectable()
export class WalletService {
    constructor(
        private prisma: PrismaService,
        private fsync: FirestoreSyncService, 
    ) { }

    async getBalance(usuarioId: number) {
        await this.prisma.wallet.upsert({
            where: { usuarioId },
            update: {},
            create: { usuarioId, balance: toDec(0) },
        });

        const w = await this.prisma.wallet.findUnique({ where: { usuarioId } });
        return decToNumber(w?.balance) || 0;
    }

    /**
     * Ajusta saldo 
     * Registra Movimiento (RECARGA/RETIRO).
     */
    async adjust(
        usuarioId: number,
        deltaPesos: number,
        motivo: string = 'AJUSTE',
        referencia?: string,
    ) {
        if (!Number.isFinite(deltaPesos) || Math.trunc(deltaPesos) !== deltaPesos) {
            throw new BadRequestException('delta debe ser entero en pesos');
        }
        const delta = toDec(deltaPesos);

        const out = await this.prisma.$transaction(async (tx) => {
            await tx.wallet.upsert({
                where: { usuarioId },
                update: {},
                create: { usuarioId, balance: toDec(0) },
            });

            const w0 = await tx.wallet.findUnique({
                where: { usuarioId },
                select: { balance: true },
            });
            if (!w0) throw new BadRequestException('Wallet no existe');

            const antes = w0.balance;                 // Prisma.Decimal
            const despues = antes.add(delta);         // Prisma.Decimal
            if (despues.isNegative()) throw new BadRequestException('Saldo insuficiente');

            const w1 = await tx.wallet.update({
                where: { usuarioId },
                data: { balance: despues, version: { increment: 1 } },
                select: { balance: true },
            });

            await tx.movimiento.create({
                data: {
                    usuarioId,
                    tipo: deltaPesos >= 0 ? 'RECARGA' : 'RETIRO',
                    monto: delta,
                    saldoAntes: antes,
                    saldoDespues: w1.balance,
                    referencia: referencia || undefined,
                    metadata: { motivo },
                },
            });

            return {
                saldoPesos: decToNumber(w1.balance),
                saldoAntes: decToNumber(antes),
                deltaPesos,
            };
        });

        await this.fsync.pushMovimiento(usuarioId, {
            tipo: out.deltaPesos >= 0 ? 'RECARGA' : 'RETIRO',
            montoPesos: out.deltaPesos,
            saldoAntes: out.saldoAntes,
            saldoDespues: out.saldoPesos,
            referencia,
            metadata: { motivo },
        });
        await this.fsync.setWalletSaldo(usuarioId, out.saldoPesos);

        return { saldoCOP: out.saldoPesos };
    }

    async resumenPorEmail(email: string) {
        const user = await this.prisma.usuario.findUnique({
            where: { correo: email },
            select: { id: true, nombre_completo: true, usuario: true, correo: true },
        });
        if (!user) throw new BadRequestException('Usuario no existe');

        const saldo = await this.getBalance(user.id);

        const movs = await this.prisma.movimiento.findMany({
            where: { usuarioId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, tipo: true, monto: true, createdAt: true, saldoAntes: true, saldoDespues: true },
        });

        return {
            usuario: {
                id: user.id,
                nombre: user.nombre_completo,
                usuario: user.usuario,
                correo: user.correo,
            },
            saldo,
            movimientos: movs.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                montoCOP: decToNumber(m.monto),
                saldoAntes: decToNumber(m.saldoAntes),
                saldoDespues: decToNumber(m.saldoDespues),
                createdAt: m.createdAt.toISOString(),
            })),
        };
    }
}
