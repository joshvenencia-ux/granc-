import GameCard from "./GameCard";
import type { Game } from "../data/games";

type Props = {
    title: string;
    games: Game[];
    limit?: number | null;
    ariaLabel?: string;
};

export default function GameGrid({ title, games, limit = 32, ariaLabel }: Props) {
    const list = typeof limit === "number" ? games.slice(0, limit) : games;

    return (
        <section
            className="grid-panel"
            aria-label={ariaLabel ?? title}
            role="region"
        >
            <header className="grid-header">
                <h2 className="grid-title">{title}</h2>
            </header>

            <div className="grid-body">
                <div className="game-grid">
                    {list.map((g) => (
                        <div key={g.id} className="game-grid__item">
                            <GameCard game={g} />
                        </div>
                    ))}
                </div>

                {list.length === 0 && (
                    <p className="text-muted" style={{ margin: "1rem 0" }}>
                        No hay juegos para mostrar.
                    </p>
                )}
            </div>
        </section>
    );
}
