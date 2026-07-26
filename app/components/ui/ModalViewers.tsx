"use client"

import { useT } from "../../i18n"

// Visionneuse PDF (CV) : iframe + bouton de secours (téléchargement/ouverture — fiable sur mobile).
export function PdfViewer({ src, downloadName }: { src: string; downloadName?: string }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3 h-[70svh]">
      <iframe src={src} title="CV" className="w-full grow rounded border border-cyan-400/20 bg-white" />
      <a
        href={src}
        download={downloadName}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400
                   text-black font-semibold transition-colors text-sm"
      >
        {t.misc.pdfDownload}
      </a>
    </div>
  )
}

// Prise de rendez-vous Calendly : iframe thémée cyberpunk (sombre + cyan) + lien de secours.
export function CalendlyViewer({ src }: { src: string }) {
  const t = useT()
  // params d'embed Calendly (hex SANS #) : fond sombre, texte holo, accent cyan
  const embed = `${src}?hide_gdpr_banner=1&background_color=0a0a0a&text_color=aef6ff&primary_color=22d3ee`
  return (
    <div className="flex flex-col gap-3 h-[70svh]">
      {/* data-keep-focus : on y REMPLIT un formulaire (nom, email). La modale ne doit
          pas reprendre le focus clavier ici, sinon les frappes partiraient dans le vide.
          Contrepartie assumée : Échap ne ferme pas tant qu'on est dans le formulaire —
          ce qui évite aussi de perdre une saisie sur une touche malheureuse. */}
      <iframe
        src={embed}
        title={t.contact.calendlyModal}
        loading="lazy"
        data-keep-focus
        className="w-full grow rounded border border-cyan-400/20 bg-[#0a0a0a]"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded border border-cyan-400/40
                   text-cyan-200 hover:bg-cyan-400/10 transition-colors text-sm"
      >
        {t.misc.calendlyOpen}
      </a>
    </div>
  )
}

// Visionneuse de site live (démo) : iframe + lien plein écran de secours (si le site refuse l'iframe).
export function SiteViewer({ src }: { src: string }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3 h-[70svh]">
      <iframe
        src={src}
        title={t.misc.demoTitle}
        loading="lazy"
        className="w-full grow rounded border border-cyan-400/20 bg-black"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded border border-cyan-400/40
                   text-cyan-200 hover:bg-cyan-400/10 transition-colors text-sm"
      >
        {t.misc.demoOpen}
      </a>
    </div>
  )
}
