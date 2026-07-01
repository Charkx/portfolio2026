"use client"

// Doit s'exécuter avant le montage de tout <Canvas> R3F (corrige le crash
// "Invalid argument not valid semver" de l'extension React DevTools).
import "./lib/devtoolsSemverGuard"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import HeroSection from "./sections/HeroSection"
import { CyberpunkLoader } from "./components/ui/LoadingScreen"
import { useOptimizedScroll } from "./hooks/useOptimizedScroll"
import { usePortfolioStore } from "./store/portfolioStore"
import { useModalStore } from "./store/modalStore"
import ARInterface from "./components/ui/ARInterface"
import CustomCursor from "./components/ui/CustomCursor"
import SmoothScroll from "./components/SmoothScroll"
import ModalRoot from "./components/ui/ModalRoot"
import LegalContent from "./components/LegalContent"
import { preloadAssets } from "./lib/preloadAssets"
import { ErrorBoundary } from "./hooks/ErrorBoundary"

// Modèles 3D lourds préchargés pendant l'écran de chargement (progression réelle).
const HEAVY_ASSETS = [
  "/3d/holograming_man.glb",
  "/3d/brain_hologram.glb",
  "/3d/earth_globe_hologram_2mb_looping_animation.glb",
]

// Petit fallback pendant le chargement client des sections 3D
function SectionFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-cyan-400/60 font-mono text-sm">
      <span className="animate-pulse">{"// loading module..."}</span>
    </div>
  )
}

// Sections lourdes (Three.js) chargées côté client uniquement (ssr:false) :
// code-split hors du bundle initial, montées dès l'hydratation de la page.
const AboutSection = dynamic(() => import("./sections/AboutSection"), {
  ssr: false,
  loading: SectionFallback,
})
const SkillsSection = dynamic(() => import("./sections/SkillsSection"), {
  ssr: false,
  loading: SectionFallback,
})
const ProjectsSection = dynamic(
  () => import("./sections/ProjectsSection").then((m) => m.ProjectsSection),
  { ssr: false, loading: SectionFallback }
)
const TransmissionChannel = dynamic(() => import("./sections/TransmissionChannel"), {
  ssr: false,
  loading: SectionFallback,
})
// Canvas 3D partagé (humain holographique) — se niche dans les slots des sections migrées
const AugmentedHumanLayer = dynamic(() => import("./components/3d/AugmentedHumanLayer"), {
  ssr: false,
})

export default function CyberpunkLanding() {
  const { isLoading, setIsLoading, introPhase, setIntroPhase } = usePortfolioStore()
  const openModal = useModalStore((s) => s.open)
  const [progress, setProgress] = useState(0)

  // Hook pour améliorer le scroll (expérience utilisateur)
  useOptimizedScroll()

  // Vrai chargement : précharge les modèles 3D (le loader reflète la progression réelle).
  useEffect(() => {
    let done = false
    const start = performance.now()
    const finish = () => {
      if (done) return
      done = true
      setProgress(100)
      setIsLoading(false)
    }
    preloadAssets(HEAVY_ASSETS, (p) => setProgress(p)).finally(() => {
      // affichage minimum de 900 ms pour ne pas "flasher"
      window.setTimeout(finish, Math.max(0, 900 - (performance.now() - start)))
    })
    const cap = window.setTimeout(finish, 6000) // filet : ne bloque jamais >6 s
    return () => window.clearTimeout(cap)
  }, [setIsLoading])

  if (isLoading) {
    return (
      <div aria-live="polite">
        <CyberpunkLoader progress={progress} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <SmoothScroll />
      <CustomCursor />
      <ARInterface />
      <main className="relative z-10">
        <HeroSection
          onScan={() => { if (introPhase === "LOCKED") setIntroPhase("SCANNING") }}
        />

        {introPhase === "UNLOCKED" && (
          <>
              <AugmentedHumanLayer />
              <ErrorBoundary fallback={null}>
                <AboutSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={null}>
                <SkillsSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={null}>
                <ProjectsSection />
              </ErrorBoundary>
              <ErrorBoundary fallback={null}>
                <TransmissionChannel />
              </ErrorBoundary>
          </>
        )}

        <footer className="relative z-10 py-6 text-center text-cyan-100/30 font-mono text-xs">
          <span>© {new Date().getFullYear()} Charly Menthiller</span>
          <span className="mx-2">·</span>
          {/* href = repli sans JS (page indexable) · onClick = modale sans quitter la page */}
          <a
            href="/mentions-legales"
            onClick={(e) => {
              e.preventDefault()
              openModal({ title: "Mentions légales", size: "md", content: <LegalContent /> })
            }}
            className="hover:text-cyan-300 transition-colors underline"
          >
            Mentions légales
          </a>
        </footer>
      </main>

      <ModalRoot />
    </div>
  )
}
