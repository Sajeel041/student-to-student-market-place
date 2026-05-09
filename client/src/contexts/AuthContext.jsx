import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on mount
  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setUser(r.data);
    return r.data;
  }, []);

  const register = useCallback(async (data) => {
    const r = await api.post('/auth/register', data);
    setUser(r.data);
    return r.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  const savedSet = new Set((user?.savedListings || []).map(l =>
    typeof l === 'string' ? l : l._id
  ));

  const toggleSave = useCallback(async (listingId) => {
    // Optimistic update
    setUser(prev => {
      if (!prev) return prev;
      const ids = (prev.savedListings || []).map(l => typeof l === 'string' ? l : l._id);
      const already = ids.includes(listingId);
      return {
        ...prev,
        savedListings: already
          ? ids.filter(id => id !== listingId)
          : [...ids, listingId],
      };
    });
    try {
      const r = await api.post(`/users/me/saved/${listingId}`);
      setUser(prev => prev ? { ...prev, savedListings: r.data.savedListings } : prev);
    } catch {
      // Revert on failure — refetch
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, savedSet, toggleSave }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
