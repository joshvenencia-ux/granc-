type Json = Record<string, any>;

type WithMeta<T> = T & { meta?: Json };

type ChildMsg =
    | WithMeta<{ type: "child:register"; payload?: { id: string } }>
    | WithMeta<{ type: "child:heartbeat"; payload?: { id: string; ts?: number } }>
    | WithMeta<{ type: "child:unload"; payload?: { id: string } }>
    | WithMeta<{ type: "auth:request"; payload?: { refresh?: boolean } }>
    | WithMeta<{ type: `crash:${string}`; payload?: Json }>
    | WithMeta<{ type: string; payload?: Json }>;

type ParentMsg =
    | { type: "parent:registered"; payload?: { peers: string[]; leaderId: string | null } }
    | { type: "parent:leader"; payload?: { leaderId: string | null } };

type Client = { id: string; win: Window; origin: string; lastBeat: number };
const _clients = new Map<string, Client>();
let _leaderId: string | null = null;
let _inited = false;

const now = () => Date.now();

function _registerChild(id: string, win: Window, origin: string) {
    _clients.set(id, { id, win, origin, lastBeat: now() });
    if (!_leaderId) _leaderId = id; // primer hijo = líder
    const peers = [..._clients.keys()].filter((k) => k !== id);
    try {
        win.postMessage(
            { type: "parent:registered", payload: { peers, leaderId: _leaderId } } as ParentMsg,
            origin
        );
    } catch { /* noop */ }
}

function _broadcast(fromId: string, msg: any) {
    for (const [id, c] of _clients) {
        if (id === fromId) continue;
        try { c.win.postMessage(msg, c.origin); } catch { }
    }
}

function _removeChild(id: string) {
    _clients.delete(id);
    if (_leaderId === id) {
        _leaderId = _clients.size ? [..._clients.keys()][0] : null;
        for (const c of _clients.values()) {
            try {
                c.win.postMessage({ type: "parent:leader", payload: { leaderId: _leaderId } } as ParentMsg, c.origin);
            } catch { }
        }
    }
}

async function _replyAuthRequest(target: Window | null, targetOrigin: string, _refresh: boolean) {
    if (!target) return;
    try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        const reply = { type: "auth:set", payload: { token, userId } };
        target.postMessage(reply, targetOrigin || "*");
    } catch { }
}

function deriveOriginForSource(target: Window | null): string {
    if (!target) return "*";
    try {
        const ifr = Array.from(document.querySelectorAll("iframe")).find(
            (x) => x.contentWindow === target
        ) as HTMLIFrameElement | undefined;
        if (ifr?.src) return new URL(ifr.src).origin;
    } catch { }
    return "*";
}

const DEFAULTS = {
    heartbeatInterval: 5000,
    heartbeatTimeout: 15000,
};

export function initParentBus(options?: Partial<typeof DEFAULTS>) {
    if (_inited) return;
    _inited = true;

    Object.assign(DEFAULTS, options || {});

    const onMessage = async (ev: MessageEvent<any>) => {
        const data = ev.data as ChildMsg;
        if (!data || typeof data !== "object" || typeof data.type !== "string") return;

        if (data.type === "child:register" && data.payload?.id) {
            const id = String(data.payload.id);
            _registerChild(id, ev.source as Window, ev.origin);
            return;
        }

        if (data.type === "child:heartbeat" && data.payload?.id) {
            const id = String(data.payload.id);
            const c = _clients.get(id);
            if (c) c.lastBeat = now();
            return;
        }

        if (data.type === "child:unload" && data.payload?.id) {
            _removeChild(String(data.payload.id));
            return;
        }

        if (data.type === "auth:request") {
            const target = ev.source as Window | null;
            let targetOrigin = ev.origin && ev.origin !== "null" ? ev.origin : "";
            if (!targetOrigin) targetOrigin = deriveOriginForSource(target);
            await _replyAuthRequest(target, targetOrigin, !!data.payload?.refresh);
            return;
        }

        if (data.type.startsWith("crash:")) {
            const fromId = String(data.meta?.from ?? "");
            if (!_leaderId || fromId !== _leaderId) return;
            _broadcast(fromId, data);
            return;
        }
    };

    window.addEventListener("message", onMessage);

    setInterval(() => {
        const nowMs = now();
        for (const [id, c] of _clients) {
            if (nowMs - c.lastBeat > DEFAULTS.heartbeatTimeout) {
                _removeChild(id);
            }
        }
    }, DEFAULTS.heartbeatInterval);
}
