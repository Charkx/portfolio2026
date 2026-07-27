import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Mouvement réduit EFFECTIF : le réglage manuel de la console de calibrage
 * (ANIMATIONS : COMPLÈTES/RÉDUITES) prime ; sinon on suit prefers-reduced-motion.
 *
 * Une réécriture en `useSyncExternalStore` a été tentée (B8) : plus propre sur le
 * papier, valeur juste dès le premier rendu au lieu de partir de `false`. Une
 * régression sur la récolte des lucioles en mouvement réduit a été signalée dans la
 * foulée, et cette version-ci a été rétablie pour l'isoler. Le mécanisme n'a JAMAIS
 * été démontré : la relecture du chemin (heroW ← station × matérialisation) n'a rien
 * donné. La seule piste est que ce hook est appelé DANS le canvas, donc dans le
 * réconciliateur de React Three Fiber et non celui du DOM.
 * À retenir : si la réécriture est retentée, c'est la récolte des lucioles en
 * mouvement réduit qu'il faut vérifier À L'ŒIL avant de conclure. Le surcoût de la
 * version ci-dessous est une image de mouvement complet avant la bascule.
 */
export function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  const motion = useSettingsStore((s) => s.motion);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia n'existe pas au rendu serveur
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return motion === 'reduced' || (motion === 'auto' && prefers);
}
