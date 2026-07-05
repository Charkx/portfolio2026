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
import { usePortfolioStore } from '../../store/portfolioStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { audioEngine } from '../../lib/audioEngine';
import { TECH_STACK } from '../../utils/constants';

// focuses des modules embarqués (= stations 1..3 ; la station contact n'a pas de module)
const FOCI = ['brain', 'adn', 'heart'] as const;

// tables techs (pour l'ADN embarqué) : id minuscule → niveau
const ALL_TECHS = Object.values(TECH_STACK).flat();
const LEVEL_BY_ID: Record<string, number> = Object.fromEntries(
  ALL_TECHS.map((t) => [t.name.toLowerCase(), t.level])
);

const CYAN = 0x22d3ee;

// Cadrage "corps entier" pour la fin de session (miroir de la station d'intro : on finit où on a commencé)
const FINALE_POS = new THREE.Vector3(0, 0.95, 4.4);
const FINALE_TGT = new THREE.Vector3(0, 0.95, 0);

// Saut de nav : parcours caméra entre VISIONS nommées. La vision "hologramme entier"
// (= FINALE, le plan large) est la vision de BASE : source → base → cible, en 2 temps,
// sans rejouer les stations intermédiaires. section → index de station :
const SEC_IDX: Record<string, number> = { hero: 0, about: 1, skills: 2, projects: 3, contact: 4 };
const NAV_CAM_DUR = 2.6; // durée du parcours caméra (≈ durée du scroll de nav)

// Réglages calibrés du placement des modules sur le corps
// 👉 PILOTE de tous les modules (à ajuster librement) :
//   scale = taille · x,z = position (unités monde) · y = hauteur sur le corps (fraction 0..1)
//   --- cadrage de la section ---
//   zoom = distance caméra (plus petit = plus près)
//   ox,oy = décalage du module DANS le cadre (composition : >0 ox le pousse à gauche, >0 oy vers le bas)
const CFG = {
  // canvas permanent : ox compose le module DANS l'écran (contenu About à gauche → cerveau à droite, etc.)
  brain: { scale: 0.05, x: 0.01, y: 1.14, z: 0.14, zoom: 0.7, ox: -0.20, oy: 0 },
  adn:   { scale: 0.01, x: 0.325, y: 0.75, z: 0.00, zoom: 0.21, ox: 0.05, oy: 0 },
  // station projets : dézoom CORPS ENTIER (les Data Cubes s'ancrent sur la paume droite levée)
  heart: { scale: 0.20, x: -0.30, y: 1.00, z: 0.70, zoom: 0.1, ox: 0.0, oy: 0.0 },
  // station contact : plan CORPS ENTIER (≈ cadrage finale) — on arrive face à
  // l'hologramme, la fin de session (désintégration) enchaîne sans coupure
  contact: { scale: 0.20, x: 0, y: 0.55, z: 0, zoom: 4.4, ox: 0, oy: 0 },
} as const;

// Station projets : caméra à la place des yeux de l'hologramme, regardant sa main levée.
// Mettre false pour revenir au cadrage frontal "corps entier".
const PROJECTS_POV = true;

// 👉 RÉGLAGES VUE SUBJECTIVE (POV) — AJUSTE ICI :
//   POV_ZOOM : avance l'œil vers la main. ↑ = plus près des cubes (zoom avant) · négatif = recul (zoom arrière)
//   POV_LOOK : DIRECTION du regard = décalage du point visé autour de la main (x = droite, y = haut, z = avant)
//   POV_EYE  : décalage libre de la position de l'œil (x = droite, y = haut, z = avant)
const POV_ZOOM = 0.08;
const POV_LOOK = new THREE.Vector3(0, 0.22, 0);   // vise le centre de la couronne de cubes
const POV_EYE  = new THREE.Vector3(-0.05, 0.08, 0.1); // œil légèrement reculé → main moins envahissante

