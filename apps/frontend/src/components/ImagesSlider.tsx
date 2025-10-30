import { useEffect, useMemo, useState } from "react";

export type Slide = { src: string; alt: string };
export type Fit = "cover" | "contain";

type Props = {
    slides: Slide[];
    autoPlay?: boolean;
    interval?: number;
    aspectRatio?: string; 
    maxHeight?: number; 
    fit?: Fit;
    rounded?: boolean;
    className?: string;
};

export default function ImageSlider({
    slides,
    autoPlay = true,
    interval = 4000,
    aspectRatio = "21 / 9",
    maxHeight,
    fit = "cover",
    rounded = true,
    className,
}: Props) {
    // ✅ Evita crashear si slides viene vacío o indefinido
    const safeSlides = useMemo(() => (Array.isArray(slides) ? slides : []), [slides]);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        // Reajusta índice si cambia el array y el índice queda fuera
        if (current >= safeSlides.length) setCurrent(0);
    }, [safeSlides.length, current]);

    useEffect(() => {
        if (!autoPlay || safeSlides.length <= 1) return;
        const id = setInterval(() => setCurrent((p) => (p + 1) % safeSlides.length), interval);
        return () => clearInterval(id);
    }, [autoPlay, interval, safeSlides.length]);

    const prev = () => setCurrent((p) => (p === 0 ? safeSlides.length - 1 : p - 1));
    const next = () => setCurrent((p) => (p + 1) % safeSlides.length);

    if (safeSlides.length === 0) return null; // 🔒 No render si no hay slides

    return (
        <div
            role="region"
            aria-label="Slider de imágenes"
            className={className}
            style={{
                position: "relative",
                width: "100%",
                aspectRatio,
                maxHeight: maxHeight ? `${maxHeight}px` : undefined,
                overflow: "hidden",
                borderRadius: rounded ? 8 : 0,
                background: "#111",
                // Evita colapsos de altura en iOS si se carga antes de calcular layout
                minHeight: 80,
            }}
        >
            {/* Imagen actual */}
            <img
                src={safeSlides[current].src}
                alt={safeSlides[current].alt}
                loading="eager"
                decoding="async"
                draggable={false} // ✅ reemplaza WebkitUserDrag
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: fit,
                    objectPosition: "center",
                    display: "block",
                    userSelect: "none",
                }}
            />

            {/* Flechas discretas */}
            {safeSlides.length > 1 && (
                <>
                    <button onClick={prev} aria-label="Anterior" style={arrowStyle("left")}>
                        ‹
                    </button>
                    <button onClick={next} aria-label="Siguiente" style={arrowStyle("right")}>
                        ›
                    </button>
                </>
            )}

            {/* Dots minimalistas */}
            {safeSlides.length > 1 && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 4,
                    }}
                >
                    {safeSlides.map((_, i) => (
                        <button
                            key={i}
                            aria-label={`Ir al slide ${i + 1}`}
                            onClick={() => setCurrent(i)}
                            style={{
                                width: i === current ? 18 : 8,
                                height: 8,
                                borderRadius: 999,
                                background: i === current ? "var(--brand)" : "rgba(255,255,255,0.45)",
                                border: 0,
                                cursor: "pointer",
                                transition: "width .18s ease, background .18s ease",
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* flechas más pequeñas y transparentes */
function arrowStyle(side: "left" | "right"): React.CSSProperties {
    return {
        position: "absolute",
        top: "50%",
        [side]: 8,
        transform: "translateY(-50%)",
        width: 32,
        height: 32,
        borderRadius: 999,
        border: 0,
        background: "rgba(0,0,0,.3)",
        color: "rgba(255,255,255,.9)",
        fontSize: 18,
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background .2s ease, opacity .2s ease",
    } as React.CSSProperties;
}
