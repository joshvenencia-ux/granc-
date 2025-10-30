import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import GameGrid from "@/components/GameGrid";
import {
    type Category,
    CATEGORIES,
    CATEGORY_LABELS,
    getGames,
} from "@/data/games";


const DEFAULT_LIMIT = 5;

function isCategory(x: string): x is Category {
    return (CATEGORIES as string[]).includes(x);
}

export default function CasinoCategory() {
    const { cat = "" } = useParams<{ cat: string }>();

    const isValid = isCategory(cat);

    const games = useMemo(() => {
        if (!isValid) return [];
        return getGames(cat);
    }, [cat, isValid]);

    const title = isValid ? CATEGORY_LABELS[cat] : "";

    if (!isValid) return <Navigate to="/casino/populares" replace />;

    return (
        <div className="container py-3 text-white">
            <GameGrid title={title} games={games} limit={DEFAULT_LIMIT} />
        </div>
    );
}
