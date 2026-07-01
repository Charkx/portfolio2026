// Moteur audio global (singleton) — synthèse WebAudio, aucun fichier.
// DA cyberpunk / sci-fi : réverbe algorithmique + FM métallique + balayages filtrés + LFO.
// Coupé par défaut : le contexte n'est créé/repris qu'au clic sur le bouton son (geste utilisateur).

export type Cue =
  | 'activation' | 'success' | 'hover'   // interactions
  | 'scan'                               // About  — scanner
  | 'molecular'                          // Skills — réassemblage moléculaire
  | 'ignition'                           // Projets — power-core engage
  | 'uplink'                             // Contact — handshake de transmission
  | 'boot'                               // déverrouillage — system power-on
  | 'powerdown'                          // re-verrouillage — power-down
  | 'modalOpen' | 'modalClose'           // ouverture/fermeture de modale
  | 'nav'                                // navigation HUD
  | 'grab' | 'release'                   // attraper/relâcher un module 3D (drag)

let ctx: AudioContext | null = null
let master: GainNode | null = null
let reverbIn: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let enabled = false

// impulse response synthétique (réverbe) : bruit à décroissance exponentielle, stéréo
function makeIR(c: AudioContext, dur: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * dur)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return ir
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
    // bus de réverbe (espace sci-fi)
    const conv = ctx.createConvolver()
    conv.buffer = makeIR(ctx, 1.1, 2.6)
    reverbIn = ctx.createGain()
    const wet = ctx.createGain(); wet.gain.value = 0.85
    reverbIn.connect(conv); conv.connect(wet); wet.connect(ctx.destination)
  }
  return ctx
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// enveloppe + routage dry (master) / wet (réverbe)
function route(g: GainNode, start: number, dur: number, peak: number, send: number, attack = 0.008) {
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  g.connect(master!)
  if (send > 0 && reverbIn) {
    const s = ctx!.createGain(); s.gain.value = send
    g.connect(s); s.connect(reverbIn)
  }
}

interface ToneOpts {
  type?: OscillatorType; f0: number; f1?: number; dur: number; peak?: number; t?: number
  detune?: number; send?: number
  filter?: { type?: BiquadFilterType; f0: number; f1?: number; q?: number }
  vibrato?: { rate: number; depth: number }
}

function tone(o: ToneOpts) {
  const c = ctx!; const start = c.currentTime + (o.t ?? 0)
  const osc = c.createOscillator(); const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.f0, start)
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, start + o.dur)
  if (o.detune) osc.detune.value = o.detune
  let node: AudioNode = osc
  if (o.filter) {
    const flt = c.createBiquadFilter()
    flt.type = o.filter.type ?? 'bandpass'
    flt.frequency.setValueAtTime(o.filter.f0, start)
    if (o.filter.f1) flt.frequency.exponentialRampToValueAtTime(o.filter.f1, start + o.dur)
    flt.Q.value = o.filter.q ?? 1
    osc.connect(flt); node = flt
  }
  if (o.vibrato) {
    const lfo = c.createOscillator(); const lg = c.createGain()
    lfo.frequency.value = o.vibrato.rate; lg.gain.value = o.vibrato.depth
    lfo.connect(lg); lg.connect(osc.frequency)
    lfo.start(start); lfo.stop(start + o.dur + 0.03)
  }
  node.connect(g)
  route(g, start, o.dur, o.peak ?? 0.2, o.send ?? 0)
  osc.start(start); osc.stop(start + o.dur + 0.03)
}

function noise(o: { dur: number; peak?: number; t?: number; type?: BiquadFilterType; f0: number; f1?: number; q?: number; send?: number }) {
  const c = ctx!; const start = c.currentTime + (o.t ?? 0)
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true
  const flt = c.createBiquadFilter(); flt.type = o.type ?? 'bandpass'
  flt.frequency.setValueAtTime(o.f0, start)
  if (o.f1) flt.frequency.exponentialRampToValueAtTime(o.f1, start + o.dur)
  flt.Q.value = o.q ?? 1
  const g = c.createGain()
  src.connect(flt); flt.connect(g)
  route(g, start, o.dur, o.peak ?? 0.15, o.send ?? 0)
  src.start(start); src.stop(start + o.dur + 0.03)
}

// synthèse FM → timbres métalliques / cristallins (clank, matière numérique)
function fm(o: { f0: number; ratio: number; index: number; dur: number; peak?: number; t?: number; send?: number }) {
  const c = ctx!; const start = c.currentTime + (o.t ?? 0)
  const carrier = c.createOscillator(); const mod = c.createOscillator()
  const modGain = c.createGain(); const g = c.createGain()
  carrier.frequency.value = o.f0
  mod.frequency.value = o.f0 * o.ratio
  modGain.gain.value = o.index
  mod.connect(modGain); modGain.connect(carrier.frequency)
  carrier.connect(g)
  route(g, start, o.dur, o.peak ?? 0.1, o.send ?? 0)
  mod.start(start); carrier.start(start)
  mod.stop(start + o.dur + 0.03); carrier.stop(start + o.dur + 0.03)
}

