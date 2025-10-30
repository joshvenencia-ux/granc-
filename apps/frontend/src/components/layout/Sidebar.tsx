import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logoHeader from "../../assets/logoheader.png";

type SidebarProps = {
    collapsed: boolean;
    isPad: boolean;
    topOffset?: number;
    onClose?: () => void;
    newGamesIcon?: string;
    onNavigate?: (to: string) => void;
    singleOpen?: boolean;
    breakpointPad?: number;
};

export default function Sidebar({
    collapsed,
    isPad,
    topOffset = 56,
    onClose,
    newGamesIcon,
    onNavigate,
    singleOpen = true,
}: SidebarProps) {
    const [openCasino, setOpenCasino] = useState(false);
    const [openPromos, setOpenPromos] = useState(false); 

    //ESC
    useEffect(() => {
        if (!onClose) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const { pathname } = useLocation();
    const navigate = useNavigate();
    const go = (to: string) => (onNavigate ? onNavigate(to) : navigate(to));
    const isActive = (p: string) => pathname.startsWith(p);

    const toggleCasino = () => {
        setOpenCasino((prev) => {
            const next = !prev;
            if (singleOpen && next) setOpenPromos(false);
            return next;
        });
    };
    const togglePromos = () => {
        setOpenPromos((prev) => {
            const next = !prev;
            if (singleOpen && next) setOpenCasino(false);
            return next;
        });
    };

    // Auto-cierre
    useEffect(() => {
        if (isPad && !collapsed && onClose) onClose();
    }, [pathname, isPad]);

    // Lock scroll 
    useEffect(() => {
        if (!isPad) return;
        if (!collapsed) document.body.classList.add("scroll-locked");
        else document.body.classList.remove("scroll-locked");
        return () => document.body.classList.remove("scroll-locked");
    }, [isPad, collapsed]);

    
    const desktopWidth = collapsed ? 64 : 280;
    const drawerWidth = 280;
    const asideWidth = isPad ? drawerWidth : desktopWidth;

    const asideStyle: CSSProperties = {
        position: "fixed",
        top: `${topOffset}px`,
        left: 0,
        height: `calc(100vh - ${topOffset}px)`,
        width: asideWidth,
        backgroundColor: "#2f333a",
        color: "#fff",
        borderRight: "1px solid rgba(255,255,255,.08)",
        transition: isPad ? "box-shadow .35s ease" : "width .4s ease",
        display: "flex",
        flexDirection: "column",
        zIndex: 1035,
        overflow: "hidden",
        willChange: "transform",
    };

    const asideClass =
        "sidebar" +
        (collapsed ? " collapsed" : "") +
        (isPad && !collapsed ? " is-open" : "");

    return (
        <>
            {isPad && !collapsed && (
                <div onClick={onClose} aria-hidden="true" className="sidebar-backdrop" />
            )}

            <aside
                className={asideClass}
                style={asideStyle}
                role="navigation"
                aria-label="Barra lateral"
            >
                {/* Header con logo */}
                <div
                    className="sb-header"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isPad ? "flex-start" : collapsed ? "center" : "flex-start",
                        padding: ".7rem .9rem",
                        borderBottom: "1px solid rgba(255,255,255,.1)",
                        cursor: "pointer",
                        gap: isPad ? 8 : collapsed ? 0 : 8,
                    }}
                    onClick={() => {
                        go("/");
                        if (isPad && onClose) onClose();
                    }}
                >
                    <img
                        src={logoHeader}
                        alt="Logo"
                        style={{
                            height: isPad ? 34 : collapsed ? 32 : 34,
                            width: isPad ? "auto" : collapsed ? 32 : "auto",
                            objectFit: "contain",
                            transition: "all 0.4s ease",
                        }}
                    />
                    {(!collapsed || isPad) && (
                        <span
                            style={{ fontWeight: "bold", fontSize: 18, userSelect: "none", marginLeft: 6 }}
                        >
                            El Gran Casino
                        </span>
                    )}
                </div>

                {/* Contenido */}
                <div className="sb-content" style={{ flex: 1, padding: ".5rem" }}>
                    {/* ====== CASINO Y SLOTS ====== */}
                    <div className="sb-group" style={{ marginBottom: ".35rem" }}>
                        <button
                            className="sb-btn sb-btn-parent"
                            onClick={toggleCasino}
                            aria-expanded={openCasino}
                            type="button"
                            style={btnParentStyle(isPad ? false : collapsed)}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: isPad ? "flex-start" : collapsed ? "center" : "flex-start",
                                    gap: 8,
                                    width: "100%",
                                }}
                            >
                                <i className="bi bi-dice-5-fill fs-5" />
                                {(!collapsed || isPad) && (
                                    <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                                        Casino y slots
                                    </span>
                                )}
                            </div>
                            {(!collapsed || isPad) && (
                                <i className={`bi ${openCasino ? "bi-chevron-up" : "bi-chevron-down"}`} />
                            )}
                        </button>

                        {openCasino && (!collapsed || isPad) && (
                            <div
                                style={{
                                    ...subStyle,
                                    opacity: collapsed && !isPad ? 0 : 1,
                                    visibility: collapsed && !isPad ? "hidden" : "visible",
                                    transition: "opacity 0.4s ease, visibility 0.4s ease",
                                }}
                            >
                                <SBLink
                                    active={isActive("/casino/populares")}
                                    onClick={() => {
                                        go("/casino/populares");
                                        if (isPad && onClose) onClose();
                                    }}
                                    icon="bi-fire"
                                >
                                    Populares
                                </SBLink>
                                <SBLink
                                    active={isActive("/casino/nuevos")}
                                    onClick={() => {
                                        go("/casino/nuevos");
                                        if (isPad && onClose) onClose();
                                    }}
                                >
                                    {newGamesIcon ? (
                                        <img
                                            src={newGamesIcon}
                                            alt="Nuevos"
                                            className="me-2 sb-new-icon"
                                            style={{ width: 18, height: 18 }}
                                        />
                                    ) : (
                                        <i className="bi bi-stars me-2" />
                                    )}
                                    Juegos nuevos
                                </SBLink>
                            </div>
                        )}
                    </div>

                    {/* ====== PROMOCIONES ====== */}
                    <div className="sb-group" style={{ marginBottom: ".35rem" }}>
                        <button
                            className="sb-btn sb-btn-parent"
                            onClick={togglePromos}
                            aria-expanded={openPromos}
                            type="button"
                            style={btnParentStyle(isPad ? false : collapsed)}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: isPad ? "flex-start" : collapsed ? "center" : "flex-start",
                                    gap: 8,
                                    width: "100%",
                                }}
                            >
                                <i className="bi bi-gift-fill fs-5" />
                                {(!collapsed || isPad) && (
                                    <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>Promociones</span>
                                )}
                            </div>
                            {(!collapsed || isPad) && (
                                <i className={`bi ${openPromos ? "bi-chevron-up" : "bi-chevron-down"}`} />
                            )}
                        </button>

                        {openPromos && (!collapsed || isPad) && (
                            <div
                                style={{
                                    ...subStyle,
                                    opacity: collapsed && !isPad ? 0 : 1,
                                    visibility: collapsed && !isPad ? "hidden" : "visible",
                                    transition: "opacity 0.4s ease, visibility 0.4s ease",
                                }}
                            >
                                <SBLink
                                    active={isActive("/promos")}
                                    onClick={() => {
                                        go("/promos");
                                        if (isPad && onClose) onClose();
                                    }}
                                    icon="bi-stars"
                                >
                                    Ver promociones
                                </SBLink>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={footerStyle(isPad ? false : collapsed)}>
                    <SBQuick
                        collapsed={isPad ? false : collapsed}
                        onClick={() => {
                            go("/puntos-de-recarga");
                            if (isPad && onClose) onClose();
                        }}
                        icon="bi-geo-alt-fill"
                    >
                        Puntos de recarga
                    </SBQuick>
                    <SBQuick
                        collapsed={isPad ? false : collapsed}
                        onClick={() => {
                            go("/estadistica");
                            if (isPad && onClose) onClose();
                        }}
                        icon="bi-bar-chart-line-fill"
                    >
                        Estadística
                    </SBQuick>
                    <SBQuick
                        collapsed={isPad ? false : collapsed}
                        onClick={() => {
                            go("/ayuda");
                            if (isPad && onClose) onClose();
                        }}
                        icon="bi-question-circle-fill"
                    >
                        Ayuda
                    </SBQuick>
                </div>
            </aside>
        </>
    );
}

