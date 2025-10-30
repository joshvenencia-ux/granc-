import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import AuthModal from "@/components/AuthModal";
import { setCuentaEstado } from "@/lib/firebase";

function useIsPad(breakpointPad = 1024) {
    const getIsPad = () => (typeof window !== "undefined" ? window.innerWidth <= breakpointPad : false);
    const [isPad, setIsPad] = useState(getIsPad);
    useEffect(() => {
        let rAF = 0;
        const onResize = () => {
            cancelAnimationFrame(rAF);
            rAF = requestAnimationFrame(() => setIsPad(getIsPad()));
        };
        window.addEventListener("resize", onResize);
        return () => {
            cancelAnimationFrame(rAF);
            window.removeEventListener("resize", onResize);
        };
    }, [breakpointPad]);
    return isPad;
}

function useViewportHeight() {
    const getH = () =>
        typeof window === "undefined" ? 0 : window.visualViewport?.height ?? window.innerHeight;
    const [h, setH] = useState<number>(getH());
    useEffect(() => {
        const update = () => setH(getH());
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        window.visualViewport?.addEventListener("resize", update);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
            window.visualViewport?.removeEventListener("resize", update);
        };
    }, []);
    return h;
}

const DESKTOP_W_OPEN = 280;
const DESKTOP_W_COLLAPSED = 64;
const NAVBAR_HEIGHT = 56;

export default function AppShell() {
    const navigate = useNavigate();
    const isPad = useIsPad(1024);
    const vpHeight = useViewportHeight();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleSidebar = () => {
        if (isPad) setDrawerOpen((v) => !v);
        else setSidebarCollapsed((v) => !v);
    };

    useEffect(() => {
        if (!isPad) setDrawerOpen(false);
    }, [isPad]);

    const contentMarginLeft = useMemo(
        () => (isPad ? 0 : sidebarCollapsed ? DESKTOP_W_COLLAPSED : DESKTOP_W_OPEN),
        [isPad, sidebarCollapsed]
    );

    useLayoutEffect(() => {
        document.body.classList.add("sb-ready");
        return () => {
            document.body.classList.remove("sb-ready");
        };
    }, []);

    useEffect(() => {
        if (!isPad) {
            document.body.style.overflow = "";
            return;
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = drawerOpen ? "hidden" : prev || "";
        return () => {
            document.body.style.overflow = prev || "";
        };
    }, [drawerOpen, isPad]);

    const [authOpen, setAuthOpen] = useState(false);
    const [authMode] = useState<"login" | "register">("login"); // ← sin setter (no se usa)
    const closeAuth = () => setAuthOpen(false);
    const onAuthSuccess = async () => {
        try {
            await setCuentaEstado("online");
        } finally {
            closeAuth();
        }
    };

    const mlStyle: CSSProperties = {
        marginLeft: contentMarginLeft,
        transition: "margin-left .35s ease",
        willChange: "margin-left",
    };

    const mainStyle: CSSProperties = {
        ...mlStyle,
        minHeight: vpHeight ? `${Math.max(vpHeight - NAVBAR_HEIGHT, 0)}px` : `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
        paddingTop: "calc(env(safe-area-inset-top))",
        paddingBottom: "calc(env(safe-area-inset-bottom))",
    };

    
    const collapsedForSidebar = isPad ? !drawerOpen : sidebarCollapsed;

    return (
        <>
            {/* botón flotante sencillo para abrir/cerrar el menú */}
            <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Abrir/cerrar menú"
                style={{
                    position: "fixed",
                    top: 8,
                    left: 8,
                    zIndex: 2000,
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,.1)",
                    background: "#0d6efd",
                    color: "#fff",
                }}
            >
                ☰
            </button>

            {/* Sidebar */}
            <Sidebar
                collapsed={collapsedForSidebar}
                isPad={isPad}
                topOffset={NAVBAR_HEIGHT}
                onClose={() => setDrawerOpen(false)}
                onNavigate={(to) => navigate(to)}
            />

            {/* Contenido principal */}
            <main style={mainStyle} id="main" tabIndex={-1}>
                <Outlet />
            </main>

            {/* Modal de autenticación */}
            <AuthModal open={authOpen} mode={authMode} onClose={closeAuth} onSuccess={onAuthSuccess} />
        </>
    );
}
