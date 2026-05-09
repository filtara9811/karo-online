import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, profile } = useAuth();
  const locallyOnboarded = typeof window !== "undefined" && window.localStorage.getItem(CUSTOMER_ONBOARDED_KEY) === "true";
  const profileComplete = locallyOnboarded || (isAuthenticated && !!(profile?.name && profile?.address));

  useEffect(() => {
    if (ready && profileComplete) navigate({ to: "/home" });
  }, [navigate, profileComplete, ready]);

  if (ready && profileComplete) return null;

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/home" })}
      onComplete={() => navigate({ to: "/home" })}
    />
  );
}
