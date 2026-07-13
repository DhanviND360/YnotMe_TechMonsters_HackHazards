import React, { createContext, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  accessToken?: string;
  enterApp(): void;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading: false,
      isAuthenticated,
      enterApp() {
        setIsAuthenticated(true);
      },
      async signOut() {
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
