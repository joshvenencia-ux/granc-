import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayableBySlug } from "../data/games";
import type { PlayableGame } from "../data/games";
import { initChildAuthBridge } from "@/lib/childAuthBridge";

function useHeaderHeight() {
    const [h, setH] = useState(0);
    useLayoutEffect(() => {
        const el =
            document.querySelector<HTMLElement>('header[role="banner"]') ||
            document.querySelector<HTMLElement>(".navbar") ||
            document.querySelector<HTMLElement>('nav[role="navigation"]');
        if (!el) return;
        const measure = () => setH(Math.ceil(el.getBoundingClientRect().height || 0));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        window.addEventListener("resize", measure);
        window.addEventListener("orientationchange", measure);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
            window.removeEventListener("orientationchange", measure);
        };
    }, []);
    return h;
}

function useResponsiveHeight() {
    const [height, setHeight] = useState<number>(() => {
        if (typeof window === "undefined") return 0;
        return (window.visualViewport?.height ?? window.innerHeight) | 0;
    });
    useEffect(() => {
        if (typeof window === "undefined") return;
        const update = () => setHeight((window.visualViewport?.height ?? window.innerHeight) | 0);
        update();
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        window.visualViewport?.addEventListener("resize", update);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
            window.visualViewport?.removeEventListener("resize", update);
        };
    }, []);
    return height;
}

function normalizeGameUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    try {
        const u = new URL(raw, window.location.origin);
        if (window.location.protocol === "https:" && u.protocol === "http:") u.protocol = "https:";
        return u.toString();
    } catch {
        return raw;
    }
}

function withAuthParams(u?: string): string | undefined {
    if (!u) return u;
    try {
        const url = new URL(u, window.location.origin);
        const t = localStorage.getItem("token");
        const uid = localStorage.getItem("userId");
        if (t) url.searchParams.set("jwt", t);
        if (uid) url.searchParams.set("uid", uid);
        return url.toString();
    } catch {
        return u;
    }
}

