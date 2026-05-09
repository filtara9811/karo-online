import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";

/** Routes that should NEVER trigger the auth gate (admin, vendor flows). */
const SKIP_PREFIXES = ["/admin", "/vendor", "/register"];

type AuthGateCtx = {
  /** Run `cb` if profile complete; otherwise open the login bottom sheet and run `cb` after it completes. */
  requireAuth: (cb?: () => void) => void;
  /** True if the user is signed-in AND has completed customer KYC (name + address). */
  isReady: boolean;
};

const Ctx = createContext<AuthGateCtx | null>(null);

export function useAuthGate(): AuthGateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback (e.g. SSR or outside provider): just run callback.
    return { requireAuth: (cb) => cb?.(), isReady: false };
  }
  return ctx;
}

/**
 * Action-triggered customer login gate.
 *
 * Usage:
 *   const { requireAuth } = useAuthGate();
 *   <button onClick={() => requireAuth(() => doProtectedAction())}>...</button>
 *
 * - No auto-popup, no floating CTA.
 * - On trigger: if profile complete → callback runs immediately.
 * - Otherwise → opens bottom-sheet (mobile → OTP → registration progress).
 * - X button closes sheet (callback NOT fired).
 */
export function AuthGate({ children }: { children?: ReactNode }) {
  const { isAuthenticated, ready, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [locallyOnboarded, setLocallyOnboarded] = useState(false);
  const pendingCb = useRef<(() => void) | null>(null);

  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    const sync = () => {
      try {
        setLocallyOnboarded(window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true");
      } catch {
        setLocallyOnboarded(false);
      }
    };
    sync();
    window.addEventListener("ko-customer-onboarded", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ko-customer-onboarded", sync);
      window.removeEventListener("storage", sync);
    };
  }, [location.pathname, isAuthenticated, profile?.name, profile?.address]);

  const profileComplete = locallyOnboarded || (isAuthenticated && !!(profile?.name && profile?.address));

  const isReady = !skip ? profileComplete : true;

  const requireAuth = useCallback(
    (cb?: () => void) => {
      if (skip || profileComplete) {
        cb?.();
        return;
      }
      pendingCb.current = cb ?? null;
      setOpen(true);
    },
    [skip, profileComplete],
  );

  // If profile becomes complete while open, fire pending callback and close.
  useEffect(() => {
    if (open && profileComplete) {
      const cb = pendingCb.current;
      pendingCb.current = null;
      setOpen(false);
      cb?.();
    }
  }, [open, profileComplete]);

  const handleClose = () => {
    pendingCb.current = null;
    setOpen(false);
  };

  const handleComplete = () => {
    const cb = pendingCb.current;
    pendingCb.current = null;
    setOpen(false);
    cb?.();
  };

  if (!ready) return <Ctx.Provider value={{ requireAuth, isReady: false }}>{children}</Ctx.Provider>;

  return (
    <Ctx.Provider value={{ requireAuth, isReady }}>
      {children}
      {open && !skip && (
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
            onBack={handleClose}
            onComplete={handleComplete}
          />
        </div>
      )}
    </Ctx.Provider>
  );
}
