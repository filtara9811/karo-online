import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { playLeadAlert, requestNotificationPermission, showBrowserNotification } from "@/lib/lead-sound";

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

    const handleNotification = async (notifId: string, leadId: string) => {
      if (seen.current.has(notifId)) return;
      seen.current.add(notifId);
      const fallbackCreatedAt = new Date().toISOString();
      const fallbackIncoming: IncomingLead = {
        notificationId: notifId,
        leadId,
        subCategoryName: "Service",
        itemNames: [],
        images: [],
        createdAt: fallbackCreatedAt,
        expiresAt: new Date(Date.now() + 15_000).toISOString(),
      };
      setAlerts((p) => [fallbackIncoming, ...p].slice(0, 8));
      playLeadAlert();
      const { data: lead } = await supabase
        .from("leads")
        .select("id, sub_category_id, sub_category_name, customer_id, customer_name, customer_phone, item_names, note, images, address, lat, lng, created_at, status")
        .eq("id", leadId)
        .maybeSingle();
      if (cancelled || !lead) return;
      let subImage: string | null = null;
      if ((lead as any).sub_category_id) {
        const { data: cat } = await supabase
          .from("categories").select("image_url, icon").eq("id", (lead as any).sub_category_id).maybeSingle();
        subImage = (cat as any)?.image_url ?? null;
      }
      let avatarUrl: string | null = null;
      if ((lead as any).customer_id) {
        const { data: cust } = await supabase
          .from("customers").select("avatar_url").eq("user_id", (lead as any).customer_id).maybeSingle();
        avatarUrl = (cust as any)?.avatar_url ?? null;
      }
      let distanceKm: number | null = null;
      const { data: vendorRow } = await supabase
        .from("vendors").select("lat, lng").eq("user_id", user.id).maybeSingle();
      const vLat = (vendorRow as any)?.lat, vLng = (vendorRow as any)?.lng;
      const lLat = (lead as any).lat, lLng = (lead as any).lng;
      if (vLat != null && vLng != null && lLat != null && lLng != null) {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lLat - vLat), dLng = toRad(lLng - vLng);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(vLat))*Math.cos(toRad(lLat))*Math.sin(dLng/2)**2;
        distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
      }
      const phone = (lead as any).customer_phone as string | null;
      const phoneDigits = phone ? phone.replace(/\D/g, "") : "";
      const masked = phoneDigits.length >= 4 ? `•••• ${phoneDigits.slice(-4)}` : null;
      const createdAt = (lead as any).created_at as string;
      const incoming: IncomingLead = {
        notificationId: notifId,
        leadId: lead.id as string,
        subCategoryName: lead.sub_category_name as string,
        subCategoryImage: subImage,
        customerName: (lead as any).customer_name,
        customerPhone: phone,
        customerPhoneMasked: masked,
        customerAvatarUrl: avatarUrl,
        distanceKm,
        itemNames: ((lead as any).item_names ?? []) as string[],
        note: (lead as any).note,
        images: ((lead as any).images ?? []) as string[],
        address: (lead as any).address,
        createdAt,
        expiresAt: new Date(new Date(createdAt).getTime() + 15_000).toISOString(),
      };
      setAlerts((p) => p.map((a) => (a.notificationId === notifId ? incoming : a)).slice(0, 8));
      showBrowserNotification(
        `🔔 New ${incoming.subCategoryName} lead!`,
        incoming.customerName ? `${incoming.customerName} needs ${incoming.subCategoryName}` : `Tap to view & accept`,
        { icon: avatarUrl ?? subImage ?? undefined, image: subImage ?? undefined },
      );
    };

    // Backfill recent pending notifications (last 10 min)
    (async () => {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, created_at")
        .eq("vendor_id", user.id)
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      for (const n of data ?? []) {
        await handleNotification((n as any).id, (n as any).lead_id);
      }
    })();

    const channel = supabase
      .channel(`lead-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          handleNotification(row.id, row.lead_id);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = (id: string) => setAlerts((p) => p.filter((a) => a.notificationId !== id));

  const acceptLead = async (leadId: string) => {
    const { data, error } = await supabase.rpc("accept_lead", { _lead_id: leadId });
    setAlerts((p) => p.filter((a) => a.leadId !== leadId));
    if (error) return { ok: false, reason: error.message };
    const res = data as any;
    return { ok: !!res?.ok, reason: res?.reason };
  };

  const rejectLead = async (leadId: string) => {
    await supabase.rpc("reject_lead", { _lead_id: leadId });
    setAlerts((p) => p.filter((a) => a.leadId !== leadId));
  };

  return { alerts, dismiss, acceptLead, rejectLead };
}
