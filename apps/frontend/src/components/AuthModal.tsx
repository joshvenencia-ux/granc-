import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import type { ConfirmationResult } from "firebase/auth";

import {
    setAuthPersistence,
    signInEmail,
    signInWithGoogle,
    resetPassword,
    registerEmail,
    resolveEmailFromIdentifier,
    sendPhoneCode,
    confirmPhoneCode,
    ensureRecaptcha,
    setCuentaEstado,
} from "@/lib/firebase";
import FechaSelect from "@/components/FechaSelect";

export type AuthMode = "login" | "register";

type Props = {
    open: boolean;
    mode: AuthMode;
    onClose: () => void;
    onSuccess?: () => void;
};

const getErr = (e: unknown) =>
    e instanceof Error ? e.message : typeof e === "string" ? e : "Error";

function normalizeColPhone(raw: string): { pretty: string; e164: string; valid: boolean } {
    const digits = raw.replace(/\D/g, "");
    let rest = "";
    if (digits.startsWith("57")) {
        rest = digits.slice(2);
    } else if (digits.startsWith("3")) {
        rest = digits;
    }
    // Móvil CO válido: 3 + 9 dígitos => 10 dígitos
    const isValid = /^3\d{9}$/.test(rest);
    const pretty = rest
        ? `+57 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`.trim()
        : "+57 ";
    const e164 = isValid ? `+57${rest}` : "+57";
    return { pretty, e164, valid: isValid };
}

