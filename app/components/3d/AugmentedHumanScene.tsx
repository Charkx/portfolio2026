'use client';

import { Suspense, useMemo, useRef, useEffect, useCallback, type RefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, useProgress, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { BrainModel } from './CognitiveProfil';
import DNAHelix from './DNAHelix';
import DataCubes from './DataCubes';
import { useSceneStore } from '../../store/sceneStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { TECH_STACK } from '../../utils/constants';

// focuses des modules embarqués (= stations 1..4)
const FOCI = ['brain', 'adn', 'heart', 'globe'] as const;

// tables techs (pour l'ADN embarqué) : id minuscule → niveau
const ALL_TECHS = Object.values(TECH_STACK).flat();
const LEVEL_BY_ID: Record<string, number> = Object.fromEntries(
  ALL_TECHS.map((t) => [t.name.toLowerCase(), t.level])
);

const CYAN = 0x22d3ee;

// Cadrage "corps entier" pour la fin de session (miroir de la station d'intro : on finit où on a commencé)
const FINALE_POS = new THREE.Vector3(0, 0.95, 4.4);
const FINALE_TGT = new THREE.Vector3(0, 0.95, 0);

// Réglages calibrés du placement des modules sur le corps
// 👉 PILOTE de tous les modules (à ajuster librement) :
//   scale = taille · x,z = position (unités monde) · y = hauteur sur le corps (fraction 0..1)
//   --- cadrage de la section ---
//   zoom = distance caméra (plus petit = plus près)
//   ox,oy = décalage du module DANS le cadre (composition : >0 ox le pousse à gauche, >0 oy vers le bas)
const CFG = {
  brain: { scale: 0.05, x: 0.01, y: 1.14, z: 0.14, zoom: 0.7, ox: 0, oy: 0 },
  adn:   { scale: 0.01, x: 0.325, y: 0.75, z: 0.00, zoom: 0.15, ox: 0, oy: 0 },
  // station projets : dézoom CORPS ENTIER (les Data Cubes s'ancrent sur la paume droite levée)
  heart: { scale: 0.20, x: -0.30, y: 1.00, z: 0.70, zoom: 0.1, ox: 0.0, oy: 0.0 },
  globe: { scale: 0.20, x: -0.30, y: 0.5, z: 0.70, zoom: 1.2, ox: 0, oy: 0 },
} as const;

// Station projets : caméra à la place des yeux de l'hologramme, regardant sa main levée.
// Mettre false pour revenir au cadrage frontal "corps entier".
const PROJECTS_POV = true;

// 👉 RÉGLAGES VUE SUBJECTIVE (POV) — AJUSTE ICI :
//   POV_ZOOM : avance l'œil vers la main. ↑ = plus près des cubes (zoom avant) · négatif = recul (zoom arrière)
//   POV_LOOK : DIRECTION du regard = décalage du point visé autour de la main (x = droite, y = haut, z = avant)
//   POV_EYE  : décalage libre de la position de l'œil (x = droite, y = haut, z = avant)
const POV_ZOOM = 0.08;
const POV_LOOK = new THREE.Vector3(0, 0.1, 0);
const POV_EYE  = new THREE.Vector3(0, 0, 0);

// PREVIEW : afficher l'hologramme du globe dans la paume, entouré des cubes (false = masqué)
const PROJECTS_SHOW_GLOBE = true;

const HUMAN_URL = '/3d/holograming_man.glb';
const BRAIN_URL = '/3d/brain_hologram.glb';
const GLOBE_URL = '/3d/earth_globe_hologram_2mb_looping_animation.glb';

// Largeur du PALIER : portion de chaque segment où l'on reste posé sur la station.
// Le reste (1 − 2×HOLD) = durée de la TRANSITION. Baisse HOLD → transition plus longue.
// (la durée absolue dépend aussi de la hauteur des sections : SECTION_VH dans le Showcase)
const HOLD = 0.3;

// Remap scroll → station : palier aux deux extrémités de chaque segment, transition douce au milieu.
// Utilisé À LA FOIS par la caméra (SceneContents) et la boîte du canvas (Showcase) → synchro garantie.
export function easedStation(prog: number, count: number): { i: number; f: number } {
  const p = THREE.MathUtils.clamp(prog, 0, 1) * (count - 1);
  const i = Math.min(Math.floor(p), count - 2);
  const fRaw = p - i;
  let f: number;
  if (fRaw <= HOLD) f = 0;
  else if (fRaw >= 1 - HOLD) f = 1;
  else f = (fRaw - HOLD) / (1 - 2 * HOLD);
  f = f * f * f * (f * (f * 6 - 15) + 10); // smootherstep
  return { i, f };
}

// Progression brute (sans palier) — quand la couche page contrôle l'easing elle-même.
export function linearStation(prog: number, count: number): { i: number; f: number } {
  const p = THREE.MathUtils.clamp(prog, 0, 1) * (count - 1);
  const i = Math.min(Math.floor(p), count - 2);
  return { i, f: p - i };
}

// --- Matériau holographique (injecté → conserve le skinning) ---
function makeHolo(timeUniform: { value: number }) {
  // émissif cyan = filet de sécurité : visible même si l'injection du shader échoue
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: CYAN, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeUniform;
    sh.uniforms.uOp = { value: 0.5 };
    sh.uniforms.uMz = { value: 1 }; // matérialisation : 0 = invisible, 1 = corps complet
    sh.uniforms.uEdge = { value: 1 }; // multiplicateur de l'edge glow (boost à la désintégration)
    m.userData.uOp = sh.uniforms.uOp;
    m.userData.uMz = sh.uniforms.uMz;
    m.userData.uEdge = sh.uniforms.uEdge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uOp;\nuniform float uMz;\nuniform float uEdge;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float fres=pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.0);
        float band=smoothstep(0.45,1.0,0.5+0.5*sin(vWPos.y*140.0-uTime*2.5));
        vec3 holo=vec3(0.12,0.85,0.95);
        float a=(0.10+fres*0.8+band*0.25)*uOp;
        // matérialisation bas → haut : front lumineux qui remonte le corps (hauteur ~1.8)
        float hN=clamp(vWPos.y/1.8,0.0,1.0);
        float front=uMz*1.15;
        float reveal=1.0-smoothstep(front-0.04,front+0.04,hN);
        float edge=smoothstep(0.07,0.0,abs(hN-front))*(1.0-uMz);
        a*=reveal;
        vec3 col=holo*(0.5+fres*1.6+band*0.7)+vec3(0.5,0.95,1.0)*edge*1.5*uEdge;
        gl_FragColor=vec4(col,a);`);
  };
  return m;
}

// --- Modules procéduraux ---
// normalise un module GLB chargé → centré à l'origine, diamètre ~2 (rayon ~1),
// pour qu'il garde la taille calibrée (CFG.*.scale) comme les anciens placeholders.
function normalizeModule(obj: THREE.Object3D): THREE.Group {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  // on normalise l'OBJET (pas le wrap) → diamètre ~2 ; le wrap reste libre pour CFG.*.scale
  obj.scale.multiplyScalar(2 / maxDim);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = new THREE.Vector3(); box2.getCenter(c);
  obj.position.sub(c);
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}

// (réacteur retiré : la station projets utilise désormais DataCubes ancrés sur la paume)

// première occurrence d'un os dont le nom matche la regex (recherche tolérante après import GLTF)
function findBone(root: THREE.Object3D, re: RegExp): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => { if (!found && re.test(o.name)) found = o; });
  return found;
}

type Station = { camPos: THREE.Vector3; target: THREE.Vector3; body: number; focus: string };
type MatRef = { m: THREE.Material & { opacity: number }; base: number };
type Organ = { group: THREE.Object3D; base: number; focus: string; mats: MatRef[] };

// récupère tous les matériaux d'un module + leur opacité de base (pour les fondre)
function collectMats(obj: THREE.Object3D): MatRef[] {
  const out: MatRef[] = [];
  obj.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    (Array.isArray(mat) ? mat : [mat]).forEach((mm) => {
      mm.transparent = true;
      const m = mm as THREE.Material & { opacity: number };
      out.push({ m, base: m.opacity ?? 1 });
    });
  });
  return out;
}

// --- Construction de la scène (humain + organes + stations) ---
function buildScene(srcScene: THREE.Object3D, srcGlobe: THREE.Object3D, globeAnims: THREE.AnimationClip[]) {
  const timeUniform = { value: 0 };
  const bodyMats: THREE.Material[] = [];

  const human = skeletonClone(srcScene);
  human.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // sphère tenue dans la main → masquée (visible=false n'altère PAS la bbox → corps inchangé)
    if (mesh.name.toLowerCase().includes('sphere')) { mesh.visible = false; return; }
    const mat = makeHolo(timeUniform); mesh.material = mat; mesh.frustumCulled = false; bodyMats.push(mat);
  });

  // échelle → 1.8 de haut, pieds au sol, centré en x
  const box = new THREE.Box3().setFromObject(human);
  const size = new THREE.Vector3(); box.getSize(size);
  human.scale.setScalar(1.8 / size.y);
  const b2 = new THREE.Box3().setFromObject(human);
  const H = b2.max.y - b2.min.y;
  human.position.y -= b2.min.y;
  human.position.x -= (b2.min.x + b2.max.x) / 2;

  // NB : GLTFLoader retire les points des noms ('hand.R_032' → 'handR_032') → regex sans point
  const palmBone = findBone(human, /hand\.?r/i);      // main droite levée → ancrage Data Cubes
  const headBone = findBone(human, /head(?!.*end)/i); // tête (hors 'head_end') → yeux POV projets

  const pos = {
    brain: new THREE.Vector3(CFG.brain.x, H * CFG.brain.y, CFG.brain.z),
    adn:   new THREE.Vector3(CFG.adn.x,   H * CFG.adn.y,   CFG.adn.z),
    heart: new THREE.Vector3(CFG.heart.x, H * CFG.heart.y, CFG.heart.z),
    globe: new THREE.Vector3(CFG.globe.x, H * CFG.globe.y, CFG.globe.z),
  };

  // NB : cerveau (CognitiveProfil), ADN (DNAHelix) ET réacteur (HoloReactor) sont des
  // composants React interactifs embarqués séparément → pas dans les organes impératifs.
  const globe = normalizeModule(skeletonClone(srcGlobe));

  // animation embarquée du globe ("Scene")
  let globeMixer: THREE.AnimationMixer | null = null;
  if (globeAnims.length) {
    globeMixer = new THREE.AnimationMixer(globe);
    globeMixer.clipAction(globeAnims[0]).play();
  }

  const organs: Record<string, Organ> = {
    globe: { group: globe, base: CFG.globe.scale, focus: 'globe', mats: collectMats(globe) },
  };
  (Object.keys(organs) as ('globe')[]).forEach((k) => {
    organs[k].group.position.copy(pos[k]);
    organs[k].group.scale.setScalar(organs[k].base);
  });

  const root = new THREE.Group();
  root.add(human, globe);

  // --- ENVIRONNEMENT : voûte sombre + poussière holographique ---
  // But : masquer la page lorsque le canvas passe en plein écran (boot + transitions).
  // Opacité pilotée par la "couverture" de la boîte canvas (cf. SceneContents/coverRef) :
  //   plein écran → opaque (cache le site) · docké dans une section → transparent (se fond).
  const backdrop = new THREE.Group();
  // voûte : grande sphère inversée, dégradé vertical sombre (bleu-nuit cyber)
  const skyGeo = new THREE.SphereGeometry(40, 32, 24);
  const sPos = skyGeo.attributes.position;
  const sCol = new Float32Array(sPos.count * 3);
  const top = new THREE.Color('#01030a');  // zénith quasi noir
  const bot = new THREE.Color('#05131c');  // horizon bleu-cyan très sombre
  const tmpC = new THREE.Color();
  for (let i = 0; i < sPos.count; i++) {
    const yN = THREE.MathUtils.clamp(sPos.getY(i) / 40 * 0.5 + 0.5, 0, 1);
    tmpC.copy(bot).lerp(top, yN);
    sCol[i * 3] = tmpC.r; sCol[i * 3 + 1] = tmpC.g; sCol[i * 3 + 2] = tmpC.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -2;
  backdrop.add(sky);
  // poussière : nuée de points cyan en coquille → profondeur + ambiance holo
  const DUST = 380;
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const r = 8 + Math.random() * 22, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    dPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dPos[i * 3 + 1] = r * Math.cos(ph);
    dPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: CYAN, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.renderOrder = -1;
  backdrop.add(dust);
  root.add(backdrop);

  // body = opacité du corps À la station : pleine sur l'intro, ~0 sur chaque module
  // (le corps reste visible PENDANT les voyages via le "bulge" dans useFrame)
  // station de focus d'un module : caméra droit devant, décalée par ox/oy (composition dans le cadre)
  const frame = (key: keyof typeof pos, body = 0.0): Station => {
    const c = CFG[key], p = pos[key];
    const ax = p.x + c.ox, ay = p.y + c.oy;
    return { camPos: new THREE.Vector3(ax, ay, c.zoom), target: new THREE.Vector3(ax, ay, 0), body, focus: key };
  };

  const stations: Station[] = [
    { camPos: new THREE.Vector3(0, H * 0.55, 4.4), target: new THREE.Vector3(0, H * 0.55, 0), body: 0.5, focus: '' },
    frame('brain'),
    frame('adn'),
    frame('heart', 0.55), // corps entier visible pour la manipulation de réalité
    frame('globe'),
  ];

  return { root, human, palmBone, headBone, organs, pos, stations, bodyMats, timeUniform, globeMixer, backdrop, skyMat, dustMat };
}

// --- Wrapper de fondu pour un module React embarqué (cerveau, ADN…) ---
// fait apparaître/disparaître le composant selon le poids de SA station.
function HoloModule({ focus, position, baseScale, weightsRef, spin = 0, children }: {
  focus: string; position: THREE.Vector3; baseScale: number;
  weightsRef: RefObject<Record<string, number>>; spin?: number; children: ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  // base capturée UNE SEULE FOIS par matériau (jamais écrasée → pas de dimming cumulatif)
  const bases = useRef(new Map<THREE.Material & { opacity: number }, number>());
  // taille de base des PointsMaterial (leur size est en unités monde → ne suit pas l'échelle de l'objet)
  const pointSizes = useRef(new Map<THREE.PointsMaterial, number>());
  const meshCount = useRef(-1);
  const spinAccum = useRef(0); // angle d'auto-rotation accumulé (en pause pendant un drag)

  useFrame((_, dt) => {
    const grp = g.current; if (!grp) return;
    // quand la structure change (GLB / logos async), on enregistre les NOUVEAUX matériaux
    let n = 0; grp.traverse(() => n++);
    if (n !== meshCount.current) {
      meshCount.current = n;
      grp.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (!mat) return;
        (Array.isArray(mat) ? mat : [mat]).forEach((mm) => {
          const m = mm as THREE.Material & { opacity: number };
          if (!bases.current.has(m)) { m.transparent = true; bases.current.set(m, m.opacity ?? 1); }
          const pm = mm as THREE.PointsMaterial;
          if (pm.isPointsMaterial && !pointSizes.current.has(pm)) pointSizes.current.set(pm, pm.size);
        });
      });
    }
    const w = THREE.MathUtils.clamp(weightsRef.current[focus] ?? 0, 0, 1);
    const s = baseScale * (0.92 + w * 0.3);
    grp.visible = w > 0.004;
    grp.scale.setScalar(s);
    // turntable : auto-rotation (en pause si l'utilisateur drague ce module) + rotation manuelle
    const st = useSceneStore.getState();
    if (spin && st.dragFocus !== focus) spinAccum.current += spin * dt * w;
    const mr = st.manualRot[focus];
    grp.rotation.y = spinAccum.current + (mr?.y ?? 0);
    grp.rotation.x = mr?.x ?? 0;
    bases.current.forEach((base, m) => { m.opacity = base * w; });
    // particules : taille proportionnelle à l'échelle du module (sinon gros carrés)
    pointSizes.current.forEach((baseSize, pm) => { pm.size = baseSize * s; });
  });

  return <group ref={g} position={position}>{children}</group>;
}

// Cerveau interactif (CognitiveProfil) embarqué, piloté par le store (onglets About)
const BRAIN_COLORS = ['#ff00ff', '#2bff66', '#ffc400', '#00ffff', '#9b5de5'];
function HoloBrain({ position, baseScale, weightsRef }: {
  position: THREE.Vector3; baseScale: number; weightsRef: RefObject<Record<string, number>>;
}) {
  const sel = useSceneStore((s) => s.aboutSelected);
  return (
    <HoloModule focus="brain" position={position} baseScale={baseScale} weightsRef={weightsRef}>
      <BrainModel selected={sel} color={BRAIN_COLORS[sel] ?? '#22d3ee'} count={3} />
    </HoloModule>
  );
}

// ADN interactif (DNAHelix) embarqué, piloté par le store (filtres/survol Skills)
function HoloDNA({ position, baseScale, weightsRef }: {
  position: THREE.Vector3; baseScale: number; weightsRef: RefObject<Record<string, number>>;
}) {
  const visible = useSceneStore((s) => s.skillsVisible);
  const hovered = useSceneStore((s) => s.skillsHovered);
  const selected = useSceneStore((s) => s.skillsSelected);
  const level = useSceneStore((s) => s.skillsLevel);
  const shown = useMemo(
    () => (level === 0 ? visible : visible.filter((id) => LEVEL_BY_ID[id] === level)),
    [visible, level]
  );
  const onClick = useCallback((name: string) => {
    const id = name.toLowerCase();
    const cur = useSceneStore.getState().skillsSelected;
    useSceneStore.getState().setSkillsSelected(cur === id ? null : id);
  }, []);
  const onHover = useCallback((name: string | null) => {
    useSceneStore.getState().setSkillsHovered(name ? name.toLowerCase() : null);
  }, []);
  return (
    <HoloModule focus="adn" position={position} baseScale={baseScale} weightsRef={weightsRef}>
      <DNAHelix visibleTechs={shown} hoveredTech={hovered} selectedTech={selected} onTechClick={onClick} onTechHover={onHover} />
    </HoloModule>
  );
}

// Retour fluide d'un module à sa position initiale quand on quitte sa section.
// On ne touche pas à la rotation tant que le module est actif (w > .5) ou en cours de drag :
// dès qu'on s'en éloigne, la rotation manuelle accumulée se relâche en douceur vers 0.
// (mutation en place de manualRot : rien ne s'y abonne, lu via getState dans les boucles de frame)
function relaxRot(focus: string, active: boolean, dt: number) {
  const st = useSceneStore.getState();
  if (active || st.dragFocus === focus) return;
  const mr = st.manualRot[focus];
  if (!mr || (Math.abs(mr.x) < 1e-4 && Math.abs(mr.y) < 1e-4)) return;
  const k = 1 - Math.pow(0.0015, dt); // lissage indépendant du framerate (~retour en .6s)
  mr.x = THREE.MathUtils.lerp(mr.x, 0, k);
  mr.y = THREE.MathUtils.lerp(mr.y, 0, k);
}

// --- Contenu du Canvas ---
export function SceneContents({ progressRef, coverRef, debug = false, linear = false }: { progressRef: RefObject<number>; coverRef?: RefObject<number>; debug?: boolean; linear?: boolean }) {
  const { scene } = useGLTF(HUMAN_URL, true); // true = décodeur Draco (GLB compressés)
  const globe = useGLTF(GLOBE_URL, true);
  // cfgKey en dépendance → toute modif de CFG reconstruit la scène (sinon useMemo reste figé
  // car les modèles chargés ne changent pas de référence au Fast Refresh).
  const cfgKey = JSON.stringify(CFG);
  const built = useMemo(
    () => buildScene(scene, globe.scene, globe.animations),
    [scene, globe.scene, globe.animations, cfgKey]
  );
  const camera = useThree((s) => s.camera);
  const reduced = useReducedMotion(); // mouvement réduit : pas d'idle, matérialisation instantanée

  const _t = useRef(new THREE.Vector3());
  const _base = useRef(new THREE.Vector3());     // position caméra de station (avant override finale)
  const _baseTgt = useRef(new THREE.Vector3());  // cible caméra de station
  const _eyes = useRef(new THREE.Vector3());     // POV : position des yeux (os tête)
  const _hand = useRef(new THREE.Vector3());     // POV : position de la main (os paume)
  const _dir = useRef(new THREE.Vector3());      // POV : direction œil → main
  const mzRef = useRef(0); // 0 → 1 : matérialisation du corps au montage (boot)
  const weightsRef = useRef<Record<string, number>>({}); // poids par module (pour HoloBrain etc.)

  useFrame((_, dt) => {
    // reduced-motion : bandes du shader figées, globe sans animation interne
    if (!reduced) {
      built.timeUniform.value += dt;
      if (built.globeMixer) built.globeMixer.update(dt);
    }

    // matérialisation : monte de 0 à 1 en ~1.6s (instantanée en calibrage/reduced-motion)
    if (reduced) mzRef.current = 1;
    if (!debug && mzRef.current < 1) mzRef.current = Math.min(mzRef.current + dt / 1.6, 1);
    const mz = debug ? 1 : mzRef.current;
    // Fin de session : le corps se désintègre (le front uMz redescend) — piloté par ContactSection
    const es = debug ? 0 : (useSceneStore.getState().endSessionProgress ?? 0);
    const esAppear = THREE.MathUtils.clamp(es / 0.15, 0, 1);        // 0→1 : le corps se cadre/apparaît
    const esDissolve = THREE.MathUtils.clamp((es - 0.15) / 0.7, 0, 1); // puis se dissout de haut en bas
    built.bodyMats.forEach((m) => {
      if (m.userData.uMz) m.userData.uMz.value = mz * (1 - esDissolve);
      if (m.userData.uEdge) m.userData.uEdge.value = 1 + esDissolve * 2.8;
    });

    // Environnement : opacité pilotée par la couverture de la boîte canvas (plein écran → opaque)
    const cover = coverRef?.current ?? 0;
    const bgT = THREE.MathUtils.clamp((cover - 0.55) / 0.35, 0, 1);
    const bgEase = bgT * bgT * (3 - 2 * bgT); // smoothstep
    built.skyMat.opacity = bgEase;
    built.dustMat.opacity = bgEase * 0.8;
    if (!reduced) built.backdrop.rotation.y += dt * 0.01; // dérive lente

    // Mode calibrage : corps + tous les modules visibles, caméra libre (OrbitControls)
    if (debug) {
      built.skyMat.opacity = 0; built.dustMat.opacity = 0;
      built.bodyMats.forEach((m) => { if (m.userData.uOp) m.userData.uOp.value = 0.4; });
      FOCI.forEach((k) => { weightsRef.current[k] = 1; });
      (Object.keys(built.organs)).forEach((key) => {
        const o = built.organs[key];
        o.group.scale.setScalar(o.base);
        o.mats.forEach(({ m, base }) => { m.opacity = base; });
      });
      return;
    }

    const { stations, bodyMats, organs } = built;
    const { i, f } = (linear ? linearStation : easedStation)(progressRef.current, stations.length);
    const A = stations[i], B = stations[i + 1];

    _base.current.lerpVectors(A.camPos, B.camPos, f);
    _baseTgt.current.lerpVectors(A.target, B.target, f);

    // Vue subjective "yeux de l'hologramme" à la station projets : la caméra glisse
    // vers la tête et regarde la main levée (là où gravitent les cubes).
    let heartW = 0;
    if (A.focus === 'heart') heartW += 1 - f;
    if (B.focus === 'heart') heartW += f;
    const head = built.headBone, palm = built.palmBone;
    if (PROJECTS_POV && heartW > 0.001 && head && palm) {
      head.getWorldPosition(_eyes.current);
      palm.getWorldPosition(_hand.current);
      _hand.current.add(POV_LOOK);                            // DIRECTION : point visé (autour de la main)
      _dir.current.subVectors(_hand.current, _eyes.current).normalize();
      _eyes.current.addScaledVector(_dir.current, POV_ZOOM);  // ZOOM : avance l'œil vers la main
      _eyes.current.add(POV_EYE);                             // décalage libre de l'œil
      _base.current.lerp(_eyes.current, heartW);
      _baseTgt.current.lerp(_hand.current, heartW);
    }

    // fin de session : la caméra recule vers le plan "corps entier"
    camera.position.lerpVectors(_base.current, FINALE_POS, esAppear);
    _t.current.lerpVectors(_baseTgt.current, FINALE_TGT, esAppear);
    camera.lookAt(_t.current);

    // corps : visible pendant le voyage (bulge au milieu), ~0 une fois arrivé sur un module,
    // ré-affiché pour la fin de session (avant de se désintégrer)
    const TRAVEL = 0.45;
    const bodyOp = Math.max(THREE.MathUtils.lerp(A.body, B.body, f), TRAVEL * Math.sin(Math.PI * f), 0.6 * esAppear);
    bodyMats.forEach((m) => { if (m.userData.uOp) m.userData.uOp.value = bodyOp; });

    // poids de chaque module = 1 sur SA station, 0 ailleurs (pilote fondu + échelle)
    FOCI.forEach((key) => {
      let w = 0; if (A.focus === key) w += 1 - f; if (B.focus === key) w += f;
      weightsRef.current[key] = THREE.MathUtils.clamp(w, 0, 1);
    });

    // dès qu'un module n'est plus actif (on quitte sa section), sa rotation manuelle
    // revient à sa position initiale (l'humain n'est actif que sur la station d'intro)
    FOCI.forEach((key) => relaxRot(key, (weightsRef.current[key] ?? 0) > 0.5, dt));
    relaxRot('human', i === 0 && f < 0.5, dt);

    // rotation manuelle du corps (hero) à la souris (pas d'auto-spin)
    const stH = useSceneStore.getState();
    const mrH = stH.manualRot.human;
    built.human.rotation.y = mrH?.y ?? 0;
    built.human.rotation.x = mrH?.x ?? 0;

    // modules impératifs (globe) — le cerveau/ADN/cœur sont des composants React dédiés
    (Object.keys(organs)).forEach((key) => {
      const o = organs[key];
      let w = weightsRef.current[o.focus] ?? 0;

      // PREVIEW : le globe apparaît dans la paume à la station projets (entouré des cubes)
      const inPalm = o.focus === 'globe' && PROJECTS_SHOW_GLOBE && (weightsRef.current.heart ?? 0) > 0.001 && !!palm;
      if (inPalm && palm) {
        palm.getWorldPosition(_hand.current);
        _hand.current.y += 0.1;                         // un peu au-dessus de la paume
        o.group.position.lerp(_hand.current, 0.3);
        w = Math.max(w, weightsRef.current.heart ?? 0);
      } else if (o.focus === 'globe') {
        o.group.position.lerp(built.pos.globe, 0.2);     // retour à la station contact
      }

      const previewScale = inPalm ? 0.35 : 1;            // globe réduit dans la paume
      const tgt = o.base * previewScale * (0.92 + w * 0.30);
      o.group.scale.setScalar(THREE.MathUtils.lerp(o.group.scale.x, tgt, 0.2));
      // le globe s'efface pendant la fin de session (place au corps qui se désintègre)
      o.mats.forEach(({ m, base }) => { m.opacity = base * w * (o.focus === 'globe' ? (1 - esAppear) : 1); });
      // rotation manuelle (l'anim interne du globe joue sur ses nœuds enfants → le wrap est libre)
      const mr = stH.manualRot[o.focus];
      if (mr) { o.group.rotation.y = mr.y; o.group.rotation.x = mr.x; }
    });
  });

  return (
    <>
      <primitive object={built.root} />
      <HoloBrain position={built.pos.brain} baseScale={CFG.brain.scale} weightsRef={weightsRef} />
      <HoloDNA position={built.pos.adn} baseScale={CFG.adn.scale} weightsRef={weightsRef} />
      <DataCubes position={built.pos.heart} baseScale={CFG.heart.scale} weightsRef={weightsRef} palmBone={built.palmBone} />
      {debug && <OrbitControls target={[0, 0.9, 0]} />}
    </>
  );
}

export function Loader() {
  const { progress } = useProgress();
  return <Html center><div style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>{Math.round(progress)}%</div></Html>;
}

// --- Composant exporté : canvas épinglé piloté par le scroll de la page ---
export default function AugmentedHumanScene() {
  const progressRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      progressRef.current = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ fov: 40, position: [0, 1, 5], near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1} />
        <Suspense fallback={<Loader />}>
          <SceneContents progressRef={progressRef} />
        </Suspense>
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0} radius={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

useGLTF.preload(HUMAN_URL, true);
useGLTF.preload(BRAIN_URL, true);
useGLTF.preload(GLOBE_URL, true);
