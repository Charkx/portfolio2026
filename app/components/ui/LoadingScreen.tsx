"use client"

import { useState, useEffect } from "react"

export function CyberpunkLoader() {
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("INITIALIZING...")

  const loadingSteps = [
    "INITIALIZING NEURAL INTERFACE...",
    "CONNECTING TO NETWORK...",
    "LOADING CYBERPUNK PROTOCOLS...",
    "ESTABLISHING SECURE CONNECTION...",
    "ACTIVATING HOLOGRAPHIC DISPLAY...",
    "NEURAL LINK ESTABLISHED",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 2
        const stepIndex = Math.floor((newProgress / 100) * loadingSteps.length)
        setLoadingText(loadingSteps[Math.min(stepIndex, loadingSteps.length - 1)])
        return Math.min(newProgress, 100)
      })
    }, 50)

    return () => clearInterval(interval)
  }, [loadingSteps])

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo/Titre */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 font-mono">
            NEURAL_INTERFACE
          </h1>
          <div className="text-cyan-400 font-mono text-sm">v2.077</div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-4">
          <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-sm font-mono">
            <span className="text-gray-400">Loading...</span>
            <span className="text-cyan-400">{progress}%</span>
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
