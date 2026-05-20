import { createFileRoute } from "@tanstack/react-router";
import { LegalPageView } from "@/components/LegalPageView";

const URL = "https://karoonline.in/shipping-policy";
const TITLE = "Shipping & Delivery Policy — Karo Online";
const DESC = "Shipping & Delivery Policy of Karo Online, powered by Filipra Private Limited.";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Karo Online" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <LegalPageView slug="shipping" fallbackTitle="Shipping & Delivery Policy" />,
});
