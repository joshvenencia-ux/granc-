const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('./path/to/your/credentials.json')), // Asegúrate de poner la ruta correcta
});

const db = admin.firestore();
module.exports = { db };
