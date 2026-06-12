import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
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

  // Show branded splash once per session (cold app open).
  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem(SPLASH_SESSION_KEY)) {
        setShowSplash(true);
      }
    } catch {}
  }, []);

  // If already registered → go straight to home (hard gate satisfied).
  useEffect(() => {
    if (ready && profileComplete && !showSplash) navigate({ to: "/quick", replace: true });
  }, [navigate, profileComplete, ready, showSplash]);

  if (showSplash) {
    return (
      <IntroSplash
        onDone={() => {
          setShowSplash(false);
          // After splash: if already authed, send straight to home.
          if (ready && profileComplete) navigate({ to: "/quick", replace: true });
        }}
      />
    );
  }

  if (ready && profileComplete) return null;

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/quick" })}
      onComplete={() => navigate({ to: "/quick" })}
    />
  );
}
