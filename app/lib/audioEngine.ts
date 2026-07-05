// Moteur audio global (singleton) — synthèse WebAudio, aucun fichier.
// DA cyberpunk / sci-fi : réverbe algorithmique + FM métallique + balayages filtrés + LFO.
// Coupé par défaut : le contexte n'est créé/repris qu'au clic sur le bouton son (geste utilisateur).

export type Cue =
  | 'activation' | 'success' | 'hover'   // interactions
  | 'scan'                               // About  — scanner
  | 'molecular'                          // Skills — réassemblage moléculaire
  | 'ignition'                           // Projets — power-core engage (sélection)
  | 'derez'                              // Projets — le cube explose (dématérialisation + éclats)
  | 'materialize'                        // Projets — le panneau se reconstruit tuile par tuile
  | 'reflow'                             // Projets — fermeture : reflux des éclats, cube reformé
  | 'uplink'                             // Contact — handshake de transmission
  | 'boot'                               // déverrouillage — system power-on
  | 'powerdown'                          // re-verrouillage — power-down
  | 'modalOpen' | 'modalClose'           // ouverture/fermeture de modale
  | 'nav'                                // navigation HUD
  | 'grab' | 'release'                   // attraper/relâcher un module 3D (drag)
  | 'collect'                            // hero — récolte d'une luciole de données

let ctx: AudioContext | null = null
let master: GainNode | null = null
let reverbIn: GainNode | null = null
let out: GainNode | null = null // sortie finale : volume global (dry + réverbe, mix préservé)
let noiseBuf: AudioBuffer | null = null
let enabled = false
let volume = 1 // 0..1 — piloté par les barres du HUD (persisté côté store)

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
    out = ctx.createGain()
    out.gain.value = volume
    out.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(out)
    // bus de réverbe (espace sci-fi)
    const conv = ctx.createConvolver()
    conv.buffer = makeIR(ctx, 1.1, 2.6)
    reverbIn = ctx.createGain()
    const wet = ctx.createGain(); wet.gain.value = 0.85
    reverbIn.connect(conv); conv.connect(wet); wet.connect(out)
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

  // --- About : SCANNER (faisceau fin qui balaie + bips radar montants + détection réverbérée) ---
  scan: () => {
    noise({ type: 'bandpass', f0: 260, f1: 3400, dur: 0.6, peak: 0.05, q: 12, send: 0.4 })            // faisceau montant (fin, q élevé)
    noise({ type: 'bandpass', f0: 2600, f1: 420, dur: 0.55, peak: 0.025, q: 12, t: 0.08, send: 0.4 }) // écho descendant discret
    tone({ type: 'sine', f0: 96, dur: 0.6, peak: 0.035, vibrato: { rate: 18, depth: 10 } })            // hum "scanner actif"
    ;[820, 1130, 1490, 1960].forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.06, peak: 0.045, t: 0.1 + i * 0.11, filter: { type: 'bandpass', f0: f, q: 7 }, send: 0.45 }) // bips radar (triangle = plus doux)
    )
    tone({ type: 'sine', f0: 2300, f1: 2050, dur: 0.22, peak: 0.08, t: 0.54, send: 0.6 })              // ping de détection, longue traîne
  },

  // --- Skills : RÉASSEMBLAGE MOLÉCULAIRE (souffle de matière + nuée qui converge en accord) ---
  molecular: () => {
    noise({ type: 'lowpass', f0: 900, f1: 250, dur: 0.4, peak: 0.03, send: 0.3 })                      // souffle de matière qui s'agrège
    for (let i = 0; i < 10; i++) {
      const start = 350 + Math.random() * 1400
      const target = CHORD[i % CHORD.length] * 2 // octave au-dessus
      tone({ type: 'sine', f0: start, f1: target, dur: 0.13, peak: 0.04, t: i * 0.038, send: 0.4 })    // grains qui glissent
    }
    fm({ f0: 660, ratio: 2.5, index: 240, dur: 0.22, peak: 0.05, t: 0.2, send: 0.5 })                  // éclat cristallin (FM)
    CHORD.forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.6, peak: 0.035, t: 0.36 + i * 0.03, send: 0.6 })) // structure qui se fige (arpégé)
    tone({ type: 'sine', f0: 2093, dur: 0.25, peak: 0.03, t: 0.5, send: 0.7 })                          // shimmer final
  },

  // --- Projets : DEREZ — le cube explose (impact, verre FM, éclats épars, convergence vers l'écran) ---
  // Timing calé sur la 3D : burst immédiat, convergence à t≈0.25-0.65 (le panneau arrive à 650 ms)
  derez: () => {
    tone({ type: 'sine', f0: 130, f1: 42, dur: 0.22, peak: 0.14 })                                     // impact sub
    fm({ f0: 480, ratio: 3.7, index: 520, dur: 0.16, peak: 0.07, send: 0.35 })                          // verre qui casse (FM inharmonique)
    noise({ type: 'highpass', f0: 2800, dur: 0.14, peak: 0.06, send: 0.3 })                             // burst d'éclats
    for (let i = 0; i < 7; i++) {
      const f = 1600 + Math.random() * 1800
      tone({ type: 'triangle', f0: f, f1: f * 0.55, dur: 0.09, peak: 0.028, t: 0.04 + i * 0.035, send: 0.5 }) // éclats qui s'éparpillent
    }
    noise({ type: 'bandpass', f0: 500, f1: 3200, dur: 0.4, peak: 0.045, q: 3, t: 0.25, send: 0.45 })    // convergence des éclats vers l'écran
  },

  // --- Projets : MATERIALIZE — le panneau se verrouille pixel par pixel ---
  materialize: () => {
    for (let i = 0; i < 10; i++) {
      const f = 700 + i * 160 + Math.random() * 90
      tone({ type: 'square', f0: f, dur: 0.03, peak: 0.02, t: i * 0.022, filter: { type: 'bandpass', f0: f, q: 8 }, send: 0.3 }) // tuiles qui claquent (montant)
    }
    tone({ type: 'sine', f0: 320, f1: 210, dur: 0.16, peak: 0.05, t: 0.24 })                            // "thunk" de solidité
    ;[523, 784].forEach((f) => tone({ type: 'triangle', f0: f, dur: 0.3, peak: 0.03, t: 0.26, send: 0.5 })) // accord bref "affichage stable"
  },

  // --- Projets : REFLOW — fermeture : tuiles qui se libèrent, éclats qui refluent, cube reformé ---
  reflow: () => {
    for (let i = 0; i < 8; i++) {
      const f = 2100 - i * 190 + Math.random() * 80
      tone({ type: 'square', f0: f, dur: 0.03, peak: 0.016, t: i * 0.02, filter: { type: 'bandpass', f0: f, q: 8 }, send: 0.25 }) // tuiles qui se libèrent (descendant)
    }
    noise({ type: 'bandpass', f0: 2800, f1: 420, dur: 0.32, peak: 0.04, q: 3, t: 0.1, send: 0.4 })      // reflux des éclats
    fm({ f0: 300, ratio: 2, index: 160, dur: 0.18, peak: 0.05, t: 0.4, send: 0.4 })                     // clic cristallin : cube reformé (~450 ms = fin du tween 3D)
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

  // --- Hero : récolte d'une luciole (petit scintillement cristallin ascendant) ---
  collect: () => {
    tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.14, peak: 0.05, send: 0.4 })
    tone({ type: 'sine', f0: 1760, dur: 0.12, peak: 0.03, t: 0.05, send: 0.55 })
  },
}

