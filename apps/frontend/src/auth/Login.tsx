import { useEffect, useMemo, useState } from "react";
import {
    auth,
    setAuthPersistence,
    signInEmail,
    resolveEmailFromIdentifier,
    signInWithGoogle,
    resetPassword,
    setCuentaEstado,
} from "@/lib/firebase";
import { fetchSignInMethodsForEmail } from "firebase/auth";

/** Extrae el code, message o causa anidada */
function extractAuthCode(err: any): string {
    // Si viene con .code directo
    if (err && typeof err.code === "string") return err.code;

    // Si viene anidado
    if (err?.cause && typeof err.cause.code === "string") return err.cause.code;

    // Parsear desde message: "Firebase: Error"
    const msg: string | undefined = err?.message;
    if (typeof msg === "string") {
        const m = msg.match(/auth\/[a-z0-9-]+/i);
        if (m) return m[0].toLowerCase();
    }
    return "auth/unknown";
}

/** Mapea code -> mensaje legible */
function mapAuthCodeToMessage(code: string): { target: "id" | "pass" | "form"; msg: string } {
    const c = code.toLowerCase();
    switch (c) {
        case "auth/invalid-email":
            return { target: "id", msg: "El correo no es válido." };
        case "auth/user-not-found":
            return { target: "id", msg: "No existe una cuenta con ese correo/usuario." };
       
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return { target: "pass", msg: "Contraseña incorrecta." };
        case "auth/too-many-requests":
            return { target: "form", msg: "Demasiados intentos. Intenta más tarde." };
        case "auth/user-disabled":
            return { target: "form", msg: "Tu cuenta está deshabilitada." };
        case "auth/network-request-failed":
            return { target: "form", msg: "Error de red. Revisa tu conexión." };
        case "auth/popup-closed-by-user":
            return { target: "form", msg: "Cerraste la ventana de Google antes de terminar." };
        case "auth/cancelled-popup-request":
            return { target: "form", msg: "Ya hay un inicio con Google en curso." };
        case "auth/popup-blocked":
            return { target: "form", msg: "El navegador bloqueó la ventana de Google. Permite pop-ups." };
        case "auth/operation-not-supported-in-this-environment":
            return { target: "form", msg: "Operación no soportada en este entorno." };
        case "auth/unsupported-persistence-type":
            return { target: "form", msg: "Este navegador no soporta el tipo de sesión elegido." };
        default:
            return { target: "form", msg: "Ocurrió un error. Intenta de nuevo." };
    }
}

function validate(identifier: string, password: string) {
    const id = identifier.trim();
    const pass = password;
    if (!id) return { id: "Ingresa tu correo, usuario o celular.", pass: null };
    if (!pass) return { id: null, pass: "Ingresa tu contraseña." };
    if (pass.length < 6) return { id: null, pass: "La contraseña debe tener al menos 6 caracteres." };
    return { id: null, pass: null };
}

type Props = { onSuccess?: () => void };

