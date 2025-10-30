import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferenciasService } from './transferencias.service';
import { TransferenciasController } from './transferencias.controller';

@Module({
    providers: [PrismaService, TransferenciasService],
    controllers: [TransferenciasController],
    exports: [TransferenciasService],
})
export class TransferenciasModule { }
