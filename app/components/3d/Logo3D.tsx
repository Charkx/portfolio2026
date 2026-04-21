'use client';

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import gsap from 'gsap';
import type { TechItem } from '@/app/utils/types';

const BASE_COLORS = {
  A: '#FF5733',
  T: '#33C1FF',
  G: '#33FF57',
  C: '#FF33D1',
} as const;

type Base = keyof typeof BASE_COLORS;

interface Props {
  tech:         TechItem;
  base:         Base;
  position:     [number, number, number];
  highlighted?: boolean;
  selected?:    boolean;
  mutated?:     boolean;
  onClick?:     () => void;
  onPointerOver?: () => void;
  onPointerOut?:  () => void;
}

// SVGLoader partagé — une seule instance pour tous les Logo3D
const svgLoader = new SVGLoader();

const Logo3D = forwardRef<THREE.Group, Props>(({
  tech,
  base,
  position,
  highlighted = false,
  selected    = false,
  mutated     = false,
  onClick,
  onPointerOver,
  onPointerOut,
}, ref) => {
  const groupRef  = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Cache des matériaux du logo — mis à jour directement, sans setState
  const logoMatsRef      = useRef<THREE.MeshStandardMaterial[]>([]);
  const sphereMatRef     = useRef<THREE.MeshStandardMaterial | null>(null);
  const [logoGroup, setLogoGroup] = useState<THREE.Group | null>(null);

  // Ref pour éviter de relancer l'animation mutation si déjà en cours
  const mutationActiveRef = useRef(false);
  // Ref stable pour les props qui changent
  const mutatedRef = useRef(mutated);
  useEffect(() => { mutatedRef.current = mutated; }, [mutated]);

  useImperativeHandle(ref, () => groupRef.current ?? new THREE.Group(), []);

  // --- Chargement SVG ---
  useEffect(() => {
    svgLoader.load(
      `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${tech.icon}/${tech.icon}-original.svg`,
      (data) => {
        const group = new THREE.Group();
        const mats: THREE.MeshStandardMaterial[] = [];

        data.paths.forEach((path) => {
          SVGLoader.createShapes(path).forEach((shape) => {
            const geometry = new THREE.ExtrudeGeometry(shape, {
              depth: 20,
              bevelEnabled: false,
            });
            const mat = new THREE.MeshStandardMaterial({
              color:      path.color ?? '#ffffff',
              metalness:  0,           // était 0.2 — le metalness assombrit les couleurs SVG
              roughness:  0.2,         // était 0.4 — plus lisse = plus de reflets, meilleure lisibilité
              transparent: true,
              opacity:     0.85,       // était 0.1 — les logos sont visibles dès l'apparition
              emissive:    new THREE.Color(path.color ?? '#ffffff'),
              emissiveIntensity: 0.4,  // les logos émettent leur propre couleur — contraste sur fond sombre
            });
            group.add(new THREE.Mesh(geometry, mat));
            mats.push(mat);
          });
        });

        group.scale.set(0.0035, -0.0035, 0.0035);

// Calcule la bounding box du groupe une fois scalé
const box = new THREE.Box3().setFromObject(group);
const center = new THREE.Vector3();
box.getCenter(center);

// Recentre le groupe sur l'origine de la sphère
group.position.set(-center.x, -center.y, -center.z);

        // Dispose les anciens matériaux avant de remplacer
        logoMatsRef.current.forEach((m) => m.dispose());
        logoMatsRef.current = mats;

        setLogoGroup(group);
      }
    );

    return () => {
      logoMatsRef.current.forEach((m) => m.dispose());
      logoMatsRef.current = [];
    };
  }, [tech]);

  // --- Synchronisation sphère → ref matériau ---
  useEffect(() => {
    if (!sphereRef.current) return;
    sphereMatRef.current = sphereRef.current.material as THREE.MeshStandardMaterial;
  }, []);

  // --- Réactions visuelles : highlighted / selected (useFrame, pas de setState) ---
  useFrame(() => {
    const mat = sphereMatRef.current;
    if (!mat) return;

    const targetOpacity  = selected ? 0.7  : highlighted ? 0.5  : 0.25; // étaient 0.5/0.3/0.1
    const targetEmissive = selected ? 1.2  : highlighted ? 0.8  : 0.4;  // étaient 0.8/0.5/0.2

    // Lerp doux — pas de snap brutal
    mat.opacity           = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.12);
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.12);
  });

  // --- Animation de mutation déclenchée par la prop `mutated` ---
  useEffect(() => {
    if (!mutated || mutationActiveRef.current) return;
    if (!groupRef.current) return;

    mutationActiveRef.current = true;
    const group = groupRef.current;

    // 1. Pulsation de scale
    gsap.fromTo(
      group.scale,
      { x: 1,   y: 1,   z: 1   },
      { x: 1.3, y: 1.3, z: 1.3,
        yoyo: true, repeat: 1,
        duration: 0.4, ease: 'power2.inOut' }
    );

    // 2. Rotation complète
    gsap.to(group.rotation, {
      y:        group.rotation.y + Math.PI * 2,
      duration: 1,
      ease:     'power1.inOut',
    });

    // 3. Fade-in du logo
    const proxy = { t: 0 };
    gsap.to(proxy, {
      t:        1,
      duration: 0.6,
      ease:     'power2.out',
      onUpdate() {
        logoMatsRef.current.forEach((m) => {
          m.opacity = THREE.MathUtils.lerp(0.1, 1, proxy.t);
        });
      },
      onComplete() {
        // 4. Fade-out après affichage
        gsap.to(proxy, {
          t:        0,
          duration: 0.6,
          delay:    0.3,
          ease:     'power2.in',
          onUpdate() {
            logoMatsRef.current.forEach((m) => {
              m.opacity = THREE.MathUtils.lerp(0.1, 1, proxy.t);
            });
          },
          onComplete() {
            mutationActiveRef.current = false;
          },
        });
      },
    });
  }, [mutated]);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(); }}
      onPointerOut={(e)  => { e.stopPropagation(); onPointerOut?.();  }}
    >
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color={BASE_COLORS[base]}
          transparent
          opacity={0.1}           // était 0.1 — sphère visible comme socle coloré
          emissive={BASE_COLORS[base]}
          emissiveIntensity={0.02}  // la sphère émet sa couleur ADN — différencie du logo
        />
      </mesh>

      {logoGroup && <primitive object={logoGroup} />}
    </group>
  );
});

Logo3D.displayName = 'Logo3D';
export default Logo3D;