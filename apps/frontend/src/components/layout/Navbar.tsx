import { useMemo } from "react";
import UserDropdown from "./UserDropdown";
import { useAuth } from "../../auth/hooks";

export const NAVBAR_HEIGHT = 56;

type Props = {
    onToggleSidebar: () => void;
    onBrandClick?: () => void;
    onLoginClick?: () => void;
    onRegisterClick?: () => void;
    onLogout?: () => Promise<void> | void;

    sidebarExpanded?: boolean;
    sidebarControlsId?: string;
};

export default function Navbar({
    onToggleSidebar,
    onBrandClick,
    onLoginClick,
    onRegisterClick,
    onLogout = () => { },
    sidebarExpanded,
    sidebarControlsId = "app-sidebar",
}: Props) {
    const { user, userDoc } = useAuth();

    const isLoggedIn = !!user;
    const displayName = useMemo(
        () => user?.displayName ?? user?.email ?? "Usuario",
        [user]
    );

    return (
        <nav
            className="navbar navbar-dark fixed-top shadow-sm"
            style={{
                backgroundColor: "#2f333a",
                zIndex: 1050, 
                minHeight: NAVBAR_HEIGHT,
                height: NAVBAR_HEIGHT,
            }}
            role="navigation"
            aria-label="Barra de navegación principal"
        >
            <div className="container-fluid">
                {/* Botón Sidebar */}
                <button
                    type="button"
                    className="btn btn-outline-light me-2 d-inline-flex align-items-center justify-content-center"
                    onClick={onToggleSidebar}
                    aria-label="Abrir/cerrar menú lateral"
                    aria-controls={sidebarControlsId}
                    {...(typeof sidebarExpanded === "boolean"
                        ? { "aria-expanded": sidebarExpanded }
                        : {})}
                    style={{ width: 40, height: 40, padding: 0 }}
                >
                    <i className="bi bi-list" aria-hidden="true" />
                </button>

                {/* Marca */}
                <button
                    type="button"
                    onClick={() => onBrandClick?.()}
                    className="navbar-brand fw-bold fs-4 border-0 bg-transparent p-0 text-white"
                    style={{ cursor: "pointer" }}
                    aria-label="Ir a inicio"
                >
                    ElGranCasino
                </button>

                {/* Empujar a la derecha */}
                <div style={{ flex: "1 1 auto" }} />

                {/* Acciones */}
                <div className="d-flex align-items-center gap-2">
                    {isLoggedIn && (
                        <span className="navbar-text text-white d-none d-lg-inline me-1">
                            Bienvenido, <strong>{displayName}</strong>
                        </span>
                    )}

                    {isLoggedIn ? (
                        <UserDropdown
                            displayName={displayName}
                            userData={{
                                saldo: userDoc?.saldo ?? 0,
                                saldoReal: userDoc?.saldoReal ?? 0,
                                promoIVA: userDoc?.promoIVA ?? 0,
                                bonosPendientes: userDoc?.bonosPendientes ?? 0,
                                sueldo: userDoc?.sueldo,
                            }}
                            isAdmin={userDoc?.rol === "admin"}
                            onLogout={onLogout}
                        />
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn btn-light text-dark d-inline-flex align-items-center justify-content-center"
                                style={{ width: 40, height: 40, padding: 0 }}
                                onClick={() => onLoginClick?.()}
                                aria-label="Ingresar"
                                title="Ingresar"
                            >
                                <i className="bi bi-person" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-light d-inline-flex align-items-center justify-content-center"
                                style={{ width: 40, height: 40, padding: 0 }}
                                onClick={() => onRegisterClick?.()}
                                aria-label="Registrarse"
                                title="Registrarse"
                            >
                                <i className="bi bi-person-plus" aria-hidden="true" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
