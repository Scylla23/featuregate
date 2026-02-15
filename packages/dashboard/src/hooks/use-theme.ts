import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

// Apply saved theme immediately on module load (prevents flash)
applyTheme((localStorage.getItem('fg_theme') as Theme) || 'system');

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('fg_theme') as Theme) || 'system',
  );

  const setTheme = useCallback((newTheme: Theme) => {
    applyTheme(newTheme);
    localStorage.setItem('fg_theme', newTheme);
    setThemeState(newTheme);
  }, []);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}