// 👉 CHORÉGRAPHIE CAMÉRA — AJUSTE ICI :
//   Entre deux stations, la caméra s'écarte en "plan large" (on revoit l'humain entier,
//   la signature du site) puis replonge vers la station suivante. Nul aux extrémités.
//   WIDE_PULL     : recul du plan large (unités monde ; 0 = désactivé)
//   WIDE_RETARGET : 0..1 — combien le regard glisse vers le corps entier pendant le voyage
//   WIDE_BODY_Y   : hauteur visée sur le corps pendant le plan large
//   BREATH        : respiration de la caméra à la station (0 = désactivée)
const WIDE_PULL = 2.6;
const WIDE_RETARGET = 0.85;
const WIDE_BODY_Y = 1.0;
const BREATH = 0.012;

// 👉 INTERACTIONS HERO — AJUSTE ICI :
//   LOOK_YAW/PITCH : amplitude du regard qui suit le curseur (rad ; signe = sens)
//   PULSE_SPEED    : vitesse de l'onde glitch au clic (unités monde/s)
const LOOK_YAW = 0.45;
const LOOK_PITCH = 0.22;
const PULSE_SPEED = 1.6;

const HUMAN_URL = '/3d/holograming_man.glb';
const BRAIN_URL = '/3d/brain_hologram.glb';

// Largeur du PALIER : portion de chaque segment où l'on reste posé sur la station.
// Le reste (1 − 2×HOLD) = durée de la TRANSITION. Baisse HOLD → transition plus longue.
// (la durée absolue dépend aussi de la hauteur des sections : SECTION_VH dans le Showcase)
const HOLD = 0.22; // 0.3 → 0.22 : voyages plus amples (plan large lisible entre les stations)

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
// pulse = onde glitch au clic : uniforms PARTAGÉS par tous les matériaux du corps
type Pulse = { t: { value: number }; o: { value: THREE.Vector3 } };

