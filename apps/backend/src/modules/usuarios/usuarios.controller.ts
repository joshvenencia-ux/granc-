import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsuarioService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAuthGuard } from '../../auth/firebase.guard';
import { SyncUsuarioDto } from './dto/sync-usuario.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';

@Controller('usuarios')
export class UsuariosController {
    constructor(
        private readonly usuariosService: UsuarioService,
        private readonly prisma: PrismaService,
    ) { }

    /** Sincroniza datos del usuario (requiere Firebase token) */
    @Post('sync')
    @UseGuards(FirebaseAuthGuard)
    async syncFromFirebase(@Req() req: Request, @Body() dto: SyncUsuarioDto) {
        const uid = (req as any).user?.uid as string | undefined;
        if (!uid) throw new NotFoundException('UID no disponible');
        return this.usuariosService.syncFromFirebase(uid, dto);
    }

    /** Actualiza estado de cuenta */
    @Post('estado')
    @UseGuards(FirebaseAuthGuard)
    async setEstado(@Req() req: Request, @Body() body: UpdateEstadoDto) {
        const uid = (req as any).user?.uid as string | undefined;
        if (!uid) throw new NotFoundException('UID no disponible');
        await this.usuariosService.updateEstadoCuenta(uid, body.estado);
        return { ok: true };
    }

    /** Actualiza username */
    @Post('username')
    @UseGuards(FirebaseAuthGuard)
    async setUsername(@Req() req: Request, @Body() body: UpdateUsernameDto) {
        const uid = (req as any).user?.uid as string | undefined;
        if (!uid) throw new NotFoundException('UID no disponible');
        return this.usuariosService.setUsername(uid, body.usuario);
    }

    /** Verifica disponibilidad de username */
    @Post('username-availability')
    async usernameAvailability(@Body('usuario') usuario: string) {
        const u = (usuario || '').trim().toLowerCase();
        const valid = /^[a-zA-Z0-9_.-]{3,20}$/.test(u);
        if (!valid) return { available: false };

        const hit = await this.prisma.usuario.findUnique({
            where: { usuario: u },
            select: { id: true },
        });

        return { available: !hit };
    }

    /** Resuelve email por username */
    @Get('email-by-username/:usuario')
    async emailByUsername(@Param('usuario') usuario: string) {
        const u = (usuario || '').trim().toLowerCase();
        const hit = await this.prisma.usuario.findUnique({
            where: { usuario: u },
            select: { correo: true },
        });
        if (!hit) throw new NotFoundException('Usuario no encontrado');
        return { email: hit.correo };
    }

    /* ========= NUEVOS ENDPOINTS PARA Recargar.tsx ========= */

    /** Devuelve { id } del usuario por su Firebase UID */
    @Get('id-by-uid/:uid')
    @UseGuards(FirebaseAuthGuard)
    async idByUid(@Param('uid') uid: string) {
        const clean = String(uid || '').trim();
        const user = await this.prisma.usuario.findUnique({
            where: { firebase_uid: clean }, // ← tu schema usa "firebase_uid"
            select: { id: true },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado por uid');
        return { id: user.id };
    }

    /** Devuelve { id } del usuario por su email */
    @Get('id-by-email/:email')
    @UseGuards(FirebaseAuthGuard)
    async idByEmail(@Param('email') email: string) {
        const clean = String(email || '').trim().toLowerCase();
        const user = await this.prisma.usuario.findUnique({
            where: { correo: clean }, // ← tu schema usa "correo"
            select: { id: true },
        });
        if (!user) throw new NotFoundException('Usuario no encontrado por email');
        return { id: user.id };
    }
}
