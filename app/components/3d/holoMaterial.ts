import * as THREE from 'three';

// Matériau holographique partagé (hologramme humanoïde). Extrait pour être
// réutilisé hors du canvas principal (ex. mini-jeu /transmission) sans importer
// tout AugmentedHumanScene.

export const CYAN = 0x22d3ee;
export const PULSE_SPEED = 1.6;
export const HUMAN_URL = '/3d/holograming_man.glb';

// pulse = onde glitch : uniforms PARTAGÉS par tous les matériaux du corps
export type Pulse = { t: { value: number }; o: { value: THREE.Vector3 } };

export function makeHolo(timeUniform: { value: number }, pulse: Pulse) {
  // émissif cyan = filet de sécurité : visible même si l'injection du shader échoue
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: CYAN, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeUniform;
    sh.uniforms.uOp = { value: 0.5 };
    sh.uniforms.uMz = { value: 1 }; // matérialisation : 0 = invisible, 1 = corps complet
    // ATTENTION : uEdge ne multiplie que le liseré du FRONT de (dé)matérialisation,
    // lui-même multiplié par (1 - uMz) dans le fragment. Tant que le corps est
    // complet (uMz = 1), il n'a AUCUN effet — le régler pendant une scène normale ne
    // produit rien. Il ne sert qu'à accentuer la matérialisation et la désintégration.
    sh.uniforms.uEdge = { value: 1 };
    sh.uniforms.uPulseT = pulse.t;   // temps écoulé depuis le clic (99 = onde inactive)
    sh.uniforms.uPulseO = pulse.o;   // origine de l'onde (point cliqué, monde)
    m.userData.uOp = sh.uniforms.uOp;
    m.userData.uMz = sh.uniforms.uMz;
    m.userData.uEdge = sh.uniforms.uEdge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uOp;\nuniform float uMz;\nuniform float uEdge;\nuniform float uPulseT;\nuniform vec3 uPulseO;')
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
        vec3 col=holo*(0.5+fres*1.6+band*0.7)+vec3(0.5,0.95,1.0)*edge*1.5*uEdge;
        // onde glitch : anneau lumineux qui se propage depuis le point cliqué puis s'éteint
        float pd=distance(vWPos,uPulseO);
        float pr=uPulseT*${PULSE_SPEED.toFixed(2)};
        float ring=smoothstep(0.14,0.0,abs(pd-pr))*max(0.0,1.0-uPulseT*0.85)*reveal;
        col+=vec3(0.45,1.0,1.0)*ring*1.8;
        a+=ring*0.55;
        gl_FragColor=vec4(col,a);`);
  };
  return m;
}
