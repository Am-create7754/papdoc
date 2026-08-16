import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAccessToken } from '../api/client';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await authService.refreshSession();
        setAccessToken(accessToken);
        const me = await authService.fetchMe();
        setUser(me);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginPatient = useCallback(async (payload) => {
    const { accessToken, user: loggedInUser } = await authService.loginPatient(payload);
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const registerPatient = useCallback(async (payload) => {
    const { accessToken, user: newUser } = await authService.registerPatient(payload);
    setAccessToken(accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const loginDoctor = useCallback(async (payload) => {
    const { accessToken, user: loggedInUser } = await authService.loginDoctor(payload);
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    loginPatient,
    registerPatient,
    loginDoctor,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
