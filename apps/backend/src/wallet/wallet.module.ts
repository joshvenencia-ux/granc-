import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { ResolverUserService } from '../common/resolve-user';
import { FirestoreSyncService } from '../modules/firebase/firestore-sync.service';
import { FirebaseModule } from '../modules/firebase/firebase.module'; // 👈 AÑADIR

@Module({
    imports: [PrismaModule, FirebaseModule], // 👈 AÑADIR FirebaseModule
    controllers: [WalletController],
    providers: [WalletService, ResolverUserService, FirestoreSyncService],
    exports: [WalletService, ResolverUserService, FirestoreSyncService],
})
export class WalletModule { }
