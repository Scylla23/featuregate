import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import * as authApi from '@/api/auth';
import type { AuthUser } from '@/api/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function getStoredAuth(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('fg_token');
  const userStr = localStorage.getItem('fg_user');
  let user: AuthUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      // ignore
    }
  }
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAuth().token);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuth().user);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('fg_token', res.token);
    localStorage.setItem('fg_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register(email, password, name);
    localStorage.setItem('fg_token', res.token);
    localStorage.setItem('fg_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
