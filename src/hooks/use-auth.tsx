import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "ko-auth-user";

export type AuthUser = {
  name: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  signedUpAt: string;
};

type Ctx = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  signIn: (u: Omit<AuthUser, "signedUpAt">) => void;
  signOut: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const signIn = (u: Omit<AuthUser, "signedUpAt">) => {
    const full: AuthUser = { ...u, signedUpAt: new Date().toISOString() };
    setUser(full);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    }
  };

  const signOut = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, isAuthenticated: !!user, ready, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    return {
      user: null,
      isAuthenticated: false,
      ready: true,
      signIn: () => {},
      signOut: () => {},
    } satisfies Ctx;
  }
  return ctx;
}