const CHORD = [392, 523, 659] // sol · do · mi

const CUES: Record<Cue, () => void> = {
  // --- interactions ---
  hover:      () => tone({ f0: 600, dur: 0.06, peak: 0.04, send: 0.15 }),
  activation: () => tone({ type: 'square', f0: 700, f1: 1100, dur: 0.12, peak: 0.06, send: 0.2, filter: { type: 'bandpass', f0: 900, q: 4 } }),
  success:    () => { tone({ f0: 520, f1: 780, dur: 0.12, peak: 0.08, send: 0.25 }); tone({ f0: 1040, dur: 0.12, peak: 0.05, t: 0.1, send: 0.3 }) },

  // --- About : SCANNER (faisceau qui balaie + bips radar + détection) ---
  scan: () => {
    noise({ type: 'bandpass', f0: 300, f1: 3200, dur: 0.55, peak: 0.06, q: 9, send: 0.35 })         // faisceau montant
    noise({ type: 'bandpass', f0: 3000, f1: 500, dur: 0.5, peak: 0.03, q: 9, t: 0.06, send: 0.35 }) // écho descendant
    tone({ type: 'sine', f0: 110, dur: 0.5, peak: 0.04, vibrato: { rate: 22, depth: 14 } })          // hum "scanner actif"
    ;[900, 1250, 1650].forEach((f, i) =>
      tone({ type: 'square', f0: f, dur: 0.05, peak: 0.05, t: 0.08 + i * 0.12, filter: { type: 'bandpass', f0: f, q: 6 }, send: 0.4 }) // bips radar
    )
    tone({ type: 'sine', f0: 2100, dur: 0.16, peak: 0.09, t: 0.48, send: 0.5 })                       // ping de détection
  },

  // --- Skills : RÉASSEMBLAGE MOLÉCULAIRE (nuée qui converge en accord cristallin) ---
  molecular: () => {
    for (let i = 0; i < 8; i++) {
      const start = 400 + Math.random() * 1200
      const target = CHORD[i % CHORD.length] * 2 // octave au-dessus
      tone({ type: 'sine', f0: start, f1: target, dur: 0.14, peak: 0.045, t: i * 0.045, send: 0.35 }) // grains qui glissent
    }
    fm({ f0: 660, ratio: 2.5, index: 220, dur: 0.2, peak: 0.05, t: 0.16, send: 0.45 })                 // éclat cristallin (FM)
    CHORD.forEach((f) => tone({ type: 'triangle', f0: f, dur: 0.5, peak: 0.04, t: 0.34, send: 0.55 })) // structure qui se fige
  },

  // --- Projets : POWER-CORE ENGAGE (sub-drop + charge résonante + clank métallique) ---
  ignition: () => {
    tone({ type: 'sine', f0: 90, f1: 38, dur: 0.5, peak: 0.16 })                                                    // sub-drop
    tone({ type: 'sawtooth', f0: 70, f1: 520, dur: 0.42, peak: 0.06, filter: { type: 'lowpass', f0: 300, f1: 2800, q: 9 }, send: 0.2 }) // charge résonante
    noise({ type: 'highpass', f0: 2200, dur: 0.12, peak: 0.05, t: 0.3, send: 0.3 })                                 // étincelle
    fm({ f0: 320, ratio: 1.5, index: 320, dur: 0.32, peak: 0.09, t: 0.36, send: 0.5 })                              // clank métallique (FM)
    tone({ type: 'sine', f0: 880, dur: 0.22, peak: 0.08, t: 0.4, send: 0.4 })                                       // pulse d'allumage
  },

  // --- Contact : HANDSHAKE de transmission (data-blips + "connexion établie") ---
  uplink: () => {
    for (let i = 0; i < 6; i++) {
      const f = 1000 + Math.random() * 1500
      tone({ type: 'square', f0: f, dur: 0.035, peak: 0.03, t: i * 0.05, filter: { type: 'bandpass', f0: f, q: 7 }, send: 0.25 }) // data-blips
    }
    tone({ type: 'sine', f0: 400, f1: 1000, dur: 0.3, peak: 0.09, t: 0.34, send: 0.4 })                 // montée "connexion"
    ;[660, 990].forEach((f) => tone({ type: 'triangle', f0: f, dur: 0.26, peak: 0.05, t: 0.52, send: 0.55 })) // confirmation
  },

  // --- Déverrouillage : SYSTEM POWER-ON (le grand moment) ---
  boot: () => {
    tone({ type: 'sine', f0: 40, f1: 95, dur: 0.9, peak: 0.14 })                                                            // montée d'énergie (sub)
    tone({ type: 'sawtooth', f0: 60, f1: 620, dur: 0.75, peak: 0.06, filter: { type: 'lowpass', f0: 200, f1: 3200, q: 8 }, send: 0.25 }) // charge résonante
    ;[440, 660, 880, 1320].forEach((f, i) =>
      tone({ type: 'square', f0: f, dur: 0.05, peak: 0.04, t: 0.2 + i * 0.09, filter: { type: 'bandpass', f0: f, q: 6 }, send: 0.35 }) // séquence "data init"
    )
    ;[523, 659, 784, 1046].forEach((f) => tone({ type: 'triangle', f0: f, dur: 0.7, peak: 0.045, t: 0.7, send: 0.6 })) // accord "ACCESS GRANTED"
    tone({ type: 'sine', f0: 2200, dur: 0.2, peak: 0.07, t: 0.72, send: 0.5 })                                          // shimmer
  },

  // --- Re-verrouillage : POWER-DOWN (miroir du boot) ---
  powerdown: () => {
    tone({ type: 'sawtooth', f0: 520, f1: 60, dur: 0.5, peak: 0.07, filter: { type: 'lowpass', f0: 2600, f1: 250, q: 7 }, send: 0.25 }) // sweep descendant
    tone({ type: 'sine', f0: 90, f1: 34, dur: 0.55, peak: 0.12 })                                                       // sub qui retombe
    fm({ f0: 180, ratio: 1.4, index: 180, dur: 0.28, peak: 0.06, t: 0.36, send: 0.4 })                                  // clunk final
  },

  // --- Modale : ouverture (whoosh montant) / fermeture (whoosh descendant, plus doux) ---
  modalOpen: () => {
    noise({ type: 'highpass', f0: 600, f1: 4000, dur: 0.22, peak: 0.05, send: 0.3 })
    tone({ type: 'sine', f0: 700, f1: 1400, dur: 0.18, peak: 0.06, send: 0.35 })
  },
  modalClose: () => {
    noise({ type: 'lowpass', f0: 3000, f1: 500, dur: 0.16, peak: 0.035, send: 0.2 })
    tone({ type: 'sine', f0: 900, f1: 500, dur: 0.12, peak: 0.045, send: 0.25 })
  },

  // --- Navigation HUD : blip de "téléportation" ---
  nav: () => {
    tone({ type: 'square', f0: 1200, f1: 1800, dur: 0.05, peak: 0.04, filter: { type: 'bandpass', f0: 1500, q: 6 }, send: 0.3 })
    tone({ type: 'sine', f0: 2000, dur: 0.06, peak: 0.04, t: 0.04, send: 0.35 })
  },

  // --- Drag d'un module 3D : attraper (grave) / relâcher (léger) ---
  grab:    () => tone({ type: 'sine', f0: 190, f1: 120, dur: 0.08, peak: 0.05, send: 0.2 }),
  release: () => tone({ type: 'sine', f0: 120, f1: 210, dur: 0.07, peak: 0.035, send: 0.2 }),
}

