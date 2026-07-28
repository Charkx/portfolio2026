import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Mouvement réduit EFFECTIF : le réglage manuel de la console de calibrage
 * (ANIMATIONS : COMPLÈTES/RÉDUITES) prime ; sinon on suit prefers-reduced-motion.
 *
 * NE PAS réécrire ceci en `useSyncExternalStore`. Ça a été tenté (B8) — plus propre
 * sur le papier, et valeur juste dès le premier rendu au lieu de partir de `false` —
 * et ça a CASSÉ la récolte des lucioles en mouvement réduit. Le lien est confirmé par
 * bisection : revenir à la version ci-dessous, seule variable changée, a rétabli le
 * comportement.
 *
 * En revanche le MÉCANISME reste inexpliqué. La relecture du chemin
 * (heroW ← station × matérialisation) n'a rien donné, et la branche `motion ===
 * 'reduced'` court-circuite `prefers`, donc la valeur retournée devrait être
 * identique dans les deux versions. Seule piste sérieuse : ce hook est appelé DANS le
 * canvas, donc dans le réconciliateur de React Three Fiber et non celui du DOM, où
 * les garanties de synchronisation de `useSyncExternalStore` ne sont pas les mêmes.
 *
 * Le surcoût assumé de cette version : une image de mouvement complet avant la
 * bascule, pour qui a demandé moins de mouvement. C'est moins cher qu'un mini-jeu
 * qu'on ne peut plus déverrouiller — la luciole est l'un des 5 signaux SIG.
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
