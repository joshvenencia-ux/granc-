// src/crash/crash.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BetService } from '../bet/bet.service';
import { JuegoTipo, RondaEstado, Prisma } from '@prisma/client';

@Injectable()
export class CrashService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly betService: BetService,
    ) { }

    async startRound(startedBy: number) {
        const juego = await this.prisma.juego.create({
            data: {
                tipo_juego: JuegoTipo.DRONX,
                estado: RondaEstado.RUN,
                fecha_partida: new Date(),
                usuarioId: startedBy,
                serverSeedHash: crypto.randomUUID(), // placeholder
            },
            select: { id: true, fecha_partida: true },
        });

        return {
            roundId: String(juego.id),
            startedAt: juego.fecha_partida.toISOString(),
        };
    }

    async endRound(roundIdParam: string | number, finalXParam: number) {
        // ✅ parseo y validación
        const juegoId =
            typeof roundIdParam === 'string' ? Number(roundIdParam) : roundIdParam;
        if (!Number.isFinite(juegoId)) {
            throw new BadRequestException('roundId inválido');
        }
        const finalX = Number(finalXParam);
        if (!(finalX > 0)) {
            throw new BadRequestException('finalX inválido');
        }

        // ✅ aquí Prisma recibe number, no string
        await this.prisma.juego.update({
            where: { id: juegoId },
            data: {
                estado: RondaEstado.CRASHED,
                finalX: new Prisma.Decimal(finalX.toFixed(2)),
            },
        });

        // Puede que tu BetService devuelva { settled } o { settledCount }
        const settle = await this.betService.settleRoundLosses(
            String(juegoId),
            finalX,
        );
        const settledCount =
            (settle as any).settled ?? (settle as any).settledCount ?? 0;

        return {
            ok: true,
            juegoId,
            finalX,
            settledCount,
        };
    }
}
