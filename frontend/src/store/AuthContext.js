import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService from '../services/auth';
import StorageService from '../services/storage';

console.log('[Yaazh][BOOT] AuthContext module evaluated');

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('[Yaazh][BOOT] AuthProvider mounted');
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await StorageService.get('yaazh_user');
        const hasToken = await AuthService.isAuthenticated();
        if (hasToken) {
          setUser(storedUser || null);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.log('Session restore failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await AuthService.login(email, password);
    if (result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
      await StorageService.set('yaazh_user', result.user);
    }
    return result;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const result = await AuthService.register(name, email, password);
    if (result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
      await StorageService.set('yaazh_user', result.user);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
    await StorageService.remove('yaazh_user');
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await AuthService.getMe();
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      await StorageService.set('yaazh_user', userData);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;