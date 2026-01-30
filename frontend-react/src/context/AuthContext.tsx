import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { AuthUser, login, register, fetchMe, logout } from "../api/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const persistToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const response = await fetchMe(token);
    setUser(response.user);
  }, [token]);

  const signIn = useCallback(async (username: string, password: string) => {
    const response = await login(username, password);
    persistToken(response.access_token);
    setUser(response.user);
  }, [persistToken]);

  const signUp = useCallback(async (username: string, password: string) => {
    const response = await register(username, password);
    persistToken(response.access_token);
    setUser(response.user);
  }, [persistToken]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch (_error) {
      // Ignore logout errors on client cleanup
    }
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();
      } finally {
        setAuthLoading(false);
      }
    };

    initialize();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      authLoading,
      signIn,
      signUp,
      signOut,
      refreshUser
    }),
    [user, token, authLoading, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};
