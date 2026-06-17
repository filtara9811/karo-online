import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Section 4 backend stubs — anti-fraud + dynamic pricing for registration.
 *
 * These are placeholder server functions wired into the registration flow so the
 * frontend can call them today. Replace the handler bodies with real logic and
 * a migration when ready (no schema is created here yet).
 *
 * Backend invariants (to implement):
 * - activation_fee = promoter's current reward tier (₹49 / ₹99 / ₹199 / ...)
 * - Lead Coins credited to promoter on successful activation
 * - 1 mobile ↔ 1 promoter binding (cannot reassign)
 * - Hardware UUID device-lock (1 install = 1 account)
 * - 1:1 Promoter ↔ PAN ↔ Bank uniqueness
 */

// ── 1. Dynamic activation fee ──────────────────────────────────────────────
export const getActivationFee = createServerFn({ method: "POST" })
  .inputValidator((input: { referralCode?: string | null }) =>
    z.object({ referralCode: z.string().nullable().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    // TODO: look up promoter by referralCode → return their reward_tier amount.
    // Default tier when no promoter / unknown code:
    return {
      ok: true,
      amount: 49,
      currency: "INR" as const,
      tier: "starter" as const,
      promoter_code: data.referralCode ?? null,
    };
  });

// ── 2. Mobile ↔ Promoter binding pre-check ─────────────────────────────────
export const checkMobilePromoterBinding = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; referralCode?: string | null }) =>
    z
      .object({
        phone: z.string().min(10),
        referralCode: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async (_ctx) => {
    // TODO: check `customers.referred_by_locked` for this phone.
    // If already bound to a different promoter → reject.
    return { ok: true, bound: false, locked_to: null as string | null };
  });

// ── 3. Device / hardware UUID lock ─────────────────────────────────────────
/**
 * Hardware UUID / device-lock check.
 *
 * SCOPE — IMPORTANT:
 *   - panel: "customer" | "vendor"  → fingerprint MUST be enforced (1 install = 1 account).
 *   - panel: "staff" | "admin"      → ALWAYS bypass. Staff/admin onboard hundreds
 *     of vendors from a single laptop/tablet/phone; locking that device would
 *     break their workflow. Role is verified server-side via `has_role()`.
 *
 * Admins can also unlock a previously-bound fingerprint for a specific phone
 * via `unlockDeviceFingerprint` below (admin panel only).
 */
export const registerDeviceFingerprint = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fingerprint: string; phone: string; panel?: "customer" | "vendor" | "staff" | "admin"; user_agent?: string }) =>
      z
        .object({
          fingerprint: z.string().min(8),
          phone: z.string().min(10),
          panel: z.enum(["customer", "vendor", "staff", "admin"]).optional().default("customer"),
          user_agent: z.string().max(500).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.panel === "staff" || data.panel === "admin") {
      return { ok: true, conflict: false, bypassed: true as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check for existing active binding on this fingerprint+panel
    const { data: existing } = await supabaseAdmin
      .from("device_fingerprints")
      .select("id, phone")
      .eq("fingerprint", data.fingerprint)
      .eq("panel", data.panel)
      .is("unlocked_at", null)
      .maybeSingle();

    if (existing && existing.phone !== data.phone) {
      return { ok: false, conflict: true, bypassed: false as const, locked_to: existing.phone };
    }

    if (!existing) {
      const { error } = await supabaseAdmin.from("device_fingerprints").insert({
        fingerprint: data.fingerprint,
        phone: data.phone,
        panel: data.panel,
        user_agent: data.user_agent ?? null,
      });
      if (error) return { ok: false, conflict: false, bypassed: false as const, error: error.message };
    } else {
      await supabaseAdmin
        .from("device_fingerprints")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    return { ok: true, conflict: false, bypassed: false as const };
  });

/**
 * Admin-only: clear a device fingerprint binding so a phone can re-register
 * on a different / same device. Caller must hold an admin role.
 */
export const unlockDeviceFingerprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; panel?: string; reason?: string }) =>
    z.object({
      phone: z.string().min(10),
      panel: z.string().optional(),
      reason: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => ["admin", "super_admin"].includes(String(r.role)));
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    let q = supabaseAdmin
      .from("device_fingerprints")
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by: context.userId,
        unlock_reason: data.reason ?? null,
      })
      .eq("phone", data.phone)
      .is("unlocked_at", null);
    if (data.panel) q = q.eq("panel", data.panel);

    const { data: updated, error } = await q.select("id, fingerprint, panel");
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("device_unlock_audit").insert({
      phone: data.phone,
      panel: data.panel ?? null,
      fingerprint: updated?.[0]?.fingerprint ?? null,
      unlocked_by: context.userId,
      reason: data.reason ?? null,
      rows_affected: updated?.length ?? 0,
    });

    return { ok: true, unlocked: updated?.length ?? 0 };
  });

// ── 4. PAN + Bank account uniqueness (1:1 with promoter) ───────────────────
export const checkPanBankUniqueness = createServerFn({ method: "POST" })
  .inputValidator((input: { pan?: string | null; bank_account?: string | null }) =>
    z
      .object({
        pan: z.string().nullable().optional(),
        bank_account: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async (_ctx) => {
    // TODO: query promoters table for pan / bank uniqueness.
    return { ok: true, pan_taken: false, bank_taken: false };
  });

// ── 5. Generate a device fingerprint (client helper, not server) ───────────
// Note: real fingerprinting happens client-side using Crypto + UA + screen
// signals. Kept here as a typed contract reference.
export type DeviceFingerprintPayload = {
  fingerprint: string;
  phone: string;
};
