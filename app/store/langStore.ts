"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type Lang = "fr" | "en"

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

/** Langue de l'interface — persistée entre les visites (toggle FR/EN de l'ATH). */
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "fr",
      setLang: (lang) => {
        set({ lang })
        // reflète la langue sur <html lang> (lecteurs d'écran, correcteurs)
        if (typeof document !== "undefined") document.documentElement.lang = lang
      },
    }),
    { name: "cm-lang", storage: createJSONStorage(() => localStorage) },
  ),
)
