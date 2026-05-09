import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";

/** Routes that should NEVER trigger the auth gate (admin, vendor flows). */
const SKIP_PREFIXES = ["/admin", "/vendor", "/register"];

const DISMISS_KEY = "ko-auth-gate-dismissed-at";
const FIRST_SHOW_DELAY_MS = 2 * 60 * 1000; // 2 minutes after app open
const REAPPEAR_AFTER_MS = 17 * 60 * 1000; // ~15-20 minutes

/**
 * Customer auth gate:
 * - Auto-opens ~2 minutes after app open if not signed in / KYC incomplete.
 * - X button closes the sheet → stores timestamp; sheet won't re-open for 15-20 min.
 * - After the cool-down, sheet auto-reappears.
 * - A persistent floating "Sign Up / Login" CTA is always visible while gate is needed.
 */
export function AuthGate() {
  const { isAuthenticated, ready, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [locallyOnboarded, setLocallyOnboarded] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    try {
      setLocallyOnboarded(window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true");
    } catch {
      setLocallyOnboarded(false);
    }
  }, [location.pathname]);

  const profileComplete = locallyOnboarded || (isAuthenticated && !!(profile?.name && profile?.address));
  const needsGate = !skip && !profileComplete;

  // Schedule auto-open: respects 15-20 min dismiss cool-down
  useEffect(() => {
    if (!ready || !needsGate) return;
    const scheduleOpen = () => {
      let dismissedAt = 0;
      try {
        dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || "0");
      } catch {/* noop */}
      const sinceDismiss = Date.now() - dismissedAt;
      const wait = dismissedAt
        ? Math.max(REAPPEAR_AFTER_MS - sinceDismiss, 5000)
        : FIRST_SHOW_DELAY_MS;
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = window.setTimeout(() => setOpen(true), wait);
    };
    scheduleOpen();
    return () => {
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    };
  }, [ready, needsGate]);

  // Close once profile is complete
  useEffect(() => {
    if (!needsGate) setOpen(false);
  }, [needsGate]);

  const handleDismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {/* noop */}
    setOpen(false);
    // Reschedule next auto-open
    if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => setOpen(true), REAPPEAR_AFTER_MS);
  };

  if (!ready) return null;
  if (!needsGate) return null;

  if (!open) {
    // Persistent floating CTA — user can always tap to open
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
        background: "linear-gradient(180deg, rgba(255,250,235,0.18) 0%, rgba(245,217,122,0.22) 100%)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <RegistrationFlow
        transparent
        hideBack={false}
        onBack={handleDismiss}
        onComplete={handleDismiss}
      />
    </div>
  );
}
