'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SceneContents, Loader } from './AugmentedHumanScene';

// Ancres = sections migrées, dans l'ordre de la page.
// `prog` = progression globale de la station (index station / (nb stations - 1)) :
//   intro 0 · cerveau .25 · ADN .5 · cœur .75 · globe 1
const ANCHORS = [
  { sel: '[data-holo="hero"]',     prog: 0.0 },  // corps entier (boot)
  { sel: '[data-holo="about"]',    prog: 0.25 }, // cerveau (tête)
  { sel: '[data-holo="skills"]',   prog: 0.5 },  // ADN (tronc)
  { sel: '[data-holo="projects"]', prog: 0.75 }, // cœur / réacteur (torse)
  { sel: '[data-holo="contact"]',  prog: 1.0 },  // globe (main)
];

const HOLD = 0.3;
function plateau(f: number): number {
  if (f <= HOLD) return 0;
  if (f >= 1 - HOLD) return 1;
  const t = (f - HOLD) / (1 - 2 * HOLD);
  return t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
}

type Rect = { left: number; top: number; width: number; height: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  left: lerp(a.left, b.left, t), top: lerp(a.top, b.top, t),
  width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t),
});
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

export default function AugmentedHumanLayer() {
  const [desktop, setDesktop] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0.5);
  const coverRef = useRef(0); // part de l'écran couverte par la boîte (→ opacité du fond)

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
        const vh = window.innerHeight, mid = vh / 2;
        // (re)résout les slots tant qu'ils ne sont pas trouvés
        ANCHORS.forEach((a, k) => { if (!els[k]) els[k] = document.querySelector<HTMLElement>(a.sel); });

        if (els.every((e) => e)) {
          const rects = els.map((e) => e!.getBoundingClientRect());
          const centers = rects.map((r) => r.top + r.height / 2);
          const FULL: Rect = { left: 0, top: 0, width: window.innerWidth, height: vh };

          // segment actif : k tel que centers[k] <= mid <= centers[k+1]
          let k = -1;
          for (let j = 0; j < centers.length - 1; j++) {
            if (mid >= centers[j] && mid <= centers[j + 1]) { k = j; break; }
          }

          let fLin: number, opacity: number;
          if (k === -1) {
            if (mid < centers[0]) { k = 0; fLin = 0; opacity = clamp01(1 - (centers[0] - mid) / (vh * 0.5)); }
            else { k = centers.length - 2; fLin = 1; opacity = clamp01(1 - (mid - centers[centers.length - 1]) / (vh * 0.5)); }
          } else {
            fLin = (mid - centers[k]) / (centers[k + 1] - centers[k]);
            opacity = 1;
          }

          const fe = plateau(clamp01(fLin));
          // caméra (SceneContents en mode linear → suit exactement progressRef)
          progressRef.current = lerp(ANCHORS[k].prog, ANCHORS[k + 1].prog, fe);
          // boîte : slot[k] → plein écran (au milieu) → slot[k+1]
          const box = fe < 0.5
            ? lerpRect(rects[k], FULL, fe * 2)
            : lerpRect(FULL, rects[k + 1], (fe - 0.5) * 2);

          w.style.transform = `translate(${box.left}px, ${box.top}px)`;
          w.style.width = `${box.width}px`;
          w.style.height = `${box.height}px`;
          w.style.opacity = String(opacity);
          // couverture écran de la boîte → pilote l'apparition du fond (plein écran = opaque)
          const cover = clamp01((box.width * box.height) / (window.innerWidth * vh));
          coverRef.current = cover;
          // même easing que le fond 3D (cf. SceneContents) → le contenu HTML des sections
          // se dématérialise EXACTEMENT en même temps que le canvas passe en plein écran
          const bgT = clamp01((cover - 0.55) / 0.35);
          const veil = bgT * bgT * (3 - 2 * bgT); // smoothstep
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
      style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 15, pointerEvents: 'none', opacity: 0, transition: 'opacity .15s' }}>
      {/* pointerEvents:none explicite → R3F met `auto` par défaut sur son conteneur et
          intercepterait le drag destiné aux slots HTML (rotation manuelle des modules). */}
      <Canvas style={{ pointerEvents: 'none' }} resize={{ debounce: 0 }} camera={{ fov: 40, position: [0, 1, 5], near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }}>
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
