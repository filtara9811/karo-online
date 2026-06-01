import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VendorQuickControlSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("is_online"),
    value: z.boolean(),
    location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  }),
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

function emailCandidates(claims: any) {
  const meta = claims?.user_metadata ?? {};
  return Array.from(
    new Set(
      [claims?.email, meta.email]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .filter((value) => value.includes("@")),
    ),
  );
}

function normalizePhone10(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

async function claimVendorRow(admin: any, row: any, userId: string) {
  if (row.user_id === userId) return row;
  const relinked = await admin
    .from("vendors")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .select(`id, ${vendorFields}`)
    .maybeSingle();

  if (relinked.error) throw new Error(relinked.error.message);
  if (relinked.data) return relinked.data;
  throw new Error("Vendor profile relink nahi ho saka. Dobara login karke try karein.");
}

async function findVendorByPhone(admin: any, phones: string[]) {
  const selectFields = `id, user_id, whatsapp, ${vendorFields}`;
  for (const phone of phones) {
    const seen = new Set<string>();
    for (const tailLength of [10, 7, 5, 4]) {
      const tail = phone.slice(-tailLength);
      const candidates = await admin
        .from("vendors")
        .select(selectFields)
        .filter("whatsapp", "ilike", `%${tail}%`)
        .limit(100);

      if (candidates.error) throw new Error(candidates.error.message);
      const match = (candidates.data ?? []).find((row: any) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return normalizePhone10(row.whatsapp) === phone;
      });
      if (match) return match;
    }
  }

  // Last-resort exact JS normalization. This prevents duplicate inserts when
  // stored phone formatting does not match ilike patterns but the DB unique
  // index still sees the same last-10-digit phone.
  for (let from = 0; from < 10000; from += 1000) {
    const page = await admin
      .from("vendors")
      .select(selectFields)
      .not("whatsapp", "is", null)
      .range(from, from + 999);
    if (page.error) throw new Error(page.error.message);
    const rows = page.data ?? [];
    const match = rows.find((row: any) => phones.includes(normalizePhone10(row.whatsapp) ?? ""));
    if (match) return match;
    if (rows.length < 1000) break;
  }
  return null;
}

async function findVendorByEmail(admin: any, emails: string[]) {
  if (!emails.length) return null;
  const selectFields = `id, user_id, email, manager_email, ${vendorFields}`;
  for (const email of emails) {
    const byEmail = await admin.from("vendors").select(selectFields).eq("email", email).maybeSingle();
    if (byEmail.error) throw new Error(byEmail.error.message);
    if (byEmail.data) return byEmail.data;

    const byManager = await admin
      .from("vendors")
      .select(selectFields)
      .eq("manager_email", email)
      .maybeSingle();
    if (byManager.error) throw new Error(byManager.error.message);
    if (byManager.data) return byManager.data;
  }
  return null;
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
  const phoneMatch = await findVendorByPhone(admin, phones);
  if (phoneMatch) return claimVendorRow(admin, phoneMatch, userId);

  const emailMatch = await findVendorByEmail(admin, emailCandidates(claims));
  if (emailMatch) return claimVendorRow(admin, emailMatch, userId);


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

  if (created.error) {
    if (created.error.message?.includes("vendors_unique_whatsapp10")) {
      const retryMatch = await findVendorByPhone(admin, phones);
      if (retryMatch) return claimVendorRow(admin, retryMatch, userId);
      throw new Error("Is phone number ka vendor profile pehle se hai. Same phone se login karke retry karein.");
    }
    if (created.error.message?.includes("vendors_unique_email_norm")) {
      const retryMatch = await findVendorByEmail(admin, emailCandidates(claims));
      if (retryMatch) return claimVendorRow(admin, retryMatch, userId);
      throw new Error("Is email ka vendor profile pehle se hai. Same login se retry karein.");
    }
    throw new Error(created.error.message);
  }
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
