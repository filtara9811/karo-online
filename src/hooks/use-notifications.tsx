import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { playPing } from "@/lib/lead-sound";

/**
 * Unified unread counters across the app for the signed-in user.
 * Buckets:
 *   - messages: unread lead_messages where I'm recipient
 *   - orders:   unread vendor_status_updates for leads where I'm the customer
 *   - support:  unread admin_notifications for me
 *   - referral: admin_notifications for me whose title/body mentions "referral"
 */
export type NotifBucket = "messages" | "orders" | "referral" | "support";

export type UnreadCounts = Record<NotifBucket, number> & { total: number };

export type NotifItem = {
  id: string;
  bucket: NotifBucket;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Where to navigate when tapped (TanStack path). */
  href?: string;
  /** Optional avatar/icon URL */
  iconUrl?: string | null;
};

export function useNotifications() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, orders: 0, referral: 0, support: 0, total: 0 });
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]); setCounts({ messages: 0, orders: 0, referral: 0, support: 0, total: 0 });
      setLoading(false); return;
    }
    const [msgsRes, adminRes, statusRes] = await Promise.all([
      supabase
        .from("lead_messages")
        .select("id, lead_id, sender_id, sender_role, body, image_url, read_at, created_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("admin_notifications")
        .select("id, title, message, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("vendor_status_updates")
        .select("id, lead_id, status_key, message, vendor_id, created_at, customer_read_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const msgs = (msgsRes.data ?? []) as Array<{ id: string; lead_id: string; sender_role: string; body: string | null; image_url: string | null; read_at: string | null; created_at: string }>;
    const admin = (adminRes.data ?? []) as Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string }>;
    const statuses = (statusRes.data ?? []) as Array<{ id: string; lead_id: string; status_key: string; message: string | null; vendor_id: string; created_at: string; customer_read_at: string | null }>;

    // Filter status updates: only ones for leads where I am the customer
    let myLeadIds: string[] = [];
    if (statuses.length) {
      const leadIds = Array.from(new Set(statuses.map((s) => s.lead_id)));
      const { data: myLeads } = await supabase
        .from("leads").select("id").eq("customer_id", user.id).in("id", leadIds);
      myLeadIds = (myLeads ?? []).map((l: any) => l.id as string);
    }
    const myStatuses = statuses.filter((s) => myLeadIds.includes(s.lead_id));

    const messageItems: NotifItem[] = msgs.map((m) => ({
      id: `msg:${m.id}`,
      bucket: "messages",
      title: m.sender_role === "vendor" ? "Vendor reply" : "Customer message",
      body: m.body || (m.image_url ? "📎 Photo" : "New message"),
      createdAt: m.created_at,
      read: !!m.read_at,
      href: `/chat?leadId=${m.lead_id}`,
    }));

    const isReferralText = (t: string) => /refer|referral|reward|₹|bonus|invite/i.test(t);
    const adminItems: NotifItem[] = admin.map((a) => ({
      id: `adm:${a.id}`,
      bucket: isReferralText(`${a.title} ${a.message}`) ? "referral" : "support",
      title: a.title,
      body: a.message,
      createdAt: a.created_at,
      read: a.is_read,
      href: isReferralText(`${a.title} ${a.message}`) ? "/referral" : "/profile",
    }));

    const labels: Record<string, string> = {
      on_the_way: "🚗 Vendor is on the way",
      arrived: "📍 Vendor has arrived",
      working: "🛠️ Vendor started the work",
      completed: "✅ Order completed",
    };
    const statusItems: NotifItem[] = myStatuses.map((s) => ({
      id: `sts:${s.id}`,
      bucket: "orders",
      title: labels[s.status_key] ?? "Vendor update",
      body: s.message || "Tap to view order details",
      createdAt: s.created_at,
      read: !!s.customer_read_at,
      href: `/status?leadId=${s.lead_id}`,
    }));

    const all = [...messageItems, ...statusItems, ...adminItems]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const c: UnreadCounts = { messages: 0, orders: 0, referral: 0, support: 0, total: 0 };
    all.forEach((it) => { if (!it.read) { c[it.bucket] += 1; c.total += 1; } });

    setItems(all);
    setCounts(c);
    setLoading(false);

    // Play ping + Paytm/PhonePe-style toast for genuinely new unread arrivals
    if (firstLoadDone.current) {
      const fresh = all.filter((it) => !it.read && !seenIds.current.has(it.id));
      if (fresh.length) {
        const first = fresh[0];
        playPing(first.bucket === "messages" ? "message" : first.bucket === "orders" ? "order" : "default");
        const emoji = first.bucket === "messages" ? "💬" : first.bucket === "orders" ? "📦" : first.bucket === "referral" ? "🎁" : "🔔";
        toast(`${emoji} ${first.title}`, {
          description: first.body,
          duration: 9000,
          position: "top-center",
          dismissible: true,
          action: first.href ? { label: "Open", onClick: () => { window.location.href = first.href!; } } : undefined,
        });
      }
    }
    all.forEach((it) => seenIds.current.add(it.id));
    firstLoadDone.current = true;
  }, [user]);

  // Keep a stable ref to refresh so the channel effect only re-runs on user change.
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    refresh();
    if (!user) return;
    // Unique channel name per mount to avoid "cannot add postgres_changes after subscribe()"
    // when the same channel name is reused across StrictMode double-mounts.
    const channelName = `notif-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "lead_messages", filter: `recipient_id=eq.${user.id}` }, () => refreshRef.current());
    ch.on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications", filter: `user_id=eq.${user.id}` }, () => refreshRef.current());
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_status_updates" }, () => refreshRef.current());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const statusIds = items
      .filter((it) => it.id.startsWith("sts:") && !it.read)
      .map((it) => it.id.slice(4));
    await Promise.all([
      supabase.from("lead_messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null),
      supabase.from("admin_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_read", false),
      statusIds.length
        ? supabase.from("vendor_status_updates").update({ customer_read_at: new Date().toISOString() }).in("id", statusIds)
        : Promise.resolve(),
    ]);
    refresh();
  }, [user, items, refresh]);

  const markRead = useCallback(async (item: NotifItem) => {
    if (!user) return;
    if (item.id.startsWith("msg:")) {
      await supabase.from("lead_messages").update({ read_at: new Date().toISOString() }).eq("id", item.id.slice(4));
    } else if (item.id.startsWith("adm:")) {
      await supabase.from("admin_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", item.id.slice(4));
    } else if (item.id.startsWith("sts:")) {
      await supabase.from("vendor_status_updates").update({ customer_read_at: new Date().toISOString() }).eq("id", item.id.slice(4));
    }
    refresh();
  }, [user, refresh]);

  return { counts, items, loading, refresh, markAllRead, markRead };
}

/** Lightweight counter-only hook for places that only want unread numbers. */
export function useUnreadCounts() {
  const { counts, loading } = useNotifications();
  return { counts, loading };
}
