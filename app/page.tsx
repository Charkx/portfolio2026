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
import ARInterface from "./components/ui/ARInterface"
import { ErrorBoundary } from "./hooks/ErrorBoundary"

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

export default function CyberpunkLanding() {
  const { isLoading, setIsLoading, introPhase, setIntroPhase } = usePortfolioStore()

  // Hook pour améliorer le scroll (expérience utilisateur)
  useOptimizedScroll()

  // Simulation du chargement (à remplacer par un vrai chargement si besoin)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [setIsLoading])

  if (isLoading) {
    return (
      <div aria-live="polite">
        <CyberpunkLoader />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <ARInterface />
      <main className="relative z-10">
        <HeroSection
          onScan={() => { if (introPhase === "LOCKED") setIntroPhase("SCANNING") }}
        />

        {introPhase === "UNLOCKED" && (
          <>
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
      </main>
    </div>
  )
}
