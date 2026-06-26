import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import { useTranslation } from '../i18n';
import { toast, suppressErrorToasts } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User) => void;
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
    const cached = authAPI.getCurrentUser();
    if (cached) {
      setUser(cached);
      setIsAuthenticated(true);
    }
    setLoading(false);

    let cancelled = false;
    authAPI.getMe().then((me) => {
      if (cancelled || me === undefined) return;
      if (me) {
        setUser(me);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(me));
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
      }
    });
    return () => {
      cancelled = true;
    };
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

  const login = (userData: User) => {
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
