"use client"

import { create } from "zustand"
import type { ReactNode } from "react"

// Largeur de la modale : md = texte lisible · lg/xl = visionneuses (CV, démos) presque plein écran
export type ModalSize = "md" | "lg" | "xl"

export interface ModalPayload {
  title:   string
  content: ReactNode
  size?:   ModalSize
}

interface ModalState {
  modal: ModalPayload | null
  open:  (payload: ModalPayload) => void
  close: () => void
}

/** Modale globale unique : n'importe quel composant l'ouvre sans quitter la page. */
export const useModalStore = create<ModalState>((set) => ({
  modal: null,
  open:  (payload) => set({ modal: payload }),
  close: () => set({ modal: null }),
}))
