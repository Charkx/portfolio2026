'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Carte d'identité en CSS 3D (mobile) : inclinaison gyroscope (permission iOS au tap),
// repli tactile (glisser), apparition en glitch CSS. Aucun WebGL.
export default function ContactMobileCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const tilt = useRef({ x: 0, y: 0 });
  const [needsPermission, setNeedsPermission] = useState(false);

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0, beta = e.beta ?? 0;
    tilt.current.y = Math.max(-18, Math.min(18, gamma * 0.4));
    tilt.current.x = Math.max(-18, Math.min(18, -(beta - 45) * 0.3));
  }, []);

  // lissage rAF de l'inclinaison
  useEffect(() => {
    let raf = 0; const cur = { x: 0, y: 0 };
    const loop = () => {
      cur.x += (tilt.current.x - cur.x) * 0.1;
      cur.y += (tilt.current.y - cur.y) * 0.1;
      if (cardRef.current) cardRef.current.style.transform = `rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // gyroscope (iOS 13+ : permission déclenchée par un tap)
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (!DOE) return;
    if (typeof DOE.requestPermission === 'function') { setNeedsPermission(true); return; }
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [onOrient]);

  const enableSensor = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const res = await DOE.requestPermission?.();
      if (res === 'granted') window.addEventListener('deviceorientation', onOrient);
    } catch { /* refusé → repli tactile */ }
    setNeedsPermission(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]; const r = cardRef.current?.getBoundingClientRect();
    if (!t || !r) return;
    tilt.current.y = Math.max(-18, Math.min(18, ((t.clientX - (r.left + r.width / 2)) / r.width) * 30));
    tilt.current.x = Math.max(-18, Math.min(18, (-(t.clientY - (r.top + r.height / 2)) / r.height) * 30));
  };

  return (
    <div className="relative flex flex-col items-center" style={{ perspective: '900px' }}>
      <div
        ref={cardRef}
        onTouchMove={onTouchMove}
        aria-hidden="true"
        className="card-glitch-in relative w-[280px] aspect-[1.6/1] rounded-lg border border-cyan-400/40 bg-cover bg-center shadow-[0_0_40px_rgba(34,211,238,0.25)]"
        style={{ backgroundImage: 'url(/images/id_card.jpg)', transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        <span className="absolute top-2 right-3 h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_8px_lime]" />
      </div>
      {needsPermission && (
        <button onClick={enableSensor} className="mt-4 rounded border border-cyan-400/50 px-4 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-400/10 cursor-pointer">
          ACTIVER LE CAPTEUR
        </button>
      )}
      <p className="mt-3 text-[11px] text-gray-500 font-mono">Incline ton téléphone ou glisse la carte</p>
    </div>
  );
}
