'use client';

import { PROFILE } from '../../utils/constants';
import { useSceneStore } from '../../store/sceneStore';
import { useDiscoveryStore } from '../../store/discoveryStore';
import { useModalStore } from '../../store/modalStore';
import { PdfViewer, CalendlyViewer } from './ModalViewers';

// Coordonnées "terminal" (fin de session) : reprend le look du terminal d'accueil
// (en-tête néon + lignes mono cyan préfixées `>` + curseur clignotant). Le survol
// d'un canal fait "parler" la carte 3D (code-barres) et capte le 5e signal SIG.
// Bouton Calendly → modale de prise de rendez-vous.

// teintes = celles auxquelles la carte répond (le lien et la carte partagent la couleur)
const CH = {
  email:    '#22d3ee',
  github:   '#c084fc',
  linkedin: '#38bdf8',
  cv:       '#f472b6',
};

export function ContactChannels() {
  const openModal = useModalStore((s) => s.open);

  const openCv = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({ title: 'CV — Charly Menthiller', size: 'xl', content: <PdfViewer src={PROFILE.cv} downloadName="CV_Charly_Menthiller.pdf" /> });
  };

  const openCalendly = () => {
    // clin d'œil : la carte célèbre (LET'S WORK TOGETHER) à l'ouverture de la prise de RDV
    useSceneStore.getState().setEndSessionSent(true);
    openModal({ title: 'Prendre rendez-vous', size: 'lg', content: <CalendlyViewer src={PROFILE.calendly} /> });
  };

  // survol/focus d'un canal → la CARTE répond + capte le signal "canal ouvert"
  const openChannel = (id: string) => {
    useSceneStore.getState().setContactIdHovered(id);
    useDiscoveryStore.getState().discover('card');
  };
  const hoverProps = (id: string) => ({
    onMouseEnter: () => openChannel(id),
    onMouseLeave: () => useSceneStore.getState().setContactIdHovered(null),
    onFocus:      () => openChannel(id),
    onBlur:       () => useSceneStore.getState().setContactIdHovered(null),
  });

  // rangée en flex : la VALEUR tronque en ellipse sur petit écran (pas de débordement)
  const line = 'flex items-baseline gap-2 hover:brightness-125 transition min-w-0';
  const key = 'w-20 sm:w-24 shrink-0 text-cyan-400/50';
  const val = 'truncate min-w-0';
  const arrow = <span className="text-cyan-400/40 shrink-0">&gt;</span>;

  return (
    <div className="font-mono text-center">
      {/* en-tête néon, comme le terminal d'accueil */}
      <div className="text-cyan-400 text-lg md:text-xl neon-glow animate-pulse mb-3 tracking-[0.2em]">
        CANAUX DE CONTACT
      </div>

      {/* bloc mono aligné à gauche, façon sortie terminal — largeur bornée, valeurs tronquées */}
      <div className="inline-block w-full max-w-md text-left text-cyan-300 text-sm space-y-1.5">
        <a href={`mailto:${PROFILE.email}`} {...hoverProps('email')} className={line}>
          {arrow}<span className={key}>EMAIL</span><span className={val} style={{ color: CH.email }}>◆ {PROFILE.email}</span>
        </a>
        <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" {...hoverProps('github')} className={line}>
          {arrow}<span className={key}>GITHUB</span><span className={val} style={{ color: CH.github }}>◆ {PROFILE.githubLabel}</span>
        </a>
        <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" {...hoverProps('linkedin')} className={line}>
          {arrow}<span className={key}>LINKEDIN</span><span className={val} style={{ color: CH.linkedin }}>◆ {PROFILE.linkedinLabel}</span>
        </a>
        <a href={PROFILE.cv} onClick={openCv} {...hoverProps('cv')} className={`${line} cursor-pointer`}>
          {arrow}<span className={key}>CV</span><span className={val} style={{ color: CH.cv }}>◆ Consulter le CV</span>
        </a>
        <div className={line}>
          {arrow}<span className={key}>DISPO</span>
          <span {...hoverProps('dispo')} tabIndex={0} className={`${val} text-green-400/90 cursor-default hover:text-green-300 transition`}>
            ⏳ {PROFILE.availability}
          </span>
        </div>
        {/* curseur clignotant */}
        <div className={line}>{arrow}<span className="term-blink text-cyan-400">_</span></div>
      </div>

      {/* prise de rendez-vous Calendly */}
      <div>
        <button
          type="button"
          onClick={openCalendly}
          className="mt-5 w-full max-w-md sm:w-auto rounded px-6 py-2.5 font-mono text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
        >
          ▸ PRENDRE RENDEZ-VOUS
        </button>
        <div className="mt-1 text-[10px] text-cyan-400/40 tracking-wider">via Calendly · créneau de 30 min</div>
      </div>
    </div>
  );
}
