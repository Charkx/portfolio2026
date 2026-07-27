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
      debugMode: process.env.NODE_ENV === "development",

      // Actions (pas de console.log ici : la console prod doit rester muette)
      setIsLoading: (loading) => set({ isLoading: loading }),

      setIntroPhase: (phase) => set({ introPhase: phase }),

      setScrollProgress: (p) => set({ scrollProgress: p }),

      setCurrentSection: (section) => {
        if (get().currentSection !== section) set({ currentSection: section })
      },

      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
    }),
    { name: "portfolio-store" },
  ),
)
