import { useMemo } from "react";
import ImageSlider from "@/components/ImagesSlider";
import GameGrid from "@/components/GameGrid";
import FloatingChatMenu from "@/components/FloatingChatMenu"; 
import { CATEGORIES, getGames } from "@/data/games";

export default function Home() {
    const featuredGames = useMemo(() => getGames(CATEGORIES[0]), []);
    const slides = useMemo(
        () => [
            { src: "/slides/banner1.jpg", alt: "Promo 1" },
            { src: "/slides/banner2.jpg", alt: "Promo 2" },
            { src: "/slides/banner3.jpg", alt: "Promo 3" },
        ],
        []
    );

    return (
        <div className="home-page" style={{ display: "grid", gap: "1.25rem" }}>
            <section className="full-bleed" aria-label="Promociones destacadas">
                <ImageSlider
                    slides={slides}
                    autoPlay
                    interval={5000}
                    aspectRatio="21 / 9"
                    maxHeight={420}
                    fit="cover"
                    rounded
                />
            </section>

            <GameGrid title="🎮 Juegos destacados" games={featuredGames} limit={12} />

            {/* Chat flotante SOLO en Home */}
            <FloatingChatMenu />
        </div>
    );
}
