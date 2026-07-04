import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Mouvement réduit EFFECTIF : le réglage manuel de la console de calibrage
 * (ANIMATIONS : COMPLÈTES/RÉDUITES) prime ; sinon on suit prefers-reduced-motion.
 */
export function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  const motion = useSettingsStore((s) => s.motion);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return motion === 'reduced' || (motion === 'auto' && prefers);
}
