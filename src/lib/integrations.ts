// Helpers for the Integrations Hub (Maps, KYC, Firebase, WhatsApp, ...)
// Phase 1: Maps providers. Other categories will be added incrementally.
import { supabase } from "@/integrations/supabase/client";

export type IntegrationCategory =
  | "maps"
  | "firebase"
  | "kyc"
  | "whatsapp"
  | "analytics";

export type IntegrationProvider = {
  id: string;
  category: IntegrationCategory | string;
  provider_key: string;
  display_name: string;
  is_active: boolean;
  is_test_mode: boolean;
  config: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_META: Record<
  string,
  { label: string; description: string; emoji: string }
> = {
  maps: {
    label: "Maps & Location",
    description: "Google Maps, Mappls (India), OpenStreetMap",
    emoji: "🗺️",
  },
  firebase: {
    label: "Firebase",
    description: "Auth, FCM Push, Analytics, Crashlytics",
    emoji: "🔥",
  },
  kyc: {
    label: "KYC Verification",
    description: "Aadhaar, PAN, GST, Bank — Cashfree / Surepass / Signzy",
    emoji: "🪪",
  },
  whatsapp: {
    label: "WhatsApp Cloud",
    description: "Meta WhatsApp API, templates, OTP, campaigns",
    emoji: "💬",
  },
  analytics: {
    label: "Analytics & Heatmaps",
    description: "Live visitors, funnels, retention",
    emoji: "📊",
  },
};

export async function listProviders(category: string) {
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("category", category)
    .order("display_name");
  if (error) throw error;
  return (data ?? []) as IntegrationProvider[];
}

export async function setActiveProvider(id: string) {
  const { error } = await supabase
    .from("integration_providers")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProvider(
  id: string,
  patch: Partial<
    Pick<IntegrationProvider, "is_test_mode" | "config" | "notes" | "display_name">
  >,
) {
  const { error } = await supabase
    .from("integration_providers")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}
