"use client"

import { useEffect, useState } from "react"
import HeroSection from "./sections/HeroSection"
import AboutSection from "./sections/AboutSection"
import SkillsSection from "./sections/SkillsSection"
import { ProjectsSection } from "./sections/ProjectsSection"
import { ContactSection } from "./sections/ContactSection"
import { CyberpunkLoader } from "./components/ui/LoadingScreen"
import { useOptimizedScroll } from "./hooks/useOptimizedScroll"
import { usePortfolioStore } from "./store/portfolioStore"

import ARInterface from "./components/ui/ARInterface"
import MemoryReconstruction from "./components/3d/MemoryReconstruction"
import TransmissionChannel from "./sections/TransmissionChannel"

// Panneau de debug séparé pour plus de clarté
function DebugPanel({ currentSection, skillsProgress, interferenceLevel }: {
  currentSection: string
  skillsProgress: number
  interferenceLevel: number
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-green-400 p-4 rounded-lg font-mono text-sm border border-green-400">
      <div>
        Section: <span className="text-cyan-400">{currentSection || "hero"}</span>
      </div>
      <div>
        Skills: <span className="text-cyan-400">{skillsProgress || 0}/6</span>
      </div>
      <div>
        Interference: <span className="text-cyan-400">{(interferenceLevel || 0.3).toFixed(2)}</span>
      </div>
    </div>
  )
}

export default function CyberpunkLanding() {
  const { isLoading, setIsLoading, currentSection, skillsProgress, interferenceLevel, debugMode } = usePortfolioStore()
  const [accessGranted, setAccessGranted] = useState(false);
  const [scanInitiated, setScanInitiated] = useState(false);

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

      {/* Contenu principal du portfolio */}
      <main className="relative z-10">
         <div className="bg-black text-white overflow-x-hidden">
      <ARInterface />
      
      <HeroSection
        onScan={() => setScanInitiated(true)}
        onAccessGranted={() => setAccessGranted(true)}
        scanInitiated={scanInitiated}
      />
      
      {accessGranted && (
        <>
          <AboutSection />
          <SkillsSection />
          <ProjectsSection />
          <TransmissionChannel />
        </>
      )}
    </div>
        {/* <HeroSection />
        <AboutSection interferenceLevel={interferenceLevel} />
        <SkillsSection skillsProgress={skillsProgress}/>
        <ProjectsSection />
        <ContactSection /> */}
      </main>
    </div>
  )
}