// --- Musique générative : un seul motif Am↔F, deux relectures ---
// 'entry' (avant le scan) : arpège cyberpunk affirmé — sawtooth filtré, basse, hat.
// 'site'  (déverrouillé)  : le MÊME thème en variante hologramme — tempo ralenti,
// notes triangle à l'octave, silences, enveloppes lentes, grande réverbe. Les notes
// étant courtes, la réverbe reste propre (pas de grésillement de nappe tenue).
type MusicMode = 'entry' | 'site'

const MUSIC_CFG = {
  entry: {
    bpm: 92, wave: 'sawtooth' as OscillatorType,
    fltF: 950, fltQ: 6, sweep: 480, sweepRate: 0.045, // balayage du filtre : le motif évolue
    arpPeak: 0.045, attack: 0.012, release: 0.9,
    bassPeak: 0.11, bassFreqs: [55, 43.65], hat: true,
    bus: 0.85, send: 0.5, sparkle: false, fadeIn: 1.4,
    patterns: [
      [110, 130.81, 164.81, 220, 261.63, 220, 164.81, 130.81],   // Am : A2 C3 E3 A3 C4…
      [87.31, 130.81, 174.61, 220, 261.63, 220, 174.61, 130.81], // F  : F2 C3 F3 A3 C4…
    ],
  },
  site: {
    bpm: 66, wave: 'triangle' as OscillatorType,
    fltF: 1500, fltQ: 1.4, sweep: 350, sweepRate: 0.03,
    arpPeak: 0.026, attack: 0.05, release: 1.8, // attaque douce, longue traîne → legato aérien
    bassPeak: 0.05, bassFreqs: [110, 87.31], hat: false,
    bus: 0.8, send: 0.7, sparkle: true, fadeIn: 2.5,
    patterns: [
      [220, 0, 261.63, 329.63, 0, 440, 329.63, 0], // Am à l'octave, aéré (0 = silence)
      [220, 0, 261.63, 349.23, 0, 440, 349.23, 0], // F à l'octave
    ],
  },
}

let music: { stop: () => void } | null = null

