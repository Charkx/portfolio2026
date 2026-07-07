"use client"

import { useLangStore } from "../store/langStore"
import { fr, en, type Dict } from "./dict"

const DICTS: Record<"fr" | "en", Dict> = { fr, en }

/** Dictionnaire de la langue active — re-render automatique au changement. */
export function useT(): Dict {
  const lang = useLangStore((s) => s.lang)
  return DICTS[lang]
}

/** Accès impératif (hors composant React : stores, callbacks…). */
export function getDict(): Dict {
  return DICTS[useLangStore.getState().lang]
}
