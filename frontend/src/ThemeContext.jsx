import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Accent palette ────────────────────────────────────────────────
export const ACCENT_COLORS = [
  { key: 'blue',   color: '#3db4f2', hover: '#1f95db', glow: 'rgba(61,180,242,0.25)',   label: 'Azul'    },
  { key: 'orange', color: '#f59e0b', hover: '#d97706', glow: 'rgba(245,158,11,0.25)',   label: 'Naranja' },
  { key: 'purple', color: '#c084fc', hover: '#a855f7', glow: 'rgba(192,132,252,0.25)',  label: 'Morado'  },
  { key: 'green',  color: '#00ffaa', hover: '#00cc88', glow: 'rgba(0,255,170,0.25)',    label: 'Verde'   },
  { key: 'red',    color: '#f43f5e', hover: '#e11d48', glow: 'rgba(244,63,94,0.25)',    label: 'Rojo'    },
];

const STORAGE_KEY = 'at_theme';

const ThemeContext = createContext(null);

function applyTheme(accentKey, styleMode) {
  const accent = ACCENT_COLORS.find(a => a.key === accentKey) || ACCENT_COLORS[0];
  const root = document.documentElement;

  root.style.setProperty('--accent',       accent.color);
  root.style.setProperty('--accent-hover', accent.hover);
  root.style.setProperty('--accent-glow',  accent.glow);

  // Patch existing vars used throughout the app
  root.style.setProperty('--color-anilist-blue',       accent.color);
  root.style.setProperty('--color-anilist-blue-hover', accent.hover);

  // Valid modes: 'classic' | 'modern' | 'modern2'
  root.setAttribute('data-style', styleMode);
}

export function ThemeProvider({ children }) {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  })();

  const [accentColor, setAccentColorState] = useState(saved.accentColor || 'blue');
  const [styleMode,   setStyleModeState]   = useState(saved.styleMode   || 'classic');

  // Apply on mount and whenever values change
  useEffect(() => {
    applyTheme(accentColor, styleMode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accentColor, styleMode }));
  }, [accentColor, styleMode]);

  const setAccentColor = (key) => setAccentColorState(key);
  const setStyleMode   = (mode) => setStyleModeState(mode);

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor, styleMode, setStyleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
