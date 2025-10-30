// src/bet/bet.controller.ts
import {
    BadRequestException, Body, Controller, Post, Req, UseGuards,
} from '@nestjs/common';
import { BetService } from './bet.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAuthGuard } from '../auth/firebase.guard';

type ReqUser = { email?: string };

@Controller('bet')
@UseGuards(FirebaseAuthGuard)
export class BetController {
    constructor(
        private readonly betSrv: BetService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('placeCrash')
    async place(@Req() req: any, @Body() body: any) {
        // --- userId ---
        let userId = Number(req.headers['x-user-id'] ?? req.headers['X-User-Id']);
        if (!Number.isFinite(userId) || userId <= 0) {
            const u: ReqUser = req.user || {};
            if (!u?.email) throw new BadRequestException('X-User-Id requerido (o token con email)');
            const user = await this.prisma.usuario.findUnique({
                where: { correo: u.email },
                select: { id: true },
            });
            if (!user) throw new BadRequestException('Usuario no existe');
            userId = user.id;
        }

        // --- roundId numérico ---
        const roundIdNum = Number(body?.roundId ?? body?.round_id);
        if (!Number.isFinite(roundIdNum) || roundIdNum <= 0) {
            throw new BadRequestException('roundId inválido');
        }

        // --- amount en pesos enteros (acepta amountPesos o amount) ---
        const rawAmount =
            body?.amountPesos ??
            body?.amount ??
            body?.monto ??
            body?.bet;

        const amountPesos = Math.trunc(Number(String(rawAmount).toString().replace(/[^\d-]/g, '')));
        if (!Number.isFinite(amountPesos) || amountPesos <= 0) {
            throw new BadRequestException('amount inválido (pesos enteros)');
        }

        // --- autoCashout y slot (opcionales) ---
        const autoCashout =
            body?.autoCashout != null && body?.autoCashout !== ''
                ? Number(body.autoCashout)
                : null;

        const slot =
            typeof body?.slot === 'string' && body.slot.trim().length > 0
                ? body.slot.trim()
                : null;

        // ✅ ahora el service recibe lo que espera
        return this.betSrv.placeCrashBet({
            roundId: roundIdNum,
            userId,
            amountPesos,
            autoCashout,
            slot,
        });
    }

    @Post('cashout/:betId')
    async cashout(@Req() req: any, @Body() body: any) {
        const id = Number(req.params.betId);
        if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('betId inválido');
        const x = Number(body?.x ?? 0);
        if (!(x >= 1)) throw new BadRequestException('x inválido');
        return this.betSrv.cashout(id, { x });
    }
}
