import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // opcional: hace que no necesites importar el módulo en cada lugar
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
