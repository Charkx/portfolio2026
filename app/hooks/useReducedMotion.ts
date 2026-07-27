import { useSyncExternalStore } from 'react';
import { useSettingsStore } from '../store/settingsStore';

const QUERY = '(prefers-reduced-motion: reduce)';

// `useSyncExternalStore` plutôt que useState + useEffect. Ce n'est pas qu'une
// question de warning : l'ancienne version partait de `false` au premier rendu et
// ne corrigeait qu'à l'effet suivant. Quelqu'un qui a demandé moins de mouvement
// voyait donc une image de mouvement complet avant la bascule — exactement ce qu'on
// cherche à lui épargner. Ici la valeur est juste dès le premier rendu client.
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false; // pas de matchMedia au rendu serveur

/**
 * Mouvement réduit EFFECTIF : le réglage manuel de la console de calibrage
 * (ANIMATIONS : COMPLÈTES/RÉDUITES) prime ; sinon on suit prefers-reduced-motion.
 */
export function useReducedMotion(): boolean {
  const prefers = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const motion = useSettingsStore((s) => s.motion);

  return motion === 'reduced' || (motion === 'auto' && prefers);
}
