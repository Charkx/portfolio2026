'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { useReducedMotion } from '@/app/hooks/useReducedMotion';
import type { Project } from '@/app/utils/types';

// --- Constantes ---

const CYAN = '#22d3ee';
const PANEL_RADIUS = 2.55; // rayon où sont projetés les panneaux projets
const NET_TILT_X   = -0.3; // l'œil fait face à la caméra (placée en hauteur)
const BASE_Y       = 0.15;
const BEAM_PKTS    = 6;

const STATUS_COLORS: Record<Project['status'], string> = {
  COMPLETED:   '#00ff00',
  OPERATIONAL: '#00ffff',
  ACTIVE:      '#ffff00',
  CLASSIFIED:  '#ff0000',
};

// --- Géométries de l'œil (procédurales, partagées) ---

const EYE_W = 1.75;
const EYE_H = 1.05;

// Contour en amande : 2 courbes de Bézier (paupière haute + basse)
const EYE_OUTLINE_GEO = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-EYE_W, 0);
  shape.quadraticCurveTo(0, EYE_H, EYE_W, 0);
  shape.quadraticCurveTo(0, -EYE_H, -EYE_W, 0);
  const pts = shape.getPoints(96);
  const arr = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return g;
})();

const IRIS_INNER = 0.42;
const IRIS_OUTER = 0.96;

