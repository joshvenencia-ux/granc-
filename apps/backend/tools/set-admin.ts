import 'dotenv/config';
import * as admin from 'firebase-admin';
import * as fs from 'node:fs';

function getCreds() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyEnv) {
        return {
            projectId,
            clientEmail,
            privateKey: privateKeyEnv.replace(/\\n/g, '\n'),
        };
    }

    if (fs.existsSync('service-account.json')) {
        const svc = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
        return {
            projectId: svc.project_id,
            clientEmail: svc.client_email,
            privateKey: svc.private_key,
        };
    }

    throw new Error('Credenciales Firebase no encontradas. Configura .env o service-account.json');
}

admin.initializeApp({
    credential: admin.credential.cert(getCreds()),
});

async function main() {
    const uid = process.argv[2];
    if (!uid) {
        console.error('Uso: npx ts-node tools/set-admin.ts <UID>');
        process.exit(1);
    }
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Usuario ${uid} ahora tiene claim admin:true`);
}

main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
