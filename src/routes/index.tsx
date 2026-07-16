import { createFileRoute } from "@tanstack/react-router";
import { QuickPage } from "./quick";

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
  component: QuickPage,
});