// Fibres radiales de l'iris (look cybernétique)
const IRIS_FIBERS_GEO = (() => {
  const N = 56;
  const arr = new Float32Array(N * 2 * 3);
  for (let i = 0; i < N; i++) {
    const a  = (i / N) * Math.PI * 2;
    const r1 = IRIS_INNER + (i % 2 ? 0.05 : 0);
    arr[i * 6]     = Math.cos(a) * r1;
    arr[i * 6 + 1] = Math.sin(a) * r1;
    arr[i * 6 + 3] = Math.cos(a) * IRIS_OUTER;
    arr[i * 6 + 4] = Math.sin(a) * IRIS_OUTER;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return g;
})();

const RING_OUT_GEO  = new THREE.RingGeometry(0.97, 1.03, 72);
const RING_IN_GEO   = new THREE.RingGeometry(0.40, 0.46, 56);
const PUPIL_GEO     = new THREE.CircleGeometry(0.32, 40);
const PUPIL_RING    = new THREE.RingGeometry(0.32, 0.37, 40);
const GLOW_GEO      = new THREE.CircleGeometry(0.6, 40);

// Vecteur temporaire
const _tmp = new THREE.Vector3();

// --- Faisceau de données pupille → panneau sélectionné ---

function FocusBeam({ target, reduced }: { target: THREE.Vector3; reduced: boolean }) {
  const pktGeoRef = useRef<THREE.BufferGeometry>(null);
  const pktMatRef = useRef<THREE.PointsMaterial>(null);

  const src = useMemo(() => new THREE.Vector3(0, 0, 0.18), []);
  const linePositions = useMemo(
    () => new Float32Array([src.x, src.y, src.z, target.x, target.y, target.z]),
    [src, target]
  );
  const packetPositions = useMemo(() => new Float32Array(BEAM_PKTS * 3), []);

  useFrame((state) => {
    if (reduced || !pktGeoRef.current) return;
    const t = state.clock.elapsedTime * 0.8;
    const arr = packetPositions;
    for (let k = 0; k < BEAM_PKTS; k++) {
      const frac = (t + k / BEAM_PKTS) % 1;
      arr[k * 3]     = THREE.MathUtils.lerp(src.x, target.x, frac);
      arr[k * 3 + 1] = THREE.MathUtils.lerp(src.y, target.y, frac);
      arr[k * 3 + 2] = THREE.MathUtils.lerp(src.z, target.z, frac);
    }
    (pktGeoRef.current.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={2} />
        </bufferGeometry>
        <lineBasicMaterial color="#ff2bd6" transparent opacity={0.55} depthWrite={false} />
      </line>
      <points>
        <bufferGeometry ref={pktGeoRef}>
          <bufferAttribute attach="attributes-position" args={[packetPositions, 3]} count={BEAM_PKTS} />
        </bufferGeometry>
        <pointsMaterial ref={pktMatRef} color="#ff2bd6" size={0.12} transparent opacity={0.95}
          depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// --- L'œil cybernétique ---

interface EyeProps {
  gaze:    THREE.Vector3 | null; // direction du regard (panneau actif)
  focused: boolean;              // un projet est sélectionné
  reduced: boolean;
}

function CyberEye({ gaze, focused, reduced }: EyeProps) {
  const irisRef   = useRef<THREE.Group>(null); // décalé par le regard
  const fibersRef = useRef<THREE.LineSegments>(null);
  const pupilRef  = useRef<THREE.Group>(null);
  const outRingMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat    = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Regard : l'iris se décale doucement vers le projet actif
    if (irisRef.current) {
      let gx = 0, gy = 0;
      if (gaze) {
        _tmp.copy(gaze).setZ(0).normalize().multiplyScalar(0.16);
        gx = _tmp.x; gy = _tmp.y;
      }
      irisRef.current.position.x = THREE.MathUtils.lerp(irisRef.current.position.x, gx, 0.08);
      irisRef.current.position.y = THREE.MathUtils.lerp(irisRef.current.position.y, gy, 0.08);
    }

    // Rotation lente des fibres (vie)
    if (fibersRef.current && !reduced) fibersRef.current.rotation.z += 0.0015;

    // Pupille : pulsation + contraction quand l'œil focus
    if (pupilRef.current) {
      const pulse  = reduced ? 1 : 1 + Math.sin(t * 2) * 0.05;
      const target = (focused ? 0.7 : 1) * pulse;
      const s = THREE.MathUtils.lerp(pupilRef.current.scale.x, target, 0.12);
      pupilRef.current.scale.setScalar(s);
    }

    // Intensité lumineuse selon le focus
    if (outRingMat.current) outRingMat.current.opacity = THREE.MathUtils.lerp(outRingMat.current.opacity, focused ? 1 : 0.7, 0.1);
    if (glowMat.current)    glowMat.current.opacity    = THREE.MathUtils.lerp(glowMat.current.opacity, focused ? 0.45 : 0.22, 0.1);
  });

  return (
    <group>
      {/* Contour en amande (paupières) */}
      <lineLoop geometry={EYE_OUTLINE_GEO}>
        <lineBasicMaterial color={CYAN} transparent opacity={0.8} depthWrite={false} />
      </lineLoop>
      <lineLoop geometry={EYE_OUTLINE_GEO} scale={0.92}>
        <lineBasicMaterial color={CYAN} transparent opacity={0.3} depthWrite={false} />
      </lineLoop>

      {/* Iris (décalé par le regard) */}
      <group ref={irisRef}>
        {/* halo */}
        <mesh geometry={GLOW_GEO} position={[0, 0, -0.02]}>
          <meshBasicMaterial ref={glowMat} color={CYAN} transparent opacity={0.22}
            depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>

        <mesh geometry={RING_OUT_GEO}>
          <meshBasicMaterial ref={outRingMat} color={CYAN} transparent opacity={0.7} depthWrite={false} />
        </mesh>
        <mesh geometry={RING_IN_GEO}>
          <meshBasicMaterial color={CYAN} transparent opacity={0.6} depthWrite={false} />
        </mesh>

        <lineSegments ref={fibersRef} geometry={IRIS_FIBERS_GEO}>
          <lineBasicMaterial color={CYAN} transparent opacity={0.45} depthWrite={false} />
        </lineSegments>

        {/* Pupille */}
        <group ref={pupilRef}>
          <mesh geometry={PUPIL_GEO} position={[0, 0, 0.03]}>
            <meshBasicMaterial color="#03080d" />
          </mesh>
          <mesh geometry={PUPIL_RING} position={[0, 0, 0.04]}>
            <meshBasicMaterial color={CYAN} transparent opacity={0.95} depthWrite={false}
              blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// --- Panneau projet (HUD holographique) ---

interface PanelProps {
  project:    Project;
  index:      number;
  anchor:     THREE.Vector3;
  isSelected: boolean;
  isHovered:  boolean;
  isDimmed:   boolean;
  onSelect:   (i: number) => void;
  onHover:    (i: number | null) => void;
}

function ProjectPanel({ project, index, anchor, isSelected, isHovered, isDimmed, onSelect, onHover }: PanelProps) {
  const statusColor = STATUS_COLORS[project.status];
  const active = isSelected || isHovered;

  return (
    <Html position={anchor} center distanceFactor={6} zIndexRange={[20, 0]}
      style={{ pointerEvents: 'auto', transition: 'opacity .25s', opacity: isDimmed ? 0.35 : 1 }}>
      <button
        onClick={() => onSelect(index)}
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
        aria-label={`Projet ${project.title}`}
        className={`group relative w-[150px] text-left font-mono rounded-lg border-2 px-3 py-2.5
                    backdrop-blur-sm cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'border-[#ff2bd6] bg-[#1a0a16]/85 shadow-[0_0_24px_rgba(255,43,214,.35)]'
                      : 'border-cyan-400/40 bg-black/70 hover:border-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,.18)]'}`}
      >
        {/* coins HUD */}
        <span className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${isSelected ? 'border-[#ff2bd6]' : 'border-cyan-300'}`} />
        <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${isSelected ? 'border-[#ff2bd6]' : 'border-cyan-300'}`} />

        <div className="text-[9px] tracking-widest mb-0.5" style={{ color: isSelected ? '#ff77e0' : '#67e8f9aa' }}>
          {project.memId}
        </div>
        <div className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-pink-100' : 'text-cyan-100'}`}>
          {project.title}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          <span className="text-[8px] tracking-wider text-gray-400">{project.status}</span>
        </div>
      </button>
    </Html>
  );
}

// --- Particules d'ambiance (cohérence DA cerveau/ADN) ---

function DustField({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const N = 110;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
    }
    return arr;
  }, []);
  useFrame((state) => {
    if (ref.current && !reduced) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} />
      </bufferGeometry>
      <pointsMaterial color={CYAN} size={0.03} transparent opacity={0.4} depthWrite={false}
        sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

// --- Composant principal ---

interface Props {
  projects:        Project[];
  selectedProject: number | null;
  hoveredProject:  number | null;
  insertedProject: number | null;
  onProjectSelect: (index: number) => void;
  onProjectInsert: (index: number) => void;
  onCardHover:     (index: number | null) => void;
}

export default function MemoryReconstruction({
  projects,
  selectedProject,
  hoveredProject,
  onProjectSelect,
  onProjectInsert,
  onCardHover,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  // Ancres des panneaux (autour de l'iris)
  const anchors = useMemo(() => {
    const base = [45, 135, 225, 315]; // coins, en degrés
    return projects.map((_, i) => {
      const a = (base[i % base.length] * Math.PI) / 180;
      return new THREE.Vector3(Math.cos(a) * PANEL_RADIUS, Math.sin(a) * PANEL_RADIUS, 0.1);
    });
  }, [projects]);

  const activeIndex  = selectedProject ?? hoveredProject ?? null;
  const activeAnchor = activeIndex !== null ? anchors[activeIndex] : null;

  // Entrée : léger fade/scale
  useEffect(() => {
    if (!rootRef.current || reduced) return;
    const g = rootRef.current;
    gsap.fromTo(g.scale, { x: 0.85, y: 0.85, z: 0.85 }, { x: 1, y: 1, z: 1, duration: 1, ease: 'power2.out' });
  }, [reduced]);

  useFrame((state) => {
    if (!rootRef.current) return;
    rootRef.current.rotation.x = NET_TILT_X;
    if (!reduced) rootRef.current.position.y = BASE_Y + Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
  });

  const handleSelect = useCallback((index: number) => {
    if (index === selectedProject) onProjectInsert(index);
    else onProjectSelect(index);
  }, [selectedProject, onProjectSelect, onProjectInsert]);

  return (
    <group ref={rootRef} position={[0, BASE_Y, 0]}>
      <DustField reduced={reduced} />

      <CyberEye gaze={activeAnchor} focused={selectedProject !== null} reduced={reduced} />

      {/* Faisceau vers le projet sélectionné */}
      {selectedProject !== null && (
        <FocusBeam target={anchors[selectedProject]} reduced={reduced} />
      )}

      {/* Panneaux projets */}
      {projects.map((project, index) => (
        <ProjectPanel
          key={project.memId}
          project={project}
          index={index}
          anchor={anchors[index]}
          isSelected={selectedProject === index}
          isHovered={hoveredProject === index && selectedProject === null}
          isDimmed={activeIndex !== null && activeIndex !== index}
          onSelect={handleSelect}
          onHover={onCardHover}
        />
      ))}
    </group>
  );
}