export default function GamePlay() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const game: PlayableGame | undefined = useMemo(
        () => (slug ? getPlayableBySlug(slug) : undefined),
        [slug]
    );

    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const loadTimerRef = useRef<number | null>(null);
    const didLoadRef = useRef(false);

    const viewportHeight = useResponsiveHeight();
    const headerHeight = useHeaderHeight();

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const main = document.querySelector<HTMLElement>("main, .page-main, [data-main]");
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        const prevBodyBg = body.style.backgroundColor;
        const prevMainPadding = main?.style.padding;
        const prevMainBg = main?.style.backgroundColor;
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        body.style.backgroundColor = "#000";
        if (main) {
            main.style.padding = "0";
            main.style.backgroundColor = "#000";
        }
        window.scrollTo(0, 0);
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
            body.style.backgroundColor = prevBodyBg;
            if (main) {
                main.style.padding = prevMainPadding ?? "";
                main.style.backgroundColor = prevMainBg ?? "";
            }
        };
    }, []);

    if (!game) {
        return (
            <div style={{ padding: 16, color: "white" }}>
                <h3>Juego no encontrado o no disponible para jugar</h3>
            </div>
        );
    }

    const availableH =
        viewportHeight && headerHeight ? Math.max(0, viewportHeight - headerHeight) : 0;

    const containerStyle: React.CSSProperties = {
        position: "absolute",
        top: `${headerHeight || 0}px`,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: availableH ? `${availableH}px` : `calc(100dvh - ${headerHeight || 0}px)`,
        margin: 0,
        padding: 0,
        backgroundColor: "#000",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "manipulation",
        zIndex: 1,
    };

    const overlayBase: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "#fff",
        textAlign: "center",
        padding: 16,
        zIndex: 3,
        pointerEvents: "none",
    };

    const headingStyle: React.CSSProperties = {
        fontSize: "clamp(16px, 2.2vw, 22px)",
        margin: 0,
        marginBottom: 8,
        lineHeight: 1.2,
    };

    const textStyle: React.CSSProperties = {
        opacity: 0.85,
        fontSize: "clamp(13px, 1.8vw, 16px)",
        margin: 0,
        marginBottom: 16,
    };

    const buttonStyle: React.CSSProperties = {
        border: 0,
        borderRadius: 12,
        padding: "10px 14px",
        background: "#fff",
        color: "#111",
        fontWeight: 600,
        fontSize: "clamp(13px, 1.8vw, 15px)",
        cursor: "pointer",
    };

    const backBtnStyle: React.CSSProperties = {
        position: "absolute",
        top: "max(8px, env(safe-area-inset-top))",
        left: "max(8px, env(safe-area-inset-left))",
        zIndex: 4,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.15)",
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontWeight: 600,
        fontSize: "14px",
        lineHeight: 1,
        cursor: "pointer",
    };

    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/", { replace: true });
    };

    // URL del iframe normalizada 
    const iframeSrc = withAuthParams(normalizeGameUrl(game.url));

    // ID estable para registrar este iframe ante el padre (bus)
    const childId = `game-${game.slug}`;

    // Empujar auth al iframe (y refrescar cuando cambie el token)
    useEffect(() => {
        if (!iframeRef.current || !iframeSrc) return;

        const cleanup = initChildAuthBridge(iframeRef.current, { allowedOrigins: "*" });

        return () => {
            try { cleanup?.(); } catch { /* noop */ }
        };
    }, [iframeSrc, reloadKey]);

    // Timeout 
    useEffect(() => {
        setLoaded(false);
        setFailed(null);
        didLoadRef.current = false;

        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
        loadTimerRef.current = window.setTimeout(() => {
            if (!didLoadRef.current) setFailed("timeout");
        }, 12000);

        return () => {
            if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
            }
        };
    }, [iframeSrc, reloadKey]);

    return (
        <div ref={containerRef} style={containerStyle} data-fullscreen-play>
            {/* Botón volver */}
            <button type="button" onClick={goBack} aria-label="Volver" style={backBtnStyle}>
                <span
                    aria-hidden="true"
                    style={{
                        display: "inline-block",
                        width: 0,
                        height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderRight: "8px solid #fff",
                        marginRight: 2,
                    }}
                />
                Volver
            </button>

            {/* Loader */}
            {!loaded && !failed && (
                <div aria-live="polite" style={overlayBase}>
                    <div style={{ fontWeight: 600, letterSpacing: 0.3, fontSize: "clamp(14px, 2vw, 18px)" }}>
                        Cargando…
                    </div>
                </div>
            )}

            {/* Fallback de error */}
            {failed && (
                <div style={{ ...overlayBase, pointerEvents: "auto" }}>
                    <div>
                        <h3 style={headingStyle}>{game.name}</h3>
                        <p style={textStyle}>
                            No pudimos cargar el juego{failed === "timeout" ? " (tiempo de espera agotado)" : ""}.
                        </p>
                        <button
                            onClick={() => {
                                setFailed(null);
                                setLoaded(false);
                                setReloadKey((k) => k + 1);
                            }}
                            style={buttonStyle}
                            aria-label="Reintentar cargar el juego"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Iframe del juego */}
            <iframe
                key={`${game.slug}-${reloadKey}`}
                ref={iframeRef}
                src={iframeSrc}
                title={game.name}
                style={{
                    border: "none",
                    width: "100%",
                    height: "100%",
                    display: failed ? "none" : "block",
                    WebkitTextSizeAdjust: "100%",
                    position: "relative",
                    zIndex: 2,
                    pointerEvents: "auto",
                    transform: "translateZ(0)",
                    WebkitTransform: "translateZ(0)",
                    willChange: "transform",
                }}
                allow="fullscreen; autoplay; clipboard-write; gamepad; accelerometer; magnetometer; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation allow-top-navigation-by-user-activation allow-downloads"
                loading="eager"
                onLoad={() => {
                    didLoadRef.current = true;
                    setLoaded(true);
                    if (loadTimerRef.current) {
                        clearTimeout(loadTimerRef.current);
                        loadTimerRef.current = null;
                    }
                    // Solicita credenciales al padre por si el child no las tiene aún
                    setTimeout(() => {
                        try {
                            const w = iframeRef.current?.contentWindow;
                            if (w) w.postMessage({ type: "auth:request", payload: { refresh: false } }, "*");
                        } catch { /* noop */ }
                    }, 100);

                    // Handshake de registro: el padre aprenderá origin real y contentWindow
                    setTimeout(() => {
                        try {
                            const w = iframeRef.current?.contentWindow;
                            if (w) w.postMessage({ type: "child:register", payload: { id: childId } }, "*");
                        } catch { /* noop */ }
                    }, 150);
                }}
                onError={() => setFailed("load_error")}
            />
        </div>
    );
}
