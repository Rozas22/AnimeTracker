'use client';

import { useEffect, useState } from 'react';

/** Preferencia de animación de los marcos, guardada en este dispositivo. */
export type FrameMotionPref = 'auto' | 'always' | 'never';

const KEY = 'kurama-frame-motion';
const EVENT = 'kurama-frame-motion-change';

export function getFrameMotionPref(): FrameMotionPref {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'always' || v === 'never' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Aplica la preferencia al <html> para que el CSS la respete (ver globals.css). */
export function applyFrameMotionPref(pref: FrameMotionPref): void {
  document.documentElement.dataset.frameMotion = pref;
}

export function setFrameMotionPref(pref: FrameMotionPref): void {
  try {
    if (pref === 'auto') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, pref);
  } catch {
    /* sin almacenamiento: vale solo para esta sesión */
  }
  applyFrameMotionPref(pref);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pref }));
}

/** Preferencia actual, reactiva a cambios desde Ajustes. */
export function useFrameMotionPref(): FrameMotionPref {
  const [pref, setPref] = useState<FrameMotionPref>('auto');
  useEffect(() => {
    const p = getFrameMotionPref();
    setPref(p);
    applyFrameMotionPref(p);
    const onChange = (e: Event): void => setPref((e as CustomEvent<FrameMotionPref>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return pref;
}

/** ¿Deben animarse los marcos ahora? Combina la preferencia con la del sistema. */
export function useShouldAnimateFrames(): boolean {
  const pref = useFrameMotionPref();
  const [systemReduce, setSystemReduce] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setSystemReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  if (pref === 'always') return true;
  if (pref === 'never') return false;
  return !systemReduce;
}
