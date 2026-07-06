"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { IntroPhase } from "../utils/types"

interface PortfolioState {
  // État de chargement
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Phases d'introduction
  introPhase: IntroPhase
  setIntroPhase: (phase: IntroPhase) => void

  //Barre de progression du scroll
  scrollProgress: number
  setScrollProgress: (p: number) => void


  // Navigation
  currentSection: string
  setCurrentSection: (section: string) => void

  // Scroll
  scrollY: number
  setScrollY: (y: number) => void

  // Skills
  skillsProgress: number
  setSkillsProgress: (progress: number) => void

  // Interference
  interferenceLevel: number
  setInterferenceLevel: (level: number) => void

  // Debug
  debugMode: boolean
  toggleDebugMode: () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    (set, get) => ({
      // État initial
      isLoading: true,
      introPhase: "LOCKED",
      currentSection: "hero",
      scrollY: 0,
      skillsProgress: 0,
      interferenceLevel: 0.3,
      debugMode: process.env.NODE_ENV === "development",

      // Actions (pas de console.log ici : la console prod doit rester muette)
      setIsLoading: (loading) => set({ isLoading: loading }),

      setIntroPhase: (phase) => set({ introPhase: phase }),

      setScrollProgress: (p) => set({ scrollProgress: p }),

      setCurrentSection: (section) => {
        if (get().currentSection !== section) set({ currentSection: section })
      },

      setScrollY: (y) => set({ scrollY: y }),

      setSkillsProgress: (progress) => {
        if (get().skillsProgress !== progress) set({ skillsProgress: progress })
      },

      setInterferenceLevel: (level) => {
        if (get().interferenceLevel !== level) set({ interferenceLevel: level })
      },

      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
    }),
    { name: "portfolio-store" },
  ),
)
