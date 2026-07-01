// app/hooks/useProjectManager.ts
import { useRef, useState, useCallback } from 'react';
import type { Cue } from '../lib/audioEngine';
import type { Project } from '@/app/utils/types';

// Machine d'état explicite — transitions valides uniquement
export type ScanStatus =
  | 'STANDBY'
  | 'NEURAL_SCAN_INITIATED'
  | 'MEMORY_FRAGMENT_DECRYPTED'
  | 'PROJECTION_ACTIVE';

interface ProjectState {
  selectedProject: number | null;
  scanStatus:      ScanStatus;
  // Cappé à projects.length — jamais au-delà
  memoryFragments: number;
  isTransitioning: boolean;
}

export function useProjectManager(projects: Project[]) {
  const [state, setState] = useState<ProjectState>({
    selectedProject: 0,          // 1er module actif par défaut (panneau toujours rempli, mise en page fixe)
    scanStatus:      'STANDBY',
    memoryFragments: 0,
    isTransitioning: false,
  });

  // Timers nettoyables
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const selectProject = useCallback((
    index: number,
    playSound: (type: Cue) => void
  ) => {
    // Même module → on ne désélectionne pas (toujours un actif, mise en page fixe)
    if (state.selectedProject === index) return;

    // Annule la transition précédente avant d'en lancer une nouvelle
    clearTimers();

    const project = projects[index];

    setState((prev) => ({
      ...prev,
      selectedProject: index,
      scanStatus:      'NEURAL_SCAN_INITIATED',
      isTransitioning: true,
    }));

    playSound('activation');

    const t1 = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        scanStatus:      'MEMORY_FRAGMENT_DECRYPTED',
        // Cap à projects.length — jamais au-delà
        memoryFragments: Math.min(prev.memoryFragments + 1, projects.length),
      }));
      playSound('success');
    }, project.extractionTime);

    const t2 = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        scanStatus:      'PROJECTION_ACTIVE',
        isTransitioning: false,
      }));
    }, project.extractionTime + 500);

    timersRef.current = [t1, t2];
  }, [state.selectedProject, state.memoryFragments, projects, clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setState({
      selectedProject: null,
      scanStatus:      'STANDBY',
      memoryFragments: state.memoryFragments,
      isTransitioning: false,
    });
  }, [clearTimers, state.memoryFragments]);

  return { ...state, selectProject, reset };
}