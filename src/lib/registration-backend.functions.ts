import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
export const registerDeviceFingerprint = createServerFn({ method: "POST" })
  .inputValidator((input: { fingerprint: string; phone: string }) =>
    z
      .object({ fingerprint: z.string().min(8), phone: z.string().min(10) })
      .parse(input),
  )
  .handler(async (_ctx) => {
    // TODO: upsert device_fingerprints { fingerprint UNIQUE, phone }.
    // Reject if fingerprint already mapped to a different active phone.
    return { ok: true, conflict: false };
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
