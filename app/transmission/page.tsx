"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import * as THREE from "three"
import { useDiscoveryStore, isDiscoveryComplete } from "../store/discoveryStore"
import type { Pulse } from "../components/3d/holoMaterial"
import type { Float } from "./TransmissionCanvas"
import { audioEngine } from "../lib/audioEngine"

// Le canvas 3D (three/GLTF) n'est chargé que côté client : évite toute exécution
// WebGL au prerender/build (même parti pris que le canvas permanent du site).
const TransmissionCanvas = dynamic(() => import("./TransmissionCanvas"), { ssr: false })

const GAME_TIME = 45          // durée d'une session (s) — survivre jusque-là = victoire
const HOST_HP = 100           // intégrité de l'hôte
const HIT_DMG = 15            // dégâts par brèche

export default function TransmissionPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle")
  const [outcome, setOutcome] = useState<"win" | "lose">("win")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [best, setBest] = useState(0)
  const [combo, setCombo] = useState(0)
  const [integrity, setIntegrity] = useState(HOST_HP)
  const [floats, setFloats] = useState<Float[]>([])
  const hpRef = useRef(HOST_HP)
  const floatId = useRef(0)
  const pulse = useRef<Pulse>({ t: { value: 99 }, o: { value: new THREE.Vector3() } }).current

  useEffect(() => {
    setAllowed(isDiscoveryComplete(useDiscoveryStore.getState().found))
    setBest(Number(localStorage.getItem("cm-transmission-best") || 0))
  }, [])

  const endGame = useCallback((result: "win" | "lose") => {
    setOutcome(result)
    setPhase("over")
    audioEngine.play(result === "win" ? "success" : "powerdown")
    setBest((b) => {
      const nb = Math.max(b, score)
      localStorage.setItem("cm-transmission-best", String(nb))
      return nb
    })
  }, [score])

  // compte à rebours → victoire si on tient jusqu'à 0
  useEffect(() => {
    if (phase !== "playing") return
    if (timeLeft <= 0) { endGame("win"); return }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, endGame])

  const start = () => {
    setScore(0); setCombo(0); setTimeLeft(GAME_TIME); setIntegrity(HOST_HP)
    hpRef.current = HOST_HP; setFloats([]); setOutcome("win")
    setPhase("playing"); audioEngine.play("boot")
  }

  const onHit = useCallback((points: number) => setScore((s) => s + points), [])
  const onBreach = useCallback(() => {
    hpRef.current = Math.max(0, hpRef.current - HIT_DMG)
    setIntegrity(hpRef.current)
    if (hpRef.current <= 0) endGame("lose")
  }, [endGame])
  const onFloat = useCallback((f: Omit<Float, "id">) => {
    const id = floatId.current++
    setFloats((list) => [...list, { ...f, id }])
    setTimeout(() => setFloats((list) => list.filter((x) => x.id !== id)), 850)
  }, [])

  if (allowed === null) return <main className="fixed inset-0 bg-black" />

  if (!allowed) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 text-center font-mono px-6">
        <div className="text-cyan-300 text-lg tracking-[0.3em]">&gt; SIGNAL INCOMPLET</div>
        <p className="text-cyan-400/60 text-sm max-w-md">
          Cette transmission se déverrouille en captant les 5 signaux disséminés dans le site (jauge SIG).
        </p>
        <button onClick={() => router.push("/")} className="rounded border border-cyan-400/50 px-5 py-2 text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer">
          ◂ RETOUR
        </button>
      </main>
    )
  }

  const integrityPct = Math.round(integrity)

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <TransmissionCanvas
        running={phase === "playing"} pulse={pulse} defeated={phase === "over" && outcome === "lose"}
        onHit={onHit} onBreach={onBreach} onCombo={setCombo} onFloat={onFloat}
      />

      {/* points flottants */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floats.map((f) => (
          <span
            key={f.id}
            className={`absolute font-mono font-bold select-none float-rise ${f.big ? "text-pink-300 text-2xl" : "text-cyan-200 text-lg"}`}
            style={{ left: f.x, top: f.y, transform: "translate(-50%,-50%)", textShadow: "0 0 8px rgba(34,211,238,0.7)" }}
          >
            {f.text}
          </span>
        ))}
      </div>

      {/* HUD jeu */}
      <div className="pointer-events-none absolute inset-0 flex flex-col font-mono text-cyan-300">
        <div className="flex items-start justify-between p-6">
          <Link href="/" className="pointer-events-auto rounded border border-cyan-400/40 px-4 py-1.5 text-xs tracking-widest hover:bg-cyan-400/10 transition-colors">
            ◂ QUITTER
          </Link>

          {/* intégrité de l'hôte + combo */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70">INTÉGRITÉ DE L&apos;HÔTE</div>
            <div className="w-56 h-2 rounded-full bg-cyan-950/60 border border-cyan-400/30 overflow-hidden">
              <div
                className="h-full transition-all duration-200"
                style={{ width: `${integrityPct}%`, background: integrityPct > 33 ? "#22d3ee" : "#f43f5e", boxShadow: "0 0 10px currentColor" }}
              />
            </div>
            {combo > 1 && phase === "playing" && (
              <div className="text-pink-300 text-sm tracking-widest animate-pulse">COMBO ×{combo}</div>
            )}
          </div>

          <div className="text-right text-xs">
            <div>SCORE <span className="text-cyan-100 text-base">{score}</span></div>
            <div className={timeLeft <= 10 && phase === "playing" ? "text-pink-400" : "text-cyan-400/70"}>
              {phase === "playing" ? `${timeLeft}s` : `RECORD ${best}`}
            </div>
          </div>
        </div>

        {/* écrans idle / fin */}
        {phase !== "playing" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="pointer-events-auto text-center rounded-xl border border-cyan-400/40 bg-black/70 backdrop-blur-md px-10 py-8 max-w-md">
              {phase === "over" ? (
                <>
                  <div className={`text-sm tracking-[0.3em] mb-2 ${outcome === "win" ? "text-green-300" : "text-pink-300"}`}>
                    &gt; {outcome === "win" ? "HÔTE PRÉSERVÉ" : "HÔTE COMPROMIS"}
                  </div>
                  <div className="text-4xl text-cyan-100 mb-1">{score}</div>
                  <div className="text-cyan-400/60 text-xs mb-6">menaces neutralisées · record {best}</div>
                </>
              ) : (
                <>
                  <div className="text-cyan-200 text-lg tracking-[0.25em] mb-2">SIGNAL CAPTÉ ✦</div>
                  <p className="text-cyan-400/70 text-xs leading-relaxed mb-6">
                    Des data-cubes convergent vers l&apos;hôte holographique. Clique-les avant l&apos;impact —
                    enchaîne pour le combo. Une brèche entame l&apos;intégrité. Tiens {GAME_TIME}s.
                  </p>
                </>
              )}
              <button onClick={start} className="rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2.5 text-sm tracking-widest transition-colors cursor-pointer">
                {phase === "over" ? "REJOUER" : "▸ LANCER"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
