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
import CustomCursor from "../components/ui/CustomCursor"
import { useT } from "../i18n"

// Le canvas 3D (three/GLTF) n'est chargé que côté client : évite toute exécution
// WebGL au prerender/build (même parti pris que le canvas permanent du site).
const TransmissionCanvas = dynamic(() => import("./TransmissionCanvas"), { ssr: false })

const GAME_TIME = 45          // durée d'une session (s) — survivre jusque-là = victoire
const HOST_HP = 100           // intégrité de l'hôte
const HIT_DMG = 15            // dégâts par brèche

export default function TransmissionPage() {
  const router = useRouter()
  const t = useT()
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
  // Boîte à uniformes partagée avec le canvas : une identité STABLE qu'on mute au
  // lieu de la remplacer (c'est l'idiome R3F — re-rendre React à 60 images/s est
  // précisément ce qu'on veut éviter). Elle était créée par `useRef(...).current`,
  // donc lue en plein rendu ; l'initialiseur paresseux de useState donne la même
  // stabilité sans toucher à une ref pendant le rendu.
  const [pulse] = useState<Pulse>(() => ({ t: { value: 99 }, o: { value: new THREE.Vector3() } }))

  // localStorage et le store de découverte n'existent pas au rendu serveur :
  // on ne peut savoir qu'ici si l'accès est acquis.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- une seule fois, au montage
    setAllowed(isDiscoveryComplete(useDiscoveryStore.getState().found))
    setBest(Number(localStorage.getItem("cm-transmission-best") || 0))
  }, [])

  // thème d'ENTRÉE (arpège tendu de l'arrivée sur le site) pendant tout le mini-jeu,
  // puis retour à la variante douce du site en repartant
  useEffect(() => {
    audioEngine.setScene("entry")
    return () => audioEngine.setScene("site")
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fin du compte à rebours : la transition d'état EST l'effet
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
      <main className="page-fade-in fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 text-center font-mono px-6">
        <CustomCursor />
        <div className="text-cyan-300 text-lg tracking-[0.3em]">{t.transmission.lockedTitle}</div>
        <p className="text-cyan-400/60 text-sm max-w-md">
          {t.transmission.lockedBody}
        </p>
        <button onClick={() => router.push("/")} className="rounded border border-cyan-400/50 px-5 py-2 text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer">
          {t.transmission.back}
        </button>
      </main>
    )
  }

  const integrityPct = Math.round(integrity)

  return (
    <main className="page-fade-in fixed inset-0 overflow-hidden bg-black">
      {/* curseur custom cyan (croix de visée sur les cubes) — même langage que le site */}
      <CustomCursor />
      <TransmissionCanvas
        running={phase === "playing"} pulse={pulse} defeated={phase === "over" && outcome === "lose"}
        integrity={integrity / HOST_HP}
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
            {t.transmission.quit}
          </Link>

          {/* intégrité de l'hôte + combo */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] tracking-[0.3em] text-cyan-400/70">{t.transmission.integrity}</div>
            <div className="w-56 h-2 rounded-full bg-cyan-950/60 border border-cyan-400/30 overflow-hidden">
              <div
                className="h-full transition-all duration-200"
                style={{ width: `${integrityPct}%`, background: integrityPct > 33 ? "#22d3ee" : "#f43f5e", boxShadow: "0 0 10px currentColor" }}
              />
            </div>
            {combo > 1 && phase === "playing" && (
              <div className="text-pink-300 text-sm tracking-widest animate-pulse">{t.transmission.combo}{combo}</div>
            )}
          </div>

          <div className="text-right text-xs">
            <div>{t.transmission.score} <span className="text-cyan-100 text-base">{score}</span></div>
            <div className={timeLeft <= 10 && phase === "playing" ? "text-pink-400" : "text-cyan-400/70"}>
              {phase === "playing" ? `${timeLeft}s` : `${t.transmission.record} ${best}`}
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
                    &gt; {outcome === "win" ? t.transmission.win : t.transmission.lose}
                  </div>
                  <div className="text-4xl text-cyan-100 mb-1">{score}</div>
                  <div className="text-cyan-400/60 text-xs mb-6">{t.transmission.neutralized(best)}</div>
                </>
              ) : (
                <>
                  <div className="text-cyan-200 text-lg tracking-[0.25em] mb-2">{t.transmission.idleTitle}</div>
                  <p className="text-cyan-400/70 text-xs leading-relaxed mb-6">
                    {t.transmission.brief(GAME_TIME)}
                  </p>
                </>
              )}
              <button onClick={start} className="rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2.5 text-sm tracking-widest transition-colors cursor-pointer">
                {phase === "over" ? t.transmission.replay : t.transmission.launch}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
