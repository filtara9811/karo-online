import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NearbyCustomersSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  radiusKm: z.number().min(0).max(50).optional(),
});

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

/**
 * Floating customers around a vendor's location.
 * SECURITY: requires authenticated vendor. Uses admin client to bypass RLS,
 * so we verify the caller is an approved vendor before returning any data.
 * Returns only coarse area (no full address) and no customer phone/email.
 */
export const getNearbyCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => NearbyCustomersSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Caller must be a known vendor (active/approved).
    const { data: vendorRow } = await (supabaseAdmin as any)
      .from("vendors")
      .select("user_id, status, is_blocked")
      .eq("user_id", userId)
      .maybeSingle();
    if (!vendorRow || vendorRow.is_blocked || vendorRow.status !== "active") {
      return { ok: false as const, error: "forbidden", customers: [], onlineCount: 0, offlineCount: 0 };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: leads, error } = await (supabaseAdmin as any)
      .from("leads")
      .select("id, customer_id, customer_name, lat, lng, address, status, created_at, sub_category_name")
      .gte("created_at", since)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error)
      return { ok: false as const, error: error.message, customers: [], onlineCount: 0, offlineCount: 0 };

    const origin = data.origin;
    const radiusKm = data.radiusKm ?? 10;

    const seen = new Map<string, any>();
    for (const l of leads ?? []) {
      if (!l.customer_id) continue;
      if (!seen.has(l.customer_id)) seen.set(l.customer_id, l);
    }

    const customerIds = Array.from(seen.keys());
    const profileMap = new Map<string, { name: string | null; avatar_url: string | null; address: string | null }>();
    if (customerIds.length) {
      const { data: customers } = await (supabaseAdmin as any)
        .from("customers")
        .select("user_id, name, avatar_url, address")
        .in("user_id", customerIds);
      (customers ?? []).forEach((c: any) =>
        profileMap.set(c.user_id, { name: c.name, avatar_url: c.avatar_url, address: c.address }),
      );
    }

    const firstName = (n: string | null | undefined) => {
      const s = String(n ?? "").trim();
      if (!s) return "Customer";
      return s.split(/\s+/)[0];
    };

    const list = Array.from(seen.values())
      .map((l: any) => {
        const lat = Number(l.lat);
        const lng = Number(l.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const km = kmBetween(origin, { lat, lng });
        const ageMs = Date.now() - new Date(l.created_at).getTime();
        const active = l.status === "new" || l.status === "process";
        const online = active || ageMs <= 30 * 60 * 1000;
        const profile = profileMap.get(l.customer_id);
        // Coarse area only — take the broadest part (last comma chunk).
        const rawAddr = String(l.address ?? profile?.address ?? "");
        const parts = rawAddr.split(",").map((s) => s.trim()).filter(Boolean);
        const area = parts.length ? parts[parts.length - 1] : null;
        return {
          id: String(l.customer_id),
          lead_id: String(l.id),
          name: firstName(profile?.name || l.customer_name),
          avatar_url: profile?.avatar_url ?? null,
          lat,
          lng,
          km,
          area,
          is_online: online,
          sub_category_name: (l.sub_category_name ?? null) as string | null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .filter((x) => radiusKm === 0 || x.km <= radiusKm)
      .sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return a.km - b.km;
      })
      .slice(0, 24);

    const onlineCount = list.filter((c) => c.is_online).length;
    return {
      ok: true as const,
      customers: list,
      onlineCount,
      offlineCount: list.length - onlineCount,
    };
  });
