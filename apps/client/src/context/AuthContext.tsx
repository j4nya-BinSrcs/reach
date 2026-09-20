import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AuthUser {
  id: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

const API_BASE = '/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('reach-token');
      const storedUser = localStorage.getItem('reach-user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {}
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Sign in failed');
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('reach-token', data.token);
      localStorage.setItem('reach-user', JSON.stringify(data.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, name: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Sign up failed');
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('reach-token', data.token);
      localStorage.setItem('reach-user', JSON.stringify(data.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('reach-token');
    localStorage.removeItem('reach-user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user && !!token, login, signup, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
