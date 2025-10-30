import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from 'pg';
import { WalletService } from './wallet.service';
import { CrashGateway } from '../crash/crash.gateway';

@Injectable()
export class MovListener implements OnModuleInit, OnModuleDestroy {
    private client = new Client({ connectionString: process.env.DATABASE_URL });

    constructor(
        private wallet: WalletService,
        private gateway: CrashGateway,
    ) { }

    async onModuleInit() {
        await this.client.connect();
        await this.client.query('LISTEN mov_changed');

        this.client.on('notification', async (msg) => {
            if (msg.channel !== 'mov_changed') return;

            const { usuarioId } = JSON.parse(msg.payload ?? '{}');
            if (!usuarioId) return;

            const saldo = await this.wallet.getBalance(Number(usuarioId)); // number (pesos enteros)


            this.gateway.emitToUser(Number(usuarioId), 'user:saldo', saldo);
        });
    }

    async onModuleDestroy() {
        await this.client.end().catch(() => { /* noop */ });
    }
}
