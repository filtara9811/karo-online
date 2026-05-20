import { createFileRoute } from "@tanstack/react-router";
import { LegalPageView } from "@/components/LegalPageView";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — Karo Online" },
      { name: "description", content: "Refund & Cancellation Policy of Karo Online, powered by Filipra Private Limited." },
    ],
  }),
  component: () => <LegalPageView slug="refund" fallbackTitle="Refund & Cancellation Policy" />,
});
