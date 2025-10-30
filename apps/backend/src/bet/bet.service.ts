import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovimientoTipo, Prisma } from '@prisma/client';
import { toDec, decToNumber } from '../common/money';
import { FirestoreSyncService } from '../modules/firebase/firestore-sync.service';

@Injectable()
export class BetService {
    constructor(
        private prisma: PrismaService,
        private fsync: FirestoreSyncService,
    ) { }

    private async getSaldoPesosTx(userId: number, tx: Prisma.TransactionClient) {
        await tx.wallet.upsert({
            where: { usuarioId: userId },
            update: {},
            create: { usuarioId: userId, balance: toDec(0) },
        });
        const w = await tx.wallet.findUnique({
            where: { usuarioId: userId },
            select: { balance: true },
        });
        if (!w) throw new NotFoundException('Wallet no existe');
        return decToNumber(w.balance);
    }

    private async setSaldoPesosTx(userId: number, nuevosPesos: number, tx: Prisma.TransactionClient) {
        await tx.wallet.update({
            where: { usuarioId: userId },
            data: { balance: toDec(nuevosPesos) },
        });
    }

    private async crearMovimientoTx(opts: {
        tx: Prisma.TransactionClient;
        usuarioId: number;
        tipo: MovimientoTipo;
        montoPesos: number;
        referencia?: string;
        juegoId?: number;
        apuestaId?: number;
        transferenciaId?: number;
        metadata?: Prisma.InputJsonValue;
    }) {
        const saldoAntes = await this.getSaldoPesosTx(opts.usuarioId, opts.tx);
        const saldoDespues = saldoAntes + opts.montoPesos;
        if (saldoDespues < 0) throw new BadRequestException('Saldo insuficiente');

        await opts.tx.movimiento.create({
            data: {
                usuarioId: opts.usuarioId,
                tipo: opts.tipo,
                monto: toDec(opts.montoPesos),
                saldoAntes: toDec(saldoAntes),
                saldoDespues: toDec(saldoDespues),
                referencia: opts.referencia,
                juegoId: opts.juegoId ?? null,
                apuestaId: opts.apuestaId ?? null,
                transferenciaId: opts.transferenciaId ?? null,
                metadata: opts.metadata ?? undefined,
            },
        });

        await this.setSaldoPesosTx(opts.usuarioId, saldoDespues, opts.tx);
        return { saldoAntes, saldoDespues };
    }

    /** PLACE: permite dos apuestas (p. ej. L/R) en la misma ronda diferenciando la referencia por slot */
    async placeCrashBet(payload: {
        roundId: number;             // id de Juego EXISTENTE
        userId: number;
        amountPesos: number;         // pesos enteros
        autoCashout?: number | null; // X deseado
        slot?: string | null;        // 'L' | 'R' | ...
    }) {
        const { userId, amountPesos, roundId, autoCashout, slot } = payload;
        if (!Number.isFinite(amountPesos) || amountPesos <= 0) {
            throw new BadRequestException('Monto inválido (pesos enteros)');
        }

        // normaliza slot y construye referencia única por usuario/juego/slot
        const slotNorm = String(slot ?? 'A').trim().toUpperCase(); // 'L' | 'R' | 'A'
        const ref = `${roundId}:${slotNorm}`;

        const out = await this.prisma.$transaction(async (tx) => {
            const juego = await tx.juego.findUnique({
                where: { id: roundId },
                select: { id: true, estado: true },
            });
            if (!juego) throw new NotFoundException('Ronda no existe');
            if (juego.estado !== 'RUN') {
                throw new BadRequestException('La ronda no está abierta para apostar');
            }

            const saldoActual = await this.getSaldoPesosTx(userId, tx);
            if (saldoActual < amountPesos) throw new BadRequestException('Saldo insuficiente');

            // (Opcional) evita doble clic en MISMO slot
            const dup = await tx.apuesta.findFirst({
                where: { usuarioId: userId, juegoId: juego.id, referencia: ref },
                select: { id: true },
            });
            if (dup) throw new BadRequestException('Ya tienes una apuesta activa en este slot');

            const apuesta = await tx.apuesta.create({
                data: {
                    usuarioId: userId,
                    juegoId: juego.id,
                    monto: toDec(amountPesos),
                    estado: 'PLACED',
                    referencia: ref, // ← referencia con slot
                },
            });

            await tx.dronXApuesta.create({
                data: {
                    apuestaId: apuesta.id,
                    autoCashoutX: autoCashout ? new Prisma.Decimal(autoCashout) : null,
                    slot: slotNorm,
                },
            });

            const mov = await this.crearMovimientoTx({
                tx,
                usuarioId: userId,
                tipo: MovimientoTipo.APUESTA,
                montoPesos: -amountPesos,
                referencia: ref,
                juegoId: juego.id,
                apuestaId: apuesta.id,
                metadata: { slot: slotNorm, autoCashout },
            });

            return {
                payload: {
                    id: apuesta.id,
                    roundId: String(roundId),
                    userId,
                    amount: amountPesos,
                    currency: 'COP',
                    autoCashout: autoCashout ?? null,
                    slot: slotNorm,
                    placedAt: new Date().toISOString(),
                },
                sync: {
                    usuarioId: userId,
                    montoPesos: -amountPesos,
                    saldoAntes: mov.saldoAntes,
                    saldoDespues: mov.saldoDespues,
                    referencia: ref,
                    juegoId: juego.id,
                    apuestaId: apuesta.id,
                    slot: slotNorm, autoCashout,
                },
            };
        });

        const s = out.sync;
        this.fsync.pushMovimiento(s.usuarioId, {
            tipo: 'APUESTA',
            montoPesos: s.montoPesos,
            saldoAntes: s.saldoAntes,
            saldoDespues: s.saldoDespues,
            referencia: s.referencia,
            juegoId: s.juegoId,
            apuestaId: s.apuestaId,
            metadata: { slot: s.slot, autoCashout: s.autoCashout },
        });
        this.fsync.setWalletSaldo(s.usuarioId, s.saldoDespues);

        return out.payload;
    }

