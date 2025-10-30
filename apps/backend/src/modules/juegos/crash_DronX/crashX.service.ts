import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RondaEstado, JuegoTipo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BetService } from '../../../bet/bet.service';
import * as crypto from 'node:crypto';
import { CrashXEvents } from 'src/gateway/crashx.events';

function randomHex32() { return crypto.randomBytes(32).toString('hex'); }

@Injectable()
export class CrashXService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly betSrv: BetService,
        private readonly events: CrashXEvents,
    ) { }

    async startRound(opts: { gameCode?: string; startedBy: number }) {
        const startedBy = Number(opts?.startedBy);
        if (!Number.isFinite(startedBy) || startedBy <= 0)
            throw new BadRequestException('startedBy inválido');

        const u = await this.prisma.usuario.findUnique({ where: { id: startedBy } });
        if (!u) throw new BadRequestException('startedBy no existe');

        const serverSeed = randomHex32();
        const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

        const juego = await this.prisma.juego.create({
            data: {
                tipo_juego: JuegoTipo.DRONX,
                estado: RondaEstado.RUN,
                fecha_partida: new Date(),
                serverSeedHash,
                serverSeed,
                clientSeed: opts?.gameCode ?? null,
                nonce: 0,
                usuarioId: startedBy,
            },
            select: { id: true, fecha_partida: true },
        });

        this.events.roundStart(juego.id, juego.fecha_partida.toISOString());

        return { roundId: String(juego.id), startsAt: juego.fecha_partida.toISOString() };
    }

    async endRound(juegoId: number, finalX: number) {
        if (!Number.isFinite(juegoId) || juegoId <= 0)
            throw new BadRequestException('juegoId inválido');
        if (!Number.isFinite(finalX) || finalX <= 0)
            throw new BadRequestException('finalX inválido');

        const juego = await this.prisma.juego.findUnique({ where: { id: juegoId } });
        if (!juego) throw new NotFoundException('Ronda no existe');

        await this.prisma.juego.update({
            where: { id: juegoId },
            data: {
                finalX: new Prisma.Decimal(Number(finalX).toFixed(2)),
                estado: RondaEstado.CRASHED,
            },
        });

        const settle = await this.betSrv.settleRoundLosses(String(juegoId), finalX);
        const settledCount = (settle as any).settledCount ?? (settle as any).settled ?? 0;

        this.events.roundEnd(juegoId, finalX, settledCount);

        return { juegoId, finalX, settledCount };
    }

    emitXChange(roundId: number, x: number) {
        this.events.tickX(roundId, x);
    }

    async autoCashoutUpToX(roundId: number, x: number) {
        return { ok: true, roundId, upToX: x, countCashed: 0 };
    }
}
