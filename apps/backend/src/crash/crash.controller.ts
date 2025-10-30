// src/crash/crash.controller.ts
import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { CrashService } from './crash.service';
import { BetService } from '../bet/bet.service';

@Controller('api/crash')
export class CrashController {
    constructor(
        private readonly crashSrv: CrashService,
        private readonly betSrv: BetService,
    ) { }

    /** Inicia una ronda. startedBy es OBLIGATORIO porque CrashService lo requiere. */
    @Post('startRound')
    async startRound(@Body() body: any) {
        const startedBy = Number(body?.startedBy);
        if (!Number.isFinite(startedBy) || startedBy <= 0) {
            throw new BadRequestException('startedBy inválido (number > 0 requerido)');
        }
        return this.crashSrv.startRound(startedBy);
    }

    /** Cierra la ronda: recibe juegoId (ruta) y finalX (body). */
    @Post('endRound/:juegoId')
    async endRound(@Param('juegoId') juegoIdParam: string, @Body() body: any) {
        const juegoId = Number(juegoIdParam);
        if (!Number.isFinite(juegoId) || juegoId <= 0) {
            throw new BadRequestException('juegoId inválido');
        }

        const finalX = Number(body?.finalX ?? body?.x);
        if (!Number.isFinite(finalX) || finalX <= 0) {
            throw new BadRequestException('finalX inválido');
        }

        // 1) Cierra la ronda en CrashService
        const endInfo = await this.crashSrv.endRound(juegoId, finalX);

        // 2) Asienta pérdidas de apuestas abiertas para esa ronda
        const settle = await this.betSrv.settleRoundLosses(String(juegoId), finalX);

        return {
            ok: true,
            juegoId,
            finalX,
            endInfo,
            settledCount: settle.settledCount ?? 0, // <- usar settledCount (no 'settled')
        };
    }
}


    // Si más adelante implementas autoCashoutUpToX en CrashService o BetService, lo expones aquí.
    // @Post('autoCashoutUpToX')
    // async autoCashoutUpToX(@Body() body: any) {
    //   const roundId = String(body?.roundId ?? '');
    //   const x = Number(body?.x ?? 0);
    //   if (!roundId) throw new BadRequestException('roundId requerido');
    //   if (!(x >= 1)) throw new BadRequestException('x inválido');
    //   // return this.crashSrv.autoCashoutUpToX(roundId, x);
    //   throw new BadRequestException('No implementado');
    // }

