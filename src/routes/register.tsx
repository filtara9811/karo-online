import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CUSTOMER_ONBOARDED_KEY, RegistrationFlow } from "@/components/RegistrationFlow";
import { ServiceMenuScreen } from "@/components/ServiceMenuScreen";
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

  const [showServiceMenu, setShowServiceMenu] = useState(false);

  // Already registered → straight to the service menu picker.
  useEffect(() => {
    if (ready && profileComplete && !showServiceMenu) setShowServiceMenu(true);
  }, [profileComplete, ready, showServiceMenu]);

  if (showServiceMenu) {
    return (
      <ServiceMenuScreen
        onPick={(route) => navigate({ to: route, replace: true })}
      />
    );
  }

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/quick" })}
      onComplete={() => setShowServiceMenu(true)}
    />
  );
}
