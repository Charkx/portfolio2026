"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface PortfolioState {
  // État de chargement
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

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
      currentSection: "hero",
      scrollY: 0,
      skillsProgress: 0,
      interferenceLevel: 0.3,
      debugMode: process.env.NODE_ENV === "development",

      // Actions
      setIsLoading: (loading) => {
        console.log("🔄 Loading state:", loading)
        set({ isLoading: loading })
      },

      setCurrentSection: (section) => {
        const current = get().currentSection
        if (current !== section) {
          console.log("📍 Section changed:", current, "→", section)
          set({ currentSection: section })
        }
      },

      setScrollY: (y) => set({ scrollY: y }),

      setSkillsProgress: (progress) => {
        const current = get().skillsProgress
        if (current !== progress) {
          console.log("🎯 Skills progress:", current, "→", progress)
          set({ skillsProgress: progress })
        }
      },

      setInterferenceLevel: (level) => {
        const current = get().interferenceLevel
        if (current !== level) {
          console.log("🌊 Interference level:", current, "→", level)
          set({ interferenceLevel: level })
        }
      },

      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
    }),
    { name: "portfolio-store" },
  ),
)