export default function AuthModal({ open, mode, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<AuthMode>(mode);
    useEffect(() => setTab(mode), [mode]);

    // Cerrar con ESC
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const close = () => onClose();
    const stop = (e: MouseEvent<HTMLDivElement>) => e.stopPropagation();

    return (
        <div className="authOverlay" onClick={close}>
            <div
                className="authShell"
                onClick={stop}
                role="dialog"
                aria-modal={true}
                aria-labelledby="auth-title"
            >
                <aside className="authAside" aria-label="Seleccionar pestaña de autenticación">
                    <button
                        type="button"
                        className={`authItem ${tab === "register" ? "active" : ""}`}
                        onClick={() => setTab("register")}
                    >
                        <span className="auth-icon">👤</span>
                        <span className="auth-label">Registro</span>
                        <span className="auth-chevron">›</span>
                    </button>
                    <button
                        type="button"
                        className={`authItem ${tab === "login" ? "active" : ""}`}
                        onClick={() => setTab("login")}
                    >
                        <span className="auth-icon">➡️</span>
                        <span className="auth-label">Ingresar</span>
                        <span className="auth-chevron">›</span>
                    </button>
                </aside>

                <section className="authContent">
                    <button type="button" className="authClose" onClick={close} aria-label="Cerrar">
                        ✕
                    </button>

                    <h2 id="auth-title" className="section-title">
                        {tab === "login" ? "Inicio de sesión" : "Crear cuenta"}
                    </h2>

                    {tab === "login" ? (
                        <LoginForm onSuccess={onSuccess ?? onClose} />
                    ) : (
                        <RegisterForm onSuccess={onSuccess ?? onClose} />
                    )}
                </section>
            </div>

            {/* Contenedor de reCAPTCHA (invisible) para login por SMS */}
            <div id="recaptcha-container" />
        </div>
    );
}

/* ===================== LOGIN ===================== */

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    type Method = "userOrEmail" | "phone";
    const [method, setMethod] = useState<Method>("userOrEmail");

    // user/email login
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);

    // phone login
    const [phonePretty, setPhonePretty] = useState("+57 ");
    const [code, setCode] = useState("");
    const confirmRef = useRef<ConfirmationResult | null>(null);
    const [smsStep, setSmsStep] = useState<"idle" | "sent">("idle");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (method === "phone") {
            try {
                ensureRecaptcha("recaptcha-container"); 
            } catch (e) {
                setErr(getErr(e));
            }
        }
    }, [method]);

    const loginWithUserOrEmail = async () => {
        setErr(null);
        setLoading(true);
        try {
            await setAuthPersistence(remember);
            const email = await resolveEmailFromIdentifier(identifier.trim());
            await signInEmail(email, password);
            await setCuentaEstado("online");
            onSuccess();
        } catch (e: any) {
            setErr(mapAuthError(e?.message) || "Correo/usuario y/o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    const sendCode = async () => {
        setErr(null);
        setLoading(true);
        try {
            const norm = normalizeColPhone(phonePretty);
            if (!norm.valid) throw new Error("Número inválido. Debe ser +57 3xxxxxxxxx.");
            confirmRef.current = await sendPhoneCode(norm.e164);
            setSmsStep("sent");
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    const confirmCode = async () => {
        setErr(null);
        setLoading(true);
        try {
            if (!confirmRef.current) throw new Error("Primero solicita el código por SMS.");
            await confirmPhoneCode(confirmRef.current, code.trim());
            await setCuentaEstado("online");
            onSuccess();
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    const doGoogle = async () => {
        setErr(null);
        setLoading(true);
        try {
            await setAuthPersistence(remember);
            await signInWithGoogle();
            await setCuentaEstado("online");
            onSuccess();
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    };

    const forgot = async () => {
        try {
            const email = await resolveEmailFromIdentifier(identifier.trim());
            await resetPassword(email);
            setErr("Correo de recuperación enviado.");
        } catch {
            setErr("Para recuperar escribe tu correo o usuario asociado.");
        }
    };

    const phoneValid = useMemo(() => normalizeColPhone(phonePretty).valid, [phonePretty]);

    return (
        <div>
            <div className="btn-group mb-3" role="group" aria-label="Método de acceso">
                <button
                    type="button"
                    className={`btn btn-sm ${method === "userOrEmail" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMethod("userOrEmail")}
                >
                    Usuario / Correo
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${method === "phone" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setMethod("phone")}
                >
                    Celular (SMS)
                </button>
            </div>

            {method === "userOrEmail" ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void loginWithUserOrEmail();
                    }}
                >
                    <label className="form-label">Usuario o correo</label>
                    <input
                        className="form-control mb-2"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        autoFocus
                    />

                    <label className="form-label">Contraseña</label>
                    <input
                        className="form-control mb-2"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-check">
                            <input
                                className="form-check-input me-2"
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Recordar sesión
                        </label>
                        <button type="button" className="btn btn-link p-0" onClick={forgot}>
                            ¿Olvidaste?
                        </button>
                    </div>

                    {err && <div className="text-danger small mb-2">{err}</div>}

                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? "Ingresando…" : "Ingresar"}
                    </button>

                    <div className="text-center text-muted my-2 small">— o —</div>

                    <button type="button" className="btn btn-light w-100" onClick={doGoogle} disabled={loading}>
                        Continuar con Google
                    </button>
                </form>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        smsStep === "idle" ? void sendCode() : void confirmCode();
                    }}
                >
                    <label className="form-label">Celular (Colombia)</label>
                    <input
                        className={`form-control mb-2 ${phoneValid ? "" : "is-invalid"}`}
                        placeholder="+57 3xx xxx xxxx"
                        value={phonePretty}
                        onChange={(e) => setPhonePretty(normalizeColPhone(e.target.value).pretty)}
                        disabled={smsStep === "sent"}
                        required
                    />
                    {!phoneValid && (
                        <small className="text-danger">
                            Debe iniciar con +57 y 10 dígitos que empiecen por 3.
                        </small>
                    )}

                    {smsStep === "sent" && (
                        <>
                            <label className="form-label">Código SMS</label>
                            <input
                                className="form-control mb-2"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                autoFocus
                            />
                        </>
                    )}

                    {err && <div className="text-danger small mb-2">{err}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading || (smsStep === "idle" && !phoneValid)}
                    >
                        {loading ? "Procesando…" : smsStep === "idle" ? "Enviar código" : "Confirmar código"}
                    </button>
                </form>
            )}
        </div>
    );
}

/* ===================== REGISTER ===================== */

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
    const [form, setForm] = useState({
        name: "",
        apellido: "",
        usuario: "",
        cedula: "",
        celular: "+57 ",
        fechaNacimiento: "",
        genero: "",
        email: "",
        password: "",
        confirm: "",
        agree: false,
    });

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const passRule = /^(?=.*[A-Z])(?=.*\d).{8,}$/; 
    const usuarioRule = /^[a-zA-Z0-9_.-]{3,20}$/;

    const pwdScore = useMemo(() => {
        let s = 0;
        if (form.password.length >= 8) s++;
        if (/[A-Z]/.test(form.password)) s++;
        if (/[a-z]/.test(form.password)) s++;
        if (/\d|[!@#$%^&*]/.test(form.password)) s++;
        return s;
    }, [form.password]);

    const emailOk = /\S+@\S+\.\S+/.test(form.email);
    const nameOk = form.name.trim().length >= 2;
    const apellidoOk = form.apellido.trim().length >= 2;
    const passOk = passRule.test(form.password) && form.password === form.confirm;
    const usuarioOk = form.usuario === "" || usuarioRule.test(form.usuario.trim()); 
    const cedulaOk = /^[0-9]{8,}$/.test(form.cedula.trim()); 
    const phoneNorm = useMemo(() => normalizeColPhone(form.celular), [form.celular]);
    const celularOk = phoneNorm.valid;
    const fechaOk = !!form.fechaNacimiento;
    const generoOk = !!form.genero;

    const canSubmit =
        emailOk &&
        nameOk &&
        apellidoOk &&
        passOk &&
        usuarioOk &&
        cedulaOk &&
        celularOk &&
        fechaOk &&
        generoOk &&
        form.agree;

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        let nextVal = value;
        if (name === "celular") {
            nextVal = normalizeColPhone(value).pretty;
        }
        setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : nextVal }));
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!canSubmit) return;

        setLoading(true);
        try {
            await registerEmail(form.email.trim(), form.password, form.name.trim(), {
                usuario: form.usuario.trim() || undefined,
                apellido: form.apellido.trim(),
                cedula: form.cedula.trim(),
                celular: phoneNorm.e164, 
                fechaNacimiento: form.fechaNacimiento,
                genero: form.genero,
            });
            await setCuentaEstado("online");
            onSuccess();
        } catch (e: any) {
            setErr(mapAuthError(e?.message) || "No se pudo registrar.");
        } finally {
            setLoading(false);
        }
    }

    async function doGoogle() {
        setErr(null);
        setLoading(true);
        try {
            await signInWithGoogle();
            await setCuentaEstado("online");
            onSuccess();
        } catch (e) {
            setErr(getErr(e));
        } finally {
            setLoading(false);
        }
    }

    const meterLabel = ["Muy débil", "Débil", "Media", "Buena", "Fuerte"][pwdScore] ?? "Muy débil";

    return (
        <form onSubmit={submit}>
            <div className="row g-3">
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Nombre</label>
                    <input
                        className={`form-control ${nameOk ? "" : "is-invalid"}`}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Apellido</label>
                    <input
                        className={`form-control ${apellidoOk ? "" : "is-invalid"}`}
                        name="apellido"
                        value={form.apellido}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="col-12">
                    <label className="form-label mb-1">Usuario (opcional)</label>
                    <input
                        className={`form-control ${usuarioOk ? "" : "is-invalid"}`}
                        name="usuario"
                        value={form.usuario}
                        onChange={handleChange}
                        placeholder="tu_usuario (3–20, letras/números . _ -)"
                        autoComplete="username"
                        pattern="[A-Za-z0-9_.-]{3,20}"
                        title="Usa 3–20 caracteres: letras, números, punto, guion y guion bajo."
                    />
                    {!usuarioOk && (
                        <small className="text-danger">
                            Debe tener 3–20 caracteres (letras, números, ., _, -).
                        </small>
                    )}
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Cédula</label>
                    <input
                        className={`form-control ${cedulaOk ? "" : "is-invalid"}`}
                        name="cedula"
                        value={form.cedula}
                        onChange={handleChange}
                        placeholder="Solo números (mín. 8 dígitos)"
                        inputMode="numeric"
                        pattern="[0-9]{8,}"
                        required
                    />
                    {!cedulaOk && <small className="text-danger">Debe tener al menos 8 dígitos.</small>}
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Fecha de expedición / nacimiento</label>
                    <FechaSelect
                        value={form.fechaNacimiento}
                        onChange={(val) => setForm((p) => ({ ...p, fechaNacimiento: val }))}
                    />
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Celular (Colombia)</label>
                    <input
                        className={`form-control ${celularOk ? "" : "is-invalid"}`}
                        name="celular"
                        value={form.celular}
                        onChange={handleChange}
                        placeholder="+57 3xx xxx xxxx"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                    />
                    {!celularOk && (
                        <small className="text-danger">
                            Debe iniciar con +57 y un móvil que empiece por 3 (10 dígitos).
                        </small>
                    )}
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Género</label>
                    <select
                        className={`form-select ${generoOk ? "" : "is-invalid"}`}
                        name="genero"
                        value={form.genero}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Selecciona…</option>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                        <option value="X">Otro / Prefiero no decir</option>
                    </select>
                </div>

                <div className="col-12">
                    <label className="form-label mb-1">Correo</label>
                    <input
                        type="email"
                        className={`form-control ${emailOk ? "" : "is-invalid"}`}
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="tucorreo@dominio.com"
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1 d-flex align-items-center justify-content-between">
                        <span>Contraseña</span>
                        <small className="text-muted d-none d-md-inline">seguridad</small>
                    </label>
                    <input
                        type="password"
                        className={`form-control ${passRule.test(form.password) ? "" : "is-invalid"}`}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Mín. 8, 1 mayúscula y 1 número"
                        autoComplete="new-password"
                        required
                        aria-describedby="pwdHelp"
                    />

                    {/* Medidor estilizado (usa CSS global .pwd-meter) */}
                    <div className="pwd-meter mt-2" aria-hidden="true">
                        <div className={`pwd-meter-bar s${pwdScore}`} style={{ width: `${(pwdScore / 4) * 100}%` }} />
                    </div>
                    <small
                        id="pwdHelp"
                        className={`d-block mt-1 ${passRule.test(form.password) ? "text-success" : "text-muted"}`}
                    >
                        Al menos 8 caracteres, 1 mayúscula y 1 número. <em>{meterLabel}</em>
                    </small>
                </div>

                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Confirmar</label>
                    <input
                        type="password"
                        className={`form-control ${form.confirm && form.confirm === form.password ? "" : "is-invalid"}`}
                        name="confirm"
                        value={form.confirm}
                        onChange={handleChange}
                        placeholder="Repite la contraseña"
                        autoComplete="new-password"
                        required
                    />
                    {form.confirm && form.confirm !== form.password && (
                        <small className="text-danger">Las contraseñas no coinciden.</small>
                    )}
                </div>

                <div className="col-12">
                    <label className="form-check">
                        <input
                            className="form-check-input me-2"
                            type="checkbox"
                            name="agree"
                            checked={form.agree}
                            onChange={handleChange}
                            required
                        />
                        Acepto términos y condiciones
                    </label>
                </div>

                <div className="col-12 d-grid gap-2 gap-md-3 d-md-flex">
                    <button
                        type="submit"
                        className="btn btn-primary flex-fill"
                        disabled={loading || !canSubmit}
                    >
                        {loading ? "Registrando…" : "Crear cuenta"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-light flex-fill"
                        onClick={doGoogle}
                        disabled={loading}
                    >
                        Continuar con Google
                    </button>
                </div>

                {err && (
                    <div className="col-12">
                        <div className="alert alert-danger py-2 mb-0" role="alert">
                            {err}
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
}

/* ===================== Helpers ===================== */

function mapAuthError(message?: string | null): string | null {
    if (!message) return null;
    const m = message.toLowerCase();
    if (m.includes("invalid-credential"))
        return "Credenciales inválidas: correo/usuario o contraseña incorrectos.";
    if (m.includes("email-already-in-use")) return "Ese correo ya está registrado.";
    if (m.includes("invalid-email")) return "El correo no es válido.";
    if (m.includes("wrong-password")) return "Contraseña incorrecta.";
    if (m.includes("user-not-found")) return "No existe una cuenta con ese usuario/correo.";
    if (m.includes("too-many-requests")) return "Demasiados intentos. Intenta más tarde.";
    if (m.includes("network-request-failed")) return "Problema de red. Intenta de nuevo.";
    return null;
}
