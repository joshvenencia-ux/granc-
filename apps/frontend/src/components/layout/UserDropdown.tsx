import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/context";

type Movimiento = {
    id: number;
    tipo: string;
    montoCOP: number;
    createdAt: string;
};

type UserData = {
    saldo: number;
    saldoReal: number;
    promoIVA: number;
    bonosPendientes: number;
    sueldo?: number;
    movimientos?: Movimiento[];
};

type Props = {
    displayName: string;
    userData?: UserData;
    onLogout: () => void | Promise<void>;
    isAdmin?: boolean;
    onSetSueldo?: (monto: number) => void | Promise<void>;
    onRecargarSaldo?: (monto: number) => void | Promise<void>;
};

// Base del Render.//
const ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const API_BASE = ORIGIN ? `${ORIGIN}/api` : "/api";

export default function UserDropdown({
    displayName,
    userData,
    onLogout,
    isAdmin = false,
}: Props) {
    const { user, userDoc } = useAuth();

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [finalData, setFinalData] = useState<UserData>(() => ({
        saldo: userData?.saldo ?? (userDoc?.saldo ?? 0),
        saldoReal: userData?.saldoReal ?? (userDoc?.saldoReal ?? 0),
        promoIVA: userData?.promoIVA ?? (userDoc?.promoIVA ?? 0),
        bonosPendientes: userData?.bonosPendientes ?? (userDoc?.bonosPendientes ?? 0),
        sueldo: userData?.sueldo ?? userDoc?.sueldo,
        movimientos: userData?.movimientos ?? [],
    }));

    //Datos Prisma
    useEffect(() => {
        let alive = true;

        (async () => {
            if (!user) return;

            const token = await user.getIdToken(true);
            const url = `${API_BASE}/ledger/resumen`;

            const waits = [200, 500, 1000];
            let lastErr: any = null;

            for (let i = 0; i < waits.length; i++) {
                try {
                    const res = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                        credentials: "include",
                    });

                    const ctype = res.headers.get("content-type") || "";
                    const text = await res.text();

                    if (!res.ok) {
                        // 404 si el usuario aún no está sincronizado
                        if (res.status === 404) throw new Error("NOT_READY");
                        throw new Error(`HTTP ${res.status} – ${text.slice(0, 200)}`);
                    }

                    if (!ctype.includes("application/json")) {
                        throw new Error(`Respuesta no-JSON: ${text.slice(0, 200)}`);
                    }

                    const json = JSON.parse(text);
                    if (!alive) return;
                    setFinalData((prev) => ({
                        ...prev,
                        saldo: typeof json.saldo === "number" ? json.saldo : prev.saldo,
                        movimientos: Array.isArray(json.movimientos) ? json.movimientos : [],
                    }));
                    return; // ok
                } catch (e: any) {
                    lastErr = e;
                    if (e?.message !== "NOT_READY") break;
                    await new Promise((r) => setTimeout(r, waits[i]));
                }
            }

            console.error("[UserDropdown] resumen error:", lastErr);
        })();

        return () => {
            alive = false;
        };
    }, [user?.uid]);

    // Cambios de props o Firestore
    useEffect(() => {
        setFinalData((prev) => ({
            ...prev,
            saldo: userData?.saldo ?? (userDoc?.saldo ?? 0),
            saldoReal: userData?.saldoReal ?? (userDoc?.saldoReal ?? 0),
            promoIVA: userData?.promoIVA ?? (userDoc?.promoIVA ?? 0),
            bonosPendientes: userData?.bonosPendientes ?? (userDoc?.bonosPendientes ?? 0),
            sueldo: userData?.sueldo ?? userDoc?.sueldo,
            movimientos: userData?.movimientos ?? prev.movimientos,
        }));
    }, [userData, userDoc]);

    const ddRef = useRef<HTMLLIElement>(null);
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ddRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const fmtCOP = useMemo(
        () => (n: number) =>
            n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
        []
    );

    const handleLogout = async () => {
        setBusy(true);
        try {
            await onLogout();
        } finally {
            setBusy(false);
            setOpen(false);
        }
    };

    if (!user) return null;

    return (
        <li className="nav-item dropdown" ref={ddRef} style={{ position: "relative" }}>
            <button
                id="user-dd-btn"
                type="button"
                className="btn btn-light text-dark dropdown-toggle"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls="user-dd-menu"
            >
                <i className="bi bi-person-circle me-1" />
                {displayName || "Mi cuenta"}
            </button>

            <div
                id="user-dd-menu"
                className={`dropdown-menu dropdown-menu-end dropdown-menu-dark shadow-lg ${open ? "show" : ""}`}
                style={{ minWidth: 320, position: "absolute", right: 0 }}
            >
                <div className="px-3 py-2 border-bottom">
                    <div className="fw-bold">{displayName}</div>

                    <div className="d-flex gap-2 mt-2">
                        <div className="p-2 bg-secondary rounded text-center flex-fill">
                            <div className="small">Saldo</div>
                            <div className="fw-bold">{fmtCOP(finalData.saldo)}</div>
                        </div>
                        <div className="p-2 bg-secondary rounded text-center flex-fill">
                            <div className="small">Saldo Real</div>
                            <div className="fw-bold">{fmtCOP(finalData.saldoReal)}</div>
                        </div>
                    </div>

                    <div className="p-2 bg-secondary rounded text-center mt-2">
                        <div className="small">Bonos</div>
                        <div className="fw-bold">{fmtCOP(finalData.bonosPendientes)}</div>
                    </div>

                    {typeof finalData.sueldo === "number" && (
                        <div className="p-2 bg-secondary rounded text-center mt-2">
                            <div className="small">Sueldo</div>
                            <div className="fw-bold">{fmtCOP(finalData.sueldo)}</div>
                        </div>
                    )}
                </div>

                {/* 👇 Últimos movimientos (Prisma) */}
                <div className="px-3 py-2">
                    <div className="small text-muted mb-1">Últimos movimientos</div>
                    {finalData.movimientos && finalData.movimientos.length > 0 ? (
                        <ul className="mb-0 ps-3 small">
                            {finalData.movimientos.slice(0, 3).map((m) => (
                                <li key={m.id}>
                                    {m.tipo} {fmtCOP(m.montoCOP)}{" "}
                                    <span className="text-muted">{new Date(m.createdAt).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-muted small">Sin movimientos</div>
                    )}
                </div>

                <div className="dropdown-divider"></div>

                {isAdmin && (
                    <>
                        <Link to="recargar" className="dropdown-item">
                            <i className="bi bi-cash-stack me-2" /> Recargar saldo
                        </Link>
                        <div className="px-3 py-2 text-success small">
                            ✅ Este usuario es <strong>ADMIN</strong>
                        </div>
                        <div className="dropdown-divider"></div>
                    </>
                )}

                <button
                    type="button"
                    className="dropdown-item text-danger"
                    disabled={busy}
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right me-2" />
                    {busy ? "Cerrando..." : "Cerrar sesión"}
                </button>
            </div>
        </li>
    );
}
