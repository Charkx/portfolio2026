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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-cyan-400/60">&gt; {label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Console de calibrage — affichée à la place du terminal tant que le site est
 * verrouillé : l'utilisateur règle SON expérience (son, volume, animations,
 * qualité) avant d'entrer. La musique d'entrée sert de mire pour le volume.
 */
export default function CalibrationConsole() {
  const enabled = useAudioStore((s) => s.enabled);
  const optIn = useAudioStore((s) => s.optIn);
  const setOptIn = useAudioStore((s) => s.setOptIn);
  const setEnabled = useAudioStore((s) => s.setEnabled);
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);
  const motion = useSettingsStore((s) => s.motion);
  const setMotion = useSettingsStore((s) => s.setMotion);
  const quality = useSettingsStore((s) => s.quality);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const reduced = useReducedMotion(); // effectif (réglage manuel OU préférence système)

  return (
    <div className="w-full max-w-md mx-auto mt-4 font-mono text-xs border border-cyan-400/25 bg-black/50 rounded-lg px-5 py-4 space-y-2.5 text-left">
      <div className="text-cyan-300 tracking-[0.25em] text-[11px]">CALIBRAGE DE SESSION</div>

      {/* effet immédiat : [ACTIVÉ] lance la musique d'entrée (geste utilisateur)
          → on règle le volume dessus AVANT d'entrer */}
      <Row label="FLUX AUDIO">
        <Opt active={optIn} onClick={() => { setOptIn(true); setEnabled(true); }}>[ACTIVÉ]</Opt>
        <Opt active={!optIn} onClick={() => { setOptIn(false); setEnabled(false); }}>[COUPÉ]</Opt>
      </Row>

      <Row label="VOLUME">
        <div role="group" aria-label="Volume du son" className="flex items-end gap-[3px] h-4">
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
        </div>
      </Row>

      <Row label="ANIMATIONS">
        <Opt active={!reduced} onClick={() => setMotion('full')}>[COMPLÈTES]</Opt>
        <Opt active={reduced} onClick={() => setMotion('reduced')}>[RÉDUITES]</Opt>
      </Row>

      <Row label="QUALITÉ">
        <Opt active={quality === 'high'} onClick={() => setQuality('high')}>[HAUTE]</Opt>
        <Opt active={quality === 'eco'} title="Bloom coupé, rendu allégé" onClick={() => setQuality('eco')}>[ÉCO]</Opt>
      </Row>

      <Row label="LANGUE">
        <Opt active>[FR]</Opt>
        <Opt disabled title="English — bientôt disponible">[EN]</Opt>
      </Row>

      <div className="text-gray-600 text-[10px] pt-1" aria-hidden="true">
        {motion === 'auto' ? '// animations : suivent la préférence système' : '// réglages mémorisés pour tes prochaines visites'}
      </div>
    </div>
  );
}
