export type Category =
    | "populares" | "nuevos" | "crash" | "slots" | "en-vivo"
    | "blackjack" | "ruleta" | "poker" | "bingo";

export type Game = {
    id: string;
    slug: string;
    name: string;
    provider: string;
    img?: string | null;
    rtp?: number;
    categories: Category[];
    /** URL del juego (iframe) */
    url?: string; //opcional: el catálogo puede incluir juegos no embebibles aún
};

/** Un juego en iframe SIEMPRE tiene url */
export type PlayableGame = Game & { url: string };

export function isPlayable(game: Game | undefined | null): game is PlayableGame {
    return !!game && typeof game.url === "string" && game.url.length > 0;
}

export const CATEGORY_LABELS: Record<Category, string> = {
    populares: "Populares",
    nuevos: "Juegos nuevos",
    crash: "Juegos Crash",
    slots: "Pagamonedas",
    "en-vivo": "Casino en vivo",
    blackjack: "Blackjack",
    ruleta: "Ruleta",
    poker: "Poker",
    bingo: "Bingo",
};

export const CATEGORIES: Category[] = [
    "populares", "nuevos", "crash", "slots", "en-vivo",
    "blackjack", "ruleta", "poker", "bingo",
];

function ensureAbsolute(u: string) {
    try { return new URL(u).toString(); }
    catch { throw new Error(`DRONX_URL no es URL absoluta: ${u}`); }
}
export const DRONX_URL =
    ensureAbsolute(
        (import.meta.env.VITE_DRONX_URL?.trim()) ||
        (import.meta.env.PROD ? "https://dronvirtual.pages.dev" : "http://localhost:5174")
    );

const CATALOG: Game[] = [
    {
        id: "g1",
        slug: "dron-x",
        name: "DronX",
        provider: "DronX",
        img: "/games/dronx.png",
        categories: ["populares", "crash", "nuevos"],
        url: DRONX_URL,
    },
    {
        id: "g2",
        slug: "ruleta-vip",
        name: "Ruleta VIP",
        provider: "Evolution",
        img: "/games/ruleta-vip.png",
        categories: ["populares", "ruleta"],
        url: "https://juegos.example.com/ruleta-vip",
    },
    {
        id: "g3",
        slug: "blackjack-pro",
        name: "Blackjack Pro",
        provider: "PlayTech",
        img: null,
        categories: ["blackjack", "populares"],
        url: "https://juegos.example.com/blackjack-pro",
    },
    {
        id: "g4",
        slug: "poker-texas",
        name: "Poker Texas",
        provider: "iSoftBet",
        img: null,
        categories: ["poker"],
        url: "https://juegos.example.com/poker-texas",
    },
    {
        id: "g5",
        slug: "bingo-70",
        name: "Bingo 70",
        provider: "Pragmatic",
        img: null,
        categories: ["bingo"],
        url: "https://juegos.example.com/bingo-70",
    },
    {
        id: "g6",
        slug: "crash-rocket",
        name: "Crash Rocket",
        provider: "Hacksaw",
        img: null,
        categories: ["crash", "nuevos"],
        url: "https://juegos.example.com/crash-rocket",
    },
    {
        id: "g7",
        slug: "casino-en-vivo-ruleta",
        name: "Ruleta en vivo",
        provider: "Evolution Live",
        img: null,
        categories: ["en-vivo", "ruleta"],
        url: "https://juegos.example.com/casino-en-vivo-ruleta",
    },
    {
        id: "g8",
        slug: "slots-egipcios",
        name: "Slots Egipcios",
        provider: "ElGranCasino",
        img: null,
        categories: ["slots"],
        url: "https://juegos.example.com/slots-egipcios",
    },
];

export function getGames(category: Category): Game[] {
    return CATALOG.filter((g) => g.categories.includes(category));
}

export function getGameBySlug(slug: string): Game | undefined {
    return CATALOG.find((g) => g.slug === slug);
}

export function getPlayableBySlug(slug: string): PlayableGame | undefined {
    const g = getGameBySlug(slug);
    return isPlayable(g) ? g : undefined;
}

export function setGameName(slug: string, newName: string): Game | undefined {
    const g = CATALOG.find((x) => x.slug === slug);
    if (!g) return undefined;
    g.name = newName.trim();
    return g;
}

export const ALL_GAMES: readonly Game[] = CATALOG;
