"use client"

import { create } from "zustand"
import { audioEngine } from "../lib/audioEngine"

const VOLUME_KEY = "audio-volume"

// volume persisté entre les visites (0..1, par cinquièmes = barres de signal du HUD)
function initialVolume(): number {
  if (typeof window === "undefined") return 0.6
  const v = parseFloat(window.localStorage.getItem(VOLUME_KEY) ?? "")
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.6
}

interface AudioState {
  enabled: boolean
  volume: number // 0..1
  optIn: boolean // choix "FLUX AUDIO" de la console de calibrage — appliqué à l'entrée
  toggle: () => void
  setEnabled: (on: boolean) => void // sans bip — pour l'opt-in de l'écran d'entrée
  setOptIn: (v: boolean) => void
  setVolume: (v: number) => void
}

/** État son partagé (HUD ↔ moteur). Coupé par défaut ; l'activation se fait au clic (geste utilisateur). */
export const useAudioStore = create<AudioState>((set, get) => ({
  enabled: false,
  volume: (() => { const v = initialVolume(); audioEngine.setVolume(v); return v })(),
  optIn: true, // l'expérience est pensée avec le son — jamais imposée (la console permet de couper)
  toggle: () => {
    const next = !get().enabled
    if (next) {
      audioEngine.enable()      // crée/reprend le contexte (dans le handler de clic → autorisé)
      audioEngine.play("success") // bip de confirmation "son activé"
    } else {
      audioEngine.disable()
    }
    // un geste explicite sur le son vaut choix d'opt-in (cohérent si on re-verrouille)
    set({ enabled: next, optIn: next })
  },
  setOptIn: (v) => set({ optIn: v }),
  setEnabled: (on) => {
    if (on === get().enabled) return
    if (on) audioEngine.enable()
    else audioEngine.disable()
    set({ enabled: on })
  },
  setVolume: (v) => {
    const vol = Math.min(Math.max(v, 0), 1)
    audioEngine.setVolume(vol)
    if (typeof window !== "undefined") window.localStorage.setItem(VOLUME_KEY, String(vol))
    // cliquer une barre alors que le son est coupé = l'activer (on est dans un geste utilisateur)
    if (!get().enabled && vol > 0) audioEngine.enable()
    set({ volume: vol, enabled: get().enabled || vol > 0, optIn: get().optIn || vol > 0 })
    audioEngine.play("nav") // retour immédiat : on entend le nouveau niveau
  },
}))
