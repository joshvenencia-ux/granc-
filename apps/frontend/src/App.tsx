import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import "./styles.css";

import AppLayout from "@/components/AppLayout";
import GameGrid from "@/components/GameGrid";
import ImagesSlider from "@/components/ImagesSlider";
import FloatingChatMenu from "@/components/FloatingChatMenu";

import { CATEGORIES, CATEGORY_LABELS, getGames, type Category } from "@/data/games";
import Recargar from "./pages/recargar";
import RecargaInfoPage from "@/pages/RecargaInfoPage";

// inicializar bridge antes de app (main.tsx)
const GameDetails = lazy(() => import("@/components/GameDetails"));
const GamePlay = lazy(() => import("@/pages/GamePlay"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

function RouteA11yFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main, .page-main, [data-main]");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function Fallback() {
  return (
    <div className="container py-4" aria-live="polite">
      <div className="alert alert-dark border-0 rounded-3 shadow-sm">Cargando…</div>
    </div>
  );
}

function Home() {
  const populares = getGames("populares").slice(0, 12);
  const nuevos = getGames("nuevos").slice(0, 12);
  const slots = getGames("slots").slice(0, 12);
  const slides = [
    { src: "banners/banner1.png", alt: "Promo 1" },
    { src: "banners/banner2.png", alt: "Promo 2" },
    { src: "banners/banner3.png", alt: "Promo 3" },
  ];
  return (
    <div className="page-main" data-main>
      <section className="mb-5">
        <ImagesSlider slides={slides} aspectRatio="21 / 9" maxHeight={480} fit="cover" rounded />
      </section>
      <section className="mb-5"><GameGrid title="Populares" games={populares} limit={12} /></section>
      <section className="mb-5"><GameGrid title="Juegos nuevos" games={nuevos} limit={12} /></section>
      <section className="mb-5"><GameGrid title="Pagamonedas" games={slots} limit={12} /></section>
    </div>
  );
}

function CasinoCategoryPage() {
  const { cat } = useParams<{ cat: string }>();
  const isValid = !!cat && (CATEGORIES as readonly Category[]).includes(cat as Category);
  if (!isValid) {
    return (
      <div className="container py-4" data-main>
        <div className="alert alert-dark border-0 rounded-3 shadow-lg">
          <h3 className="mb-1">Categoría no válida</h3>
          <p className="mb-0 text-secondary">Verifica el enlace o vuelve al catálogo.</p>
        </div>
      </div>
    );
  }
  const category = cat as Category;
  const title = CATEGORY_LABELS[category];
  const list = getGames(category);
  return (
    <div className="page-main" data-main>
      <GameGrid title={title} games={list} limit={null} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="container py-4" data-main>
      <div className="alert alert-dark border-0 rounded-3 shadow-lg">
        <h3 className="mb-1">404 - Página no encontrada</h3>
        <p className="mb-0 text-secondary">La ruta que intentas abrir no existe.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <RouteA11yFocus />
      <FloatingChatMenu hideOnPath={/^\/play(\/|$)/i} whatsappNumber="573244805747" telegramUrl="https://t.me/tu_usuario" />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/recargar" element={<Recargar />} />
          <Route path="/puntos-de-recarga" element={<RecargaInfoPage />} />
          <Route path="casino/:cat" element={<CasinoCategoryPage />} />
          <Route path="juego/:slug" element={<Suspense fallback={<Fallback />}><GameDetails /></Suspense>} />
          <Route path="play/:slug" element={<Suspense fallback={<Fallback />}><GamePlay /></Suspense>} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
