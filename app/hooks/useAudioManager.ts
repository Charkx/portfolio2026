// app/hooks/useAudioManager.ts
import { useRef, useState, useCallback, useEffect } from 'react';

export type SoundType = 'activation' | 'success' | 'hover';

interface AudioConfig {
  frequency: number;
  duration:  number;
  volume:    number;
  ramp?:     number; // fréquence cible du ramp exponentiel
}

const SOUND_CONFIG: Record<SoundType, AudioConfig> = {
  activation: { frequency: 600,  duration: 0.3, volume: 0.05, ramp: 1000 },
  success:    { frequency: 800,  duration: 0.3, volume: 0.04, ramp: 1200 },
  hover:      { frequency: 600,  duration: 0.1, volume: 0.02 },
};

export function useAudioManager() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const initAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setIsAudioEnabled(true);
    } catch {
      setIsAudioEnabled(false);
    }
  }, []);

  // Initialisation au premier clic utilisateur
  useEffect(() => {
    const handler = () => {
      initAudio();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [initAudio]);

  // Ref stable — évite les stale closures dans les callbacks consumers
  const isEnabledRef = useRef(isAudioEnabled);
  useEffect(() => { isEnabledRef.current = isAudioEnabled; }, [isAudioEnabled]);

  const playSound = useCallback((type: SoundType) => {
    if (!isEnabledRef.current || !audioContextRef.current) return;

    try {
      const ctx    = audioContextRef.current;
      const osc    = ctx.createOscillator();
      const gain   = ctx.createGain();
      const config = SOUND_CONFIG[type];

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(config.frequency, ctx.currentTime);
      if (config.ramp) {
        osc.frequency.exponentialRampToValueAtTime(
          config.ramp,
          ctx.currentTime + config.duration
        );
      }

      gain.gain.setValueAtTime(config.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + config.duration);
    } catch {
      // AudioContext indisponible — silencieux
    }
  }, []);

  return { playSound, isAudioEnabled };
}