    async cashout(apuestaId: number, payload: { x: number }) {
        const x = Number(payload?.x ?? 0);
        if (!(x >= 1)) throw new BadRequestException('x inválido');

        const out = await this.prisma.$transaction(async (tx) => {
            const apuesta = await tx.apuesta.findUnique({
                where: { id: apuestaId },
                include: { dronx: true },
            });
            if (!apuesta) throw new NotFoundException('Apuesta no encontrada');

            if (apuesta.estado !== 'PLACED') {
                return { payload: { ok: true, already: true }, sync: null as any };
            }

            const montoPesos = decToNumber(apuesta.monto);
            const prizePesos = Math.floor(montoPesos * x);
            const profitPesos = Math.max(0, prizePesos - montoPesos);

            await tx.apuesta.update({
                where: { id: apuesta.id },
                data: {
                    estado: 'CASHED',
                    payout: toDec(prizePesos),
                    cashoutX: new Prisma.Decimal(x),
                    cashedAt: new Date(),
                },
            });

            const mov = await this.crearMovimientoTx({
                tx,
                usuarioId: apuesta.usuarioId,
                tipo: MovimientoTipo.PREMIO,
                montoPesos: prizePesos,
                referencia: apuesta.referencia ?? undefined,
                juegoId: apuesta.juegoId,
                apuestaId: apuesta.id,
                metadata: { x, profit: profitPesos },
            });

            return {
                payload: {
                    apuestaId: apuesta.id,
                    x,
                    prize: prizePesos,
                    profit: profitPesos,
                    currency: 'COP',
                    cashedAt: new Date().toISOString(),
                },
                sync: {
                    usuarioId: apuesta.usuarioId,
                    montoPesos: prizePesos,
                    saldoAntes: mov.saldoAntes,
                    saldoDespues: mov.saldoDespues,
                    referencia: apuesta.referencia ?? null,
                    juegoId: apuesta.juegoId,
                    apuestaId: apuesta.id,
                    x,
                    profitPesos,
                },
            };
        });

        if (out.sync) {
            const s = out.sync;
            this.fsync.pushMovimiento(s.usuarioId, {
                tipo: 'PREMIO',
                montoPesos: s.montoPesos,
                saldoAntes: s.saldoAntes,
                saldoDespues: s.saldoDespues,
                referencia: s.referencia ?? undefined,
                juegoId: s.juegoId ?? undefined,
                apuestaId: s.apuestaId ?? undefined,
                metadata: { x: s.x, profit: s.profitPesos },
            });
            this.fsync.setWalletSaldo(s.usuarioId, s.saldoDespues);
        }

        return out.payload;
    }

    async settleRoundLosses(roundId: string, finalX: number) {
        const juegoId = Number(roundId);
        if (!Number.isFinite(juegoId) || juegoId <= 0) {
            throw new BadRequestException('roundId inválido');
        }

        return this.prisma.$transaction(async (tx) => {
            const openBets = await tx.apuesta.findMany({
                where: { juegoId, estado: 'PLACED' },
                select: { id: true },
            });

            if (openBets.length > 0) {
                await tx.apuesta.updateMany({
                    where: { juegoId, estado: 'PLACED' },
                    data: { estado: 'LOST', payout: toDec(0) },
                });
            }

            await tx.juego.update({
                where: { id: juegoId },
                data: { estado: 'CRASHED', finalX: new Prisma.Decimal(Number(finalX).toFixed(2)) },
            });

            return { roundId, finalX, settledCount: openBets.length };
        });
    }
}
