import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CATEGORIES, getGames } from "../data/games";

export default function GameDetails() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const all = useMemo(() => CATEGORIES.flatMap((c) => getGames(c)), []);
    const game = all.find((g) => g.slug === slug);

    if (!game) {
        return (
            <div className="container py-4 text-white">
                <div className="alert alert-dark border-0 rounded-3 shadow-lg">
                    <h3 className="mb-1">Juego no encontrado</h3>
                    <p className="mb-0 text-secondary">
                        Verifica el enlace o vuelve al catálogo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 text-white">
            <div className="row g-4">
                <div className="col-12 col-md-6">
                    <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow-lg bg-dark">
                        {game.img ? (
                            <img
                                src={game.img}
                                alt={game.name}
                                className="w-100 h-100"
                                style={{ objectFit: "cover" }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
                                <i className="bi bi-controller fs-1" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-12 col-md-6">
                    <div className="game-details-card">
                        <h2 className="mb-2">{game.name}</h2>
                        <div className="d-flex gap-2 align-items-center mb-3">
                            <span className="badge">Proveedor: {game.provider ?? "—"}</span>
                            {typeof game.rtp === "number" && (
                                <span className="badge">RTP {game.rtp}%</span>
                            )}
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-light text-dark btn-lg fw-semibold shadow"
                                onClick={() => navigate(`/play/${slug}`)}
                            >
                                <i className="bi bi-play-fill me-2" />
                                Jugar ahora
                            </button>

                            <button
                                className="btn btn-outline-light btn-lg"
                                onClick={() => navigate(-1)}
                            >
                                <i className="bi bi-arrow-left me-2" />
                                Volver
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
