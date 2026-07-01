"use client"

import { create } from "zustand"
import { audioEngine } from "../lib/audioEngine"

interface AudioState {
  enabled: boolean
  toggle: () => void
}

/** État son partagé (HUD ↔ moteur). Coupé par défaut ; l'activation se fait au clic (geste utilisateur). */
export const useAudioStore = create<AudioState>((set, get) => ({
  enabled: false,
  toggle: () => {
    const next = !get().enabled
    if (next) {
      audioEngine.enable()      // crée/reprend le contexte (dans le handler de clic → autorisé)
      audioEngine.play("success") // bip de confirmation "son activé"
    } else {
      audioEngine.disable()
    }
    set({ enabled: next })
  },
}))
