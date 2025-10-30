import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Post,
    Req,
    UseGuards,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseService } from '../modules/firebase/firebase.service';
import { FirebaseAuthGuard } from './firebase.guard';

import { PrismaService } from 'src/prisma/prisma.service';

class CreateUserDto {
    email!: string;
    password!: string;
    name!: string;
    apellido!: string;
}

class VerifyDto {
    token?: string;
}

class LinkDto {
    /** Firebase ID Token */
    idToken!: string;

    nombre_completo!: string;
    usuario!: string;       
    correo!: string;        
    cedula!: string;

    celular?: string;
    moneda?: string;        
}

@Controller('auth')
export class AuthController {
    constructor(
        private readonly fb: FirebaseService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('create')
    async create(@Body() dto: CreateUserDto) {
        const user = await this.fb.createUser({
            email: dto.email,
            password: dto.password,
            displayName: `${dto.name} ${dto.apellido}`.trim(),
        });
        return { uid: user.uid };
    }

    @Post('verify')
    async verify(
        @Headers('authorization') authHeader: string | undefined,
        @Body() body: VerifyDto,
    ) {
        const bearer = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : undefined;
        const token = bearer ?? body.token;
        if (!token) {
            return { ok: false, error: 'Falta Authorization Bearer o body.token' };
        }

        const decoded = await this.fb.verifyIdToken(token);
        return {
            ok: true,
            uid: decoded.uid,
            email: decoded.email ?? null,
            email_verified: decoded.email_verified ?? false,
            name: decoded.name ?? null,
        };
    }

    @Get('user/:uid')
    async getUser(@Param('uid') uid: string) {
        const record = await this.fb.getUser(uid);
        return {
            uid: record.uid,
            email: record.email ?? null,
            displayName: record.displayName ?? null,
            disabled: record.disabled ?? false,
            emailVerified: record.emailVerified ?? false,
            providerData: record.providerData?.map((p) => ({
                providerId: p.providerId,
                uid: p.uid,
                email: p.email,
                displayName: p.displayName,
            })),
        };
    }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    async me(@Req() req: Request & { firebaseUser?: any }) {
        const fu = req.firebaseUser;
        return {
            uid: fu?.uid ?? null,
            email: fu?.email ?? null,
            email_verified: fu?.email_verified ?? false,
            name: fu?.name ?? null,
        };
    }

    
    @Post('link')
    async link(@Body() dto: LinkDto) {
        if (!dto?.idToken) throw new BadRequestException('idToken requerido');

        const decoded = await this.fb.verifyIdToken(dto.idToken);
        const uid = decoded.uid;

        const existing = await this.prisma.usuario.findUnique({
            where: { firebase_uid: uid },
            select: { id: true },
        });
        if (existing) return { ok: true, usuarioId: existing.id, created: false };

        const faltantes: string[] = [];
        if (!dto.nombre_completo) faltantes.push('nombre_completo');
        if (!dto.usuario) faltantes.push('usuario');
        if (!dto.correo) faltantes.push('correo');
        if (!dto.cedula) faltantes.push('cedula');
        if (faltantes.length) {
            throw new BadRequestException(
                `Faltan campos requeridos: ${faltantes.join(', ')}`,
            );
        }

        const username = await this.ensureUniqueUsername(dto.usuario);

        try {
            const user = await this.prisma.$transaction(async (tx) => {
                const created = await tx.usuario.create({
                    data: {
                        firebase_uid: uid,
                        nombre_completo: dto.nombre_completo,
                        usuario: username,
                        correo: dto.correo,
                        cedula: dto.cedula,
                        celular: dto.celular ?? null,
                        moneda: dto.moneda ?? 'COP',
                    },
                });

                await tx.wallet.create({
                    data: {
                        usuarioId: created.id,
                        balance: '0', // Decimal(18,0) => usa string para precisión
                    },
                });

                return created;
            });

            return { ok: true, usuarioId: user.id, created: true };
        } catch (e: any) {
            if (e?.code === 'P2002') {
                throw new ConflictException('Conflicto de unicidad en Usuario');
            }
            throw e;
        }
    }

  
    @Get('status')
    @UseGuards(FirebaseAuthGuard)
    async status(@Req() req: Request & { firebaseUser?: any }) {
        const uid = req.firebaseUser?.uid as string | undefined;
        if (!uid) return { ok: false, provisioned: false };

        const existing = await this.prisma.usuario.findUnique({
            where: { firebase_uid: uid },
            select: { id: true },
        });

        return { ok: true, provisioned: !!existing, usuarioId: existing?.id ?? null };
    }

    private async ensureUniqueUsername(base: string): Promise<string> {
        let username = base.trim();
        if (!username) username = 'user';
        let i = 0;
        while (i < 1000) {
            const found = await this.prisma.usuario.findUnique({
                where: { usuario: username },
                select: { id: true },
            });
            if (!found) return username;
            i += 1;
            username = `${base}-${i}`;
        }
        throw new ConflictException('No fue posible generar un usuario único');
    }
}
