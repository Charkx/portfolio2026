"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Signaux à capter — 5 interactions cachées disséminées dans le site.
 * Les capter tous (SIG 100 %) déverrouille la transmission secrète (mini-jeu).
 * L'ordre = l'ordre d'apparition au fil du scroll (hero → contact).
 */
export const SIGNALS = [
  { id: "firefly", label: "LUCIOLE CAPTÉE",  hint: "Récolte une luciole de données (accueil)" },
  { id: "brain",   label: "CORTEX SCANNÉ",   hint: "Scanne le cerveau (À propos)" },
  { id: "adn",     label: "ADN RÉAGENCÉ",     hint: "Réagence une hélice (Compétences)" },
  { id: "cube",    label: "CUBE DÉCRYPTÉ",    hint: "Fais exploser un data-cube (Projets)" },
  { id: "card",    label: "CANAL OUVERT",     hint: "Fais parler la carte (Contact)" },
] as const

export type SignalId = (typeof SIGNALS)[number]["id"]

interface DiscoveryState {
  found: SignalId[]
  lastFound: SignalId | null   // dernier capté → toast + son (consommé puis remis à null)
  discover: (id: SignalId) => void
  clearLast: () => void
}

export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      found: [],
      lastFound: null,
      discover: (id) => {
        if (get().found.includes(id)) return          // déjà capté → aucun effet
        set((s) => ({ found: [...s.found, id], lastFound: id }))
      },
      clearLast: () => set({ lastFound: null }),
    }),
    {
      name: "cm-signals",                              // clé localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ found: s.found }),         // on ne persiste que la liste
    },
  ),
)

/** Progression 0..1 (sélecteur pur, hors du store pour éviter les re-renders). */
export const discoveryProgress = (found: SignalId[]) => found.length / SIGNALS.length
export const isDiscoveryComplete = (found: SignalId[]) => found.length >= SIGNALS.length
