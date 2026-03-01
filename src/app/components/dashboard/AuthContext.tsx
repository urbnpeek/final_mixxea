import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'artist' | 'label' | 'curator';
  credits: number;
  plan: string;
  avatar: string | null;
  bio: string;
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

// ─── HMR-safe singleton context ────────────────────────────────────────────
const CONTEXT_KEY = '__MIXXEA_AUTH_CTX__';
if (!(globalThis as any)[CONTEXT_KEY]) {
  (globalThis as any)[CONTEXT_KEY] = createContext<AuthContextType | null>(null);
}
const AuthContext: React.Context<AuthContextType | null> = (globalThis as any)[CONTEXT_KEY];

const LOADING_FALLBACK: AuthContextType = {
  user: null,
  token: null,
  isLoading: true,
  login: async () => { throw new Error('AuthProvider not mounted yet'); },
  signup: async () => { throw new Error('AuthProvider not mounted yet'); },
  logout: () => {},
  refreshUser: async () => {},
  updateUser: () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from localStorage via a silent token verify
  useEffect(() => {
    const savedToken = localStorage.getItem('mixxea_token');
    if (savedToken) {
      api.verifyToken(savedToken)
        .then(({ user: u }) => {
          setToken(savedToken);
          setUser(u);
        })
        .catch(() => {
          // Stale / expired token — wipe silently, user will need to log in again
          localStorage.removeItem('mixxea_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Keep isLoading=true for the full login→commit cycle so DashboardLayout's
    // auth guard (!isLoading && !user) can't fire before setUser() is committed.
    setIsLoading(true);
    try {
      const { token: t, user: u } = await api.login({ email, password });
      localStorage.setItem('mixxea_token', t);
      setToken(t);
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: string, inviteCode?: string) => {
    setIsLoading(true);
    try {
      const { token: t, user: u } = await api.signup({ name, email, password, role, inviteCode });
      localStorage.setItem('mixxea_token', t);
      setToken(t);
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (token) api.logout(token).catch(console.error);
    localStorage.removeItem('mixxea_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { user: u } = await api.getProfile(token);
      setUser(u);
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useAuth: AuthContext not found — returning loading fallback (normal during HMR).');
    }
    return LOADING_FALLBACK;
  }
  return ctx;
}
