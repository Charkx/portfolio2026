'use client';

import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  selected: number; // index de la catégorie active
  color: string;    // couleur de la catégorie active
  count: number;    // nombre de catégories (= régions)
}

const MODEL = '/3d/brain_hologram.glb';
const CYAN = new THREE.Color('#22d3ee');

function BrainModel({ selected, color, count }: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL, true); // true = décodeur Draco

  // On retire les pistes "scale" de l'animation : elles faisaient varier la
  // taille du cerveau (et ralentir l'anim le figeait trop petit). On garde
  // les autres pistes (mouvement/swirl).
  const clips = useMemo(
    () =>
      animations.map((c) => {
        const clone = c.clone();
        clone.tracks = clone.tracks.filter((t) => !t.name.endsWith('.scale'));
        return clone;
      }),
    [animations]
  );
  const { actions } = useAnimations(clips, group);

  // Centre + échelle (appliqués au wrapper).
  const { center, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    return { center: c, scale: 4.2 / Math.max(s.x, s.y, s.z) };
  }, [scene]);

  // Prépare : une COURBE zigzag par catégorie qui serpente dans le cerveau, et
  // pour chaque particule sa distance à chacune des courbes (précalculée).
  const prep = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const dims = [size.x, size.y, size.z];
    const minArr = [box.min.x, box.min.y, box.min.z];
    const cArr = [center.x, center.y, center.z];
    // axe le plus long = direction que longe la courbe ; les deux autres = zigzag
    const L = dims[0] >= dims[1] && dims[0] >= dims[2] ? 0 : dims[1] >= dims[2] ? 1 : 2;
    const a1 = (L + 1) % 3, a2 = (L + 2) % 3;

    // Échantillonne une courbe zigzag (Catmull-Rom) par catégorie.
    const curves: THREE.Vector3[][] = [];
    for (let c = 0; c < count; c++) {
      const pts: THREE.Vector3[] = [];
      const M = 7;
      for (let k = 0; k < M; k++) {
        const f = k / (M - 1);
        const arr = [...cArr];
        arr[L] = minArr[L] + dims[L] * (0.08 + 0.84 * f); // longe l'axe d'un bout à l'autre
        arr[a1] += Math.sin(k * 2.4 + c * 1.7) * dims[a1] * 0.34; // zigzag
        arr[a2] += Math.cos(k * 1.9 + c * 2.6) * dims[a2] * 0.34;
        pts.push(new THREE.Vector3(arr[0], arr[1], arr[2]));
      }
      curves.push(new THREE.CatmullRomCurve3(pts).getPoints(48));
    }
    const radius = Math.min(dims[a1], dims[a2]) * 0.3; // rayon du tube coloré

    const meshes: { mesh: THREE.Mesh; world: Float32Array; dists: Float32Array[]; owner: Uint8Array }[] = [];
    const v = new THREE.Vector3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const pos = m.geometry.attributes.position;
      const nC = pos.count;
      const world = new Float32Array(nC * 3);
      const dists = Array.from({ length: count }, () => new Float32Array(nC));
      const owner = new Uint8Array(nC);
      for (let i = 0; i < nC; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        world[i * 3] = v.x; world[i * 3 + 1] = v.y; world[i * 3 + 2] = v.z;
        let bestC = 0, bestD = Infinity;
        for (let c = 0; c < count; c++) {
          let md = Infinity;
          const samples = curves[c];
          for (let s = 0; s < samples.length; s++) {
            const dx = v.x - samples[s].x, dy = v.y - samples[s].y, dz = v.z - samples[s].z;
            const dd = dx * dx + dy * dy + dz * dz;
            if (dd < md) md = dd;
          }
          dists[c][i] = Math.sqrt(md);
          if (md < bestD) { bestD = md; bestC = c; }
        }
        owner[i] = bestC; // chaque particule appartient à UN réseau (sa courbe la plus proche)
      }
      if (!m.geometry.attributes.color) {
        m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nC * 3), 3));
      }
      m.material = new THREE.MeshBasicMaterial({ vertexColors: true });
      meshes.push({ mesh: m, world, dists, owner });
    });
    return { meshes, radius, scanMin: box.min.y, scanMax: box.max.y };
  }, [scene, count]);

  // --- Transition « barre de scan » entre catégories ---
  const targetRef = useRef<Float32Array[]>([]);
  const prevRef = useRef<Float32Array[]>([]);
  const scanRef = useRef(1);   // progression 0..1 (1 = au repos)
  const firstRef = useRef(true);

  // Calcule les couleurs CIBLES de la sélection (cyan partout, couleur de la
  // catégorie le long de SA courbe, et seulement pour les particules qui lui
  // appartiennent) puis déclenche le scan.
  useEffect(() => {
    if (!prep.meshes.length) return;
    const cat = new THREE.Color(color);
    const R = prep.radius;
    const targets: Float32Array[] = [];
    const prevs: Float32Array[] = [];
    for (const { mesh, world, dists, owner } of prep.meshes) {
      const attr = mesh.geometry.attributes.color as THREE.BufferAttribute;
      const cur = attr.array as Float32Array;
      const n = owner.length;
      const dsel = dists[selected];
      const target = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        let r = CYAN.r, g = CYAN.g, b = CYAN.b;
        if (owner[i] === selected) {
          const t = 1 - dsel[i] / R;
          if (t > 0) {
            const wx = world[i * 3], wy = world[i * 3 + 1], wz = world[i * 3 + 2];
            const clump = 0.5 + 0.5 * Math.sin(wx * 9 + wy * 3) * Math.cos(wz * 9 + wy * 2);
            const prob = t * (0.5 + 0.5 * clump);
            const h = ((Math.sin(i * 12.9898 + wx * 4.1) * 43758.5453) % 1 + 1) % 1;
            if (prob > h * 0.45) { r = cat.r; g = cat.g; b = cat.b; }
          }
        }
        target[i * 3] = r; target[i * 3 + 1] = g; target[i * 3 + 2] = b;
      }
      targets.push(target);
      prevs.push(cur.slice());
    }
    targetRef.current = targets;
    prevRef.current = prevs;

    if (firstRef.current) {
      // 1er rendu : pas de scan, on applique direct
      prep.meshes.forEach((md, idx) => {
        const a = md.mesh.geometry.attributes.color as THREE.BufferAttribute;
        (a.array as Float32Array).set(targets[idx]);
        a.needsUpdate = true;
      });
      firstRef.current = false;
      scanRef.current = 1;
    } else {
      scanRef.current = 0; // démarre le balayage
    }
  }, [prep, selected, color]);

  // La barre de scan balaie le cerveau (sur l'axe Y) et révèle la cible.
  useFrame((_, delta) => {
    if (scanRef.current >= 1) return;
    scanRef.current = Math.min(1, scanRef.current + delta / 1.1); // ~1.1 s
    const coord = prep.scanMin + (prep.scanMax - prep.scanMin) * scanRef.current;
    const band = (prep.scanMax - prep.scanMin) * 0.05;
    const done = scanRef.current >= 1;
    prep.meshes.forEach((md, idx) => {
      const attr = md.mesh.geometry.attributes.color as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const target = targetRef.current[idx];
      const prev = prevRef.current[idx];
      const world = md.world;
      const n = md.owner.length;
      for (let i = 0; i < n; i++) {
        const y = world[i * 3 + 1];
        if (!done && Math.abs(y - coord) < band) {
          arr[i * 3] = 1; arr[i * 3 + 1] = 1; arr[i * 3 + 2] = 1; // liseré blanc = la barre
        } else if (done || y <= coord) {
          arr[i * 3] = target[i * 3]; arr[i * 3 + 1] = target[i * 3 + 1]; arr[i * 3 + 2] = target[i * 3 + 2];
        } else {
          arr[i * 3] = prev[i * 3]; arr[i * 3 + 1] = prev[i * 3 + 1]; arr[i * 3 + 2] = prev[i * 3 + 2];
        }
      }
      attr.needsUpdate = true;
    });
  });

  // Animation intégrée du modèle, ralentie.
  useEffect(() => {
    const a = Object.values(actions)[0];
    if (a) { a.timeScale = 0.5; a.reset().play(); }
  }, [actions]);

  return (
    <group ref={group}>
      <group scale={scale} position={[-center.x * scale, -center.y * scale, -center.z * scale]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

export default function CognitiveProfile({ selected, color, count }: Props) {
  return (
    <div className="h-[80vh] w-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 7]} />
        <OrbitControls enableZoom={false} enablePan={false} />
        <ambientLight intensity={0.6} />
        <Suspense fallback={null}>
          <BrainModel selected={selected} color={color} count={count} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL, true);
