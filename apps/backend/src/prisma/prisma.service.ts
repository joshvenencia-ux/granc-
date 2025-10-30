import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    // Conexión al iniciar el módulo
    async onModuleInit() {
        await this.$connect();
    }

    // Desconexión al apagar el módulo
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
