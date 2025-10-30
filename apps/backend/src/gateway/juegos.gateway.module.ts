import { Module } from '@nestjs/common';
import { JuegosGateway } from './juegos.gateway';
import * as admin from 'firebase-admin';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

const FirebaseAdminProvider = {
    provide: 'FIREBASE_ADMIN',
    useFactory: () => {
        if (admin.apps.length > 0) return admin.app();

        const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (svc) {
            const creds = JSON.parse(svc);
            return admin.initializeApp({ credential: admin.credential.cert(creds) });
        }
        return admin.initializeApp({ credential: admin.credential.applicationDefault() });
    },
};

const UserRepoProvider = {
    provide: 'USER_REPO',
    useFactory: (prisma: PrismaService) => ({
        async findOrCreateByFirebaseUid(uid: string): Promise<{ id: number }> {
            const u = await prisma.usuario.findUnique({ where: { firebase_uid: uid } });
            if (!u) throw new Error('USUARIO_NO_PROVISIONADO');
            return { id: u.id };
        },
    }),
    inject: [PrismaService],
};

@Module({
    imports: [PrismaModule],
    providers: [JuegosGateway, FirebaseAdminProvider, UserRepoProvider],
    exports: [JuegosGateway],
})
export class JuegosGatewayModule { }
