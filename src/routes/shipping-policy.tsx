import { createFileRoute } from "@tanstack/react-router";
import { LegalPageView } from "@/components/LegalPageView";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping & Delivery Policy — Karo Online" },
      { name: "description", content: "Shipping & Delivery Policy of Karo Online, powered by Filipra Private Limited." },
    ],
  }),
  component: () => <LegalPageView slug="shipping" fallbackTitle="Shipping & Delivery Policy" />,
});
