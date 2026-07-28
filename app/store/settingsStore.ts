"use client"

import { create } from "zustand"

// Préférences d'expérience réglées dans la console de calibrage (écran d'entrée),
// persistées entre les visites.
export type MotionPref = "auto" | "full" | "reduced" // auto = suit prefers-reduced-motion
export type QualityPref = "high" | "eco"             // eco = bloom bon marché + DPR plafonné

const MOTION_KEY = "pref-motion"
const QUALITY_KEY = "pref-quality"

function initial<T extends string>(key: string, allowed: readonly T[], def: T): T {
  if (typeof window === "undefined") return def
  const v = window.localStorage.getItem(key) as T | null
  return v && allowed.includes(v) ? v : def
}

// tactile (téléphone/tablette) sans préférence enregistrée → éco d'office :
// fluidité garantie au premier contact ; le calibrage permet toujours de passer HIGH
function initialQuality(): QualityPref {
  if (typeof window === "undefined") return "high"
  const def: QualityPref = window.matchMedia("(pointer: coarse)").matches ? "eco" : "high"
  return initial(QUALITY_KEY, ["high", "eco"], def)
}

interface SettingsState {
  motion: MotionPref
  quality: QualityPref
  setMotion: (m: MotionPref) => void
  setQuality: (q: QualityPref) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  motion: initial(MOTION_KEY, ["auto", "full", "reduced"], "auto"),
  quality: initialQuality(),
  setMotion: (m) => {
    window.localStorage.setItem(MOTION_KEY, m)
    set({ motion: m })
  },
  setQuality: (q) => {
    window.localStorage.setItem(QUALITY_KEY, q)
    set({ quality: q })
  },
}))
