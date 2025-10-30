import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LedgerService {
    constructor(private prisma: PrismaService) { }

    private toDecimal(v: number | string | Prisma.Decimal | null | undefined): Prisma.Decimal {
        return new Prisma.Decimal(v ?? 0);
    }
    private toNumber(d: Prisma.Decimal | number | null | undefined): number {
        return Number(d ?? 0);
    }

    async getBalancePesos(usuarioId: number) {
        const w = await this.prisma.wallet.findUnique({
            where: { usuarioId },
            select: { balance: true },
        });
        return this.toNumber(w?.balance);
    }

    async getResumenByFirebaseUid(firebaseUid: string) {
        const user = await this.prisma.usuario.findUnique({
            where: { firebase_uid: firebaseUid },
            include: { wallet: { select: { balance: true } } },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const movimientos = await this.prisma.movimiento.findMany({
            where: { usuarioId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, tipo: true, monto: true, createdAt: true },
        });

        return {
            userId: user.id,
            saldo: this.toNumber(user.wallet?.balance),
            movimientos: movimientos.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                montoCOP: this.toNumber(m.monto),
                createdAt: m.createdAt,
            })),
        };
    }

    async getResumenByIdentifier(identifier: string) {
        const asNumber = Number(identifier);
        const isNumericId = Number.isInteger(asNumber) && String(asNumber) === identifier.trim();

        const whereUser = isNumericId
            ? { id: asNumber }
            : { OR: [{ correo: identifier.trim() }, { usuario: identifier.trim() }] };

        const user = await this.prisma.usuario.findFirst({
            where: whereUser,
            include: { wallet: { select: { balance: true } } },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const movimientos = await this.prisma.movimiento.findMany({
            where: { usuarioId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, tipo: true, monto: true, createdAt: true },
        });

        return {
            userId: user.id,
            saldo: this.toNumber(user.wallet?.balance),
            movimientos: movimientos.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                montoCOP: this.toNumber(m.monto),
                createdAt: m.createdAt,
            })),
        };
    }

    async getResumenByUserId(usuarioId: number) {
        const user = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
            include: { wallet: { select: { balance: true } } },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const movimientos = await this.prisma.movimiento.findMany({
            where: { usuarioId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, tipo: true, monto: true, createdAt: true },
        });

        return {
            userId: user.id,
            saldo: this.toNumber(user.wallet?.balance),
            movimientos: movimientos.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                montoCOP: this.toNumber(m.monto),
                createdAt: m.createdAt,
            })),
        };
    }

    async applyMovement(params: {
        usuarioId: number;
        tipo:
        | 'RECARGA'
        | 'RETIRO'
        | 'APUESTA'
        | 'PREMIO'
        | 'AJUSTE'
        | 'TRANSFERENCIA_IN'
        | 'TRANSFERENCIA_OUT';
        deltaPesos: number;
        referencia?: string;
        juegoId?: number;
        apuestaId?: number;
        transferenciaId?: number;
        metadata?: any;
    }) {
        const { usuarioId, tipo, deltaPesos, referencia, juegoId, apuestaId, transferenciaId, metadata } = params;

        if (!Number.isInteger(deltaPesos) || deltaPesos === 0) {
            throw new BadRequestException('deltaPesos inválido (debe ser entero en pesos y distinto de 0)');
        }

        const dDelta = this.toDecimal(deltaPesos);

        return this.prisma.$transaction(async (tx) => {
            const w = await tx.wallet.findUnique({ where: { usuarioId }, select: { balance: true } });
            if (!w) throw new BadRequestException('Wallet no existe');

            const saldoAntes = this.toDecimal(w.balance);
            const saldoDespues = saldoAntes.add(dDelta);
            if (saldoDespues.lessThan(0)) throw new BadRequestException('Saldo insuficiente');

            await tx.wallet.update({ where: { usuarioId }, data: { balance: saldoDespues } });

            const mov = await tx.movimiento.create({
                data: {
                    usuarioId,
                    tipo,
                    monto: dDelta,
                    saldoAntes,
                    saldoDespues,
                    referencia,
                    juegoId,
                    apuestaId,
                    transferenciaId,
                    metadata,
                },
            });

            return mov;
        });
    }
}
