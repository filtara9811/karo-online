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
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      };
      setAlerts((p) => [fallbackIncoming, ...p].slice(0, 8));
      playLeadAlert();
      const { data: lead } = await supabase
        .from("leads")
        .select("id, sub_category_id, sub_category_name, customer_name, customer_phone, item_names, note, images, address, created_at, status")
        .eq("id", leadId)
        .maybeSingle();
      if (cancelled || !lead) return;
      // Allow 'new' or 'accepted' (auto-accept may flip status before alert renders)
      let subImage: string | null = null;
      if ((lead as any).sub_category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("image_url, icon")
          .eq("id", (lead as any).sub_category_id)
          .maybeSingle();
        subImage = (cat as any)?.image_url ?? null;
      }
      const createdAt = (lead as any).created_at as string;
      const incoming: IncomingLead = {
        notificationId: notifId,
        leadId: lead.id as string,
        subCategoryName: lead.sub_category_name as string,
        subCategoryImage: subImage,
        customerName: (lead as any).customer_name,
        customerPhone: (lead as any).customer_phone,
        itemNames: ((lead as any).item_names ?? []) as string[],
        note: (lead as any).note,
        images: ((lead as any).images ?? []) as string[],
        address: (lead as any).address,
        createdAt,
        expiresAt: new Date(new Date(createdAt).getTime() + 90_000).toISOString(),
      };
      setAlerts((p) => p.map((a) => (a.notificationId === notifId ? incoming : a)).slice(0, 8));
      showBrowserNotification(
        `🔔 New ${incoming.subCategoryName} lead!`,
        incoming.customerName ? `${incoming.customerName} needs ${incoming.subCategoryName}` : `Tap to view & accept`,
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
