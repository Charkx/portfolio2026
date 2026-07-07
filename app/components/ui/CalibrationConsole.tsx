'use client';

import { useEffect, useState } from 'react';
import { useAudioStore } from '../../store/audioStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { audioEngine } from '../../lib/audioEngine';
import { useLangStore } from '../../store/langStore';
import { useT } from '../../i18n';

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

// Ligne de terminal (apparition douce au montage)
function Line({ children }: { children: React.ReactNode }) {
  return (
    <div className="hud-reveal flex flex-wrap items-center gap-x-2" style={{ animationDelay: '0.1s' }}>
      {children}
    </div>
  );
}

// Étapes du calibrage (une seule question à la fois)
const STEP_AUDIO = 0, STEP_VOLUME = 1, STEP_MOTION = 2, STEP_QUALITY = 3, STEP_LANG = 4, DONE = 5;

/**
 * Calibrage de session pas-à-pas, au cœur de la séquence de scan : une seule
 * question s'affiche à la fois ; le choix de l'utilisateur imprime la suivante.
 * Les lignes répondues restent visibles (et modifiables jusqu'au boot).
 * Après la dernière réponse, le lien neural s'établit tout seul (onConfirm).
 */
export default function CalibrationConsole({ onConfirm }: { onConfirm: () => void }) {
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

  const [step, setStep] = useState(STEP_AUDIO);
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = useT();
  const [volumeSkipped, setVolumeSkipped] = useState(false); // audio coupé → pas de question volume

  // répondre à l'étape COURANTE fait apparaître la suivante (re-cliquer une
  // ligne passée modifie le réglage sans faire avancer l'assistant)
  const advance = (idx: number, skipVolume = false) => {
    if (idx !== step) return;
    setStep(idx + (skipVolume ? 2 : 1));
  };

  // dernière réponse donnée → petite pause, puis établissement du lien (boot)
  useEffect(() => {
    if (step < DONE) return;
    audioEngine.play('activation');
    const t = window.setTimeout(onConfirm, 1200);
    return () => window.clearTimeout(t);
  }, [step, onConfirm]);

  return (
    <div className="space-y-1.5">
      <Line>
        <span className="text-cyan-400/70">{t.calibration.intro}</span>
      </Line>

      {step >= STEP_AUDIO && (
        <Line>
          <span className="text-cyan-400/60">{t.calibration.audio}</span>
          {/* effet immédiat : [ACTIVÉ] lance la musique (geste utilisateur) → mire du volume */}
          <Opt active={optIn} onClick={() => { setOptIn(true); setEnabled(true); advance(STEP_AUDIO); }}>{t.calibration.audioOn}</Opt>
          <Opt active={!optIn} onClick={() => { setOptIn(false); setEnabled(false); setVolumeSkipped(true); advance(STEP_AUDIO, true); }}>{t.calibration.audioOff}</Opt>
        </Line>
      )}

      {step >= STEP_VOLUME && !volumeSkipped && (
        <Line>
          <span className="text-cyan-400/60">{t.calibration.volume}</span>
          <span role="group" aria-label={t.hud.volume} className="flex items-end gap-[3px] h-4">
            {[1, 2, 3, 4, 5].map((n) => {
              const lit = enabled && volume >= n / 5 - 0.001;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={t.misc.volumeOf(n)}
                  aria-pressed={lit}
                  onClick={() => { setVolume(n / 5); advance(STEP_VOLUME); }}
                  onMouseEnter={() => audioEngine.play('hover')}
                  className={`w-[5px] rounded-[1px] cursor-pointer transition-colors
                    ${lit ? 'bg-cyan-300 hover:bg-cyan-100' : 'bg-cyan-400/25 hover:bg-cyan-400/60'}`}
                  style={{ height: `${5 + n * 2.4}px` }}
                />
              );
            })}
          </span>
        </Line>
      )}

      {step >= STEP_MOTION && (
        <Line>
          <span className="text-cyan-400/60">{t.calibration.motion}</span>
          <Opt active={!reduced} onClick={() => { setMotion('full'); advance(STEP_MOTION); }}>{t.calibration.motionFull}</Opt>
          <Opt active={reduced} onClick={() => { setMotion('reduced'); advance(STEP_MOTION); }}>{t.calibration.motionReduced}</Opt>
        </Line>
      )}

      {step >= STEP_QUALITY && (
        <Line>
          <span className="text-cyan-400/60">{t.calibration.quality}</span>
          <Opt active={quality === 'high'} onClick={() => { setQuality('high'); advance(STEP_QUALITY); }}>{t.calibration.qHigh}</Opt>
          <Opt active={quality === 'eco'} title={t.calibration.qEcoTip} onClick={() => { setQuality('eco'); advance(STEP_QUALITY); }}>{t.calibration.qEco}</Opt>
        </Line>
      )}

      {step >= STEP_LANG && (
        <Line>
          <span className="text-cyan-400/60">{t.calibration.lang}</span>
          <Opt active={lang === 'fr'} onClick={() => { setLang('fr'); advance(STEP_LANG); }}>[FR]</Opt>
          <Opt active={lang === 'en'} onClick={() => { setLang('en'); advance(STEP_LANG); }}>[EN]</Opt>
        </Line>
      )}

      {step >= DONE ? (
        <Line>
          <span className="text-green-400">{t.calibration.locked}</span>
          <span className="animate-pulse text-cyan-300" aria-hidden="true">_</span>
        </Line>
      ) : (
        <div className="text-cyan-300 animate-pulse" aria-hidden="true">_</div>
      )}
    </div>
  );
}
