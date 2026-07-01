'use client';

import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useSceneStore } from '../store/sceneStore';
import { audioEngine } from '../lib/audioEngine';

/**
 * Permet de faire pivoter à la souris le module 3D embarqué dans le canvas partagé.
 * Le canvas est `pointer-events:none` → le drag est capté sur le SLOT HTML de la
 * section (dessous), et traduit en rotation de l'objet (pas de la caméra, qui reste
 * pilotée par le scroll). `focus` = clé du module (brain / adn / heart / globe / human).
 */
export function useDragRotate(focus: string) {
  const nudgeRot = useSceneStore((s) => s.nudgeRot);
  const setDragFocus = useSceneStore((s) => s.setDragFocus);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    setDragFocus(focus);
    audioEngine.play('grab');
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [focus, setDragFocus]);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    nudgeRot(focus, (e.clientX - last.current.x) * 0.01, (e.clientY - last.current.y) * 0.01);
    last.current = { x: e.clientX, y: e.clientY };
  }, [focus, nudgeRot]);

  const end = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    setDragFocus(null);
    audioEngine.play('release');
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, [setDragFocus]);

  // handlers à spread sur le slot ; ajoute les classes `cursor-grab touch-none` pour l'affordance
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerLeave: end,
  };
}
