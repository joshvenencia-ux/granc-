// apps/backend/scripts/delete-all-users.ts
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY!;

// Convierte los "\n" literales a saltos reales
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

async function main() {
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            projectId,
        });
    }

    const BATCH = 1000;
    let total = 0;
    let nextPageToken: string | undefined;

    for (; ;) {
        const list = await admin.auth().listUsers(BATCH, nextPageToken);
        const uids = list.users.map(u => u.uid);
        if (uids.length) {
            const res = await admin.auth().deleteUsers(uids);
            total += res.successCount;
            console.log(`Borrados: ${res.successCount} / Fallidos: ${res.failureCount}`);
        }
        if (list.pageToken) nextPageToken = list.pageToken;
        else break;
    }

    console.log(`✔ Listo. Usuarios borrados: ${total}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
