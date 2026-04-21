'use client';

import { Suspense, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import DNAHelix from './DNAHelix';
import type { MutationState, PositionMap } from '@/app/utils/types';

interface Props {
  visibleTechs:       string[];
  hoveredTech:        string | null;
  selectedTech:       string | null;
  mutation:           MutationState | null;
  onTechClick:        (name: string) => void;
  onTechHover:        (name: string | null) => void;
  onPositionsReady:   (map: PositionMap) => void;
  onMutationComplete: () => void;
}

// Stable — évite la recréation de l'objet camera à chaque render
const CAMERA = { position: [0, 0, 10] as [number, number, number], fov: 45 };

export default memo(function DNAAnalysis({
  visibleTechs,
  hoveredTech,
  selectedTech,
  mutation,
  onTechClick,
  onTechHover,
  onPositionsReady,
  onMutationComplete,
}: Props) {
  return (
    // Decorative 3D view — l'équivalent accessible est la TechList à droite
    <div
      className="w-full relative"
      style={{ height: 'clamp(500px, 60vh, 800px)' }}
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono
                   text-cyan-400/50 pointer-events-none select-none"
      >
        Drag to rotate
      </div>

      <Canvas camera={CAMERA} gl={{ antialias: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />

        <Suspense fallback={<CanvasLoader />}>
          <DNAHelix
            visibleTechs={visibleTechs}
            hoveredTech={hoveredTech}
            selectedTech={selectedTech}
            mutation={mutation}
            onTechClick={onTechClick}
            onTechHover={onTechHover}
            onPositionsReady={onPositionsReady}
            onMutationComplete={onMutationComplete}
          />
        </Suspense>

        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
});

// Doit rester dans ce fichier — useProgress requiert le contexte Canvas
function CanvasLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-sm text-cyan-300 font-mono animate-pulse">
        {progress < 100 ? 'Sequencing DNA...' : 'Initializing helix...'}
      </div>
    </Html>
  );
}





