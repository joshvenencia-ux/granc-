import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuarioService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [UsuariosController],
    providers: [UsuarioService, PrismaService],
    exports: [UsuarioService],
})
export class UsuariosModule { }
