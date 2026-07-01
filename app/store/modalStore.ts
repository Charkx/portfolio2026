"use client"

import { create } from "zustand"
import type { ReactNode } from "react"
import { audioEngine } from "../lib/audioEngine"

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
  open:  (payload) => { audioEngine.play("modalOpen"); set({ modal: payload }) },
  close: () => { audioEngine.play("modalClose"); set({ modal: null }) },
}))
