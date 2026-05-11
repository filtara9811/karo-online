import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const ROUTE_FOR: Record<string, string> = {
  quick: "/quick",
  vendor: "/vendor/register",
  all: "/vendors",
};

const OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b6c58009-aed3-4f10-8b1d-c9bf371df617";

export const Route = createFileRoute("/")({
  // IMPORTANT: no SSR redirect. We render a real 200 page with OG meta
  // so Facebook / WhatsApp / Twitter scrapers can read link previews.
  // Real users get redirected client-side to their preferred home.
  head: () => ({
    meta: [
      { title: "Karo Online — Premium Local Services & Vendors" },
      {
        name: "description",
        content:
          "Karo Online — India's premium hyperlocal marketplace. Find trusted vendors, instant service, secure payments. Join now.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://karoonline.in/" },
      { property: "og:title", content: "Karo Online — Premium Local Services & Vendors" },
      {
        property: "og:description",
        content:
          "India's premium hyperlocal marketplace. Find trusted vendors, instant service, secure payments.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Karo Online" },
      {
        name: "twitter:description",
        content: "India's premium hyperlocal marketplace.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/" }],
  }),
  component: HomeRedirect,
});

function HomeRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let target = "/quick";
    try {
      const pref = window.localStorage.getItem("ko-default-home");
      if (pref && ROUTE_FOR[pref]) target = ROUTE_FOR[pref];
    } catch {}
    navigate({ to: target, replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="font-display text-4xl text-gold-gradient mb-3">
          Karo Online
        </h1>
        <p className="text-sm text-muted-foreground">
          India's premium hyperlocal marketplace. Loading your experience…
        </p>
      </div>
    </div>
  );
}
