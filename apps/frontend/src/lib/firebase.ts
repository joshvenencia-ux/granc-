import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
    getAuth, type Auth,
    GoogleAuthProvider, signInWithPopup,
    createUserWithEmailAndPassword, updateProfile,
    setPersistence, browserLocalPersistence, browserSessionPersistence,
    signInWithEmailAndPassword, sendPasswordResetEmail,
    onAuthStateChanged, signOut, type User, deleteUser,
    RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult,
} from "firebase/auth";
import {
    initializeFirestore, type Firestore,
    doc, setDoc, deleteDoc, serverTimestamp, onSnapshot,
    getDoc, updateDoc, increment,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/* ========= Firebase App ========= */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
auth.languageCode = "es";
setPersistence(auth, browserLocalPersistence).catch(() => { });

export const db: Firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
});
export const storage: FirebaseStorage = getStorage(app);

export type ExtraMeta = {
    usuario?: string;
    apellido?: string;
    cedula?: string;
    celular?: string;
    fechaNacimiento?: string;
    genero?: string;
    direccion?: string;
};

export type UserDoc = {
    uid: string;
    email: string;
    nombre?: string;
    apellido?: string;
    usuario?: string;
    rol?: "admin" | "user";
    estado_de_cuenta?: "online" | "offline";
    moneda?: "COP";
    saldo?: number;
    saldoReal?: number;
    promoIVA?: number;
    bonosPendientes?: number;
    sueldo?: number;
    cedula?: string;
    celular?: string;
    fechaNacimiento?: string;
    genero?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
};

const ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_BASE = `${ORIGIN}/api`;

export async function setAuthPersistence(remember: boolean) {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}
export async function signInEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}
export async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const u = res.user;
    try {
        await setDoc(
            doc(db, "usuarios", u.uid),
            {
                uid: u.uid,
                email: u.email ?? "",
                nombre: u.displayName ?? "",
                rol: "user",
                estado_de_cuenta: "offline",
                moneda: "COP",
                saldo: 0,
                saldoReal: 0,
                promoIVA: 0,
                bonosPendientes: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );
    } catch { }
    return u;
}

export async function resolveEmailFromIdentifier(identifier: string): Promise<string> {
    if (identifier.includes("@")) return identifier.trim();
    const res = await fetch(`${API_BASE}/usuarios/email-by-username/${encodeURIComponent(identifier)}`);
    if (!res.ok) throw new Error("No se pudo resolver el usuario");
    const data = await res.json();
    if (!data?.email) throw new Error("Usuario no encontrado");
    return String(data.email);
}

export async function isUsuarioAvailable(usuario: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/usuarios/username-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario }),
    });
    if (!res.ok) throw new Error("No se pudo validar el usuario");
    const data = await res.json();
    return !!data?.available;
}

export async function syncUserWithBackend(payload: {
    email: string;
    name: string;
    apellido: string;
    usuario?: string;
    cedula: string;
    celular: string;
    fechaNacimiento: string;
    genero: string;
}) {
    const u = auth.currentUser;
    if (!u) throw new Error("No hay usuario autenticado");
    const token = await u.getIdToken(true);

    const res = await fetch(`${API_BASE}/usuarios/sync`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Error de sincronización con el backend");
    }
    try { return await res.json(); } catch { return { ok: true }; }
}

export async function setCuentaEstado(estado: "online" | "offline") {
    const u = auth.currentUser;
    if (!u) throw new Error("No hay usuario autenticado");
    const token = await u.getIdToken(true);

    const res = await fetch(`${API_BASE}/usuarios/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "No se pudo actualizar estado");
    }
    return res.json().catch(() => ({ ok: true }));
}

export async function registerAndSync(payload: {
    email: string;
    password: string;
    name: string;
    apellido: string;
    usuario?: string;
    cedula: string;
    celular: string;
    fechaNacimiento: string;
    genero: string;
}) {
    const { email, password, name } = payload;

    if (payload.usuario) {
        const ok = await isUsuarioAvailable(payload.usuario);
        if (!ok) throw new Error("El nombre de usuario ya está en uso");
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });

    const u = cred.user;
    const uid = u.uid;

    let wroteDoc = false;
    const userRef = doc(db, "usuarios", uid);

    try {
        await syncUserWithBackend(payload);

        await setDoc(
            userRef,
            {
                uid,
                email: payload.email,
                nombre: payload.name,
                apellido: payload.apellido,
                usuario: payload.usuario ?? "",
                cedula: payload.cedula,
                celular: payload.celular,
                fechaNacimiento: payload.fechaNacimiento,
                genero: payload.genero,
                rol: "user",
                estado_de_cuenta: "offline",
                moneda: "COP",
                saldo: 0,
                saldoReal: 0,
                promoIVA: 0,
                bonosPendientes: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );
        wroteDoc = true;

        await setCuentaEstado("online");
        return u;
    } catch (err) {
        try { if (wroteDoc) await deleteDoc(userRef); } catch { }
        try { await deleteUser(u); } catch { }
        try { await signOut(auth); } catch { }
        throw err;
    }
}

export async function registerEmail(
    email: string,
    password: string,
    displayName: string,
    extra: ExtraMeta = {},
) {
    return registerAndSync({
        email,
        password,
        name: displayName,
        apellido: extra.apellido ?? "",
        usuario: extra.usuario?.trim() || undefined,
        cedula: extra.cedula ?? "",
        celular: extra.celular ?? "",
        fechaNacimiento: extra.fechaNacimiento ?? "",
        genero: extra.genero ?? "",
    });
}

export function observeAuth(cb: (u: User | null) => void) {
    return onAuthStateChanged(auth, cb);
}
export function observeUserDoc(uid: string, cb: (doc: UserDoc | undefined) => void) {
    const ref = doc(db, "usuarios", uid);
    return onSnapshot(
        ref,
        s => cb(s.exists() ? ({ uid, ...(s.data() as any) }) : undefined),
        () => cb(undefined),
    );
}
export async function logoutAndSetOffline() {
    try { await setCuentaEstado("offline"); } catch { }
    await signOut(auth);
}

/* ========= SMS ========= */
let _recaptcha: RecaptchaVerifier | null = null;
export function ensureRecaptcha(containerId = "recaptcha-container") {
    if (_recaptcha) return _recaptcha;

    if (!document.getElementById(containerId)) {
        const el = document.createElement("div");
        el.id = containerId;
        el.style.position = "fixed";
        el.style.left = "-99999px";
        document.body.appendChild(el);
    }
    _recaptcha = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
    return _recaptcha;
}
export async function sendPhoneCode(celularE164: string): Promise<ConfirmationResult> {
    const verifier = ensureRecaptcha();
    return await signInWithPhoneNumber(auth, celularE164, verifier);
}
export async function confirmPhoneCode(confirm: ConfirmationResult, code: string) {
    const res = await confirm.confirm(code);
    return res.user;
}

export async function getUserDoc(uid: string): Promise<UserDoc | undefined> {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return undefined;
    return { uid, ...(snap.data() as any) };
}

export async function recargarSaldo(uid: string, monto: number): Promise<void> {
    if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error("Monto inválido");
    }
    const ref = doc(db, "usuarios", uid);

    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            uid,
            saldo: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }

    await updateDoc(ref, {
        saldo: increment(monto),
        updatedAt: serverTimestamp(),
    });
}
