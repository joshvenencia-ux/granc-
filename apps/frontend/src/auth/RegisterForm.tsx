import React, { useMemo, useState } from "react";
import { registerEmail, signInWithGoogle } from "@/lib/firebase";
import FechaSelect from "../components/FechaSelect";

type Props = { onSuccess?: () => void };

type LocalForm = {
    email: string;
    password: string;
    confirm: string;
    name: string;
    apellido: string;
    usuario: string;
    agree: boolean;
    cedula: string;
    celular: string;
    direccion: string;
    fechaNacimiento: string; 
    genero: string;          
};

const initialForm: LocalForm = {
    email: "",
    password: "",
    confirm: "",
    name: "",
    apellido: "",
    usuario: "",
    agree: false,
    cedula: "",
    celular: "",
    direccion: "",
    fechaNacimiento: "",
    genero: "",
};

const getErrorMessage = (err: unknown): string | null =>
    err instanceof Error ? err.message : typeof err === "string" ? err : null;


function normalizeColPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("57")) {
        const rest = digits.slice(2);
        if (rest.startsWith("3")) {
            return `+57 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`.trim();
        }
        return "+57 ";
    }
    
    if (digits.startsWith("3")) {
        const rest = digits.slice(0, 10); 
        return `+57 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`.trim();
    }
    
    return "+57 ";
}

export default function Register({ onSuccess }: Props) {
    const [form, setForm] = useState<LocalForm>(initialForm);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value, type, checked } = e.target as HTMLInputElement;

        let nextVal = value;
        //ormaliza celular a formato colombiano
        if (name === "celular") {
            nextVal = normalizeColPhone(value);
        }

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : nextVal,
        }));
    }

    
    const passRule = /^(?=.*[A-Z])(?=.*\d).{8,}$/; 
    const usuarioRule = /^[a-zA-Z0-9_.-]{3,20}$/;

    // fuerza de contraseña 
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
    const usuarioOk = form.usuario === "" || usuarioRule.test(form.usuario.trim()); // opcional
    const cedulaOk = /^[0-9]{8,}$/.test(form.cedula.trim()); 
    const celularOk = /^\+573\d{9}$/.test(form.celular.replace(/\s+/g, ""));
    const direccionOk = form.direccion.trim().length > 5;
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
        direccionOk &&
        fechaOk &&
        generoOk &&
        form.agree;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErr(null);
        if (!canSubmit) return;

        setLoading(true);
        try {
            await registerEmail(form.email.trim(), form.password, form.name.trim(), {
                usuario: form.usuario.trim() || undefined,
                apellido: form.apellido.trim(),
                cedula: form.cedula.trim(),
                celular: form.celular.replace(/\s+/g, ""), 
                direccion: form.direccion.trim(),
                fechaNacimiento: form.fechaNacimiento,
                genero: form.genero,
            });
            onSuccess?.();
        } catch (error) {
            setErr(mapAuthError(getErrorMessage(error) || undefined) || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogle() {
        setErr(null);
        setLoading(true);
        try {
            await signInWithGoogle();
            onSuccess?.();
        } catch (error) {
            setErr(mapAuthError(getErrorMessage(error) || undefined) || "Error con Google");
        } finally {
            setLoading(false);
        }
    }

    
    const meterLabel = ["Muy débil", "Débil", "Media", "Buena", "Fuerte"][pwdScore] ?? "Muy débil";

    return (
        <form onSubmit={handleSubmit} className="d-grid gap-3" noValidate>
            <div className="row g-3">
                {/* Nombre / Apellido */}
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Nombre</label>
                    <input
                        type="text"
                        className={`form-control ${nameOk ? "" : "is-invalid"}`}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Tu nombre"
                        autoComplete="given-name"
                        required
                    />
                </div>
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Apellido</label>
                    <input
                        type="text"
                        className={`form-control ${apellidoOk ? "" : "is-invalid"}`}
                        name="apellido"
                        value={form.apellido}
                        onChange={handleChange}
                        placeholder="Tu apellido"
                        autoComplete="family-name"
                        required
                    />
                </div>

                {/* Usuario (opcional) */}
                <div className="col-12">
                    <label className="form-label mb-1">Usuario (opcional)</label>
                    <input
                        type="text"
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

                {/* Cédula / Fecha */}
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Cédula</label>
                    <input
                        type="text"
                        className={`form-control ${cedulaOk ? "" : "is-invalid"}`}
                        name="cedula"
                        value={form.cedula}
                        onChange={handleChange}
                        placeholder="Solo números (mín. 8 dígitos)"
                        inputMode="numeric"
                        pattern="[0-9]{8,}"
                        autoComplete="off"
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

                {/* Celular / Género */}
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Celular (Colombia)</label>
                    <input
                        type="tel"
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
                            Debe iniciar con <strong>+57</strong> y un móvil que empiece por <strong>3</strong> (10 dígitos).
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

                {/* Dirección */}
                <div className="col-12">
                    <label className="form-label mb-1">Dirección</label>
                    <input
                        type="text"
                        className={`form-control ${direccionOk ? "" : "is-invalid"}`}
                        name="direccion"
                        value={form.direccion}
                        onChange={handleChange}
                        placeholder="Calle, número, complemento"
                        autoComplete="street-address"
                        required
                    />
                </div>

                {/* Email / Password / Confirm */}
                <div className="col-12 col-md-6">
                    <label className="form-label mb-1">Correo electrónico</label>
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

                <div className="col-12 col-md-3">
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

                    {/* Medidor estilizado */}
                    <div className="pwd-meter mt-2" aria-hidden="true">
                        <div
                            className={`pwd-meter-bar s${pwdScore}`}
                            style={{ width: `${(pwdScore / 4) * 100}%` }}
                        />
                    </div>
                    <small
                        id="pwdHelp"
                        className={`d-block mt-1 ${passRule.test(form.password) ? "text-success" : "text-muted"}`}
                    >
                        Al menos 8 caracteres, 1 mayúscula y 1 número. <em>{meterLabel}</em>
                    </small>
                </div>

                <div className="col-12 col-md-3">
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

                {/* Aceptación */}
                <div className="col-12">
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="agree"
                            name="agree"
                            checked={form.agree}
                            onChange={handleChange}
                            required
                        />
                        <label className="form-check-label" htmlFor="agree">
                            Acepto términos y condiciones.
                        </label>
                    </div>
                </div>

                {/* Botones */}
                <div className="col-12 d-grid gap-2 gap-md-3 d-md-flex">
                    <button
                        type="submit"
                        className="btn btn-primary flex-fill"
                        disabled={loading || !canSubmit}
                    >
                        {loading ? "Registrando..." : "Crear cuenta"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-light flex-fill"
                        onClick={handleGoogle}
                        disabled={loading}
                    >
                        Continuar con Google
                    </button>
                </div>

                {/* Errores generales */}
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

function mapAuthError(message?: string): string | null {
    if (!message) return null;
    const m = message.toLowerCase();
    if (m.includes("email-already-in-use")) return "Ese correo ya está registrado.";
    if (m.includes("invalid-email")) return "El correo no es válido.";
    if (m.includes("weak-password")) return "La contraseña es demasiado débil (mínimo 8, mayúscula y número).";
    if (m.includes("network-request-failed")) return "Problema de red. Intenta de nuevo.";
    return null;
}
