import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VendorQuickControlSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("is_online"), value: z.boolean() }),
  z.object({ key: z.literal("auto_accept_leads"), value: z.boolean() }),
  z.object({ key: z.literal("operation_mode"), value: z.enum(["static", "dynamic"]) }),
  z.object({ key: z.literal("service_radius_km"), value: z.number().min(0).max(100) }),
]);

const vendorFields =
  "business_name, owner_name, avatar_url, status, verified, auto_accept_leads, is_online, lat, lng, live_lat, live_lng, operation_mode, service_radius_km";

function phoneCandidates(claims: any) {
  const meta = claims?.user_metadata ?? {};
  const raw = [claims?.phone, meta.phone, meta.phone_number, claims?.email, meta.email]
    .filter(Boolean)
    .map((value) => String(value).replace(/\D/g, ""))
    .filter((digits) => digits.length >= 10)
    .map((digits) => digits.slice(-10));
  return Array.from(new Set(raw));
}

async function ensureVendorForUser(userId: string, claims: any) {
  const admin = supabaseAdmin as any;
  const byOwner = await admin
    .from("vendors")
    .select(`id, ${vendorFields}`)
    .eq("user_id", userId)
    .maybeSingle();

  if (byOwner.error) throw new Error(byOwner.error.message);
  if (byOwner.data) return byOwner.data;

  const phones = phoneCandidates(claims);
  for (const phone of phones) {
    const found = await admin
      .from("vendors")
      .select(`id, user_id, whatsapp, ${vendorFields}`)
      .filter("whatsapp", "ilike", `%${phone}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (found.error) throw new Error(found.error.message);
    if (!found.data) continue;

    const relinked = await admin
      .from("vendors")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", found.data.id)
      .select(`id, ${vendorFields}`)
      .maybeSingle();

    if (relinked.error) throw new Error(relinked.error.message);
    if (relinked.data) return relinked.data;
  }

  // Auto-create a minimal vendor row so quick controls work for first-time vendors.
  const primaryPhone = phones[0] ?? null;
  const ownerName =
    claims?.user_metadata?.full_name ||
    claims?.user_metadata?.name ||
    claims?.email ||
    "Vendor";
  const created = await admin
    .from("vendors")
    .insert({
      user_id: userId,
      owner_name: ownerName,
      whatsapp: primaryPhone,
      email: claims?.email ?? null,
      status: "pending",
    })
    .select(`id, ${vendorFields}`)
    .maybeSingle();

  if (created.error) throw new Error(created.error.message);
  if (created.data) return created.data;

  throw new Error("Vendor profile create nahi ho saka. Support se contact karein.");
}

export const updateVendorQuickControl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => VendorQuickControlSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const vendor = await ensureVendorForUser(userId, claims);
    const patch: Record<string, unknown> = {
      [data.key]: data.value,
      updated_at: new Date().toISOString(),
    };

    if (data.key === "is_online") {
      patch.location_updated_at = data.value ? new Date().toISOString() : null;
    }

    const { data: updated, error } = await (supabaseAdmin as any)
      .from("vendors")
      .update(patch)
      .eq("id", vendor.id)
      .select(vendorFields)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Vendor setting save nahi hui. Row missing hai.");
    return updated;
  });
