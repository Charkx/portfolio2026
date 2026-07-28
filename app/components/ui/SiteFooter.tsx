"use client"

import { useModalStore } from "../../store/modalStore"
import LegalContent from "../LegalContent"
import { useT } from "../../i18n"

/**
 * Mentions légales du site. Rendu à DEUX endroits, jamais visible aux deux à la fois :
 *
 *  1. en fin de document (ClientApp) — le pied de page normal, celui qui clôt la page ;
 *  2. dans le calque de fin de session (ContactSection) — parce que ce calque est
 *     `fixed` et couvre tout l'écran : le pied de page du flux, lui, n'entre dans le
 *     champ qu'au tout dernier pixel de scroll. La section contact devait donc
 *     l'afficher elle-même plutôt que de le faire mériter.
 *
 * D'où l'extraction : deux blocs copiés-collés auraient fini par diverger, et c'est un
 * contenu obligatoire par la loi — le lien doit être le même des deux côtés.
 *
 * `hidden` masque en VISIBILITÉ et non en display : la hauteur du document reste
 * intacte (la cinématique de contact se règle dessus, cf. endTrigger), et l'exemplaire
 * masqué sort de l'ordre de tabulation comme de l'arbre d'accessibilité — on ne peut
 * pas tomber au clavier sur un lien invisible.
 */
export function SiteFooter({ id, className, hidden }: { id?: string; className?: string; hidden?: boolean }) {
  const openModal = useModalStore((s) => s.open)
  const t = useT()

  return (
    <footer id={id} className={className} style={hidden ? { visibility: "hidden" } : undefined}>
      <span>© {new Date().getFullYear()} Charly Menthiller</span>
      <span className="mx-2">·</span>
      {/* href = repli sans JS (page indexable) · onClick = modale sans quitter la page */}
      <a
        href="/mentions-legales"
        onClick={(e) => {
          e.preventDefault()
          openModal({ title: t.misc.legalModal, size: "md", content: <LegalContent /> })
        }}
        className="hover:text-cyan-300 transition-colors underline"
      >
        {t.misc.footerLegal}
      </a>
    </footer>
  )
}
