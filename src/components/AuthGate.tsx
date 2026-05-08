import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";

/** Routes that should NEVER trigger the auth gate (admin, vendor flows). */
const SKIP_PREFIXES = ["/admin", "/vendor", "/register"];

/**
 * Customer auth gate:
 * - On app open (after 1.5s) → show signup sheet if not signed in.
 * - Any tap anywhere while unauthenticated → also opens it (capture-phase listener).
 * - Sheet has a fully translucent backdrop so the home screen stays visible behind.
 */
export function AuthGate() {
  const { isAuthenticated, ready, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));
  const locallyOnboarded = typeof window !== "undefined" && window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true";

  // Profile is complete when this device was already onboarded, or the signed-in
  // session has a complete customer profile. This prevents repeated signup sheets
  // on mobile app reopen while backend auth providers are still being finalized.
  const profileComplete = locallyOnboarded || (isAuthenticated && !!(profile?.name && profile?.address));
  const needsGate = !skip && !profileComplete;

  // Auto-open immediately on a fresh device when not authenticated
  useEffect(() => {
    if (!ready || !needsGate) return;
    const id = window.setTimeout(() => setOpen(true), 250);
    return () => window.clearTimeout(id);
  }, [ready, needsGate]);

  // Intercept first click anywhere (capture phase) while gate is needed
  useEffect(() => {
    if (!ready || !needsGate) return;

    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-auth-gate]")) return;
      setOpen(true);
    };
    document.addEventListener("pointerdown", handler as EventListener, { capture: true });
    return () => document.removeEventListener("pointerdown", handler as EventListener, { capture: true } as EventListenerOptions);
  }, [ready, needsGate]);

  // Auto-close once profile is complete
  useEffect(() => {
    if (!needsGate) setOpen(false);
  }, [needsGate]);

  if (!needsGate) return null;

  if (!open) {
    // Persistent floating CTA so the user can always find Sign Up / Login.
    return (
      <button
        data-auth-gate
        onClick={() => setOpen(true)}
        aria-label="Sign Up or Login"
        className="fixed z-[60] right-4 bottom-24 px-4 py-2.5 rounded-full font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)] shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)] active:scale-95"
        style={{
          background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 45%,#d4af37 100%)",
          border: "1.5px solid rgba(255,255,255,0.7)",
          animation: "breathe 2.6s ease-in-out infinite",
        }}
      >
        ✦ Sign Up / Login
      </button>
    );
  }

  return (
    <div
      data-auth-gate
      className="fixed inset-0 z-[60]"
      style={{
        // Translucent backdrop so the home screen behind stays visible
        background: "linear-gradient(180deg, rgba(255,250,235,0.18) 0%, rgba(245,217,122,0.22) 100%)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <RegistrationFlow
        transparent
        hideBack={false}
        onBack={() => setOpen(false)}
        onComplete={() => setOpen(false)}
      />
    </div>
  );
}
