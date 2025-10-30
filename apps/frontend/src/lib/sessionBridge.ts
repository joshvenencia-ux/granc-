// src/lib/sessionBridge.ts
import { auth, observeAuth, observeUserDoc } from "./firebase";
import { onIdTokenChanged } from "firebase/auth";

type PerfilPayload = {
    nombre: string;
    email: string;
    codigo: string;
    saldoCop: number;
};

function emitirPerfil(perfil: PerfilPayload) {
    try { localStorage.setItem("perfil", JSON.stringify(perfil)); } catch { }
    window.dispatchEvent(new CustomEvent("user:perfil", { detail: perfil }));
    window.dispatchEvent(new CustomEvent("user:saldo", { detail: { saldoCOP: perfil.saldoCop } }));
}
function perfilInvitado() {
    emitirPerfil({ nombre: "Invitado", email: "", codigo: "", saldoCop: 0 });
}

async function pushAuthToChildren(refresh = false) {
    const u = auth.currentUser;
    let token: string | null = null;
    try { token = u ? await u.getIdToken(refresh) : null; } catch { }
    const msg = { type: "auth:set", payload: { token, userId: u?.uid ?? null } };
    document.querySelectorAll("iframe").forEach(f => {
        try { f.contentWindow?.postMessage(msg, "*"); } catch { }
    });
}

async function setLocalAuth(u: import("firebase/auth").User | null) {
    if (!u) {
        try { localStorage.removeItem("token"); localStorage.removeItem("userId"); } catch { }
        void pushAuthToChildren(false);
        perfilInvitado();
        return;
    }
    try { localStorage.setItem("token", await u.getIdToken(true)); } catch { }
    try { localStorage.setItem("userId", u.uid); } catch { }
    void pushAuthToChildren(false);
}

let stopUserDoc: (() => void) | null = null;
let _inited = false;

export function initAuthWalletBridge() {
    if (_inited) return;
    _inited = true;

    onIdTokenChanged(auth, async (u) => {
        if (!u) {
            try { localStorage.removeItem("token"); localStorage.removeItem("userId"); } catch { }
            void pushAuthToChildren(false);
            return;
        }
        try {
            const t = await u.getIdToken(false);
            localStorage.setItem("token", t);
            localStorage.setItem("userId", u.uid);
        } catch { }
        void pushAuthToChildren(false);
    });

    observeAuth(async (u) => {
        if (stopUserDoc) { try { stopUserDoc(); } catch { }; stopUserDoc = null; }
        await setLocalAuth(u);
        if (!u) return;

        const nombreAuth =
            (u.displayName && u.displayName.trim()) ||
            (u.email && u.email.split("@")[0]) ||
            "Usuario";

        const perfilInicial: PerfilPayload = {
            nombre: nombreAuth,
            email: u.email || "",
            codigo: "",
            saldoCop: 0,
        };
        emitirPerfil(perfilInicial);

        stopUserDoc = observeUserDoc(u.uid, (doc) => {
            const nombre = (doc?.nombre || doc?.usuario || perfilInicial.nombre).toString();
            const codigo = (doc?.usuario || perfilInicial.codigo).toString();
            const saldo = Number(doc?.saldo ?? doc?.saldoReal ?? perfilInicial.saldoCop) || 0;
            emitirPerfil({ nombre, email: perfilInicial.email, codigo, saldoCop: saldo });
        });
    });
}
