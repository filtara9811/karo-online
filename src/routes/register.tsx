import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
import { OnboardingCarousel, ONBOARDING_SEEN_KEY } from "@/components/OnboardingCarousel";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, profile } = useAuth();
  const locallyOnboarded = typeof window !== "undefined" && window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true";
  const profileComplete = locallyOnboarded || (isAuthenticated && !!profile?.name);

  // Show splash/onboarding BEFORE login screen on first install.
  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(ONBOARDING_SEEN_KEY)) {
        setShowSplash(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (ready && profileComplete) navigate({ to: "/quick" });
  }, [navigate, profileComplete, ready]);

  if (ready && profileComplete) return null;

  if (showSplash) {
    return <OnboardingCarousel audience="customer" onDone={() => setShowSplash(false)} />;
  }

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/quick" })}
      onComplete={() => navigate({ to: "/quick" })}
    />
  );
}