// --- Drone d'ambiance (très bas) : tourne tant que le son est activé ---
let drone: { stop: () => void } | null = null

function startDrone() {
  if (!ctx || !master || !reverbIn || drone) return
  const c = ctx
  const g = c.createGain(); g.gain.value = 0.0001
  const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 300; flt.Q.value = 2
  const oscs: OscillatorNode[] = []
  ;[55, 55.3, 82.5].forEach((f, i) => {
    const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f
    o.connect(flt); o.start(); oscs.push(o)
  })
  // LFO lent sur le filtre → léger mouvement "vivant"
  const lfo = c.createOscillator(); const lg = c.createGain()
  lfo.frequency.value = 0.07; lg.gain.value = 110
  lfo.connect(lg); lg.connect(flt.frequency); lfo.start(); oscs.push(lfo)
  flt.connect(g); g.connect(master)
  const s = c.createGain(); s.gain.value = 0.3; g.connect(s); s.connect(reverbIn)
  const now = c.currentTime
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.02, now + 1.5) // fondu d'entrée, niveau très bas
  drone = {
    stop: () => {
      const t = c.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7) // fondu de sortie
      oscs.forEach((o) => o.stop(t + 0.8))
    },
  }
}

function stopDrone() {
  if (!drone) return
  drone.stop(); drone = null
}

let lastHover = 0 // throttle du cue hover (évite le mitraillage)

export const audioEngine = {
  enable() {
    const c = ensureCtx()
    if (c && c.state === 'suspended') c.resume()
    enabled = true
    startDrone()
  },
  disable() { enabled = false; stopDrone() },
  isEnabled: () => enabled,
  play(cue: Cue) {
    if (!enabled) return
    const c = ensureCtx(); if (!c || !master) return
    if (cue === 'hover') { if (c.currentTime - lastHover < 0.07) return; lastHover = c.currentTime }
    try { CUES[cue]() } catch { /* contexte indisponible — silencieux */ }
  },
}
