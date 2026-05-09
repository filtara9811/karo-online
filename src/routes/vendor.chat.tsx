import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { VendorLeadInbox } from "@/components/VendorLeadInbox";
import { VendorAuthGate } from "@/components/VendorAuthGate";

const chatSearchSchema = z.object({
  leadId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/vendor/chat")({
  validateSearch: zodValidator(chatSearchSchema),
  head: () => ({
    meta: [
      { title: "Live Chat — Karo Online" },
      { name: "description", content: "Chat live with your customers across all accepted leads." },
    ],
  }),
  component: () => (<VendorAuthGate><VendorChatPage /></VendorAuthGate>),
});

function VendorChatPage() {
  const search = Route.useSearch();
  return <VendorLeadInbox initialLeadId={search.leadId || undefined} />;
}
