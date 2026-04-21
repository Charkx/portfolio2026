export const PROJECTS = [
  {
    title: "MEM.DAT_203_NI_DASHBOARD",
    description: "Interface neuronale pour le suivi en temps réel de bio-signaux cybernétiques.",
    tech: ["React", "Three.js", "WebGL"],
    status: "COMPLETED",
  },
  {
    title: "MEM.DAT_117_QT_PROCESSOR",
    description: "Analyse visuelle haute fréquence pour réseaux quantiques expérimentaux.",
    tech: ["TypeScript", "D3.js", "WebAssembly"],
    status: "OPERATIONAL",
  },
  {
    title: "MEM.DAT_501_HOLO_BANK",
    description: "Interface 3D immersive pour stockage et récupération de données complexes.",
    tech: ["Three.js", "GSAP", "WebXR"],
    status: "ACTIVE",
  },
  {
    title: "MEM.DAT_X77_SYN_CORE",
    description: "IA tactique avec capacités d’analyse prédictive en environnement instable.",
    tech: ["Python", "TensorFlow", "React"],
    status: "CLASSIFIED",
  },
] as const

export const TECH_STACK = {
  "Frontend": [
    { name: "HTML5", icon: "html5" },
    { name: "CSS3", icon: "css3" },
    { name: "JavaScript", icon: "javascript" },
    { name: "TypeScript", icon: "typescript" },
    { name: "React", icon: "react" },
    { name: "NextJs", icon: "nextjs" },
  ],
  "Backend": [
    { name: "NodeJs", icon: "nodejs" },
    { name: "MongoDB", icon: "mongodb" },
    { name: "Java", icon: "java" },
    { name: "Python", icon: "python" },
  ],
  "LibrariesTools": [
    { name: "GSAP", icon: "gsap" },
    { name: "ThreeJs", icon: "threejs" },
    { name: "Github", icon: "github" },
    { name: "Docker", icon: "docker" },
  ],
} as const;


export const SCAN_COLORS = ["#ff00ff", "#9b5de5", "#00ffff"] as const

export const ABOUT_TEXT = [
            {
              title: 'IDENTITY_NEURAL ASSESSMENT',
              color: 'text-pink-400',
              text: [
                'Former corpo kid turned edgerunner.',
                'Specialized in neural interface programming and quantum data manipulation.',
                'Problem Solving: 87%',
                'Creative Synthesis: 92%'
              ]
            },
            {
              title: 'EXPERTISE_PERSONALITY MATRIX',
              color: 'text-purple-400',
              text: [
                'Full-stack development with cybernetic enhancement protocols.',
                'Experience in AI consciousness transfer and holographic UI systems.',
                'Innovation Drive: MAXIMUM',
                'Collaboration Index: 91%'
              ]
            },
            {
              title: 'MISSION_COGNITIVE ENHANCEMENT',
              color: 'text-cyan-400',
              text: [
                'Creating immersive digital experiences bridging humans and machines.',
                'Memory Retention: 98%',
                'Processing Speed: OPTIMAL'
              ]
            }
          ]
