import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const Ctx = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('synchro_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('synchro_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(p => p === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <Ctx.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);