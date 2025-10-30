import { useEffect, useRef, useState } from "react"; 
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

type Props = {
    hidden?: boolean;
    hideOnPath?: RegExp;
    whatsappNumber?: string; 
    whatsappText?: string;
    telegramUrl?: string; 

const DEFAULT_WA = "573244805700";
const DEFAULT_WA_TEXT = "Hola, necesito ayuda 🙂";
const DEFAULT_TG = "https://t.me/tu_usuario";

/**
 * Chat flotante global: se monta vía portal directo al <body>.
 * Se oculta automáticamente en rutas /gameplay, /game, /juego.
 */
export default function FloatingChatMenu({
    hidden,
    hideOnPath,
    whatsappNumber = DEFAULT_WA,
    whatsappText = DEFAULT_WA_TEXT,
    telegramUrl = DEFAULT_TG,
}: Props) {
    if (typeof document === "undefined") return null;

    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const GAME_ROUTES = /^\/(gameplay|game|juego)(\/|$)/i;
    const mustHide =
        !!hidden ||
        GAME_ROUTES.test(pathname) ||
        (hideOnPath ? hideOnPath.test(pathname) : false);

    useEffect(() => {
        let container = document.getElementById("floating-chat-root") as HTMLDivElement | null;

        if (!container) {
            container = document.createElement("div");
            container.setAttribute("id", "floating-chat-root");
            container.setAttribute("data-chat-floating", "true");
            document.body.appendChild(container);
        }

        rootRef.current = container;

        Object.assign(container.style, {
            position: "fixed",
            right: "16px",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            zIndex: String(2147483000), // altísimo, encima de casi todo
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "12px",
            pointerEvents: "auto",
        });
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const firstItemRef = useRef<HTMLAnchorElement | null>(null);
    useEffect(() => {
        if (open) firstItemRef.current?.focus();
    }, [open]);

    const size = 56;
    const waText = encodeURIComponent(whatsappText);
    const waHref = `https://wa.me/${encodeURIComponent(whatsappNumber)}?text=${waText}`;

    if (!rootRef.current || mustHide) return null;

    return createPortal(
        <>
            {/* Opciones */}
            {open && (
                <div
                    id="chat-menu"
                    className="animate-fade-in"
                    style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                    {/* WhatsApp */}
                    <a
                        ref={firstItemRef}
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        title="WhatsApp"
                        className="btn p-0 rounded-circle shadow"
                        style={{
                            width: size,
                            height: size,
                            backgroundColor: "#22c55e",
                            borderColor: "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            outline: "none",
                        }}
                    >
                        <i className="bi bi-whatsapp" style={{ fontSize: 22 }} />
                    </a>

                    {/* Telegram */}
                    <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Telegram"
                        title="Telegram"
                        className="btn p-0 rounded-circle shadow"
                        style={{
                            width: size,
                            height: size,
                            backgroundColor: "#0ea5e9",
                            borderColor: "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            outline: "none",
                        }}
                    >
                        <i className="bi bi-telegram" style={{ fontSize: 22 }} />
                    </a>
                </div>
            )}

            {/* Burbuja principal */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="chat-menu"
                aria-label={open ? "Cerrar chat" : "Abrir chat"}
                title={open ? "Cerrar chat" : "Chat en vivo"}
                className="btn p-0 rounded-circle shadow"
                style={{
                    width: `${size + 8}px`,
                    height: `${size + 8}px`,
                    backgroundColor: "#0d6efd",
                    borderColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    transition: "transform 150ms ease",
                    outline: "none",
                }}
            >
                {open ? (
                    <i className="bi bi-x-lg" style={{ fontSize: 22 }} />
                ) : (
                    <i className="bi bi-chat-dots-fill" style={{ fontSize: 22 }} />
                )}
            </button>
        </>,
        rootRef.current
    );
}
