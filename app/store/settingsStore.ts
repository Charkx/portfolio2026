"use client"

import { create } from "zustand"

// Préférences d'expérience réglées dans la console de calibrage (écran d'entrée),
// persistées entre les visites.
export type MotionPref = "auto" | "full" | "reduced" // auto = suit prefers-reduced-motion
export type QualityPref = "high" | "eco"             // eco = bloom coupé + DPR plafonné

const MOTION_KEY = "pref-motion"
const QUALITY_KEY = "pref-quality"

function initial<T extends string>(key: string, allowed: readonly T[], def: T): T {
  if (typeof window === "undefined") return def
  const v = window.localStorage.getItem(key) as T | null
  return v && allowed.includes(v) ? v : def
}

interface SettingsState {
  motion: MotionPref
  quality: QualityPref
  setMotion: (m: MotionPref) => void
  setQuality: (q: QualityPref) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  motion: initial(MOTION_KEY, ["auto", "full", "reduced"], "auto"),
  quality: initial(QUALITY_KEY, ["high", "eco"], "high"),
  setMotion: (m) => {
    window.localStorage.setItem(MOTION_KEY, m)
    set({ motion: m })
  },
  setQuality: (q) => {
    window.localStorage.setItem(QUALITY_KEY, q)
    set({ quality: q })
  },
}))
