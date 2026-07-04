import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
import { RoleChoiceScreen } from "@/components/RoleChoiceScreen";
import { IntroSplash, SPLASH_SESSION_KEY } from "@/components/IntroSplash";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign Up — Karo Online" },
      { name: "description", content: "Create your Karo Online account in seconds. Verify your mobile, set up your profile, and start booking trusted local vendors near you." },
      { property: "og:title", content: "Sign Up — Karo Online" },
      { property: "og:description", content: "Create your Karo Online account in seconds and start booking trusted local vendors near you." },
      { property: "og:url", content: "https://karoonline.in/register" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/register" }],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, profile } = useAuth();
  const locallyOnboarded =
    typeof window !== "undefined" &&
    window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true";
  const profileComplete = locallyOnboarded || (isAuthenticated && !!profile?.name);

  const [showSplash, setShowSplash] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem(SPLASH_SESSION_KEY)) {
        setShowSplash(true);
      }
    } catch {}
  }, []);

  // Already registered → go straight home (skip role choice — one-time only).
  useEffect(() => {
    if (ready && profileComplete && !showSplash && !showRoleChoice) {
      navigate({ to: "/quick", replace: true });
    }
  }, [navigate, profileComplete, ready, showSplash, showRoleChoice]);

  if (showSplash) {
    return (
      <IntroSplash
        onDone={() => {
          setShowSplash(false);
          if (ready && profileComplete) navigate({ to: "/quick", replace: true });
        }}
      />
    );
  }

  if (showRoleChoice) {
    return (
      <RoleChoiceScreen
        onBuyer={() => navigate({ to: "/quick", replace: true })}
        onSeller={() => navigate({ to: "/vendor/join", replace: true })}
      />
    );
  }

  if (ready && profileComplete) return null;

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/quick" })}
      onComplete={() => setShowRoleChoice(true)}
    />
  );
}
