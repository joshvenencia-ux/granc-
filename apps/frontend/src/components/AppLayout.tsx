import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AuthModal from "@/components/AuthModal";
import { logoutAndSetOffline, setCuentaEstado } from "@/lib/firebase";

function useIsPad(breakpointPad = 1024) {
    const getIsPad = () =>
        typeof window !== "undefined" ? window.innerWidth <= breakpointPad : false;

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

// Viewport estable en móvil 
function useViewportHeight() {
    const getH = () =>
        typeof window === "undefined"
            ? 0
            : window.visualViewport?.height ?? window.innerHeight;
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

    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === "undefined") return true; // seguro por SSR
        const saved = window.localStorage.getItem("sidebarCollapsed");
        if (saved !== null) return saved === "1";
        return window.innerWidth > 1024 ? true : false;
    });

    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleSidebarFromNavbar = () => {
        if (isPad) setDrawerOpen((v) => !v);
        else setSidebarCollapsed((v) => !v);
    };

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
        if (typeof window === "undefined") return;
        if (!isPad) {
            window.localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "1" : "0");
        }
    }, [sidebarCollapsed, isPad]);

    useEffect(() => {
        if (!isPad) setDrawerOpen(false);
    }, [isPad]);

    useEffect(() => {
        if (!isPad) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = drawerOpen ? "hidden" : prev || "";
        return () => {
            document.body.style.overflow = prev || "";
        };
    }, [drawerOpen, isPad]);

    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");
    const openLogin = () => {
        setAuthMode("login");
        setAuthOpen(true);
    };
    const openRegister = () => {
        setAuthMode("register");
        setAuthOpen(true);
    };
    const closeAuth = () => setAuthOpen(false);
    const onAuthSuccess = async () => {
        try {
            await setCuentaEstado("online");
        } finally {
            closeAuth();
        }
    };
    const handleLogout = async () => {
        await logoutAndSetOffline();
    };

    // Estilos comunes y responsivos
    const mlStyle: React.CSSProperties = {
        marginLeft: contentMarginLeft,
        transition: "margin-left .35s ease",
        willChange: "margin-left",
    };

    const mainStyle: React.CSSProperties = {
        ...mlStyle,
        minHeight: vpHeight
            ? `${Math.max(vpHeight - NAVBAR_HEIGHT, 0)}px`
            : `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
        paddingTop: "calc(env(safe-area-inset-top))",
        paddingBottom: "calc(env(safe-area-inset-bottom))",
    };

    const sidebarExpanded = isPad ? drawerOpen : !sidebarCollapsed;

    return (
        <div className="min-vh-100 d-flex flex-column">
            <Navbar
                onToggleSidebar={toggleSidebarFromNavbar}
                onBrandClick={() => navigate("/")}
                onLoginClick={openLogin}
                onRegisterClick={openRegister}
                onLogout={handleLogout}

                sidebarExpanded={sidebarExpanded}
                sidebarControlsId="app-sidebar"
            />

            <Sidebar
                collapsed={isPad ? !drawerOpen : sidebarCollapsed}
                isPad={isPad} 
                topOffset={NAVBAR_HEIGHT}
                breakpointPad={1024}
                onClose={() => setDrawerOpen(false)}
            
            />

            <main
                className="container py-4 flex-fill"
                style={mainStyle}
                aria-hidden={isPad && drawerOpen ? true : undefined}
                data-main
            >
                <Outlet />
            </main>

            <footer className="border-top py-3 text-center text-muted small" style={mlStyle}>
                © {new Date().getFullYear()} ElGranCasino
            </footer>

            <AuthModal open={authOpen} mode={authMode} onClose={closeAuth} onSuccess={onAuthSuccess} />
        </div>
    );
}