function makeHolo(timeUniform: { value: number }, pulse: Pulse) {
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
    sh.uniforms.uPulseT = pulse.t;   // temps écoulé depuis le clic (99 = onde inactive)
    sh.uniforms.uPulseO = pulse.o;   // origine de l'onde (point cliqué, monde)
    m.userData.uOp = sh.uniforms.uOp;
    m.userData.uMz = sh.uniforms.uMz;
    m.userData.uEdge = sh.uniforms.uEdge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uOp;\nuniform float uMz;\nuniform float uEdge;\nuniform float uPulseT;\nuniform vec3 uPulseO;')
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
        // onde glitch : anneau lumineux qui se propage depuis le point cliqué puis s'éteint
        float pd=distance(vWPos,uPulseO);
        float pr=uPulseT*${PULSE_SPEED.toFixed(2)};
        float ring=smoothstep(0.14,0.0,abs(pd-pr))*max(0.0,1.0-uPulseT*0.85)*reveal;
        col+=vec3(0.45,1.0,1.0)*ring*1.8;
        a+=ring*0.55;
        gl_FragColor=vec4(col,a);`);
  };
  return m;
}

// (réacteur retiré : la station projets utilise désormais DataCubes ancrés sur la paume)

// première occurrence d'un os dont le nom matche la regex (recherche tolérante après import GLTF)
function findBone(root: THREE.Object3D, re: RegExp): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => { if (!found && re.test(o.name)) found = o; });
  return found;
}

type Station = { camPos: THREE.Vector3; target: THREE.Vector3; body: number; focus: string };

// --- Construction de la scène (humain + stations) ---
function buildScene(srcScene: THREE.Object3D) {
  const timeUniform = { value: 0 };
  // onde glitch au clic : uniforms partagés (t=99 → inactive au départ)
  const pulse: Pulse = { t: { value: 99 }, o: { value: new THREE.Vector3() } };
  const bodyMats: THREE.Material[] = [];

  const human = skeletonClone(srcScene);
  human.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // sphère tenue dans la main → masquée (visible=false n'altère PAS la bbox → corps inchangé)
    if (mesh.name.toLowerCase().includes('sphere')) { mesh.visible = false; return; }
    const mat = makeHolo(timeUniform, pulse); mesh.material = mat; mesh.frustumCulled = false; bodyMats.push(mat);
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
  const headBone = findBone(human, /head(?!.*end)/i); // tête (hors 'head_end') → yeux POV projets + regard
  // pose de repos de la tête : base sur laquelle s'ajoute le regard qui suit le curseur
  const headBaseQuat = headBone ? headBone.quaternion.clone() : null;

  const pos = {
    brain:   new THREE.Vector3(CFG.brain.x,   H * CFG.brain.y,   CFG.brain.z),
    adn:     new THREE.Vector3(CFG.adn.x,     H * CFG.adn.y,     CFG.adn.z),
    heart:   new THREE.Vector3(CFG.heart.x,   H * CFG.heart.y,   CFG.heart.z),
    contact: new THREE.Vector3(CFG.contact.x, H * CFG.contact.y, CFG.contact.z),
  };

  const root = new THREE.Group();
  root.add(human);

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
    frame('heart', 0.55),   // corps entier visible pour la manipulation de réalité
    frame('contact', 0.55), // corps visible à l'arrivée (avant la désintégration scrubbée)
  ];

  return { root, human, palmBone, headBone, headBaseQuat, pos, stations, bodyMats, timeUniform, pulse, backdrop, skyMat, dustMat };
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

// --- Lucioles de données (station d'intro) : de petites lueurs flottent autour de
// l'hologramme. On les RÉCOLTE en balayant la souris dessus (proximité, pas de clic) :
// la luciole file dans le corps, éclate en éclat lumineux + carillon. Positif, sans
// répétition pénible, incite au mouvement de la souris. (Le mini-jeu "defend" vit
// ailleurs — page easter-egg.) Le mini-jeu défensif est conservé dans l'historique git.
const MOTE_COUNT = 10;             // lucioles simultanées
const MOTE_TARGET = new THREE.Vector3(0, 1.0, 0); // cœur de l'hologramme (destination)
const MOTE_COLLECT_R = 0.32;       // rayon de récolte autour du curseur (monde)
const MOTE_SIZE = 0.035;           // taille d'une luciole

type Mote = {
  base: THREE.Vector3;  // centre de flottement
  pos: THREE.Vector3;   // position courante
  phase: number;        // phase du drift (déphasage par luciole)
  collected: boolean;
  ct: number;           // 0→1 : absorption dans le corps
  respawnAt: number;
};

function randomMoteBase(m: Mote) {
  // volume devant l'hologramme, dans le cadre caméra
  m.base.set((Math.random() - 0.5) * 3.0, 0.3 + Math.random() * 1.7, -0.3 + Math.random() * 1.4);
  m.phase = Math.random() * Math.PI * 2;
}

function HeroMotes({ heroWRef }: { heroWRef: RefObject<number> }) {
  const reduced = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const clock = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const _ndc = useRef(new THREE.Vector2());
  const _ray = useRef(new THREE.Raycaster());
  const _plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const _cursor = useRef(new THREE.Vector3());
  const motes = useRef<Mote[]>(
    Array.from({ length: MOTE_COUNT }, () => {
      const m: Mote = { base: new THREE.Vector3(), pos: new THREE.Vector3(), phase: 0, collected: false, ct: 0, respawnAt: 0 };
      randomMoteBase(m);
      return m;
    })
  );

  // le canvas est pointer-events:none → on suit la souris sur la fenêtre
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, dt) => {
    const active = (heroWRef.current ?? 0) > 0.5 && !reduced;
    clock.current += dt;

    // position monde du curseur : projeté sur le plan du corps (z=0)
    if (active) {
      _ndc.current.set(pointer.current.x, pointer.current.y);
      _ray.current.setFromCamera(_ndc.current, camera);
      _ray.current.ray.intersectPlane(_plane.current, _cursor.current);
    }

    motes.current.forEach((m, i) => {
      const mesh = meshes.current[i], mat = mats.current[i];
      if (!mesh || !mat) return;
      if (!active) { mesh.visible = false; return; }
      mesh.visible = true;

      if (m.collected) {
        // absorption : file vers le cœur, brille puis disparaît
        m.ct += dt / 0.45;
        const e = Math.min(m.ct, 1);
        m.pos.lerp(MOTE_TARGET, 0.12 + e * 0.15);
        mesh.position.copy(m.pos);
        mesh.scale.setScalar(MOTE_SIZE * (1.6 - e * 1.5));
        mat.opacity = 1 - e;
        if (m.ct >= 1) {
          m.collected = false; m.ct = 0;
          m.respawnAt = clock.current + 0.4 + Math.random() * 1.2;
          randomMoteBase(m);
        }
        return;
      }

      // en attente de réapparition (invisible un court instant)
      if (clock.current < m.respawnAt) { mesh.visible = false; return; }

      // flottement lent autour du point de base (dérive + bob → attire l'œil)
      const t = clock.current + m.phase;
      m.pos.set(
        m.base.x + Math.sin(t * 0.5) * 0.18,
        m.base.y + Math.sin(t * 0.8 + 1.3) * 0.14,
        m.base.z + Math.cos(t * 0.4) * 0.12,
      );
      mesh.position.copy(m.pos);
      mesh.scale.setScalar(MOTE_SIZE * (0.85 + 0.15 * Math.sin(t * 3)));
      mat.opacity = 0.9;

      // récolte : la souris passe à proximité → absorption
      if (m.pos.distanceTo(_cursor.current) < MOTE_COLLECT_R) {
        m.collected = true; m.ct = 0;
        audioEngine.play('collect');
      }
    });
  });

  return (
    <group>
      {Array.from({ length: MOTE_COUNT }).map((_, i) => (
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} visible={false}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            ref={(mm) => { mats.current[i] = mm as THREE.MeshBasicMaterial | null; }}
            color="#aef6ff" transparent opacity={0.9} depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Contenu du Canvas ---
export function SceneContents({ progressRef, coverRef, debug = false, linear = false }: { progressRef: RefObject<number>; coverRef?: RefObject<number>; debug?: boolean; linear?: boolean }) {
  const { scene } = useGLTF(HUMAN_URL, true); // true = décodeur Draco (GLB compressés)
  // cfgKey en dépendance → toute modif de CFG reconstruit la scène (sinon useMemo reste figé
  // car les modèles chargés ne changent pas de référence au Fast Refresh).
  const cfgKey = JSON.stringify(CFG);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cfgKey est volontairement en trop (rebuild au Fast Refresh)
  const built = useMemo(() => buildScene(scene), [scene, cfgKey]);
  const camera = useThree((s) => s.camera);
  const reduced = useReducedMotion(); // mouvement réduit : pas d'idle, matérialisation instantanée

  const _t = useRef(new THREE.Vector3());
  const _base = useRef(new THREE.Vector3());     // position caméra de station (avant override finale)
  const _baseTgt = useRef(new THREE.Vector3());  // cible caméra de station
  const _eyes = useRef(new THREE.Vector3());     // POV : position des yeux (os tête)
  const _hand = useRef(new THREE.Vector3());     // POV : position de la main (os paume)
  const _dir = useRef(new THREE.Vector3());      // POV : direction œil → main
  const _pull = useRef(new THREE.Vector3());     // plan large : axe de recul caméra
  const _wideTgt = useRef(new THREE.Vector3());  // plan large : point visé (corps entier)
  const mzRef = useRef(0); // 0 → 1 : matérialisation du corps au montage (boot)
  const weightsRef = useRef<Record<string, number>>({}); // poids par module (pour HoloBrain etc.)
  // saut de nav : horloge 0→1 + vecteurs des visions source/cible/interpolée
  const navClockRef = useRef(0);
  const _navPos = useRef(new THREE.Vector3());
  const _navTgt = useRef(new THREE.Vector3());
  const _navSrcPos = useRef(new THREE.Vector3());
  const _navSrcTgt = useRef(new THREE.Vector3());
  const _navDstPos = useRef(new THREE.Vector3());
  const _navDstTgt = useRef(new THREE.Vector3());

  // interactions hero : curseur (regard) + poids de la station d'intro (gate du clic)
  const pointerRef = useRef({ x: 0, y: 0 }); // NDC -1..1
  const lookRef = useRef({ yaw: 0, pitch: 0 }); // regard lissé
  const heroWRef = useRef(0);
  const _lookE = useRef(new THREE.Euler());
  const _lookQ = useRef(new THREE.Quaternion());

  // le canvas est pointer-events:none → on écoute la fenêtre
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // ONDE GLITCH : clic sur le corps (station d'intro) → raycast manuel → l'onde
  // part du point touché (uniforms du shader holo)
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onDown = (e: PointerEvent) => {
      if (reduced || heroWRef.current < 0.5) return;
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObject(built.human, true);
      if (!hits.length) return;
      // onde glitch depuis le point touché
      built.pulse.o.value.copy(hits[0].point);
      built.pulse.t.value = 0;
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [built, camera, reduced]);

  // VISION d'une section (cadrage caméra nommé), écrite dans outPos/outTgt.
  // Projets = vue subjective (POV main) ; les autres = cadrage de station.
  const visionFor = useCallback((section: string, outPos: THREE.Vector3, outTgt: THREE.Vector3) => {
    const stn = built.stations[SEC_IDX[section] ?? 0];
    if (section === 'projects' && PROJECTS_POV && built.headBone && built.palmBone) {
      built.headBone.getWorldPosition(outPos);
      built.palmBone.getWorldPosition(outTgt);
      outTgt.add(POV_LOOK);
      _dir.current.subVectors(outTgt, outPos).normalize();
      outPos.addScaledVector(_dir.current, POV_ZOOM);
      outPos.add(POV_EYE);
    } else {
      outPos.copy(stn.camPos);
      outTgt.copy(stn.target);
    }
  }, [built]);

  useFrame((_, dt) => {
    // reduced-motion : bandes du shader figées
    if (!reduced) built.timeUniform.value += dt;
    built.pulse.t.value += dt; // l'onde glitch se propage puis s'éteint (inactive à t≥~1.2)

    // matérialisation : monte de 0 à 1 en ~1.6s (instantanée en calibrage/reduced-motion).
    // Tant que l'accès est verrouillé, le corps reste invisible : le canvas permanent
    // ne montre que l'environnement (voûte + poussière) derrière la carte biométrique.
    const unlocked = usePortfolioStore.getState().introPhase === 'UNLOCKED';
    if (reduced) mzRef.current = unlocked ? 1 : 0;
    if (!debug && unlocked && mzRef.current < 1) mzRef.current = Math.min(mzRef.current + dt / 1.6, 1);
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
      return;
    }

    const { stations, bodyMats } = built;
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

    // PLAN LARGE : au cœur du voyage entre deux stations, le regard glisse vers le
    // corps entier et la caméra recule en cloche (établit la signature du site),
    // puis replonge. sin(πf) = 0 aux stations → aucune incidence sur les paliers.
    const wide = Math.sin(Math.PI * f);
    if (wide > 0.001 && WIDE_PULL > 0) {
      _wideTgt.current.set(0, WIDE_BODY_Y, 0);
      _baseTgt.current.lerp(_wideTgt.current, wide * WIDE_RETARGET);
      _pull.current.subVectors(_base.current, _baseTgt.current).normalize();
      _base.current.addScaledVector(_pull.current, wide * WIDE_PULL);
    }

    // respiration : très légère dérive à la station — l'image ne fige jamais
    if (!reduced && BREATH > 0) {
      const tb = built.timeUniform.value;
      const idle = 1 - wide;
      _base.current.x += Math.sin(tb * 0.4) * BREATH * idle;
      _base.current.y += Math.sin(tb * 0.27 + 1.7) * BREATH * 0.6 * idle;
    }

    // SAUT DE NAV : parcours caméra en 2 temps entre VISIONS nommées, SANS rejouer
    // les stations intermédiaires. La vision "hologramme entier" (FINALE) est la base :
    //   vision(source) → hologramme (base) → vision(cible).
    //   ex. About(cerveau) → Contact : cerveau → hologramme → carte (2 mouvements).
    const navSt = useSceneStore.getState();
    if (navSt.navJumping && navSt.navSource && navSt.navTarget) {
      navClockRef.current = Math.min(navClockRef.current + dt / NAV_CAM_DUR, 1);
      visionFor(navSt.navSource, _navSrcPos.current, _navSrcTgt.current);
      visionFor(navSt.navTarget, _navDstPos.current, _navDstTgt.current);
      const np = navClockRef.current;
      if (np < 0.5) {
        const s = np / 0.5, e = s * s * (3 - 2 * s);          // 1er temps : source → base
        _navPos.current.lerpVectors(_navSrcPos.current, FINALE_POS, e);
        _navTgt.current.lerpVectors(_navSrcTgt.current, FINALE_TGT, e);
      } else {
        const s = (np - 0.5) / 0.5, e = s * s * (3 - 2 * s);  // 2e temps : base → cible
        _navPos.current.lerpVectors(FINALE_POS, _navDstPos.current, e);
        _navTgt.current.lerpVectors(FINALE_TGT, _navDstTgt.current, e);
      }
      camera.position.copy(_navPos.current);
      camera.lookAt(_navTgt.current);
    } else {
      navClockRef.current = 0;
      // scroll normal / fin de session : recul vers le plan "corps entier" (esAppear)
      camera.position.lerpVectors(_base.current, FINALE_POS, esAppear);
      _t.current.lerpVectors(_baseTgt.current, FINALE_TGT, esAppear);
      camera.lookAt(_t.current);
    }

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

    // L'HOLOGRAMME TE REGARDE : à la station d'intro, la tête suit le curseur
    // (lissé, revient à la pose de repos dès qu'on quitte la station)
    const heroW = (i === 0 ? 1 - f : 0) * mz;
    heroWRef.current = heroW;
    if (built.headBone && built.headBaseQuat) {
      const k = 1 - Math.pow(0.001, dt);
      const tgtYaw = reduced ? 0 : pointerRef.current.x * LOOK_YAW * heroW;
      const tgtPitch = reduced ? 0 : -pointerRef.current.y * LOOK_PITCH * heroW;
      lookRef.current.yaw += (tgtYaw - lookRef.current.yaw) * k;
      lookRef.current.pitch += (tgtPitch - lookRef.current.pitch) * k;
      _lookE.current.set(lookRef.current.pitch, lookRef.current.yaw, 0);
      _lookQ.current.setFromEuler(_lookE.current);
      built.headBone.quaternion.copy(built.headBaseQuat).multiply(_lookQ.current);
    }
  });

  return (
    <>
      <primitive object={built.root} />
      <HoloBrain position={built.pos.brain} baseScale={CFG.brain.scale} weightsRef={weightsRef} />
      <HoloDNA position={built.pos.adn} baseScale={CFG.adn.scale} weightsRef={weightsRef} />
      <DataCubes position={built.pos.heart} baseScale={CFG.heart.scale} weightsRef={weightsRef} palmBone={built.palmBone} />
      <HeroMotes heroWRef={heroWRef} />
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
