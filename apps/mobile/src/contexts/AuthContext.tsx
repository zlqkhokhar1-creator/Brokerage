import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApi } from '@/src/lib/api';

type User = {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  kycStatus?: string;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('authToken');
      if (stored) {
        setToken(stored);
        // Fetch profile
        try {
          const api = await getApi();
          const { data } = await api.get('/auth/profile');
          setUser({
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            kycStatus: data.kycStatus,
          });
        } catch (_err) {
          // token invalid; clear
          await AsyncStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    const api = await getApi();
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    const tk = data.token as string;
    await AsyncStorage.setItem('authToken', tk);
    setToken(tk);
    setUser({ id: data.user.id, email: data.user.email, firstName: data.user.firstName, lastName: data.user.lastName, kycStatus: data.user.kycStatus });
  }, []);

  const register = useCallback(async (payload: any) => {
    const api = await getApi();
    await api.post('/auth/register', payload);
    // Auto-login after register
    await login(payload.email, payload.password, true);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      const api = await getApi();
      await api.post('/auth/logout');
    } catch (_err) {}
    await AsyncStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ isLoading, isAuthenticated: !!token, user, token, login, register, logout }), [isLoading, token, user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

