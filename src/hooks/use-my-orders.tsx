// Real customer orders, grouped by vendor, in VendorGroup shape.
// Replaces the seed/mock data in orders-store for the My Orders list.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  VendorGroup, OrderItem, OrderSource, OrderStatus,
} from "@/lib/orders-store";

function mapLeadStatus(s: string): OrderStatus {
  switch (s) {
    case "new":
    case "searching_complete":
    case "no_vendor_available":
      return "placed";
    case "accepted":
    case "fulfilled":
      return "accepted";
    case "processing": return "processing";
    case "packed":     return "packed";
    case "shipped":    return "shipped";
    case "delivered":  return "delivered";
    case "cancelled":  return "cancelled";
    default:           return "placed";
  }
}

function mapSource(src: string): OrderSource {
  if (src === "service" || src === "shop" || src === "lead" || src === "quick") return src;
  return "lead";
}

function fmtAt(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

const PENDING_VENDOR_ID = "__pending__";

export function useMyOrders(): { groups: VendorGroup[]; loading: boolean; refresh: () => void; markOrderRead: (leadId: string) => Promise<void> } {
  const [groups, setGroups] = useState<VendorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setGroups([]); setLoading(false); return; }

    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, sub_category_name, sub_category_id, item_ids, images, status, source, accepted_vendor_id, accepted_vendor_ids, created_at, updated_at, accepted_at, note")
      .eq("customer_id", uid)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error || !leads) { setGroups([]); setLoading(false); return; }

    const vendorIds = Array.from(new Set(
      leads.flatMap((l) => [l.accepted_vendor_id, ...(l.accepted_vendor_ids ?? [])]).filter(Boolean) as string[]
    ));

    const vendorMap = new Map<string, { name: string; avatar: string }>();
    if (vendorIds.length) {
      const { data: vs } = await supabase
        .from("vendors")
        .select("user_id, business_name, owner_name, avatar_url, profile_photo_url, cover_image_url")
        .in("user_id", vendorIds);
      vs?.forEach((v) => {
        vendorMap.set(v.user_id as string, {
          name: (v.business_name || v.owner_name || "Vendor") as string,
          avatar: ((v as any).profile_photo_url || v.avatar_url || "") as string,
        });
      });
    }

    // Resolve catalog image per lead (first lead.item_ids -> catalog_items.image_url,
    // fallback to sub_category_id, fallback to lead.images[0]).
    const allItemIds = Array.from(new Set(leads.flatMap((l) => (l.item_ids ?? []) as string[]).concat(
      leads.map((l) => l.sub_category_id as string).filter(Boolean) as string[],
    )));
    const itemImageMap = new Map<string, string>();
    if (allItemIds.length) {
      const { data: items } = await supabase
        .from("catalog_items")
        .select("id, image_url")
        .in("id", allItemIds);
      items?.forEach((it: any) => { if (it.image_url) itemImageMap.set(it.id as string, it.image_url as string); });
    }


    // last message/status + unread per lead
    const leadIds = leads.map((l) => l.id);
    const lastMsgByLead = new Map<string, { body: string; at: string }>();
    const unreadByLead = new Map<string, number>();
    if (leadIds.length) {
      const [{ data: msgs }, { data: statuses }] = await Promise.all([
        supabase
          .from("lead_messages")
          .select("lead_id, body, image_url, created_at, recipient_id, read_at, sender_id")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("vendor_status_updates")
          .select("lead_id, status_key, message, created_at, customer_read_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);
      msgs?.forEach((m) => {
        if (!lastMsgByLead.has(m.lead_id as string)) {
          lastMsgByLead.set(m.lead_id as string, {
            body: (m.body || (m.image_url ? "📷 Image" : "")) as string,
            at: m.created_at as string,
          });
        }
        if (m.recipient_id === uid && !m.read_at) {
          unreadByLead.set(m.lead_id as string, (unreadByLead.get(m.lead_id as string) ?? 0) + 1);
        }
      });
      const statusLabel: Record<string, string> = {
        on_the_way: "🚗 Vendor is on the way",
        arrived: "📍 Vendor has arrived",
        working: "🛠️ Vendor started the work",
        completed: "✅ Order completed",
      };
      statuses?.forEach((s) => {
        const leadId = s.lead_id as string;
        const text = (s.message as string | null) || statusLabel[s.status_key as string] || "Vendor update";
        const prev = lastMsgByLead.get(leadId);
        if (!prev || new Date(s.created_at as string).getTime() > new Date(prev.at).getTime()) {
          lastMsgByLead.set(leadId, { body: text, at: s.created_at as string });
        }
        if (!s.customer_read_at) {
          unreadByLead.set(leadId, (unreadByLead.get(leadId) ?? 0) + 1);
        }
      });
    }

    // Group by accepted vendor; if multiple vendors accepted, show the first accepted vendor.
    // Leads with no accepted vendor stay in the pending bucket.
    const grouped = new Map<string, VendorGroup>();
    for (const l of leads) {
      const acceptedIds = ((l.accepted_vendor_ids ?? []) as string[]).filter(Boolean);
      const vid = ((l.accepted_vendor_id as string | null) ?? acceptedIds[0]) ?? PENDING_VENDOR_ID;
      const v = vendorMap.get(vid);
      if (!grouped.has(vid)) {
        grouped.set(vid, {
          vendorId: vid,
          vendorName: vid === PENDING_VENDOR_ID ? "Vendor dhoondh rahe hain…" : (v?.name ?? "Vendor"),
          avatar: v?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(v?.name ?? "V")}`,
          presence: "Offline",
          orders: [],
        });
      }
      const lm = lastMsgByLead.get(l.id as string);
      const firstItemId = ((l.item_ids ?? []) as string[])[0];
      const productImage =
        (firstItemId && itemImageMap.get(firstItemId)) ||
        (l.sub_category_id && itemImageMap.get(l.sub_category_id as string)) ||
        ((l.images ?? []) as string[])[0] ||
        null;
      const idStr = l.id as string;
      const order: OrderItem = {
        id: idStr,
        vendorId: vid,
        service: (l.sub_category_name as string) || "Service",
        source: mapSource(l.source as string),
        status: mapLeadStatus(l.status as string),
        history: [{ status: "placed", at: fmtAt(l.created_at as string) }],
        lastMsg: lm?.body || (l.note as string) || "Tap to chat",
        lastAt: fmtAt((lm?.at as string) || (l.updated_at as string)),
        unread: unreadByLead.get(idStr) ?? 0,
        productImage,
        shortCode: idStr.slice(-6).toUpperCase(),
      };
      grouped.get(vid)!.orders.push(order);
    }

    setGroups(Array.from(grouped.values()));
    setLoading(false);
  }, []);

  const markOrderRead = useCallback(async (leadId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("lead_messages").update({ read_at: now }).eq("lead_id", leadId).eq("recipient_id", uid).is("read_at", null),
      supabase.from("vendor_status_updates").update({ customer_read_at: now }).eq("lead_id", leadId).is("customer_read_at", null),
    ]);
    await load();
  }, [load]);

  useEffect(() => {
    load();
    let alive = true;
    let chRef: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || !alive) return;
      const ch = supabase
        .channel(`my-orders-${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => { if (alive) load(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "lead_messages" }, () => { if (alive) load(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "vendor_status_updates" }, () => { if (alive) load(); })
        .subscribe();
      chRef = ch;
    })();
    return () => { alive = false; if (chRef) supabase.removeChannel(chRef); };
  }, [load]);

  return { groups, loading, refresh: load, markOrderRead };
}
