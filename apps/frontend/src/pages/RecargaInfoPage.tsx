import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/context";

type WaContact = { label: string; phone: string };

const CONTACTOS: WaContact[] = [
    { label: "Caja principal", phone: "573001112233" },
    { label: "Soporte 1", phone: "57" },
    { label: "Soporte 2", phone: "57" },
];

export default function RecargaInfoPage() {
    const { user, userDoc } = useAuth();

    // 👇 usaremos siempre el correo
    const userEmail = useMemo(() => user?.email ?? "sin-correo", [user]);

    const saldo = userDoc?.saldo ?? 0;
    const saldoReal = userDoc?.saldoReal ?? 0;
    const bonos = userDoc?.bonosPendientes ?? 0;
    const promoIVA = userDoc?.promoIVA ?? 0;

    const [customAmount, setCustomAmount] = useState<string>("");

    const fmtCOP = (n: number) =>
        n.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        });

    const parseAmount = (raw: string) => {
        const clean = raw.replace(/[^\d]/g, "");
        const asNum = Number(clean);
        return Number.isFinite(asNum) ? asNum : 0;
    };

    const buildWaLink = (phone: string, amount: number) => {
        const msg = [
            `Hola 👋`,
            `Quiero recargar ${fmtCOP(amount)} a mi cuenta.`,
            `Correo: ${userEmail}`,
        ].join("\n");
        const encoded = encodeURIComponent(msg);
        return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    };

    const validCustom = Math.max(0, parseAmount(customAmount));
    const quick = [10_000, 20_000, 50_000, 100_000];

    return (
        <div className="container my-4 page-main" data-main>
            <div className="d-flex align-items-center justify-content-between">
                <div>
                    <h1 className="h4 mb-1">
                        <i className="bi bi-geo-alt-fill me-2" />
                        Puntos de recarga
                    </h1>
                    <div className="text-muted">
                        Hola, <strong>{userEmail}</strong>. Aquí puedes ver tu información y
                        contactar por WhatsApp.
                    </div>
                </div>
                <Link to="/" className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left me-2" />
                    Volver
                </Link>
            </div>

            {/* Resumen */}
            <div className="row g-3 mt-3">
                {[
                    { label: "Saldo", value: fmtCOP(saldo) },
                    { label: "Saldo Real", value: fmtCOP(saldoReal) },
                    { label: "Bonos pendientes", value: fmtCOP(bonos) },
                    { label: "Promo IVA", value: fmtCOP(promoIVA) },
                ].map((b) => (
                    <div className="col-12 col-md-6 col-lg-3" key={b.label}>
                        <div className="p-3 bg-secondary text-white rounded">
                            <div className="small">{b.label}</div>
                            <div className="fw-bold fs-5">{b.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Montos */}
            <div className="card shadow-sm mt-4">
                <div className="card-body">
                    <h2 className="h6 mb-3">
                        <i className="bi bi-currency-exchange me-2" />
                        Monto de recarga
                    </h2>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        {quick.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => setCustomAmount(String(n))}
                            >
                                {fmtCOP(n)}
                            </button>
                        ))}
                    </div>
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-cash-coin" />
                        </span>
                        <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="form-control"
                            placeholder="Ej: 30000"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                        />
                        <span className="input-group-text">
                            {validCustom > 0 ? fmtCOP(validCustom) : "—"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Contactos */}
            <div className="card shadow-sm mt-4">
                <div className="card-body">
                    <h2 className="h6 mb-3">
                        <i className="bi bi-whatsapp me-2" />
                        Contactar por WhatsApp
                    </h2>
                    <div className="row g-3">
                        {CONTACTOS.map((c) => (
                            <div className="col-12 col-md-6 col-lg-4" key={c.phone}>
                                <div className="border rounded p-3 h-100 d-flex flex-column">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="fw-bold">{c.label}</div>
                                        <span className="badge bg-success">
                                            <i className="bi bi-check2-circle me-1" />
                                            Disponible
                                        </span>
                                    </div>
                                    <div className="text-muted small mt-1">+{c.phone}</div>
                                    <div className="mt-auto d-grid gap-2 pt-3">
                                        <a
                                            className={`btn btn-success ${validCustom <= 0 ? "disabled" : ""
                                                }`}
                                            href={
                                                validCustom > 0 ? buildWaLink(c.phone, validCustom) : "#"
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <i className="bi bi-whatsapp me-2" />
                                            Chatear por{" "}
                                            {validCustom > 0 ? fmtCOP(validCustom) : "monto"}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="alert alert-info mt-3 mb-0 small">
                        <i className="bi bi-info-circle me-2" />
                        Al tocar un botón se abrirá WhatsApp con un mensaje listo para
                        enviar.
                    </div>
                </div>
            </div>
        </div>
    );
}
