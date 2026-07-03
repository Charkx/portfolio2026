'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SceneContents, Loader } from './AugmentedHumanScene';
import { useSceneStore } from '../../store/sceneStore';

// CANVAS PERMANENT : plein écran en continu, DERRIÈRE le contenu (zIndex 5 < main z-10).
// Le monde 3D (voûte + poussière + humain) est le fond de page ; les sections HTML
// flottent par-dessus. Plus aucun morphing de boîte : la chorégraphie caméra
// (stations + plan large) fait tout le voyage. Les slots [data-holo] ne servent
// plus qu'à deux choses : mapper le scroll → progression des stations, et capter
// le drag de rotation des modules.
const ANCHORS = [
  { sel: '[data-holo="hero"]',     prog: 0.0 },  // corps entier (boot)
  { sel: '[data-holo="about"]',    prog: 0.25 }, // cerveau (tête)
  { sel: '[data-holo="skills"]',   prog: 0.5 },  // ADN (tronc)
  { sel: '[data-holo="projects"]', prog: 0.75 }, // paume + Data Cubes (POV)
  { sel: '[data-holo="contact"]',  prog: 1.0 },  // fin de session
];

// aligné sur la scène : paliers courts, voyages amples
const HOLD = 0.22;
function plateau(f: number): number {
  if (f <= HOLD) return 0;
  if (f >= 1 - HOLD) return 1;
  const t = (f - HOLD) / (1 - 2 * HOLD);
  return t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

export default function AugmentedHumanLayer() {
  const [desktop, setDesktop] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0); // station hero au départ (écran verrouillé : environnement seul)
  const coverRef = useRef(1); // canvas permanent → l'environnement (voûte/poussière) est toujours visible

  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const els: (HTMLElement | null)[] = ANCHORS.map(() => null);
    let raf = 0;

    const loop = () => {
      const w = wrapperRef.current;
      if (w) {
        // l'environnement reste visible même pendant la carte finale (fin de session)
        w.style.opacity = '1';
        const mid = window.innerHeight / 2;
        // (re)résout les slots tant qu'ils ne sont pas trouvés
        ANCHORS.forEach((a, k) => { if (!els[k]) els[k] = document.querySelector<HTMLElement>(a.sel); });

        if (els.every((e) => e)) {
          const centers = els.map((e) => { const r = e!.getBoundingClientRect(); return r.top + r.height / 2; });

          // segment actif : k tel que centers[k] <= mid <= centers[k+1]
          let k = -1;
          for (let j = 0; j < centers.length - 1; j++) {
            if (mid >= centers[j] && mid <= centers[j + 1]) { k = j; break; }
          }
          let fLin: number;
          if (k === -1) {
            if (mid < centers[0]) { k = 0; fLin = 0; }
            else { k = centers.length - 2; fLin = 1; }
          } else {
            fLin = (mid - centers[k]) / (centers[k + 1] - centers[k]);
          }

          const fe = plateau(clamp01(fLin));
          // caméra (SceneContents en mode linear → suit exactement progressRef)
          progressRef.current = lerp(ANCHORS[k].prog, ANCHORS[k + 1].prog, fe);

          // voile : le contenu HTML s'efface pendant TOUT le voyage (fenêtre large :
          // le texte de la section suivante n'apparaît qu'à l'arrivée de la caméra,
          // jamais en cours de route). sin(πfe) = 0 aux paliers.
          const travel = Math.sin(Math.PI * fe);
          const vT = clamp01((travel - 0.12) / 0.28);
          const veil = vT * vT * (3 - 2 * vT); // smoothstep
          document.documentElement.style.setProperty('--holo-veil', veil.toFixed(3));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.setProperty('--holo-veil', '0'); // contenu rendu visible
    };
  }, [desktop]);

  if (!desktop) return null;

  return (
    <div ref={wrapperRef}
      style={{ position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0, transition: 'opacity .6s' }}>
      {/* pointerEvents:none explicite → R3F met `auto` par défaut sur son conteneur et
          intercepterait le drag destiné aux slots HTML (rotation manuelle des modules). */}
      <Canvas frameloop="always" style={{ pointerEvents: 'none' }} resize={{ debounce: 0 }} camera={{ fov: 40, position: [0, 1, 5], near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1} />
        <Suspense fallback={<Loader />}>
          <SceneContents progressRef={progressRef} coverRef={coverRef} linear />
        </Suspense>
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0} radius={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
