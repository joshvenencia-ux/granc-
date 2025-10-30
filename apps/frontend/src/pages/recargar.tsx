import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

type Player = {
    uid: string;
    email?: string;
    nombre?: string;
    usuario?: string;
    rol?: string;
    saldo?: number;
};

type BackendUserIdResp = { id: number };

const ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_BASE = `${ORIGIN}/api`;
const ID_BY_UID_URL = (uid: string) =>
    `${API_BASE}/usuarios/id-by-uid/${encodeURIComponent(uid)}`;
const ID_BY_EMAIL_URL = (email: string) =>
    `${API_BASE}/usuarios/id-by-email/${encodeURIComponent(email)}`;

export default function Recargar() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Player | null>(null);
    const [monto, setMonto] = useState<number>(0);
    const [modo, setModo] = useState<"recarga" | "descuento">("recarga");
    const [loading, setLoading] = useState(false);

    const [notificacion, setNotificacion] = useState<{
        tipo: "success" | "danger" | "warning" | "info";
        mensaje: string;
    } | null>(null);

    const [confirmacionDescuento, setConfirmacionDescuento] = useState<null | {
        mensaje: string;
        monto: number;
        usuarioId: number;
        jugador: Player;
    }>(null);

    // ===== Helpers UI =====
    const formatCOP = (v: number | undefined) =>
        (v ?? 0).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        });

    // ===== Data =====
    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(db, "usuarios"));
                const data: Player[] = snap.docs.map(d => {
                    const v = d.data() as any;
                    return {
                        uid: d.id,
                        email: v.email ?? "",
                        nombre: v.nombre ?? "",
                        usuario: v.usuario ?? "",
                        rol: v.rol ?? "user",
                        saldo: typeof v.saldo === "number" ? v.saldo : 0
                    };
                });
                setPlayers(
                    data.filter(p => p.rol === "jugador" || p.rol === "user")
                );
            } catch (e) {
                console.error("🔥 Error al cargar usuarios:", e);
                setPlayers([]);
                setNotificacion({
                    tipo: "danger",
                    mensaje: "No se pudo cargar la lista de usuarios."
                });
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return players;
        return players.filter(
            p =>
                (p.nombre || "").toLowerCase().includes(q) ||
                (p.usuario || "").toLowerCase().includes(q) ||
                (p.uid || "").toLowerCase().includes(q) ||
                (p.email || "").toLowerCase().includes(q)
        );
    }, [players, search]);

    // ===== Backend calls =====
    async function resolveBackendUserId(p: Player): Promise<number> {
        const u = auth.currentUser;
        if (!u) throw new Error("No hay sesión de admin");
        const token = await u.getIdToken(true);

        if (p.uid) {
            const r1 = await fetch(ID_BY_UID_URL(p.uid), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r1.ok) {
                const j: BackendUserIdResp = await r1.json();
                if (typeof j?.id === "number") return j.id;
            }
        }

        if (p.email) {
            const r2 = await fetch(ID_BY_EMAIL_URL(p.email), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r2.ok) {
                const j: BackendUserIdResp = await r2.json();
                if (typeof j?.id === "number") return j.id;
            }
        }

        throw new Error("No se pudo resolver usuarioId del backend");
    }

    async function adminAdjust(
        usuarioId: number,
        delta: number,
        motivo: string
    ) {
        const u = auth.currentUser;
        if (!u) throw new Error("No hay sesión de admin");
        const token = await u.getIdToken(true);

        const res = await fetch(`${API_BASE}/wallet/admin/adjust`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "idempotency-key": cryptoRandom()
            },
            body: JSON.stringify({ usuarioId, delta, motivo })
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(txt || "Error al ajustar saldo");
        }

        return res.json().catch(() => ({}));
    }

    function cryptoRandom(): string {
        try {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            return Array.from(arr)
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        } catch {
            return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
        }
    }

    async function procesarAjuste(
        usuarioId: number,
        delta: number,
        jugador: Player,
        motivo: string
    ) {
        await adminAdjust(usuarioId, delta, motivo);

        const nuevoSaldo = (jugador.saldo ?? 0) + delta;

        await setDoc(
            doc(db, "usuarios", jugador.uid),
            { saldo: nuevoSaldo, updatedAt: serverTimestamp() },
            { merge: true }
        );

        setPlayers(old =>
            old.map(p => (p.uid === jugador.uid ? { ...p, saldo: nuevoSaldo } : p))
        );
        setMonto(0);
        setNotificacion({
            tipo: "success",
            mensaje:
                motivo === "RECARGA_ADMIN"
                    ? `Se recargaron ${formatCOP(delta)} correctamente.`
                    : `Se descontaron ${formatCOP(Math.abs(delta))} correctamente.`
        });
    }

    // ===== UI handlers =====
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selected) {
            setNotificacion({ tipo: "danger", mensaje: "Selecciona un jugador" });
            return;
        }

        const absMonto = Math.abs(monto);
        if (
            !Number.isFinite(absMonto) ||
            absMonto <= 0 ||
            Math.trunc(absMonto) !== absMonto
        ) {
            setNotificacion({
                tipo: "danger",
                mensaje: "Ingresa un monto válido (entero positivo)"
            });
            return;
        }

        setLoading(true);
        try {
            const usuarioId = await resolveBackendUserId(selected);

            if (modo === "descuento") {
                setConfirmacionDescuento({
                    mensaje: `¿Confirmas descontar ${formatCOP(
                        absMonto
                    )} al jugador ${selected.nombre || selected.usuario || selected.uid}?`,
                    monto: -absMonto,
                    usuarioId,
                    jugador: selected
                });
                setLoading(false);
                return;
            }

            await procesarAjuste(usuarioId, absMonto, selected, "RECARGA_ADMIN");
        } catch (e: any) {
            console.error("❌ Error:", e);
            setNotificacion({
                tipo: "danger",
                mensaje: e?.message || "Error inesperado"
            });
        } finally {
            setLoading(false);
        }
    }

    // ===== Render =====
    return (
        <div className="page-container py-3 admin-adjust">
            <header className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 m-0">Ajustar saldo</h1>
                {selected && (
                    <span className="badge bg-secondary-subtle text-white fw-normal">
                        Seleccionado:{" "}
                        <strong className="ms-1">
                            {selected.nombre || selected.usuario || selected.uid}
                        </strong>
                    </span>
                )}
            </header>

            {/* Notificaciones */}
            {notificacion && (
                <div
                    className={`alert alert-${notificacion.tipo} alert-dismissible fade show`}
                    role="alert"
                >
                    {notificacion.mensaje}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setNotificacion(null)}
                    ></button>
                </div>
            )}

            {confirmacionDescuento && (
                <div
                    className="alert alert-warning alert-dismissible fade show"
                    role="alert"
                >
                    <div className="mb-2">{confirmacionDescuento.mensaje}</div>
                    <div className="d-flex justify-content-end gap-2">
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                                setConfirmacionDescuento(null);
                                setNotificacion({
                                    tipo: "info",
                                    mensaje: "Descuento cancelado."
                                });
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-sm btn-warning"
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    await procesarAjuste(
                                        confirmacionDescuento.usuarioId,
                                        confirmacionDescuento.monto,
                                        confirmacionDescuento.jugador,
                                        "DESCUENTO_ADMIN"
                                    );
                                } catch (e: any) {
                                    setNotificacion({
                                        tipo: "danger",
                                        mensaje:
                                            e?.message || "Error al descontar saldo."
                                    });
                                } finally {
                                    setConfirmacionDescuento(null);
                                    setLoading(false);
                                }
                            }}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            <div className="row g-3">
                {/* Col izquierda: lista de jugadores */}
                <div className="col-12 col-lg-6">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-transparent border-0 pb-0">
                            <label htmlFor="buscador" className="form-label fw-semibold">
                                Buscar jugador
                            </label>
                            <div className="input-group">
                                <span className="input-group-text bg-dark text-white border-dark-subtle">
                                    <i className="bi bi-search" />
                                </span>
                                <input
                                    id="buscador"
                                    type="text"
                                    className="form-control"
                                    placeholder="Nombre, usuario, email o UID…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-body pt-3">
                            <ul className="list-group list-scroll">
                                {filtered.map(p => {
                                    const active = selected?.uid === p.uid;
                                    return (
                                        <li
                                            key={p.uid}
                                            className={`list-group-item d-flex justify-content-between align-items-center selectable ${active ? "active" : ""
                                                }`}
                                            onClick={() => setSelected(p)}
                                            title={p.email || ""}
                                            role="button"
                                            aria-current={active ? "true" : undefined}
                                        >
                                            <div className="d-flex flex-column">
                                                <span className="fw-semibold">
                                                    {p.nombre || p.usuario || p.uid}
                                                </span>
                                                <span className="small text-muted">{p.email}</span>
                                            </div>
                                            <span
                                                className={`badge saldo ${active ? "saldo--active" : ""
                                                    }`}
                                            >
                                                {formatCOP(p.saldo)}
                                            </span>
                                        </li>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <li className="list-group-item text-muted">No encontrado</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Col derecha: formulario */}
                <div className="col-12 col-lg-6">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-transparent border-0">
                            <h2 className="h6 m-0">Operación</h2>
                        </div>

                        <div className="card-body">
                            <form onSubmit={onSubmit} className="form-grid">
                                <div className="mb-3">
                                    <label htmlFor="monto" className="form-label fw-semibold">
                                        Monto (pesos)
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-dark text-white border-dark-subtle">
                                            <i className="bi bi-cash-coin" />
                                        </span>
                                        <input
                                            id="monto"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            type="number"
                                            className="form-control"
                                            value={monto}
                                            onChange={e => setMonto(Number(e.target.value))}
                                            min={1}
                                            step={1}
                                            placeholder="Ej: 50000"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Modo</label>
                                    <select
                                        className="form-select"
                                        value={modo}
                                        onChange={e => setModo(e.target.value as any)}
                                    >
                                        <option value="recarga">Recargar</option>
                                        <option value="descuento">Descontar</option>
                                    </select>
                                </div>

                                {selected && (
                                    <div className="mb-3 small text-muted">
                                        Jugador seleccionado:&nbsp;
                                        <strong className="text-white">
                                            {selected.nombre || selected.usuario || selected.uid}
                                        </strong>
                                        <span className="ms-2">
                                            | Saldo actual:{" "}
                                            <strong>{formatCOP(selected.saldo)}</strong>
                                        </span>
                                    </div>
                                )}

                                <div className="d-flex gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || !selected || !monto}
                                    >
                                        {loading
                                            ? modo === "recarga"
                                                ? "Recargando…"
                                                : "Descontando…"
                                            : modo === "recarga"
                                                ? "Recargar"
                                                : "Descontar"}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setSelected(null);
                                            setMonto(0);
                                            setModo("recarga");
                                        }}
                                        disabled={loading}
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="card-footer bg-transparent border-0 text-end small text-muted">
                            Acciones de administrador. Se registra fecha y usuario.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
