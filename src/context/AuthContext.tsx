import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import { useTranslation } from '../i18n';
import { toast, suppressErrorToasts } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const revokeNotifiedRef = useRef(false);

  useEffect(() => {
    const currentUser = authAPI.getCurrentUser();
    const isAuth = authAPI.isAuthenticated();

    if (currentUser && isAuth) {
      setUser(currentUser);
      setIsAuthenticated(true);
    } else if (currentUser && !isAuth) {
      authAPI.logout();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleForcedLogout = (e: Event) => {
      setUser(null);
      setIsAuthenticated(false);
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      if (reason === 'revoked') {
        suppressErrorToasts();
        if (!revokeNotifiedRef.current) {
          revokeNotifiedRef.current = true;
          toast.warning(t('login.loggedOutByRequest'));
        }
      }
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [t]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    revokeNotifiedRef.current = false;
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
