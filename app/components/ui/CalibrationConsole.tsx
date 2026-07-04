'use client';

import { useAudioStore } from '../../store/audioStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { audioEngine } from '../../lib/audioEngine';

// Bouton [OPTION] de la console — style terminal
function Opt({ active, disabled, title, onClick, children }: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseEnter={() => { if (!disabled) audioEngine.play('hover'); }}
      className={`transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400
        ${disabled
          ? 'text-gray-700 cursor-not-allowed'
          : active
            ? 'text-cyan-300 cursor-pointer'
            : 'text-gray-600 hover:text-cyan-400/80 cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

// Ligne de terminal révélée à son tour (i = ordre d'apparition)
function Line({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <div className="hud-reveal flex flex-wrap items-center gap-x-2" style={{ animationDelay: `${0.2 + i * 0.35}s` }}>
      {children}
    </div>
  );
}

/**
 * Calibrage de session DANS le terminal : tant que le site est verrouillé, les
 * réglages (son, volume, animations, qualité, langue) s'affichent ligne à ligne
 * comme une séquence de boot — le terminal a une vraie utilité.
 * La musique d'entrée sert de mire pour le volume.
 */
export default function CalibrationConsole() {
  const enabled = useAudioStore((s) => s.enabled);
  const optIn = useAudioStore((s) => s.optIn);
  const setOptIn = useAudioStore((s) => s.setOptIn);
  const setEnabled = useAudioStore((s) => s.setEnabled);
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);
  const quality = useSettingsStore((s) => s.quality);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const setMotion = useSettingsStore((s) => s.setMotion);
  const reduced = useReducedMotion(); // effectif (réglage manuel OU préférence système)

  return (
    <div className="text-center mt-4">
      {/* même en-tête que le terminal : la console EST le terminal en phase verrouillée */}
      <div className="text-red-500 text-xl font-mono neon-glow animate-pulse mb-2">
        SCAN CARD CODE TO ACCESS DATA
      </div>

      <div className="text-left text-cyan-300 text-sm font-mono max-w-md mx-auto px-4 space-y-1.5 min-h-[100px]">
        <Line i={0}>
          <span className="text-cyan-400/70">&gt; Lien neural en attente — calibrage de session :</span>
        </Line>

        <Line i={1}>
          <span className="text-cyan-400/60">&gt; FLUX AUDIO :</span>
          {/* effet immédiat : [ACTIVÉ] lance la musique d'entrée (geste utilisateur) */}
          <Opt active={optIn} onClick={() => { setOptIn(true); setEnabled(true); }}>[ACTIVÉ]</Opt>
          <Opt active={!optIn} onClick={() => { setOptIn(false); setEnabled(false); }}>[COUPÉ]</Opt>
        </Line>

        <Line i={2}>
          <span className="text-cyan-400/60">&gt; VOLUME :</span>
          <span role="group" aria-label="Volume du son" className="flex items-end gap-[3px] h-4">
            {[1, 2, 3, 4, 5].map((n) => {
              const lit = enabled && volume >= n / 5 - 0.001;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Volume ${n} sur 5`}
                  aria-pressed={lit}
                  onClick={() => setVolume(n / 5)}
                  onMouseEnter={() => audioEngine.play('hover')}
                  className={`w-[5px] rounded-[1px] cursor-pointer transition-colors
                    ${lit ? 'bg-cyan-300 hover:bg-cyan-100' : 'bg-cyan-400/25 hover:bg-cyan-400/60'}`}
                  style={{ height: `${5 + n * 2.4}px` }}
                />
              );
            })}
          </span>
        </Line>

        <Line i={3}>
          <span className="text-cyan-400/60">&gt; ANIMATIONS :</span>
          <Opt active={!reduced} onClick={() => setMotion('full')}>[COMPLÈTES]</Opt>
          <Opt active={reduced} onClick={() => setMotion('reduced')}>[RÉDUITES]</Opt>
        </Line>

        <Line i={4}>
          <span className="text-cyan-400/60">&gt; QUALITÉ :</span>
          <Opt active={quality === 'high'} onClick={() => setQuality('high')}>[HAUTE]</Opt>
          <Opt active={quality === 'eco'} title="Bloom coupé, rendu allégé" onClick={() => setQuality('eco')}>[ÉCO]</Opt>
        </Line>

        <Line i={5}>
          <span className="text-cyan-400/60">&gt; LANGUE :</span>
          <Opt active>[FR]</Opt>
          <Opt disabled title="English — bientôt disponible">[EN]</Opt>
        </Line>

        <Line i={6}>
          <span className="text-gray-600 text-xs">&gt; Scanne la carte pour établir le lien neural…</span>
          <span className="animate-pulse" aria-hidden="true">_</span>
        </Line>
      </div>
    </div>
  );
}
