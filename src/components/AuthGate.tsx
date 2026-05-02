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

  // Profile is "complete" when basic fields are filled
  const profileComplete = locallyOnboarded || !!(profile?.name && profile?.address);
  const needsGate = !skip && !profileComplete;

  // Auto-open ~1.5s after first ready render
  useEffect(() => {
    if (!ready || !needsGate) return;
    const id = window.setTimeout(() => setOpen(true), 1500);
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

  if (!open || !needsGate) return null;

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
