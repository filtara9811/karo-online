import { supabase } from "@/integrations/supabase/client";
import { getVisitFp } from "@/lib/visit-fp";

export type QrEvent =
  | "QR_SCAN"
  | "STORE_VIEW"
  | "PRODUCT_VIEW"
  | "PRODUCT_ENQUIRY"
  | "WHATSAPP_CLICK"
  | "CALL_CLICK"
  | "ORDER_CREATED"
  | "PAYMENT_COMPLETED"
  | "REVIEW_SUBMITTED"
  | "CAMPAIGN_CLICK"
  | "AD_CLICK"
  | "PWA_INSTALL"
  | "CHAT";

/**
 * Fire-and-forget customer journey event for a merchant QR / landing page.
 * Safe to call from anywhere in the browser; never throws.
 */
export async function trackQrEvent(
  event: QrEvent,
  opts: {
    code?: string | null;
    project?: string | null;
    ref?: string | null;
    amount?: number | null;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await supabase.rpc("track_qr_event" as never, {
      _event: event,
      _code: opts.code ?? null,
      _project: opts.project ?? null,
      _fp_hash: getVisitFp(),
      _ref: opts.ref ?? null,
      _amount: opts.amount ?? null,
      _meta: opts.meta ?? {},
      _user_agent: navigator.userAgent,
    } as never);
  } catch {
    /* analytics must never break the page */
  }
}

export type KnownVisitor = { identityId: string; name: string | null; mobile: string | null };

/** Recognise a returning visitor on this device so the capture form can be skipped. */
export async function recognizeVisitor(): Promise<KnownVisitor | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data } = await supabase.rpc("remember_customer_device" as never, {
      _fp_hash: getVisitFp(),
    } as never);
    const res = data as { found?: boolean; identity_id?: string; name?: string | null; mobile?: string | null } | null;
    if (!res?.found || !res.identity_id) return null;
    return { identityId: res.identity_id, name: res.name ?? null, mobile: res.mobile ?? null };
  } catch {
    return null;
  }
}
