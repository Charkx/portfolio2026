import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Secteur mémoire introuvable",
  robots: { index: false },
};

// 404 diégétique : un secteur mémoire corrompu dans l'interface AR.
// Volontairement statique (aucun JS, pas de 3D) : instantanée et robuste.
export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-black flex items-center justify-center px-6 overflow-hidden">
      {/* scanlines STATIQUES (la version animée fait vibrer le texte) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.35) 2px, rgba(0,255,255,0.35) 4px)" }}
      />
      {/* coins HUD (même langage que l'interface) */}
      <div aria-hidden="true">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400/70" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400/70" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400/70" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400/70" />
      </div>

      <div className="relative text-center font-mono">
        <div className="text-pink-400/70 text-xs tracking-[0.3em] mb-6">
          &gt; ERREUR 0x404 — ACCÈS MÉMOIRE REFUSÉ
        </div>

        <h1
          className="glitch text-7xl md:text-9xl font-bold text-cyan-300 mb-6"
          data-text="404"
          style={{ fontFamily: "var(--font-orbitron), monospace" }}
        >
          404
        </h1>

        <p className="text-cyan-400/80 text-sm md:text-base mb-2 tracking-wider">
          SECTEUR MÉMOIRE INTROUVABLE
        </p>
        <p className="text-gray-500 text-xs md:text-sm mb-10">
          Le fragment demandé n&apos;existe pas ou a été purgé du système.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-lg border border-cyan-400/60 bg-cyan-400/5 text-cyan-300
                     text-sm tracking-[0.2em] transition-all
                     hover:bg-cyan-400/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]
                     focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          RETOUR AU FLUX PRINCIPAL
        </Link>
      </div>
    </main>
  );
}
