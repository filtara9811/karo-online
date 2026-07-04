import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
import { RoleChoiceScreen } from "@/components/RoleChoiceScreen";

/** Routes that should NEVER trigger the auth gate (admin, vendor flows). */
const SKIP_PREFIXES = ["/admin", "/vendor", "/register"];
const PUBLIC_EXACT = new Set([
  "/", "/about", "/features", "/pricing", "/for-vendors", "/for-customers",
  "/download", "/contact", "/services", "/privacy-policy", "/terms-and-conditions",
  "/refund-policy", "/shipping-policy",
]);
const PUBLIC_PREFIXES = ["/blog", "/f/", "/c/", "/r/", "/s/"];

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
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const navigate = useNavigate();

  const skip =
    PUBLIC_EXACT.has(location.pathname) ||
    PUBLIC_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
    SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));

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
  }, [location.pathname, isAuthenticated, profile?.name]);

  const profileComplete = locallyOnboarded || (isAuthenticated && !!profile?.name);

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

  // FORCED GATE: on customer routes, block the entire app behind login/registration
  // until the profile is complete. Admin/vendor/register routes skip this.
  const forceGate = !skip && !profileComplete;

  return (
    <Ctx.Provider value={{ requireAuth, isReady }}>
      {forceGate ? (
        <div
          data-auth-gate
          className="fixed inset-0 z-[60]"
          style={{
            background: "linear-gradient(180deg, #fffaeb 0%, #f5e8c4 100%)",
          }}
        >
          {showRoleChoice ? (
            <RoleChoiceScreen
              onBuyer={() => {
                setShowRoleChoice(false);
                handleComplete();
              }}
              onSeller={() => {
                setShowRoleChoice(false);
                handleComplete();
                try { navigate({ to: "/vendor/join" }); } catch { /* ignore */ }
              }}
            />
          ) : (
            <RegistrationFlow
              transparent
              hideBack
              onBack={() => { /* cannot dismiss — forced gate */ }}
              onComplete={() => setShowRoleChoice(true)}
            />
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </Ctx.Provider>
  );
}
