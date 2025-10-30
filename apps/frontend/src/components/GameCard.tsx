import { Link } from "react-router-dom";
import type { Game } from "../data/games";

export default function GameCard({ game }: { game: Game }) {
    return (
        <Link
            to={`/play/${game.slug}`}
            className="text-decoration-none game-card-link"
            aria-label={`Abrir ${game.name}`}
        >
            <article className="game-card" role="group" aria-label={game.name}>
                <div className="game-thumb">
                    {game.img ? (
                        <img
                            src={game.img}
                            alt={game.name}
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="game-thumb-empty" aria-hidden="true">
                            <i className="bi bi-controller fs-2" />
                        </div>
                    )}

                    <div className="game-overlay">
                        <span className="game-play-cta">Jugar</span>
                    </div>
                </div>

                <div className="game-body">
                    <h3 className="game-title" title={game.name}>
                        {game.name}
                    </h3>

                    <div className="game-meta">
                        <span>{game.provider ?? "Proveedor"}</span>
                        {typeof game.rtp === "number" && <span>RTP {game.rtp}%</span>}
                    </div>
                </div>
            </article>
        </Link>
    );
}
