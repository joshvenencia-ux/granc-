import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthMsg =
    | { type: "auth:set"; payload?: { token?: string | null; userId?: string | null } }
    | { type: "auth:request"; payload?: { refresh?: boolean } };

type Options = {
    allowedOrigins?: string[] | "*";
    targetOriginOverride?: string;
};

function toOriginString(s: string): string {
    try {
        if (s.startsWith("http://") || s.startsWith("https://")) {
            return new URL(s).origin;
        }
        return new URL(`https://${s}`).origin;
    } catch {
        return "";
    }
}

function originMatches(origin: string, pattern: string): boolean {
    if (pattern === "*") return true;

    let realHost = "";
    try { realHost = new URL(origin).host; } catch { return false; }

    let patHost = pattern;
    if (patHost.startsWith("http://") || patHost.startsWith("https://")) {
        try { patHost = new URL(patHost).host; } catch { }
    }

    if (patHost.startsWith("*.")) {
        const suf = patHost.slice(1);
        return realHost.endsWith(suf) || realHost === suf.slice(1);
    }

    return realHost === patHost;
}

export function initChildAuthBridge(
    iframe: HTMLIFrameElement,
    opts: Options = {}
): () => void {
    if (!iframe) return () => { };

    const srcOrigin = (() => {
        try { return new URL(iframe.src).origin; } catch { return "*"; }
    })();

    const allowed: string[] | "*" =
        opts.allowedOrigins === "*"
            ? "*"
            : Array.isArray(opts.allowedOrigins)
                ? opts.allowedOrigins.map((s) => s.trim()).filter(Boolean)
                : [srcOrigin];

    const isAllowed = (origin: string) => {
        if (allowed === "*") return true;
        return allowed.some((pat) => originMatches(origin, pat));
    };

    const postProactive = (win: Window | null, msg: AuthMsg) => {
        if (!win) return;
        try {
            const forced = opts.targetOriginOverride
                ? (toOriginString(opts.targetOriginOverride) || opts.targetOriginOverride)
                : "*";
            win.postMessage(msg, forced || "*");
        } catch { }
    };

    const postToOrigin = (win: Window | null, msg: AuthMsg, origin: string) => {
        if (!win) return;
        try { win.postMessage(msg, origin); } catch { }
    };

    const sendAuth = async (win: Window | null, targetOrigin?: string) => {
        if (!win) return;
        try {
            const u = auth.currentUser;
            const token = u ? await u.getIdToken(false) : null;
            const userId = u?.uid ?? null;
            const m: AuthMsg = { type: "auth:set", payload: { token, userId } };
            if (targetOrigin) postToOrigin(win, m, targetOrigin);
            else postProactive(win, m);
        } catch { }
    };

    const handleMessage = (ev: MessageEvent<AuthMsg>) => {
        const data = ev?.data;
        if (!data || typeof data !== "object") return;
        if (data.type !== "auth:request") return;

        if (ev.source !== iframe.contentWindow) return;
        if (!isAllowed(ev.origin)) return;
        void sendAuth(ev.source as Window, ev.origin);
    };

    window.addEventListener("message", handleMessage);

    const unsubToken = onIdTokenChanged(auth, () => {
        void sendAuth(iframe.contentWindow);
    });

    const onLoad = () => {
        void sendAuth(iframe.contentWindow);
    };
    iframe.addEventListener("load", onLoad);

    void sendAuth(iframe.contentWindow);

    return () => {
        try { window.removeEventListener("message", handleMessage); } catch { }
        try { iframe.removeEventListener("load", onLoad); } catch { }
        try { unsubToken(); } catch { }
    };
}
