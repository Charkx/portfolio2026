'use client';

import { useEffect, useState } from 'react';
import { PROFILE } from '../../utils/constants';
import { audioEngine } from '../../lib/audioEngine';
import { sendMessage } from '../../lib/sendMessage';
import { useSceneStore } from '../../store/sceneStore';
import { useModalStore } from '../../store/modalStore';
import { PdfViewer } from './ModalViewers';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// Identifiants réseau + repli mailto — bloc autonome : intégré au formulaire (mobile)
// ou affiché sous la carte 3D (desktop, fin de session).
export function NetworkIdentifiers() {
  const openModal = useModalStore((s) => s.open);
  const openCv = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal({ title: 'CV — Charly Menthiller', size: 'xl', content: <PdfViewer src={PROFILE.cv} downloadName="CV_Charly_Menthiller.pdf" /> });
  };
  // survol/focus d'un canal → la CARTE répond (code-barres décodé à la teinte du canal)
  const hoverProps = (id: string) => ({
    onMouseEnter: () => useSceneStore.getState().setContactIdHovered(id),
    onMouseLeave: () => useSceneStore.getState().setContactIdHovered(null),
    onFocus:      () => useSceneStore.getState().setContactIdHovered(id),
    onBlur:       () => useSceneStore.getState().setContactIdHovered(null),
  });
  // teintes = celles auxquelles la carte répond (le lien et la carte partagent la couleur)
  const CH = {
    email:    '#22d3ee',
    github:   '#c084fc',
    linkedin: '#38bdf8',
    cv:       '#f472b6',
  };
  const linkCls = 'underline decoration-dotted underline-offset-4 hover:brightness-125 transition whitespace-nowrap';
  return (
    <div className="font-mono">
      {/* indice : le survol d'un canal fait "parler" la carte */}
      <div className="text-[10px] text-cyan-300/60 text-center tracking-wider mb-1.5">
        &gt; SURVOLE UN CANAL — LA CARTE RÉPOND
      </div>
      {/* coordonnées sur UNE seule ligne (défile si trop étroit) */}
      <div className="flex flex-nowrap justify-center items-center gap-x-3 text-[11px] overflow-x-auto scrollbar-hide">
        <a href={`mailto:${PROFILE.email}`} {...hoverProps('email')} style={{ color: CH.email }} className={linkCls}>◆ {PROFILE.email}</a>
        <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" {...hoverProps('github')} style={{ color: CH.github }} className={linkCls}>◆ {PROFILE.githubLabel}</a>
        <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" {...hoverProps('linkedin')} style={{ color: CH.linkedin }} className={linkCls}>◆ {PROFILE.linkedinLabel}</a>
        <a href={PROFILE.cv} onClick={openCv} {...hoverProps('cv')} style={{ color: CH.cv }} className={`${linkCls} cursor-pointer`}>◆ CV</a>
      </div>
      {/* dispo survolable → la carte affiche AVAILABLE 09/2026 */}
      <div className="mt-2 text-center">
        <span
          {...hoverProps('dispo')}
          tabIndex={0}
          className="text-[10px] text-green-400/90 cursor-default hover:text-green-300 transition tracking-wider"
        >
          ⏳ {PROFILE.availability}
        </span>
      </div>
    </div>
  );
}

// Panneau de contact holographique — partagé desktop (à côté de la carte 3D) et mobile.
// showNetwork=false quand les identifiants sont affichés ailleurs (sous la carte).
export default function ContactForm({ showNetwork = true }: { showNetwork?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const setSent = useSceneStore((s) => s.setEndSessionSent);
  const setContactFill = useSceneStore((s) => s.setContactFill);

  // alimente la carte 3D : progression du formulaire (nom + email + message)
  // → message "LINK: XX%" décodé sur le code-barres de la carte
  useEffect(() => {
    const filled = (name.trim() ? 1 : 0) + (email.trim() ? 1 : 0) + (message.trim() ? 1 : 0);
    setContactFill(filled / 3);
  }, [name, email, message, setContactFill]);

  const mailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent(`Contact portfolio — ${name || 'message'}`)}&body=${encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`)}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    audioEngine.play('uplink');
    const ok = await sendMessage({ name, email, message });
    if (ok) { setStatus('sent'); setSent(true); audioEngine.play('success'); }
    else { setStatus('error'); }
  };

  const input = 'w-full bg-black/50 border border-cyan-400/30 rounded px-3 py-2 text-cyan-200 font-mono text-sm focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(34,211,238,0.35)] focus:outline-none transition-shadow';
  const label = 'block text-cyan-300/80 text-[11px] font-mono tracking-widest mb-1';

  return (
    <div className="w-full max-w-md rounded-xl border border-cyan-400/40 bg-black/60 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
      <div className="font-mono text-cyan-300 text-xs tracking-[0.25em] mb-4">&gt; CARTE.MENTHILLER_009 // INTERFACE</div>

      {status !== 'sent' ? (
        <form onSubmit={onSubmit} className="space-y-3" aria-label="Formulaire de contact">
          <div>
            <label htmlFor="c-name" className={label}>NOM</label>
            <input id="c-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Votre nom" />
          </div>
          <div>
            <label htmlFor="c-email" className={label}>EMAIL</label>
            <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="votre@email.com (optionnel)" />
          </div>
          <div>
            <label htmlFor="c-msg" className={label}>MESSAGE</label>
            <textarea id="c-msg" rows={4} required value={message} onChange={(e) => setMessage(e.target.value)} className={`${input} resize-none`} placeholder="Votre message..." />
          </div>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full rounded px-4 py-2.5 font-mono text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {status === 'sending' ? '> TRANSMISSION EN COURS...' : "S'EXTRAIRE DE LA SIMULATION [ENVOYER]"}
          </button>
          <p aria-live="polite" className="min-h-[1.1rem] text-xs font-mono">
            {status === 'error' && (
              <span role="alert" className="text-pink-400">
                &gt; ERREUR DE TRANSMISSION — canal de secours :{' '}
                <a href={mailto} className="underline text-cyan-300 hover:text-cyan-100">mailto</a>
              </span>
            )}
          </p>
        </form>
      ) : (
        <div aria-live="polite" className="space-y-4">
          <p className="text-green-400 font-mono text-sm">&gt; MESSAGE TRANSMIS. À BIENTÔT DANS LE MONDE RÉEL.</p>
        </div>
      )}

      {/* Identifiants réseaux + repli — masqués si affichés sous la carte 3D */}
      {showNetwork && (
        <div className="mt-5 pt-4 border-t border-cyan-400/15">
          <NetworkIdentifiers />
        </div>
      )}
    </div>
  );
}
