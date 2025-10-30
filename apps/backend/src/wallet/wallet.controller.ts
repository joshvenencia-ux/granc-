import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
    Headers,
    BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AdjustDto, AdminAdjustDto } from './dto/wallet.dto';
import { FirebaseAuthGuard } from '../auth/firebase.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type ReqUser = { uid: string; email?: string; roles?: string[] };

@Controller('wallet') // 👈 quitamos el "api/"
export class WalletController {
    constructor(private wallet: WalletService) { }

    /** Perfil + saldo (para tu Navbar / api.ts loadPerfil) */
    @UseGuards(FirebaseAuthGuard)
    @Get('me')
    async me(@Req() req: any) {
        const u: ReqUser = req.user;
        if (!u?.email) throw new BadRequestException('Auth sin email');

        const prisma = this.wallet['prisma'];
        const user = await prisma.usuario.findUnique({
            where: { correo: u.email },
            select: { id: true, nombre_completo: true, usuario: true, correo: true },
        });
        if (!user) throw new BadRequestException('Usuario no existe en base de datos');

        const saldo = await this.wallet.getBalance(user.id);

        return {
            id: user.id,
            nombre: user.nombre_completo,
            userName: user.usuario,
            email: user.correo,
            saldoCOP: saldo,
        };
    }

    /** Solo saldo (para polling o sincronización rápida) */
    @UseGuards(FirebaseAuthGuard)
    @Get('saldo')
    async saldo(@Req() req: any) {
        const u: ReqUser = req.user;
        if (!u?.email) throw new BadRequestException('Auth sin email');
        const prisma = this.wallet['prisma'];
        const user = await prisma.usuario.findUnique({
            where: { correo: u.email },
            select: { id: true },
        });
        if (!user) throw new BadRequestException('Usuario no existe');

        const saldo = await this.wallet.getBalance(user.id);
        return { saldoCOP: saldo };
    }

    /** Ajuste propio (QA) */
    @UseGuards(FirebaseAuthGuard)
    @Post('adjust')
    async adjust(@Req() req: any, @Body() body: AdjustDto, @Headers('idempotency-key') idem?: string) {
        const u: ReqUser = req.user;
        if (!u?.email) throw new BadRequestException('Auth sin email');

        const prisma = this.wallet['prisma'];
        const user = await prisma.usuario.findUnique({
            where: { correo: u.email },
            select: { id: true },
        });
        if (!user) throw new BadRequestException('Usuario no existe');

        return this.wallet.adjust(user.id, body.delta, body.motivo ?? 'AJUSTE', idem);
    }

    /** Ajuste admin */
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('admin')
    @Post('admin/adjust')
    async adminAdjust(@Body() body: AdminAdjustDto, @Headers('idempotency-key') idem?: string) {
        return this.wallet.adjust(body.usuarioId, body.delta, body.motivo ?? 'ADMIN', body.referencia ?? idem);
    }
}
