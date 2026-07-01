'use client';

import { Suspense, useMemo, useRef, useEffect, useCallback, type RefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, useProgress, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { BrainModel } from './CognitiveProfil';
import DNAHelix from './DNAHelix';
import { useSceneStore } from '../../store/sceneStore';
import { TECH_STACK } from '../../utils/constants';

// focuses des modules embarqués (= stations 1..4)
const FOCI = ['brain', 'adn', 'heart', 'globe'] as const;

// tables techs (pour l'ADN embarqué) : id minuscule → niveau
const ALL_TECHS = Object.values(TECH_STACK).flat();
const LEVEL_BY_ID: Record<string, number> = Object.fromEntries(
  ALL_TECHS.map((t) => [t.name.toLowerCase(), t.level])
);

const CYAN = 0x22d3ee;

// Réglages calibrés du placement des modules sur le corps
// 👉 PILOTE de tous les modules (à ajuster librement) :
//   scale = taille · x,z = position (unités monde) · y = hauteur sur le corps (fraction 0..1)
//   --- cadrage de la section ---
//   zoom = distance caméra (plus petit = plus près)
//   ox,oy = décalage du module DANS le cadre (composition : >0 ox le pousse à gauche, >0 oy vers le bas)
const CFG = {
  brain: { scale: 0.05, x: 0.01, y: 1.14, z: 0.14, zoom: 0.7, ox: 0, oy: 0 },
  adn:   { scale: 0.01, x: 0.325, y: 0.75, z: 0.00, zoom: 0.15, ox: 0, oy: 0 },
  heart: { scale: 0.03, x: 0.00, y: 0.85, z: 0.23, zoom: 0.8, ox: 0, oy: 0 },
  globe: { scale: 0.14, x: -0.30, y: 1.00, z: 0.70, zoom: 1.2, ox: 0, oy: 0 },
} as const;

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
    m.userData.uOp = sh.uniforms.uOp;
    m.userData.uMz = sh.uniforms.uMz;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uOp;\nuniform float uMz;')
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
        vec3 col=holo*(0.5+fres*1.6+band*0.7)+vec3(0.5,0.95,1.0)*edge*1.5;
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

function makeReactor() {
  const g = new THREE.Group();
  const cm = (op: number) => new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: op, side: THREE.DoubleSide });
  // (6) LOGEMENT CREUSÉ : puits conique qui s'enfonce dans le torse → profondeur 3D
  const housing = new THREE.Group();
  // paroi du puits : cône (rayon avant > arrière) ; dégradé additif sombre au fond → se fond dans le noir
  const wellGeo = new THREE.CylinderGeometry(0.95, 0.72, 0.5, 48, 1, true);
  wellGeo.rotateX(Math.PI / 2); // axe le long de Z (z ∈ [-0.25, +0.25])
  const wpos = wellGeo.attributes.position;
  const wcol = new Float32Array(wpos.count * 3);
  const cyl = new THREE.Color(CYAN);
  for (let i = 0; i < wpos.count; i++) {
    const t = THREE.MathUtils.clamp((wpos.getZ(i) + 0.25) / 0.5, 0, 1); // 0 = fond, 1 = bord avant
    const k = 0.06 + 0.94 * t * t;                                      // sombre au fond → vif au bord
    wcol[i * 3] = cyl.r * k; wcol[i * 3 + 1] = cyl.g * k; wcol[i * 3 + 2] = cyl.b * k;
  }
  wellGeo.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
  const well = new THREE.Mesh(wellGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  well.position.z = -0.25; housing.add(well); // recule dans le torse (rim à z=0, fond à z=-0.5)
  // anneaux étagés EN PROFONDEUR (nervures du puits) → renforcent le relief
  ([[-0.07, 0.9, 0.45], [-0.21, 0.84, 0.3], [-0.36, 0.78, 0.16]] as const).forEach(([z, r, op]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.025, r, 48), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.position.z = z; housing.add(ring);
  });
  g.add(housing);

  // noyau (bat) + halo (respire) → animés séparément (cf. HoloReactor)
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), cm(0.9));
  core.position.z = 0.04; // flotte en avant du puits → parallaxe quand le corps bouge
  g.add(core); g.userData.core = core;
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  gl.position.z = 0.02; g.add(gl); g.userData.glow = gl;
  [0.62, 0.95].forEach((r, i) => g.add(new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 64), cm(i ? 0.5 : 0.8))));
  const coils = new THREE.Group(); const NC = 20, st = (Math.PI * 2) / NC;
  for (let i = 0; i < NC; i++) coils.add(new THREE.Mesh(new THREE.RingGeometry(1.0, 1.45, 2, 1, i * st + 0.03, st - 0.06), cm(0.18)));
  g.add(coils); g.userData.coils = coils;
  g.add(new THREE.Mesh(new THREE.RingGeometry(1.45, 1.5, 80), cm(0.6)));
  const CHIPS = 8; // nb de puces autour du réacteur
  const HEX = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 6); HEX.rotateX(Math.PI / 2);
  const chips: THREE.Mesh[] = [];
  const baseZ = 0.12;
  for (let i = 0; i < CHIPS; i++) {
    const a = Math.PI / 2 + i * (Math.PI * 2 / CHIPS);
    const c = new THREE.Mesh(HEX, cm(0.5)); // matériau propre à chaque puce → recoloration indépendante
    c.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, baseZ);
    c.rotation.z = a; // chaque puce orientée vers l'extérieur
    c.userData.angle = a; c.userData.baseZ = baseZ;
    g.add(c); chips.push(c);
  }
  g.userData.chips = chips; // puces interactives (4 premières = projets)

  // faisceau de données : noyau → puce sélectionnée (orienté à la volée)
  const beam = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.08), beamMat);
  beamMesh.position.set(0.83, 0, 0.06); // entre le bord du noyau (~0.5) et la puce (~1.1)
  beam.add(beamMesh);
  beam.userData.mat = beamMat;
  g.add(beam); g.userData.beam = beam;

  // onde de choc : anneau qui jaillit du noyau (allumage + sélection projet)
  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.05, 64),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  shock.position.z = 0.05; shock.visible = false;
  g.add(shock); g.userData.shock = shock;
  return g;
}

