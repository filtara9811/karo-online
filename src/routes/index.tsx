import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuickPage } from "./quick";
import { useServiceMenu } from "@/hooks/use-service-menu";
import { clearActiveService, readActiveService } from "@/lib/service-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karo Online — Nearby Vendors, Instant Service" },
      { name: "description", content: "Find trusted local plumbers, carpenters, electricians and more on a live map. Tap, pick a service, get instant quotes." },
      { property: "og:title", content: "Karo Online — Nearby Vendors, Instant Service" },
      { property: "og:description", content: "Live map of nearby vendors. Instant quotes from trusted local pros." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/" }],
  }),
  component: HomeDispatch,
});

/**
 * The home screen follows the workspace the user picked in the Service
 * Selection Menu: Quick Service renders here as before, any other service
 * redirects to its own dashboard. A service disabled by admin is dropped.
 */
function HomeDispatch() {
  const navigate = useNavigate();
  const { services, loading } = useServiceMenu();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    const active = readActiveService();
    if (!active || active === "quick") return;
    const svc = services.find((s) => s.id === active);
    if (!svc) {
      clearActiveService();
      return;
    }
    setRedirecting(true);
    navigate({ to: svc.route, replace: true });
  }, [loading, services, navigate]);

  if (redirecting) return null;
  return <QuickPage />;
}