export default function Login({ onSuccess }: Props) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);

    const [idError, setIdError] = useState<string | null>(null);
    const [passError, setPassError] = useState<string | null>(null);
    const [formMsg, setFormMsg] = useState<string | null>(null);

    const [showPass, setShowPass] = useState(false);

    // Configurar persistencia sin spamear warnings
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                await setAuthPersistence(remember);
            } catch {
                if (alive) {
                    
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [remember]);

    const disableSubmit = useMemo(() => loading, [loading]);

    const refineInvalidCredential = async () => {
        
        try {
            const email = await resolveEmailFromIdentifier(identifier.trim());
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length === 0) {
                setIdError("No existe una cuenta con ese correo/usuario.");
                return true;
            }
            if (!methods.includes("password")) {
                setFormMsg("Tu cuenta está registrada con Google. Entra con Google o crea una contraseña desde “¿Olvidaste?”.");
                return true;
            }
            
            setPassError("Contraseña incorrecta.");
            return true;
        } catch {
            
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIdError(null);
        setPassError(null);
        setFormMsg(null);

        const v = validate(identifier, password);
        if (v.id || v.pass) {
            setIdError(v.id);
            setPassError(v.pass);
            return;
        }

        setLoading(true);
        try {
            const email = await resolveEmailFromIdentifier(identifier.trim());

            // Prechequeo de métodos de acceso
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length === 0) {
                setIdError("No existe una cuenta con ese correo/usuario.");
                return;
            }
            if (!methods.includes("password")) {
                setFormMsg("Tu cuenta está registrada con Google. Entra con Google o crea una contraseña desde “¿Olvidaste?”.");
                return;
            }

            // Intento de login
            await signInEmail(email, password);
            await setCuentaEstado("online");
            onSuccess?.();
        } catch (err: any) {
            const code = extractAuthCode(err);

            // Afinar casos de credencial inválida
            if (code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
                const handled = await refineInvalidCredential();
                if (handled) return;
            }

            const m = mapAuthCodeToMessage(code);
            if (m.target === "id") setIdError(m.msg);
            else if (m.target === "pass") setPassError(m.msg);
            else setFormMsg(m.msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIdError(null);
        setPassError(null);
        setFormMsg(null);
        setLoading(true);
        try {
            await signInWithGoogle();
            await setCuentaEstado("online");
            onSuccess?.();
        } catch (err: any) {
            const code = extractAuthCode(err);
            const m = mapAuthCodeToMessage(code);
            setFormMsg(m.msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async () => {
        setFormMsg(null);
        const id = identifier.trim();
        if (!id) {
            setIdError("Ingresa tu correo para recuperar la contraseña.");
            return;
        }
        try {
            const email = await resolveEmailFromIdentifier(id);
            await resetPassword(email);
            setFormMsg("Te enviamos un correo para recuperar tu contraseña.");
        } catch (err: any) {
            const code = extractAuthCode(err);
            const m = mapAuthCodeToMessage(code);
            if (m.target === "id") setIdError(m.msg);
            else setFormMsg(m.msg);
        }
    };

    const idErrId = "login-id-error";
    const passErrId = "login-pass-error";
    const formMsgId = "login-form-msg";

    return (
        <form onSubmit={handleSubmit} noValidate aria-describedby={formMsg ? formMsgId : undefined}>
            <label className="field">
                <span className="field-label">Correo / Usuario / Celular</span>
                <div className="field-inner" data-invalid={!!idError || undefined}>
                    <input
                        className="field-input"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        autoComplete="username"
                        inputMode="email"
                        aria-invalid={!!idError}
                        aria-describedby={idError ? idErrId : undefined}
                    />
                </div>
                {idError && (
                    <span id={idErrId} className="field-error" role="alert" aria-live="polite">
                        {idError}
                    </span>
                )}
            </label>

            <label className="field">
                <span className="field-label">Contraseña</span>
                <div className="field-inner" data-invalid={!!passError || undefined} style={{ alignItems: "center" }}>
                    <input
                        className="field-input"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="current-password"
                        aria-invalid={!!passError}
                        aria-describedby={passError ? passErrId : undefined}
                    />
                    <button
                        type="button"
                        className="btn-reset"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                        title={showPass ? "Ocultar" : "Mostrar"}
                        style={{ opacity: 0.9 }}
                    >
                        <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} />
                    </button>
                </div>
                {passError && (
                    <span id={passErrId} className="field-error" role="alert" aria-live="polite">
                        {passError}
                    </span>
                )}
            </label>

            <div className="row">
                <label className="remember">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                    />
                    Recordar sesión
                </label>
                <button type="button" className="link" onClick={handleForgot}>
                    ¿Olvidaste?
                </button>
            </div>

            <div id={formMsgId} className="form-msg" aria-live="polite">
                {formMsg}
            </div>

            <button type="submit" className="primary" disabled={disableSubmit}>
                {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <div className="divider" />

            <button type="button" className="google" onClick={handleGoogle} disabled={loading}>
                Google
            </button>
        </form>
    );
}
