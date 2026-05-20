import { createFileRoute } from "@tanstack/react-router";
import { LegalPageView } from "@/components/LegalPageView";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Karo Online" },
      { name: "description", content: "Privacy Policy of Karo Online, powered by Filipra Private Limited." },
    ],
  }),
  component: () => <LegalPageView slug="privacy" fallbackTitle="Privacy Policy" />,
});
