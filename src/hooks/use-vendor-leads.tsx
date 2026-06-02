import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { requestNotificationPermission, showBrowserNotification } from "@/lib/lead-sound";

export type IncomingLead = {
  notificationId: string;
  leadId: string;
  subCategoryName: string;
  subCategoryImage?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerPhoneMasked?: string | null;
  customerAvatarUrl?: string | null;
  distanceKm?: number | null;
  itemNames: string[];
  note?: string | null;
  images: string[];
  address?: string | null;
  createdAt: string;
  notificationStatus?: string | null;
  /** ISO timestamp; alert auto-expires 15 s after this. */
  expiresAt: string;
};

type State = {
  alerts: IncomingLead[];
  dismiss: (notificationId: string) => void;
  acceptLead: (leadId: string) => Promise<{ ok: boolean; reason?: string }>;
  rejectLead: (leadId: string) => Promise<void>;
};

/** Hook used in vendor dashboard / shell to receive realtime lead notifications. */
export function useVendorLeadAlerts(): State {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<IncomingLead[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    requestNotificationPermission();

    let cancelled = false;

    const handleNotification = async (notifId: string, leadId: string, notificationCreatedAt?: string | null, notificationStatus?: string | null) => {
      if (seen.current.has(notifId)) return;
      seen.current.add(notifId);
      const fallbackCreatedAt = notificationCreatedAt ?? new Date().toISOString();
      const fallbackIncoming: IncomingLead = {
        notificationId: notifId,
        leadId,
        subCategoryName: "Service",
        itemNames: [],
        images: [],
        createdAt: fallbackCreatedAt,
        notificationStatus,
        expiresAt: new Date(Date.now() + 15_000).toISOString(),
      };
      setAlerts((p) => [fallbackIncoming, ...p].slice(0, 8));

      // Try direct read first (works for admins & accepted vendors).
      // For pending vendors, RLS now blocks the row — fall back to the
      // sanitized SECURITY DEFINER RPC which returns a safe summary only.
      const { data: directLead } = await supabase
        .from("leads")
        .select("id, sub_category_id, sub_category_name, customer_id, customer_name, customer_phone, item_names, note, images, address, lat, lng, created_at, status")
        .eq("id", leadId)
        .maybeSingle();

      let leadInfo: any = directLead;
      let isAccepted = !!directLead;
      if (!directLead) {
        const { data: brief } = await supabase.rpc("get_pending_lead_brief", { p_lead_id: leadId });
        const b = Array.isArray(brief) ? brief[0] : brief;
        if (!b) return;
        leadInfo = {
          id: b.id,
          sub_category_id: b.sub_category_id,
          sub_category_name: b.sub_category_name,
          customer_id: null,
          customer_name: b.customer_name_initial,
          customer_phone: null,
          item_names: b.item_names ?? [],
          note: b.note,
          images: b.images ?? [],
          address: b.area_hint,
          lat: null,
          lng: null,
          created_at: b.created_at,
          status: b.status,
        };
      }

      if (cancelled || !leadInfo) return;
      let subImage: string | null = null;
      if (leadInfo.sub_category_id) {
        const { data: cat } = await supabase
          .from("categories").select("image_url, icon").eq("id", leadInfo.sub_category_id).maybeSingle();
        subImage = (cat as any)?.image_url ?? null;
      }
      let avatarUrl: string | null = null;
      if (leadInfo.customer_id) {
        const { data: cust } = await supabase
          .from("customers").select("avatar_url").eq("user_id", leadInfo.customer_id).maybeSingle();
        avatarUrl = (cust as any)?.avatar_url ?? null;
      }
      let distanceKm: number | null = null;
      if (isAccepted && leadInfo.lat != null && leadInfo.lng != null) {
        const { data: vendorRow } = await supabase
          .from("vendors").select("lat, lng").eq("user_id", user.id).maybeSingle();
        const vLat = (vendorRow as any)?.lat, vLng = (vendorRow as any)?.lng;
        if (vLat != null && vLng != null) {
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(leadInfo.lat - vLat), dLng = toRad(leadInfo.lng - vLng);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(vLat))*Math.cos(toRad(leadInfo.lat))*Math.sin(dLng/2)**2;
          distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
        }
      }
      const phone = leadInfo.customer_phone as string | null;
      const phoneDigits = phone ? phone.replace(/\D/g, "") : "";
      const masked = phoneDigits.length >= 4 ? `•••• ${phoneDigits.slice(-4)}` : null;
      const createdAt = (notificationCreatedAt ?? leadInfo.created_at) as string;
      const incoming: IncomingLead = {
        notificationId: notifId,
        leadId: leadInfo.id as string,
        subCategoryName: leadInfo.sub_category_name as string,
        subCategoryImage: subImage,
        customerName: leadInfo.customer_name,
        customerPhone: phone,
        customerPhoneMasked: masked,
        customerAvatarUrl: avatarUrl,
        distanceKm,
        itemNames: (leadInfo.item_names ?? []) as string[],
        note: leadInfo.note,
        images: (leadInfo.images ?? []) as string[],
        address: leadInfo.address,
        createdAt,
        notificationStatus,
        expiresAt: new Date(new Date(createdAt).getTime() + 15_000).toISOString(),
      };
      setAlerts((p) => p.map((a) => (a.notificationId === notifId ? incoming : a)).slice(0, 8));
      showBrowserNotification(
        `🔔 New ${incoming.subCategoryName} lead!`,
        incoming.customerName ? `${incoming.customerName} needs ${incoming.subCategoryName}` : `Tap to view & accept`,
        { icon: avatarUrl ?? subImage ?? undefined, image: subImage ?? undefined },
      );
    };

    // Backfill recent pending notifications (last 2 min only, excluding
    // ones the vendor already saw / dismissed on this device).
    (async () => {
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      let seenLocal = new Set<string>();
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(`ko-seen-leads-${user.id}`) : null;
        if (raw) seenLocal = new Set(JSON.parse(raw));
      } catch { /* ignore */ }
      const { data } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, created_at")
        .eq("vendor_id", user.id)
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      for (const n of data ?? []) {
        if (seenLocal.has((n as any).id)) continue;
        await handleNotification((n as any).id, (n as any).lead_id, (n as any).created_at, (n as any).status);
      }
    })();

    const channel = supabase
      .channel(`lead-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          handleNotification(row.id, row.lead_id, row.created_at, row.status);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const persistSeen = (notifId: string) => {
    if (!user || typeof window === "undefined") return;
    try {
      const key = `ko-seen-leads-${user.id}`;
      const raw = window.localStorage.getItem(key);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(notifId)) {
        arr.push(notifId);
        // keep last 200
        window.localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
      }
    } catch { /* ignore */ }
  };

  const dismiss = (id: string) => {
    persistSeen(id);
    setAlerts((p) => p.filter((a) => a.notificationId !== id));
  };

  const acceptLead = async (leadId: string) => {
    const { data, error } = await supabase.rpc("accept_lead", { _lead_id: leadId });
    setAlerts((p) => {
      p.filter((a) => a.leadId === leadId).forEach((a) => persistSeen(a.notificationId));
      return p.filter((a) => a.leadId !== leadId);
    });
    if (error) return { ok: false, reason: error.message };
    const res = data as any;
    return { ok: !!res?.ok, reason: res?.reason };
  };

  const rejectLead = async (leadId: string) => {
    await supabase.rpc("reject_lead", { _lead_id: leadId });
    setAlerts((p) => {
      p.filter((a) => a.leadId === leadId).forEach((a) => persistSeen(a.notificationId));
      return p.filter((a) => a.leadId !== leadId);
    });
  };

  return { alerts, dismiss, acceptLead, rejectLead };
}
