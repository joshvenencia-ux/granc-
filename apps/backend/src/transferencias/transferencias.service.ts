import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferenciaEstado, MovimientoTipo } from '@prisma/client';
import { toDec, decToNumber } from '../common/money';

@Injectable()
export class TransferenciasService {
    constructor(private prisma: PrismaService) { }

    /** Crear recarga o retiro pendiente (monto en pesos enteros) */
    async create(opts: { usuarioId: number; monto: number; motivo?: string }) {
        if (!Number.isInteger(opts.monto)) {
            throw new BadRequestException('Monto debe ser entero en COP');
        }
        return this.prisma.transferencia.create({
            data: {
                usuarioId: opts.usuarioId,
                monto: toDec(opts.monto),
                motivo: opts.motivo,
                estado: TransferenciaEstado.PENDIENTE,
            },
        });
    }

    /** Completar transferencia → aplica al wallet y crea movimiento */
    async completar(id: number) {
        return this.prisma.$transaction(async (tx) => {
            const t = await tx.transferencia.findUnique({ where: { id } });
            if (!t) throw new NotFoundException('Transferencia no encontrada');
            if (t.estado !== TransferenciaEstado.PENDIENTE) {
                throw new BadRequestException('Ya procesada');
            }

            const w = await tx.wallet.upsert({
                where: { usuarioId: t.usuarioId },
                update: {},
                create: { usuarioId: t.usuarioId, balance: toDec(0) },
            });

            const saldoAntes = w.balance;
            const saldoDespues = saldoAntes.add(t.monto);

            await tx.wallet.update({
                where: { usuarioId: t.usuarioId },
                data: { balance: saldoDespues, version: { increment: 1 } },
            });

            await tx.movimiento.create({
                data: {
                    usuarioId: t.usuarioId,
                    tipo: t.monto.greaterThan(0) ? MovimientoTipo.RECARGA : MovimientoTipo.RETIRO,
                    monto: t.monto,
                    saldoAntes,
                    saldoDespues,
                    transferenciaId: t.id,
                    metadata: { motivo: t.motivo },
                },
            });

            await tx.transferencia.update({
                where: { id },
                data: { estado: TransferenciaEstado.COMPLETADA, completedAt: new Date() },
            });

            return { saldoCOP: decToNumber(saldoDespues) };
        });
    }

    /** Marcar como fallida */
    async marcarFallida(id: number) {
        return this.prisma.transferencia.update({
            where: { id },
            data: { estado: TransferenciaEstado.FALLIDA },
        });
    }

    /** Listado de transferencias por usuario */
    async listarPorUsuario(usuarioId: number) {
        const list = await this.prisma.transferencia.findMany({
            where: { usuarioId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return list.map((t) => ({
            id: t.id,
            monto: decToNumber(t.monto),
            estado: t.estado,
            motivo: t.motivo,
            createdAt: t.createdAt.toISOString(),
            completedAt: t.completedAt?.toISOString() ?? null,
        }));
    }
}
