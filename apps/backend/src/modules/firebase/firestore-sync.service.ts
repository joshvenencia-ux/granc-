import { Inject, Injectable, Logger } from '@nestjs/common';
import { FIREBASE_DB } from './firebase.constants';
import type { Firestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FirestoreSyncService {
    private readonly log = new Logger(FirestoreSyncService.name);

    constructor(
        @Inject(FIREBASE_DB) private readonly db: Firestore,
        private readonly prisma: PrismaService,
    ) { }

    private async getUid(usuarioId: number): Promise<string | null> {
        const user = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: { firebase_uid: true },
        });
        return user?.firebase_uid ?? null;
    }

    async setWalletSaldo(usuarioId: number, saldoPesos: number) {
        try {
            const uid = await this.getUid(usuarioId);
            if (!uid) {
                this.log.warn(`Usuario ${usuarioId} sin firebase_uid`);
                return;
            }

            await this.db.collection('usuarios').doc(uid).set(
                {
                    saldo: saldoPesos,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        } catch (e) {
            this.log.error(`Firestore setWalletSaldo fallo usuarioId=${usuarioId}`, e as any);
        }
    }

    async pushMovimiento(
        usuarioId: number,
        mov: {
            tipo: string;
            montoPesos: number;
            saldoAntes: number;
            saldoDespues: number;
            referencia?: string | null;
            juegoId?: number | null;
            apuestaId?: number | null;
            metadata?: any;
        },
    ) {
        try {
            const uid = await this.getUid(usuarioId);
            if (!uid) {
                this.log.warn(`Usuario ${usuarioId} sin firebase_uid`);
                return;
            }

            await this.db
                .collection('usuarios')
                .doc(uid)
                .collection('movimientos')
                .add({
                    ...mov,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
        } catch (e) {
            this.log.error(`Firestore pushMovimiento fallo usuarioId=${usuarioId}`, e as any);
        }
    }
}
