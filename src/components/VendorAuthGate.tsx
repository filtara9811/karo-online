import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gates vendor pages behind a Supabase session.
 * - If session is restoring → spinner.
 * - If no user → redirect to /vendor/register (which shows the OTP/Google sign-in flow).
 * - If signed-in → render children.
 *
 * Listens to auth state so logout from anywhere kicks the user back to login.
 */
export function VendorAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (cancelled) return;
      const ok = !!sess?.user;
      setAuthed(ok);
      if (!ok) {
        navigate({ to: "/vendor/register" });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const ok = !!session?.user;
      setAuthed(ok);
      setReady(true);
      if (!ok) navigate({ to: "/vendor/register" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!ready || !authed) {
    return (
      <div
        className="min-h-dvh grid place-items-center"
        style={{ background: "linear-gradient(180deg,#0a0606,#150d05)" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return <>{children}</>;
}
