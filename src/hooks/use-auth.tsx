import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type CardFieldVisibility = {
  name?: boolean;
  phone?: boolean;
  email?: boolean;
  address?: boolean;
  member_code?: boolean;
  company?: boolean;
};

export type CardCustomField = {
  id: string;
  type: "text" | "image";
  label?: string;
  value: string; // text value or image URL
  on?: boolean;
};

export type CustomerProfile = {
  id?: string;
  user_id?: string;
  name?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  shop_name?: string | null;
  card_link_url?: string | null;
  card_back_image_url?: string | null;
  card_field_visibility?: CardFieldVisibility | null;
  card_share_count?: number | null;
  card_view_count?: number | null;
  card_accent_color?: string | null;
  card_custom_fields?: CardCustomField[] | null;
  referral_code?: string | null;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: CustomerProfile | null;
  isAuthenticated: boolean;
  ready: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    setProfile((data as CustomerProfile) ?? null);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    try {
      window.localStorage.removeItem("ko-customer-onboarded");
      window.dispatchEvent(new Event("ko-customer-onboarded"));
    } catch {}
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        user,
        profile,
        isAuthenticated: !!session,
        ready,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    return {
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      ready: true,
      signOut: async () => {},
      refreshProfile: async () => {},
    } satisfies Ctx;
  }
  return ctx;
}
