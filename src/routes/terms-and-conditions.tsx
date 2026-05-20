import { createFileRoute } from "@tanstack/react-router";
import { LegalPageView } from "@/components/LegalPageView";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Karo Online" },
      { name: "description", content: "Terms & Conditions of Karo Online, powered by Filipra Private Limited." },
    ],
  }),
  component: () => <LegalPageView slug="terms" fallbackTitle="Terms & Conditions" />,
});