// Courbe de battement « lub-dub » : deux pics rapprochés puis repos, sur une phase 0..1.
function heartbeat(p: number): number {
  const b1 = Math.exp(-Math.pow((p - 0.10) / 0.045, 2));        // systole (gros pic)
  const b2 = Math.exp(-Math.pow((p - 0.27) / 0.055, 2)) * 0.6;  // diastole (rebond)
  return Math.min(1, b1 + b2);
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
  const frame = (key: keyof typeof pos): Station => {
    const c = CFG[key], p = pos[key];
    const ax = p.x + c.ox, ay = p.y + c.oy;
    return { camPos: new THREE.Vector3(ax, ay, c.zoom), target: new THREE.Vector3(ax, ay, 0), body: 0.0, focus: key };
  };

  const stations: Station[] = [
    { camPos: new THREE.Vector3(0, H * 0.55, 4.4), target: new THREE.Vector3(0, H * 0.55, 0), body: 0.5, focus: '' },
    frame('brain'),
    frame('adn'),
    frame('heart'),
    frame('globe'),
  ];

  return { root, human, organs, pos, stations, bodyMats, timeUniform, globeMixer, backdrop, skyMat, dustMat };
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

// Réacteur Iron Man interactif (HoloReactor) — puces = projets, piloté par le store.
// Gère son propre fondu/échelle (poids "heart") ET la mise en valeur des puces.
function HoloReactor({ position, baseScale, weightsRef }: {
  position: THREE.Vector3; baseScale: number; weightsRef: RefObject<Record<string, number>>;
}) {
  const sel = useSceneStore((s) => s.projectSelected);
  const hov = useSceneStore((s) => s.projectHovered);
  const colors = useSceneStore((s) => s.projectColors);
  const cards = useSceneStore((s) => s.projectCards);

  const built = useMemo(() => {
    const g = makeReactor();
    const chips = g.userData.chips as THREE.Mesh[];
    const beam = g.userData.beam as THREE.Group;
    const coils = g.userData.coils as THREE.Group;
    const core = g.userData.core as THREE.Mesh;
    const glow = g.userData.glow as THREE.Mesh;
    const shock = g.userData.shock as THREE.Mesh;
    const beamMat = beam.userData.mat as THREE.MeshBasicMaterial;
    const coreMat = core.material as THREE.MeshBasicMaterial;
    const glowMat = glow.material as THREE.MeshBasicMaterial;
    const shockMat = shock.material as THREE.MeshBasicMaterial;
    const chipMats = new Set(chips.map((c) => c.material as THREE.Material));
    // matériaux de "fond" (anneaux/bobines) → fondus par le poids ; noyau/halo/puces/faisceau/onde gérés à part
    const exclude = new Set<THREE.Material>([...chipMats, beamMat, coreMat, glowMat, shockMat]);
    const baseMats: { m: THREE.MeshBasicMaterial; base: number }[] = [];
    g.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!mm || Array.isArray(mm)) return;
      if (exclude.has(mm)) return;
      baseMats.push({ m: mm as THREE.MeshBasicMaterial, base: (mm as THREE.MeshBasicMaterial).opacity });
    });
    return { g, chips, beam, coils, core, glow, shock, beamMat, coreMat, glowMat, shockMat, baseMats };
  }, []);

  const _col = useRef(new THREE.Color());
  const tRef = useRef(0);
  const beatRef = useRef(0);        // phase du battement 0..1
  const bootRef = useRef(0);        // séquence d'allumage 0→1 (1 = terminée) — démarre éteint
  const prevW = useRef(0);          // poids précédent → détecte l'arrivée (front montant)
  const prevSel = useRef<number | null>(null);
  const shockT = useRef(1);         // progression de l'onde 0→1 (1 = au repos)
  const shockColor = useRef(new THREE.Color(CYAN));
  const surgeRef = useRef(1);       // pic d'allumage au choix d'un projet : 0 (déclenché) → 1 (repos)

  const triggerShock = useCallback((hex?: string) => {
    shockT.current = 0;
    shockColor.current.set(hex ?? '#22d3ee');
  }, []);

  useFrame((_, dt) => {
    tRef.current += dt;

    const w = THREE.MathUtils.clamp(weightsRef.current.heart ?? 0, 0, 1);

    // (2) ALLUMAGE : front montant à l'arrivée (w franchit 0.5) → relance la séquence + onde
    if (w > 0.5 && prevW.current <= 0.5) { bootRef.current = 0; triggerShock(); }
    if (w < 0.05) bootRef.current = 0; // hors section → reste éteint jusqu'au prochain allumage
    prevW.current = w;
    // ne progresse qu'une fois arrivé (w > 0.5) → reste éteint pendant le voyage d'approche
    if (w > 0.5 && bootRef.current < 1) bootRef.current = Math.min(1, bootRef.current + dt / 1.1);
    const boot = bootRef.current;                       // 0→1
    const bootEase = boot * boot * (3 - 2 * boot);       // smoothstep
    const bootPop = Math.sin(boot * Math.PI);            // bosse de surbrillance au démarrage

    // bobines : spin-up rapide pendant l'allumage, puis vitesse de croisière
    built.coils.rotation.z += dt * 0.6 * (1 + (1 - bootEase) * 5);

    built.g.visible = w > 0.004;
    if (!built.g.visible) return;
    built.g.scale.setScalar(baseScale * (0.92 + w * 0.3));
    // balancement doux (face lisible) + rotation manuelle à la souris (drag → met le balancement en pause)
    const st = useSceneStore.getState();
    const mr = st.manualRot.heart;
    const osc = st.dragFocus === 'heart' ? 0 : 1;
    built.g.rotation.y = osc * Math.sin(tRef.current * 0.5) * 0.35 * w + (mr?.y ?? 0);
    built.g.rotation.x = osc * Math.sin(tRef.current * 0.37) * 0.12 * w + (mr?.x ?? 0);
    // le fond s'allume avec la séquence de boot (réacteur qui "prend vie")
    built.baseMats.forEach(({ m, base }) => { m.opacity = base * w * bootEase; });

    // IGNITION : au choix d'un projet, le cœur s'emballe ~1.2 s (surge 1 → 0)
    if (surgeRef.current < 1) surgeRef.current = Math.min(1, surgeRef.current + dt / 1.2);
    const surge = 1 - surgeRef.current;

    // (1) BATTEMENT : lub-dub à ~66 BPM, accéléré + amplifié pendant l'ignition
    beatRef.current = (beatRef.current + dt * 1.1 * (1 + surge * 2.2)) % 1;
    const beat = heartbeat(beatRef.current) * bootEase;
    const amp = 1 + surge * 1.4;
    built.core.scale.setScalar(1 + beat * 0.10 * amp + bootPop * 0.12);
    built.coreMat.opacity = Math.min(1, 0.7 + 0.3 * beat + 0.3 * bootPop + surge * 0.2) * w;
    built.glow.scale.setScalar(1 + beat * 0.18 * amp + bootPop * 0.2);
    built.glowMat.opacity = (0.18 + 0.5 * beat + 0.4 * bootPop + surge * 0.3) * w;

    // (3) ONDE DE CHOC : à la sélection d'un projet (change de cible) + à l'allumage
    const nProj = colors.length;
    if (sel !== prevSel.current) {
      if (sel !== null && sel < nProj) { triggerShock(colors[sel]); surgeRef.current = 0; }
      prevSel.current = sel;
    }
    if (shockT.current < 1) {
      shockT.current = Math.min(1, shockT.current + dt / 0.7);
      const e = shockT.current;
      built.shock.visible = true;
      built.shock.scale.setScalar(THREE.MathUtils.lerp(0.3, 2.6, e * e * (3 - 2 * e)));
      built.shockMat.color.copy(shockColor.current);
      built.shockMat.opacity = (1 - e) * 0.7 * w;
    } else if (built.shock.visible) {
      built.shock.visible = false;
    }

    const pulse = 0.5 + 0.5 * Math.sin(tRef.current * 4);
    const n = colors.length; // nb de projets (= nb de puces "actives")

    built.chips.forEach((chip, ci) => {
      const mat = chip.material as THREE.MeshBasicMaterial;
      let op: number, scale: number, z = chip.userData.baseZ as number;
      // projets répartis 1 puce sur 2 (paires) → haut/gauche/bas/droite ; impaires = déco
      const p = ci % 2 === 0 ? ci / 2 : -1;
      if (p >= 0 && p < n) {
        mat.color.copy(_col.current.set(colors[p]));
        if (sel === p)      { op = 0.85 + 0.15 * pulse; scale = 1.32 + surge * 0.28; z += 0.12 + surge * 0.08; } // sélectionnée : avance + pulse (+ pic d'ignition)
        else if (hov === p) { op = 0.80;                scale = 1.15; z += 0.06; } // survolée : highlight
        else                { op = 0.55;                scale = 1.0;            }
      } else {
        mat.color.setHex(CYAN); op = 0.18; scale = 1.0; // puces déco
      }
      mat.opacity = op * w * bootEase;
      chip.scale.setScalar(THREE.MathUtils.lerp(chip.scale.x, scale, 0.2));
      chip.position.z = THREE.MathUtils.lerp(chip.position.z, z, 0.2);
    });

    // faisceau noyau → puce sélectionnée (projet p → puce 2p)
    if (sel !== null && sel < n) {
      built.beam.rotation.z = built.chips[sel * 2].userData.angle as number;
      built.beamMat.color.set(colors[sel]);
      built.beamMat.opacity = (0.35 + 0.25 * pulse) * w * bootEase;
    } else {
      built.beamMat.opacity = THREE.MathUtils.lerp(built.beamMat.opacity, 0, 0.2);
    }
  });

  // Pattern "ADN" : les puces (3D) sont cliquables via des zones transparentes qui les
  // suivent (enfants du réacteur). Le TEXTE du projet s'affiche en bas du canvas (HTML
  // dans ProjectsSection, au clic) — comme le panneau de décodage de l'ADN.
  return (
    <primitive object={built.g} position={position}>
      {cards.map((card, i) => {
        const a = built.chips[i * 2]?.userData.angle as number | undefined; // projet i → puce 2i
        if (a === undefined) return null;
        return (
          <Html
            key={card.id}
            position={[Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.25]}
            center
            zIndexRange={[14, 0]}
            style={{ pointerEvents: 'auto' }}
          >
            <button
              type="button"
              title={card.title}
              aria-label={card.title}
              onClick={() => useSceneStore.getState().requestSelectProject?.(i)}
              onPointerOver={() => useSceneStore.getState().setProjectHovered(i)}
              onPointerOut={() => useSceneStore.getState().setProjectHovered(null)}
              className="block w-11 h-11 rounded-full cursor-pointer bg-transparent"
            />
          </Html>
        );
      })}
    </primitive>
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
  const { scene } = useGLTF(HUMAN_URL);
  const globe = useGLTF(GLOBE_URL);
  // cfgKey en dépendance → toute modif de CFG reconstruit la scène (sinon useMemo reste figé
  // car les modèles chargés ne changent pas de référence au Fast Refresh).
  const cfgKey = JSON.stringify(CFG);
  const built = useMemo(
    () => buildScene(scene, globe.scene, globe.animations),
    [scene, globe.scene, globe.animations, cfgKey]
  );
  const camera = useThree((s) => s.camera);

  const _t = useRef(new THREE.Vector3());
  const mzRef = useRef(0); // 0 → 1 : matérialisation du corps au montage (boot)
  const weightsRef = useRef<Record<string, number>>({}); // poids par module (pour HoloBrain etc.)

  useFrame((_, dt) => {
    built.timeUniform.value += dt;
    if (built.globeMixer) built.globeMixer.update(dt);

    // matérialisation : monte de 0 à 1 en ~1.6s (instantané en mode calibrage)
    if (!debug && mzRef.current < 1) mzRef.current = Math.min(mzRef.current + dt / 1.6, 1);
    const mz = debug ? 1 : mzRef.current;
    built.bodyMats.forEach((m) => { if (m.userData.uMz) m.userData.uMz.value = mz; });

    // Environnement : opacité pilotée par la couverture de la boîte canvas (plein écran → opaque)
    const cover = coverRef?.current ?? 0;
    const bgT = THREE.MathUtils.clamp((cover - 0.55) / 0.35, 0, 1);
    const bgEase = bgT * bgT * (3 - 2 * bgT); // smoothstep
    built.skyMat.opacity = bgEase;
    built.dustMat.opacity = bgEase * 0.8;
    built.backdrop.rotation.y += dt * 0.01; // dérive lente

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

    camera.position.lerpVectors(A.camPos, B.camPos, f);
    _t.current.lerpVectors(A.target, B.target, f);
    camera.lookAt(_t.current);

    // corps : visible pendant le voyage (bulge au milieu), ~0 une fois arrivé sur un module
    const TRAVEL = 0.45;
    const bodyOp = Math.max(THREE.MathUtils.lerp(A.body, B.body, f), TRAVEL * Math.sin(Math.PI * f));
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
      const w = weightsRef.current[o.focus] ?? 0;
      const tgt = o.base * (0.92 + w * 0.30);
      o.group.scale.setScalar(THREE.MathUtils.lerp(o.group.scale.x, tgt, 0.2));
      o.mats.forEach(({ m, base }) => { m.opacity = base * w; });
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
      <HoloReactor position={built.pos.heart} baseScale={CFG.heart.scale} weightsRef={weightsRef} />
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

useGLTF.preload(HUMAN_URL);
useGLTF.preload(BRAIN_URL, true);
useGLTF.preload(GLOBE_URL);
