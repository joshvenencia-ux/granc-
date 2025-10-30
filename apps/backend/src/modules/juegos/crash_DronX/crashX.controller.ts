import {
    Body, Controller, Post, Req, Headers,
    UseGuards, BadRequestException, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { CrashXService } from './crashX.service';
import { FirebaseAuthGuard } from '../../../auth/firebase.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { StartRoundDTO } from './dto/start-round.dto';
import { EndRoundDTO } from './dto/end-round.dto';
import { AutoCashoutDTO } from './dto/auto-cashout.dto';

@Controller('crash')
@UseGuards(FirebaseAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CrashXController {
    constructor(
        private readonly service: CrashXService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('startRound')
    async start(@Body() body: StartRoundDTO, @Req() req: any, @Headers('x-user-id') xUserId?: string) {
        let userId: number | null = null;

        const email: string | undefined = req?.user?.email;
        if (email) {
            const u = await this.prisma.usuario.findUnique({ where: { correo: email }, select: { id: true } });
            if (u) userId = u.id;
        }

        if (!userId && xUserId) {
            const n = Number(xUserId);
            if (Number.isFinite(n) && n > 0) userId = n;
        }

        if (!userId) throw new BadRequestException('Usuario no autenticado');

        return this.service.startRound({
            startedBy: userId,
            gameCode: body?.gameCode ?? 'CRASH_MAIN',
        });
    }

    @Post('endRound')
    async end(@Body() body: EndRoundDTO) {
        return this.service.endRound(body.roundId, body.finalX);
    }

    @Post('autoCashoutUpToX')
    async autoCashoutUpToX(@Body() body: AutoCashoutDTO) {
        return this.service.autoCashoutUpToX(body.roundId, body.x);
    }
}
