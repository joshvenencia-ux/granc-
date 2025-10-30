// src/bet/bet.module.ts
import { Module } from '@nestjs/common';
import { BetService } from './bet.service';
import { BetController } from './bet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from '../modules/firebase/firebase.module'; // 👈 importa el módulo que expone FirestoreSyncService

@Module({
    imports: [
        PrismaModule,   // PrismaService
        FirebaseModule, // FirestoreSyncService (y FIREBASE_DB) vienen de aquí
    ],
    providers: [BetService],
    controllers: [BetController],
    exports: [BetService],
})
export class BetModule { }
