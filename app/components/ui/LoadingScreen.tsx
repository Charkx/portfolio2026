"use client"

const LOADING_STEPS = [
  "INITIALISATION...",
  "CHARGEMENT DES MODULES HOLOGRAPHIQUES...",
  "DÉCOMPRESSION DU MODÈLE NEURAL...",
  "CALIBRAGE DE L'INTERFACE...",
  "SYSTÈME PRÊT",
]

// Loader contrôlé : `progress` (0-100) reflète le chargement réel des modèles 3D.
export function CyberpunkLoader({ progress = 0 }: { progress?: number }) {
  const pct = Math.round(progress)
  const loadingText = LOADING_STEPS[Math.min(LOADING_STEPS.length - 1, Math.floor((pct / 100) * LOADING_STEPS.length))]

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo/Titre */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 font-display">
            NEURAL_INTERFACE
          </h1>
          <div className="text-cyan-400 font-mono text-sm">v2.077</div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-4">
          <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between text-sm font-mono">
            <span className="text-gray-400">Chargement...</span>
            <span className="text-cyan-400">{pct}%</span>
          </div>
        </div>

        {/* Texte de chargement */}
        <div className="text-green-400 font-mono text-sm animate-pulse">{loadingText}</div>

        {/* Indicateurs de statut */}
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs font-mono">NEURAL_LINK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
            <span className="text-cyan-400 text-xs font-mono">NETWORK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <span className="text-yellow-400 text-xs font-mono">SECURITY</span>
          </div>
        </div>

        {/* Effet de scan */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse"></div>
          <div className="text-gray-600 font-mono text-xs">Scanning neural pathways...</div>
        </div>
      </div>
    </div>
  )
}
