import type * as THREE from 'three';

export interface TechItem {
  name: string;
  icon: string;
  level: 1 | 2 | 3; // 1 = Familier · 2 = Avancé · 3 = Maîtrise
  desc: string;     // phrase courte affichée au "décodage" (clic)
}

export type TechStack = Record<string, TechItem[]>;

export type PositionMap = Record<string, THREE.Vector3>;

export interface MutationState {
  source: string; // toujours lowercase
  target: string; // toujours lowercase
}

export interface Project {
  title:          string;
  description:    string;
  tech:           string[];
  status:         'COMPLETED' | 'OPERATIONAL' | 'ACTIVE' | 'CLASSIFIED';
  memId:          string;
  classification: string;
  extractionTime: number;
  github:         string;
  demo:           string;
  contribution?:  string;   // "Ce que j'ai fait"
  highlights?:    string[]; // Points forts
}

export type IntroPhase = 'LOCKED' | 'SCANNING' | 'BOOTING' | 'UNLOCKED';