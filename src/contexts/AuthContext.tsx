import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: { name: string; username?: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; address?: string; avatar?: string }) => Promise<void>;
  changePassword: (current_password: string, new_password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data || null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await authService.getMe();
          setUser(response.data || null);
        } catch {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (username: string, password: string, rememberMe = false) => {
    const response = await authService.login(username, password);
    if (response.data?.token) {
      const storage = rememberMe ? localStorage : sessionStorage;
      // Clear both first
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      storage.setItem('token', response.data.token);
      setToken(response.data.token);
    }
    setUser(response.data?.user || null);
  };

  const register = async (data: { name: string; username?: string; email: string; password: string; phone?: string }) => {
    const response = await authService.register(data);
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
    }
    setUser(response.data?.user || null);
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; phone?: string; address?: string; avatar?: string }) => {
    const response = await authService.updateProfile(data);
    if (response.data) {
      setUser(response.data);
    }
  };

  const changePassword = async (current_password: string, new_password: string) => {
    await authService.changePassword(current_password, new_password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
