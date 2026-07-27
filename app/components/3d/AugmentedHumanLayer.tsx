'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SceneContents, Loader } from './AugmentedHumanScene';
import { useSceneStore } from '../../store/sceneStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Garde-fou perfs : < 40 fps pendant 3 s consécutives → bascule qualité "éco"
// (bloom coupé + DPR 1). Une seule fois par session (on ne lutte pas contre
// l'utilisateur qui remettrait HIGH au recalibrage).
function FpsGuard() {
  const setQuality = useSettingsStore((s) => s.setQuality);
  const acc = useRef({ t: 0, frames: 0, slow: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    if (dt > 0.25) { a.t = 0; a.frames = 0; return; } // retour d'onglet caché : fenêtre invalide
    a.t += dt; a.frames++;
    if (a.t < 1) return;                              // bilan chaque seconde
    const fps = a.frames / a.t;
    a.t = 0; a.frames = 0;
    a.slow = fps < 40 ? a.slow + 1 : 0;
    if (a.slow >= 3 && !sessionStorage.getItem('auto-eco')) {
      sessionStorage.setItem('auto-eco', '1');
      setQuality('eco');
    }
  });
  return null;
}

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

// sections dont le texte est masquable (celles à voile) — contact affiche son contenu autrement
const GATED_SECTIONS = ['hero', 'about', 'skills', 'projects'];

// portrait (mobile) : fov élargi pour que l'hologramme ne soit pas rogné sur les côtés
function ResponsiveFov() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as import('three').PerspectiveCamera;
    c.fov = size.width < size.height ? 52 : 40;
    c.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function AugmentedHumanLayer() {
  // le canvas permanent tourne AUSSI sur mobile (la narration hologramme est
  // l'identité du site) — la qualité éco y est le défaut (cf. settingsStore)
  const [ready, setReady] = useState(false);
  const quality = useSettingsStore((s) => s.quality); // éco : bloom coupé + DPR plafonné
  const reduced = useReducedMotion();                 // coupe le VOYAGE, pas la scène
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0); // station hero au départ (écran verrouillé : environnement seul)
  const fadeRef = useRef(0);     // progression des FONDUS — continue même quand la caméra coupe
  const coverRef = useRef(1); // canvas permanent → l'environnement (voûte/poussière) est toujours visible

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
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

          // fondus : TOUJOURS continus (opacité et échelle des modules), même quand la
          // caméra, elle, coupe. C'est ce qui évite que les modules surgissent d'un bloc.
          fadeRef.current = lerp(ANCHORS[k].prog, ANCHORS[k + 1].prog, plateau(clamp01(fLin)));

          if (reduced) {
            // MOUVEMENT RÉDUIT : la caméra ne voyage plus, elle COUPE d'une station à
            // l'autre à mi-chemin. C'est le travelling qui peut donner la nausée — pas
            // la vie de l'hologramme, ni le récit. On retire donc le déplacement, et
            // rien d'autre (cf. AugmentedHumanScene, qui garde le shader et la
            // matérialisation en mouvement réduit).
            progressRef.current = clamp01(fLin) < 0.5 ? ANCHORS[k].prog : ANCHORS[k + 1].prog;
            // plus de voyage à masquer → le texte reste lisible en permanence
            document.documentElement.style.setProperty('--holo-veil', '0');
          } else {
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

        // GATE nav : pendant un saut, on n'affiche QUE la section source et la
        // destination ; les sections traversées restent masquées (leur texte ne
        // recouvre plus l'animation). Hors saut : chaque section suit le voile normal.
        const st = useSceneStore.getState();
        GATED_SECTIONS.forEach((id) => {
          const sec = document.getElementById(id);
          if (!sec) return;
          sec.style.opacity = st.navJumping && id !== st.navSource && id !== st.navTarget ? '0' : '';
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.setProperty('--holo-veil', '0'); // contenu rendu visible
      GATED_SECTIONS.forEach((id) => { const s = document.getElementById(id); if (s) s.style.opacity = ''; });
    };
  }, [ready, reduced]);

  if (!ready) return null;

  return (
    <div ref={wrapperRef}
      style={{ position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0, transition: 'opacity .6s' }}>
      {/* pointerEvents:none explicite → R3F met `auto` par défaut sur son conteneur et
          intercepterait le drag destiné aux slots HTML (rotation manuelle des modules). */}
      <Canvas frameloop="always" dpr={quality === 'eco' ? 1 : [1, 2]} style={{ pointerEvents: 'none' }} resize={{ debounce: 0 }} camera={{ fov: 40, position: [0, 1, 5], near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }}>
        <ResponsiveFov />
        <ambientLight intensity={1} />
        <Suspense fallback={<Loader />}>
          <SceneContents progressRef={progressRef} fadeProgressRef={fadeRef} coverRef={coverRef} linear />
        </Suspense>
        {quality !== 'eco' && (
          <>
            <FpsGuard />
            <EffectComposer>
              <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0} radius={0.6} />
            </EffectComposer>
          </>
        )}
      </Canvas>
    </div>
  );
}
