/**
 * Resolves the white-label identity (name / icon / accent) behind a shop code,
 * preferring the merchant's One QR project. Server-only.
 */
export type ShopIdentity = {
  name: string | null;
  icon: string | null;
  accent: string | null;
};

type Proj = {
  business_name: string | null;
  title: string | null;
  avatar_url: string | null;
  accent_color: string | null;
};

type Cust = {
  name: string | null;
  shop_name: string | null;
  avatar_url: string | null;
  shop_logo_url: string | null;
};

const PROJ_COLS = "business_name, title, avatar_url, accent_color";

export async function resolveShopIdentity(
  code: string,
  project: string | null,
): Promise<ShopIdentity> {
  const out: ShopIdentity = { name: null, icon: null, accent: null };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Shop code → owner (referral_codes first, then customers.referral_code).
    let userId: string | null = null;
    const rc = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .ilike("code", code)
      .maybeSingle();
    userId = (rc.data as { user_id: string } | null)?.user_id ?? null;

    let customer: Cust | null = null;

    if (userId) {
      const c = await supabaseAdmin
        .from("customers")
        .select("name, shop_name, avatar_url, shop_logo_url")
        .eq("id", userId)
        .maybeSingle();
      customer = (c.data as Cust | null) ?? null;
    } else {
      const c = await supabaseAdmin
        .from("customers")
        .select("id, name, shop_name, avatar_url, shop_logo_url")
        .ilike("referral_code", code)
        .maybeSingle();
      const row = c.data as (Cust & { id: string }) | null;
      if (row) {
        userId = row.id;
        customer = row;
      }
    }

    if (customer) {
      out.name = customer.shop_name || customer.name || null;
      out.icon = customer.shop_logo_url || customer.avatar_url || null;
    }

    if (!out.name && userId) {
      const v = await supabaseAdmin
        .from("vendors")
        .select("business_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      const vendor = v.data as { business_name: string | null; avatar_url: string | null } | null;
      out.name = out.name || vendor?.business_name || null;
      out.icon = out.icon || vendor?.avatar_url || null;
    }

    // The One QR project is the preferred white-label identity.
    let proj: Proj | null = null;
    if (project) {
      const bySlug = await supabaseAdmin
        .from("qr_projects")
        .select(PROJ_COLS)
        .eq("slug", project)
        .maybeSingle();
      proj = (bySlug.data as Proj | null) ?? null;
      if (!proj && /^[0-9a-f-]{36}$/i.test(project)) {
        const byId = await supabaseAdmin
          .from("qr_projects")
          .select(PROJ_COLS)
          .eq("id", project)
          .maybeSingle();
        proj = (byId.data as Proj | null) ?? null;
      }
    }
    if (!proj && userId) {
      const first = await supabaseAdmin
        .from("qr_projects")
        .select(PROJ_COLS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      proj = (first.data as Proj | null) ?? null;
    }

    if (proj) {
      out.name = proj.business_name || proj.title || out.name;
      out.icon = proj.avatar_url || out.icon;
      out.accent = proj.accent_color ?? null;
    }
  } catch {
    /* defaults */
  }
  return out;
}
