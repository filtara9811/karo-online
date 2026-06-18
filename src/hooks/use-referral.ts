import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const REFERRAL_PENDING_KEY = "ko-pending-referral-code";

export type ReferralCheckpoint =
  | "registered"
  | "otp_verified"
  | "kyc_completed"
  | "became_seller"
  | "first_order_placed"
  | "payment_completed";

export type ReferralProgress = {
  installed: boolean;
  registered: boolean;
  otp_verified: boolean;
  kyc_completed: boolean;
  became_seller: boolean;
  first_order_placed: boolean;
  payment_completed: boolean;
  reward_released: boolean;
};

export type DownlineMember = {
  name: string | null;
  phone: string | null;
  status: string;
};

export type ReferralRow = {
  id: string;
  status: "pending" | "locked" | "approved" | "rejected";
  created_at: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  progress: ReferralProgress;
  downline_count: number;
  downline_earnings: number;
  downline: DownlineMember[];
};

export type ReferralWallet = {
  total: number;
  personal: number;
  team: number;
  today: number;
  this_month: number;
};

export type ReferralRoyaltyTier = {
  min_recruits: number;
  bonus_pct: number;
};

export type ReferralBannerSettings = {
  is_active: boolean;
  base_reward_amount: number;
  activation_fee: number;
  influencer_activation_fee: number;
  play_store_url: string;
  banner_image_url: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  offer_active: boolean;
  offer_ends_at: string | null;
  offer_label: string | null;
  royalty_tiers: ReferralRoyaltyTier[];
  direct_recruits: number;
};

export type ReferralActivation = {
  is_activated: boolean;
  partner_kind: "vendor" | "influencer" | null;
};

export type ReferralOverview = {
  code: string;
  kind: "customer" | "vendor";
  wallet: ReferralWallet;
  settings: ReferralBannerSettings;
  activation: ReferralActivation;
  stats: {
    total_invited: number;
    successful: number;
    pending: number;
    earnings_total: number;
    earnings_pending: number;
  };
  referrals: ReferralRow[];
};

function deviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset().toString(),
  ];
  let hash = 0;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return `fp_${Math.abs(hash).toString(36)}`;
}

export async function applyPendingReferralCode(): Promise<void> {
  if (typeof window === "undefined") return;
  const code = window.localStorage.getItem(REFERRAL_PENDING_KEY);
  if (!code) return;
  try {
    await supabase.rpc("apply_referral_code", {
      _code: code,
      _device: deviceFingerprint(),
      _ip: undefined,
      _kind: "customer",
    });
  } finally {
    window.localStorage.removeItem(REFERRAL_PENDING_KEY);
  }
}

export async function markCheckpoint(referredUserId: string, checkpoint: ReferralCheckpoint) {
  try {
    await supabase.rpc("mark_referral_checkpoint", {
      _referred_user_id: referredUserId,
      _checkpoint: checkpoint,
    });
  } catch { /* ignore */ }
}

/** Generate / fetch the user's 4+4 referral code (e.g. ASHU9876). */
export async function ensureMyCode44(firstName: string | null | undefined, phone: string | null | undefined, kind: "customer" | "vendor" = "customer") {
  const { data } = await supabase.rpc("ensure_my_referral_code_v2", {
    _first_name: firstName ?? "",
    _phone: phone ?? "",
    _kind: kind,
  });
  return data as { code?: string } | null;
}

export function useReferralOverview() {
  const [data, setData] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: res } = await supabase.rpc("get_my_referral_overview");
    setData((res as ReferralOverview) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}
