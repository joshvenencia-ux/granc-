import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB } from './firebase.constants';
import { FirestoreSyncService } from './firestore-sync.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule], // 👈 Necesario porque FirestoreSyncService usa PrismaService
    providers: [
        {
            provide: FIREBASE_APP,
            useFactory: () => {
                if (admin.apps.length) return admin.app();
                const projectId = process.env.FIREBASE_PROJECT_ID!;
                const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
                const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
                return admin.initializeApp({
                    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
                });
            },
        },
        {
            provide: FIREBASE_AUTH,
            useFactory: (app: admin.app.App) => app.auth(),
            inject: [FIREBASE_APP],
        },
        {
            provide: FIREBASE_DB,
            useFactory: (app: admin.app.App) => app.firestore(),
            inject: [FIREBASE_APP],
        },
        FirestoreSyncService, // 👈 Declarar provider
    ],
    exports: [FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB, FirestoreSyncService], // 👈 Exportar
})
export class FirebaseModule { }
