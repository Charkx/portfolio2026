"use client"

// Visionneuse PDF (CV) : iframe + bouton de secours (téléchargement/ouverture — fiable sur mobile).
export function PdfViewer({ src, downloadName }: { src: string; downloadName?: string }) {
  return (
    <div className="flex flex-col gap-3 h-[75vh]">
      <iframe src={src} title="CV" className="w-full grow rounded border border-cyan-400/20 bg-white" />
      <a
        href={src}
        download={downloadName}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start inline-flex items-center gap-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400
                   text-black font-semibold transition-colors text-sm"
      >
        ↓ Télécharger le PDF
      </a>
    </div>
  )
}

// Visionneuse de site live (démo) : iframe + lien plein écran de secours (si le site refuse l'iframe).
export function SiteViewer({ src }: { src: string }) {
  return (
    <div className="flex flex-col gap-3 h-[75vh]">
      <iframe
        src={src}
        title="Démo du projet"
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
        Ouvrir en plein écran ↗
      </a>
    </div>
  )
}
