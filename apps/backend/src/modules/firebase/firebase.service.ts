import { Inject, Injectable } from '@nestjs/common';
import type { Auth, CreateRequest, UserRecord, DecodedIdToken } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
    constructor(
        @Inject('FIREBASE_AUTH') private readonly auth: Auth,
        @Inject('FIREBASE_DB') private readonly db: Firestore,
    ) { }

    verifyIdToken(token: string): Promise<DecodedIdToken> {
        return this.auth.verifyIdToken(token);
    }

    createUser(req: CreateRequest): Promise<UserRecord> {
        return this.auth.createUser(req);
    }

    getUser(uid: string): Promise<UserRecord> {
        return this.auth.getUser(uid);
    }

    // === Firestore helpers (Admin) ===
    userDoc(uid: string) {
        return this.db.collection('usuarios').doc(uid);
    }

    async upsertUser(uid: string, data: Record<string, unknown>) {
        await this.userDoc(uid).set({ ...data, updatedAt: new Date() }, { merge: true });
    }
}
