import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('synchro_token')) {
      authAPI.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('synchro_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login  = useCallback((tok, u) => { localStorage.setItem('synchro_token', tok); setUser(u); }, []);
  const logout = useCallback(() => {
    localStorage.removeItem('synchro_token');
    localStorage.removeItem('synchro_buyer_token');
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);