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
import { Billboard } from '@react-three/drei';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import gsap from 'gsap';
import type { TechItem } from '@/app/utils/types';

// Nuances de cyan (au lieu du rainbow A/T/G/C) pour matcher la DA du cerveau.
const BASE_COLORS = {
  A: '#22d3ee',
  T: '#19b6d6',
  G: '#3ae0f0',
  C: '#1fc4dd',
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
  const animRef   = useRef<THREE.Group>(null); // groupe INTERNE animé à l'entrée
  const enteredRef = useRef(false);
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

  // Caché tant que le logo n'est pas prêt (évite que le socle apparaisse seul)
  useEffect(() => {
    animRef.current?.scale.setScalar(0);
  }, []);

  // --- Entrée « assemblage » : arrive dispersé → se loge dans l'hélice ---
  useEffect(() => {
    if (!logoGroup || !animRef.current || enteredRef.current) return;
    enteredRef.current = true;
    const g = animRef.current;
    // point de départ dispersé (relatif à l'emplacement final)
    g.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
    gsap.to(g.position, { x: 0, y: 0, z: 0, duration: 0.9, ease: 'power3.out' });
    gsap.fromTo(
      g.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.6)' } // petit rebond
    );
  }, [logoGroup]);

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
              metalness:  0,
              roughness:  0.2,
              transparent: true,
              opacity:     1,
              emissive:    new THREE.Color(path.color ?? '#ffffff'),
              emissiveIntensity: 0.5,
              side:        THREE.DoubleSide, // l'échelle -Y inverse les faces → on rend les deux côtés
            });
            group.add(new THREE.Mesh(geometry, mat));
            mats.push(mat);
          });
        });

        group.scale.set(0.0045, -0.0045, 0.0045);

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
    // Pop : le logo sélectionné grossit légèrement (sort de l'hélice)
    if (groupRef.current) {
      const target = selected ? 1.22 : 1;
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, target, 0.15);
      groupRef.current.scale.setScalar(s);
    }

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
      <group ref={animRef}>
        <mesh ref={sphereRef}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color={BASE_COLORS[base]}
            transparent
            opacity={0.1}
            emissive={BASE_COLORS[base]}
            emissiveIntensity={0.02}
            depthWrite={false}
          />
        </mesh>

        {/* Billboard : le logo reste face caméra → toujours lisible même quand l'hélice tourne */}
        {logoGroup && (
          <Billboard>
            <primitive object={logoGroup} />
          </Billboard>
        )}
      </group>
    </group>
  );
});

Logo3D.displayName = 'Logo3D';
export default Logo3D;