/* ===== helpers ===== */
function SBLink({
    active,
    onClick,
    icon,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    icon?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                textAlign: "left",
                padding: ".5rem .65rem",
                border: 0,
                background: active ? "rgba(43,135,255,.15)" : "transparent",
                color: active ? "#fff" : "#d2d6dc",
                borderRadius: ".55rem",
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                cursor: "pointer",
                width: "100%",
            }}
        >
            {icon && <i className={`bi ${icon} me-2`} />}
            {children}
        </button>
    );
}

function SBQuick({
    collapsed,
    onClick,
    icon,
    children,
}: {
    collapsed: boolean;
    onClick: () => void;
    icon: string;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            type="button"
            title={collapsed ? String(children) : undefined}
            style={{
                width: "100%",
                textAlign: "left",
                padding: ".45rem .6rem",
                border: 0,
                background: "transparent",
                color: "#b9bec7",
                borderRadius: ".55rem",
                display: "flex",
                alignItems: "center",
                gap: ".6rem",
                cursor: "pointer",
                justifyContent: collapsed ? "center" : "flex-start",
            }}
        >
            <i className={`bi ${icon}`} />
            {!collapsed && children}
        </button>
    );
}

//estilos comunes//
const btnParentStyle = (collapsed: boolean): CSSProperties => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "space-between",
    padding: ".6rem .7rem",
    background: "transparent",
    border: 0,
    color: "#fff",
    borderRadius: ".6rem",
    cursor: "pointer",
});

const subStyle: CSSProperties = {
    marginTop: ".35rem",
    paddingLeft: ".35rem",
    display: "flex",
    flexDirection: "column",
    gap: ".1rem",
};

const footerStyle = (collapsed: boolean): CSSProperties => ({
    padding: ".45rem .7rem",
    borderTop: "1px solid rgba(255,255,255,.1)",
    display: "flex",
    flexDirection: "column",
    gap: ".25rem",
    fontSize: 12,
    color: "#b9bec7",
    justifyContent: collapsed ? "center" : "flex-start",
    alignItems: collapsed ? "center" : "stretch",
});
