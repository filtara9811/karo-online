import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "support"]);

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const ok = (data ?? []).some((r: { role: string }) => ADMIN_ROLES.has(r.role));
  if (!ok) throw new Error("Not authorized");
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const lookupUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);

    const q = data.q.trim();
    const digits = onlyDigits(q);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    let customers: any[] = [];

    if (isUuid) {
      const { data: rows } = await supabase
        .from("customers")
        .select("*")
        .or(`id.eq.${q},user_id.eq.${q}`);
      customers = rows ?? [];
    } else if (digits.length === 4) {
      const { data: rows } = await supabase
        .from("customers")
        .select("*")
        .eq("support_code", digits);
      customers = rows ?? [];
    } else {
      // Phone (10 digits), email, or name
      const orParts: string[] = [];
      if (digits.length >= 6) orParts.push(`phone.ilike.%${digits.slice(-10)}%`);
      if (q.includes("@")) orParts.push(`email.ilike.%${q}%`);
      orParts.push(`name.ilike.%${q}%`);
      if (digits.length === 4) orParts.push(`support_code.eq.${digits}`);
      const { data: rows } = await supabase
        .from("customers")
        .select("*")
        .or(orParts.join(","))
        .limit(20);
      customers = rows ?? [];
    }

    const userIds = customers.map((c) => c.user_id);
    let vendors: any[] = [];
    let wallets: any[] = [];
    if (userIds.length > 0) {
      const [{ data: v }, { data: w }] = await Promise.all([
        supabase.from("vendors").select("*").in("user_id", userIds),
        supabase.from("vendor_wallets").select("*").in("vendor_id", userIds),
      ]);
      vendors = v ?? [];
      wallets = w ?? [];
    }

    return {
      results: customers.map((c) => ({
        customer: c,
        vendor: vendors.find((v) => v.user_id === c.user_id) ?? null,
        wallet: wallets.find((w) => w.vendor_id === c.user_id) ?? null,
      })),
    };
  });

export const getUserFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const uid = data.userId;
    const [c, v, w, tx, leads, refs] = await Promise.all([
      supabase.from("customers").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("vendors").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("vendor_wallets").select("*").eq("vendor_id", uid).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("vendor_id", uid).order("created_at", { ascending: false }).limit(25),
      supabase.from("leads").select("id,sub_category_name,status,created_at,lead_price_inr").or(`customer_id.eq.${uid},accepted_vendor_id.eq.${uid}`).order("created_at", { ascending: false }).limit(20),
      supabase.from("referrals").select("*").or(`referrer_user_id.eq.${uid},referred_user_id.eq.${uid}`).limit(20),
    ]);
    return {
      customer: c.data ?? null,
      vendor: v.data ?? null,
      wallet: w.data ?? null,
      transactions: tx.data ?? [],
      leads: leads.data ?? [],
      referrals: refs.data ?? [],
    };
  });

const customerPatchSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  avatar_url: z.string().max(2000).nullable().optional(),
  is_blocked: z.boolean().optional(),
  verified: z.boolean().optional(),
  status: z.string().max(40).optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
});

export const updateCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; patch: Record<string, unknown> }) =>
    z.object({ userId: z.string().uuid(), patch: customerPatchSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("customers")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const vendorPatchSchema = z.object({
  business_name: z.string().max(200).nullable().optional(),
  owner_name: z.string().max(120).nullable().optional(),
  trade: z.string().max(120).nullable().optional(),
  deals_in: z.string().max(120).nullable().optional(),
  whatsapp: z.string().max(20).nullable().optional(),
  manager_email: z.string().max(255).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  gst: z.string().max(50).nullable().optional(),
  pan: z.string().max(50).nullable().optional(),
  aadhaar: z.string().max(50).nullable().optional(),
  plan: z.string().max(40).nullable().optional(),
  status: z.string().max(40).optional(),
  verified: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
});

export const updateVendorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; patch: Record<string, unknown> }) =>
    z.object({ userId: z.string().uuid(), patch: vendorPatchSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase
      .from("vendors")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; kind: "coin" | "service"; direction: "credit" | "debit"; amount: number; reason: string }) =>
    z.object({
      userId: z.string().uuid(),
      kind: z.enum(["coin", "service"]),
      direction: z.enum(["credit", "debit"]),
      amount: z.number().int().positive().max(10_000_000),
      reason: z.string().min(1).max(300),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { data: res, error } = await supabase.rpc("admin_adjust_wallet", {
      _user_id: data.userId,
      _kind: data.kind,
      _direction: data.direction,
      _amount: data.amount,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const setUserBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; blocked: boolean }) =>
    z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    await supabase.from("customers").update({ is_blocked: data.blocked, updated_at: new Date().toISOString() }).eq("user_id", data.userId);
    await supabase.from("vendors").update({ is_blocked: data.blocked, updated_at: new Date().toISOString() }).eq("user_id", data.userId);
    return { ok: true };
  });
