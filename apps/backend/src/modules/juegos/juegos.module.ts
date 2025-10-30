import { Module } from '@nestjs/common';
import { JuegosController } from './juegos.controller';
import { JuegosService } from './juegos.service';
import { CrashXController } from './crash_DronX/crashX.controller';
import { CrashXService } from './crash_DronX/crashX.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BetService } from '../../bet/bet.service';

@Module({
    controllers: [JuegosController, CrashXController],
    providers: [PrismaService, JuegosService, CrashXService, BetService],
    exports: [JuegosService, CrashXService],
})
export class JuegosModule { }
