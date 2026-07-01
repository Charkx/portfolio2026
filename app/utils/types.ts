export interface TechItem {
  name: string;
  icon: string;
  level: 1 | 2 | 3; // 1 = Familier · 2 = Avancé · 3 = Maîtrise
  desc: string;     // phrase courte affichée au "décodage" (clic)
}

export type TechStack = Record<string, TechItem[]>;

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
  image?:         string;   // aperçu visuel (screenshot/GIF) — ex: '/projects/arrakis.png'
  context:        'PRO' | 'ASSO' | 'ECOLE' | 'PERSO'; // cadre du projet (badge)
  short:          string;   // libellé court (onglet)
}

export type IntroPhase = 'LOCKED' | 'SCANNING' | 'BOOTING' | 'UNLOCKED';