import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('mathnexus_theme');
      if (stored) return stored === 'dark';
    } catch { /* Fall back to the system preference. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#18251f' : '#f5f7f2');
    try { localStorage.setItem('mathnexus_theme', dark ? 'dark' : 'light'); } catch { /* Theme still works for this session. */ }
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
