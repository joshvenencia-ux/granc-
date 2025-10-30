import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { CrashXModule } from './modules/juegos/crash_DronX/crashX.module';
import { BetModule } from './bet/bet.module';
import { WalletModule } from './wallet/wallet.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { FirebaseModule } from './modules/firebase/firebase.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

import { JuegosGatewayModule } from './gateway/juegos.gateway.module';  // <-- Módulo WebSocket

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    PrismaModule,
    FirebaseModule,
    UsuariosModule,
    LedgerModule,
    JuegosGatewayModule,
    CrashXModule,
    BetModule,
    WalletModule,

    EventEmitterModule.forRoot(),


  ],
})
export class AppModule { }
