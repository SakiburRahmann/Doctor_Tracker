'use client';

/**
 * Theme state (light / dark).
 *
 * The theme is applied as a class on <html> so the CSS variables in
 * globals.css flip every surface at once. A tiny inline script in layout.js
 * applies the stored/system theme before first paint, so there is no flash.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'dt-theme';

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const set = useCallback((next) => {
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: theme simply does not persist */
    }
  }, []);

  const toggle = useCallback(() => {
    set(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  }, [set]);

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', setTheme: set, toggle }), [theme, set, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Inline pre-paint script — intentionally tiny and dependency-free. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`;