function startMusic(mode: MusicMode) {
  if (!ctx || !master || !reverbIn || music) return
  const cfg = MUSIC_CFG[mode]
  const c = ctx
  const bus = c.createGain(); bus.gain.value = 0.0001; bus.connect(master)
  const send = c.createGain(); send.gain.value = cfg.send; bus.connect(send); send.connect(reverbIn)

  // filtre commun de l'arpège, balayé lentement → le motif évolue sans changer de notes
  const arpFlt = c.createBiquadFilter(); arpFlt.type = 'lowpass'; arpFlt.Q.value = cfg.fltQ; arpFlt.frequency.value = cfg.fltF
  const fLfo = c.createOscillator(); fLfo.frequency.value = cfg.sweepRate
  const fLg = c.createGain(); fLg.gain.value = cfg.sweep
  fLfo.connect(fLg); fLg.connect(arpFlt.frequency); fLfo.start()
  arpFlt.connect(bus)

  const STEP = 60 / cfg.bpm / 2 // croches
  let step = 0
  let nextT = c.currentTime + 0.1
  const iv = window.setInterval(() => {
    // planifie ~0.2 s en avance (précis à l'échantillon, insensible au jitter du timer JS)
    while (nextT < c.currentTime + 0.2) {
      const t = nextT
      const bar = Math.floor(step / 8) % 2
      const f = cfg.patterns[bar][step % 8]
      // arpège (0 = silence)
      if (f > 0) {
        const o = c.createOscillator(); o.type = cfg.wave; o.frequency.value = f
        const g = c.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(cfg.arpPeak, t + cfg.attack)
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * cfg.release)
        o.connect(g); g.connect(arpFlt)
        o.start(t); o.stop(t + STEP * cfg.release + 0.05)
      }
      // basse : fondamentale au début de chaque mesure
      if (step % 8 === 0) {
        const b = c.createOscillator(); b.type = 'sine'; b.frequency.value = cfg.bassFreqs[bar]
        const bg = c.createGain()
        bg.gain.setValueAtTime(0.0001, t)
        bg.gain.exponentialRampToValueAtTime(cfg.bassPeak, t + 0.03)
        bg.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 7)
        b.connect(bg); bg.connect(bus)
        b.start(t); b.stop(t + STEP * 8)
      }
      // hat discret sur les contretemps (variante entrée uniquement)
      if (cfg.hat && step % 2 === 1) {
        const src = c.createBufferSource(); src.buffer = noiseBuffer(c)
        const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000
        const hg = c.createGain()
        hg.gain.setValueAtTime(0.0001, t)
        hg.gain.exponentialRampToValueAtTime(0.011, t + 0.004)
        hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
        src.connect(hf); hf.connect(hg); hg.connect(bus)
        src.start(t); src.stop(t + 0.06)
      }
      step++
      nextT += STEP
    }
  }, 60)

  // étincelles réverbérées espacées (variante site) : ponctuent le thème hologramme
  const sparkle = cfg.sparkle
    ? window.setInterval(() => {
        if (!enabled || Math.random() > 0.7) return
        tone({ f0: 1200 + Math.random() * 1600, dur: 0.4, peak: 0.012, send: 0.8 })
      }, 9000)
    : 0

  const now = c.currentTime
  bus.gain.setValueAtTime(0.0001, now)
  bus.gain.exponentialRampToValueAtTime(cfg.bus, now + cfg.fadeIn)
  music = {
    stop: () => {
      window.clearInterval(iv)
      if (sparkle) window.clearInterval(sparkle)
      const t = c.currentTime
      bus.gain.cancelScheduledValues(t)
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t)
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      fLfo.stop(t + 1)
      window.setTimeout(() => { bus.disconnect(); send.disconnect() }, 1300)
    },
  }
}

function stopMusic() {
  if (!music) return
  music.stop(); music = null
}

// scène sonore courante : 'entry' (verrouillé) ou 'site' (déverrouillé)
let sceneMode: MusicMode = 'entry'

function startAmbience() {
  startMusic(sceneMode)
}

let lastHover = 0 // throttle du cue hover (évite le mitraillage)

export const audioEngine = {
  enable() {
    const c = ensureCtx()
    if (c && c.state === 'suspended') c.resume()
    enabled = true
    startAmbience()
  },
  disable() { enabled = false; stopMusic() },
  isEnabled: () => enabled,
  // bascule entre les deux variantes du thème (appelé quand l'introPhase change)
  setScene(mode: 'entry' | 'site') {
    if (mode === sceneMode) return
    sceneMode = mode
    if (!enabled) return
    stopMusic()
    startAmbience()
  },
  // volume global 0..1 (rampe courte pour éviter les clics) — mémorisé même avant la création du contexte
  setVolume(v: number) {
    volume = Math.min(Math.max(v, 0), 1)
    if (ctx && out) {
      const t = ctx.currentTime
      out.gain.cancelScheduledValues(t)
      out.gain.setValueAtTime(out.gain.value, t)
      out.gain.linearRampToValueAtTime(volume, t + 0.08)
    }
  },
  getVolume: () => volume,
  play(cue: Cue) {
    if (!enabled) return
    const c = ensureCtx(); if (!c || !master) return
    if (cue === 'hover') { if (c.currentTime - lastHover < 0.07) return; lastHover = c.currentTime }
    try { CUES[cue]() } catch { /* contexte indisponible — silencieux */ }
  },
}
