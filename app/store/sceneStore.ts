"use client"

import { create } from "zustand"

/**
 * État interactif partagé entre les contrôles HTML des sections et les modules
 * 3D embarqués dans le canvas humain (cerveau, ADN, globe…).
 * Le HTML écrit, le module 3D lit → l'interactivité est préservée dans l'humain.
 */
interface SceneState {
  // About → cerveau (catégorie active : PROFIL / EXPÉRIENCE / FORMATION)
  aboutSelected: number
  setAboutSelected: (i: number) => void

  // Skills → ADN (ids de technos en minuscules)
  skillsVisible: string[]                       // technos révélées (entrée de section)
  setSkillsVisible: (v: string[]) => void
  skillsHovered: string | null
  setSkillsHovered: (id: string | null) => void
  skillsSelected: string | null
  setSkillsSelected: (id: string | null) => void
  skillsLevel: number                           // filtre par niveau (0 = tout)
  setSkillsLevel: (n: number) => void

  // Projets → réacteur Iron Man (puces = projets)
  projectSelected: number | null                // index du projet sélectionné
  setProjectSelected: (i: number | null) => void
  projectHovered: number | null                 // index du projet survolé
  setProjectHovered: (i: number | null) => void
  projectColors: string[]                       // couleur (statut) de chaque projet, dans l'ordre
  setProjectColors: (c: string[]) => void
  // données des cartes-boutons flottantes (autour des puces du réacteur)
  projectCards: { id: string; title: string; tech: string[]; statusLabel: string }[]
  setProjectCards: (c: { id: string; title: string; tech: string[]; statusLabel: string }[]) => void
  // pont canvas → React : clic sur une carte flottante → sélection (via useProjectManager)
  requestSelectProject: ((i: number) => void) | null
  setRequestSelectProject: (fn: ((i: number) => void) | null) => void

  // Rotation manuelle des modules à la souris (drag sur le slot de section)
  manualRot: Record<string, { x: number; y: number }> // rotation accumulée par focus
  nudgeRot: (focus: string, dx: number, dy: number) => void
  dragFocus: string | null                      // module en cours de drag (met l'auto-spin en pause)
  setDragFocus: (f: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  aboutSelected: 0,
  setAboutSelected: (i) => set({ aboutSelected: i }),

  skillsVisible: [],
  setSkillsVisible: (v) => set({ skillsVisible: v }),
  skillsHovered: null,
  setSkillsHovered: (id) => set({ skillsHovered: id }),
  skillsSelected: null,
  setSkillsSelected: (id) => set({ skillsSelected: id }),
  skillsLevel: 0,
  setSkillsLevel: (n) => set({ skillsLevel: n }),

  projectSelected: null,
  setProjectSelected: (i) => set({ projectSelected: i }),
  projectHovered: null,
  setProjectHovered: (i) => set({ projectHovered: i }),
  projectColors: [],
  setProjectColors: (c) => set({ projectColors: c }),
  projectCards: [],
  setProjectCards: (c) => set({ projectCards: c }),
  requestSelectProject: null,
  setRequestSelectProject: (fn) => set({ requestSelectProject: fn }),

  manualRot: {},
  nudgeRot: (focus, dx, dy) => set((s) => {
    const cur = s.manualRot[focus] ?? { x: 0, y: 0 };
    const x = Math.max(-1, Math.min(1, cur.x + dy)); // tangage limité (±~57°)
    return { manualRot: { ...s.manualRot, [focus]: { x, y: cur.y + dx } } };
  }),
  dragFocus: null,
  setDragFocus: (f) => set({ dragFocus: f }),
}))
