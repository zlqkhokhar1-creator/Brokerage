"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  twoFactorEnabled: boolean;
  hasCompletedOnboarding: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  riskProfile?: string;
  investmentGoals?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 🚀 Dev mode: instantly log in with a fake user
    // Check both NODE_ENV and if we're in a Docker environment
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ||
                         typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    if (isDevelopment) {
      const devUser: User = {
        id: 'dev-1',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        kycStatus: 'approved',
        twoFactorEnabled: false,
        hasCompletedOnboarding: true,
      };
      setUser(devUser);
      setLoading(false);
      // Optional: auto‑redirect to dashboard
      if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '/login')) {
        router.push('/dashboard');
      }
      return;
    }

    // Production: run real auth check
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const demo = localStorage.getItem('demo');
      if (demo === '1') {
        setUser(JSON.parse(localStorage.getItem('demo_user') || 'null'));
        setLoading(false);
        return;
      }
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    // Dev mode: skip login entirely
    if (process.env.NODE_ENV === 'development') {
      const devUser: User = {
        id: 'dev-1',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        kycStatus: 'approved',
        twoFactorEnabled: false,
        hasCompletedOnboarding: true,
      };
      setUser(devUser);
      router.push('/dashboard');
      return;
    }

    // Offline demo login
    if (email === 'demo@investpro.com' && password === 'demo123') {
      const demoUser: User = {
        id: 'demo-1',
        email,
        firstName: 'Demo',
        lastName: 'User',
        kycStatus: 'approved',
        twoFactorEnabled: false,
        hasCompletedOnboarding: false,
      };
      localStorage.setItem('demo', '1');
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      localStorage.setItem('token', 'demo-token');
      setUser(demoUser);
      router.push('/dashboard');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.removeItem('demo');
      localStorage.removeItem('demo_user');
      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (_userData: RegisterData) => {
    throw new Error('Registration is currently disabled in demo mode. Please use the demo login.');
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('demo');
      localStorage.removeItem('demo_user');
      setUser(null);
      router.push('/');
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    const demo = localStorage.getItem('demo');
    if (demo === '1') {
      const updated = { ...(JSON.parse(localStorage.getItem('demo_user') || 'null') || {}), ...userData };
      localStorage.setItem('demo_user', JSON.stringify(updated));
      setUser(updated);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Profile update failed');

      setUser(prev => prev ? { ...prev, ...userData } : null);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = { user, loading, login, register, logout, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
