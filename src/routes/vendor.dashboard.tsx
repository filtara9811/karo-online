import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { VendorSideMenu } from "@/components/VendorSideMenu";
import {
  Download,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MessageCircle,
  Phone,
  Store,
  Zap,
  ChevronRight,
  Bell,
  Plus,
  Sparkles,
  ArrowLeft,
  
  Loader2,
  Handshake,
  Search,
  User,
  Radar,
  ShoppingBag,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import type { Lead, LeadSource, LeadStatus } from "@/lib/leads";
import { VendorNotificationBell } from "@/components/VendorNotificationBell";
import { ActionAlertBanner } from "@/components/ActionAlertBanner";
import { VendorAuthGate } from "@/components/VendorAuthGate";

import { CoinRateTicker } from "@/components/CoinRateTicker";
import {
  VendorPendingLeadsSheet,
  usePendingLeadsCount,
} from "@/components/VendorPendingLeadsSheet";
import { VendorLeadDetailSheet } from "@/components/VendorLeadDetailSheet";
import { VendorQuickActionsSheet } from "@/components/VendorQuickActionsSheet";
import { AcceptedLeadFloatingButton } from "@/components/AcceptedLeadFloatingButton";
import { QuickServiceMap, type QuickMapVendor } from "@/components/QuickServiceMap";
import { useLeadUnreadCounts } from "@/hooks/use-lead-unread";
import { useLeadSteps } from "@/hooks/use-lead-steps";
import { useGeolocation } from "@/hooks/use-geolocation";
import { updateVendorQuickControl } from "@/lib/vendor-dashboard.functions";
import { getNearbyCustomers } from "@/lib/nearby-customers.functions";

export const Route = createFileRoute("/vendor/dashboard")({
  head: () => ({
    meta: [
      { title: "Vendor Dashboard — Karo Online" },
      { name: "description", content: "Manage your leads, products and digital shop." },
    ],
  }),
  component: () => (
    <VendorAuthGate>
      <VendorDashboard />
    </VendorAuthGate>
  ),
});

type Potential = { id: string; title: string; earn: number; customers: number; chance: string };

type NeedCategory = {
  id: string;
  name: string;
  image_url: string | null;
  lead_price_inr: number | null;
  enabled: number;
};

type CustomerLookup = {
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
};

const QUICK_CONTROL_TIMEOUT_MS = 12000;

async function withQuickControlTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} request timed out`)),
      QUICK_CONTROL_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function distanceKm(
  a?: { lat?: number | null; lng?: number | null } | null,
  b?: { lat?: number | null; lng?: number | null } | null,
) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function VendorDashboard() {
  const { user, profile } = useAuth();
  const geo = useGeolocation();
  const updateQuickControl = useServerFn(updateVendorQuickControl);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "potential">("my");
  const [activePanel, setActivePanel] = useState<0 | 1 | 2>(0);
  const [statRange, setStatRange] = useState<"day" | "week" | "month" | "year">("day");
  const panelScrollRef = useRef<HTMLDivElement | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadsSheetOpen, setLeadsSheetOpen] = useState(false);
  const [leadsSheetFilter, setLeadsSheetFilter] = useState<
    "all" | "pending" | "in_process" | "success" | "rejected"
  >("all");
  const openLeadsSheet = (f: "all" | "pending" | "in_process" | "success" | "rejected" = "all") => {
    setLeadsSheetFilter(f);
    setLeadsSheetOpen(true);
  };
  const [actionsOpen, setActionsOpen] = useState(false);
  const [profileFinderOpen, setProfileFinderOpen] = useState(false);
  const [needCategories, setNeedCategories] = useState<NeedCategory[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [findingNeedId, setFindingNeedId] = useState<string | null>(null);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const pendingCount = usePendingLeadsCount();
  const [vendor, setVendor] = useState<{
    business_name?: string | null;
    owner_name?: string | null;
    avatar_url?: string | null;
    status?: string | null;
    verified?: boolean | null;
    auto_accept_leads?: boolean | null;
    is_online?: boolean | null;
    lat?: number | null;
    lng?: number | null;
    live_lat?: number | null;
    live_lng?: number | null;
    operation_mode?: string | null;
    service_radius_km?: number | null;
  } | null>(null);

  const [savingAuto, setSavingAuto] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingRadius, setSavingRadius] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fields =
      "business_name, owner_name, avatar_url, status, verified, auto_accept_leads, is_online, lat, lng, live_lat, live_lng, operation_mode, service_radius_km";
    const loadVendor = async () => {
      const readOwnVendor = () =>
        supabase.from("vendors").select(fields).eq("user_id", user.id).maybeSingle();
      let { data } = await readOwnVendor();

      if (!data) {
        const metaPhone = String(
          (user.user_metadata as any)?.phone ?? (user.user_metadata as any)?.phone_number ?? "",
        );
        const phoneDigits = String(user.phone || profile?.phone || metaPhone).replace(/\D/g, "");
        if (phoneDigits.length >= 10) {
          await supabase.rpc("vendor_claim_by_phone", { _phone: phoneDigits });
          ({ data } = await readOwnVendor());
        }
      }

      if (!cancelled) setVendor((data as any) ?? null);
    };
    loadVendor();
    return () => {
      cancelled = true;
    };
  }, [profile?.phone, user]);

  const loadNeedCategories = async () => {
    if (!user) return;
    setLoadingNeeds(true);
    const { data: mappings } = await supabase
      .from("vendor_item_mappings")
      .select("item_id, catalog_items(category_id)")
      .eq("vendor_id", user.id)
      .eq("is_active", true)
      .limit(80);
    const subIds = Array.from(
      new Set((mappings ?? []).map((m: any) => m.catalog_items?.category_id).filter(Boolean)),
    );
    if (!subIds.length) {
      setNeedCategories([]);
      setLoadingNeeds(false);
      return;
    }
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, image_url, lead_price_inr")
      .in("id", subIds)
      .eq("is_active", true)
      .order("name");
    const counts = new Map<string, number>();
    (mappings ?? []).forEach((m: any) => {
      const cid = m.catalog_items?.category_id;
      if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
    });
    setNeedCategories(
      ((cats ?? []) as any[]).map((c) => ({ ...c, enabled: counts.get(c.id) ?? 0 })),
    );
    setLoadingNeeds(false);
  };

  // Load REAL leads for this vendor: only the ones the vendor has STARTED WORK on.
  // (Auto-accept sets vendor_started_at = now() in accept_lead; manual must press "Start Work")
  useEffect(() => {
    if (!user) {
      setLoadingLeads(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data: notifs } = await supabase
        .from("lead_notifications")
        .select("lead_id, status, created_at, vendor_started_at")
        .eq("vendor_id", user.id)
        .not("vendor_started_at", "is", null)
        .order("vendor_started_at", { ascending: false })
        .limit(50);
      const ids = Array.from(new Set((notifs ?? []).map((n: any) => n.lead_id)));
      if (ids.length === 0) {
        if (!cancelled) {
          setLeads([]);
          setLoadingLeads(false);
        }
        return;
      }
      const { data: rows } = await supabase
        .from("leads")
        .select(
          "id, customer_id, customer_name, customer_phone, sub_category_id, sub_category_name, address, note, lead_price_inr, source, status, accepted_vendor_ids, created_at, lat, lng, item_ids, item_names, images",
        )
        .in("id", ids);
      if (cancelled) return;
      const customerIds = Array.from(
        new Set((rows ?? []).map((r: any) => r.customer_id).filter(Boolean)),
      );
      const customerMap = new Map<string, CustomerLookup>();
      if (customerIds.length) {
        const { data: customers } = await supabase
          .from("customers")
          .select("user_id, name, phone, avatar_url, address")
          .in("user_id", customerIds);
        (customers ?? []).forEach((c: any) => customerMap.set(c.user_id, c));
      }
      const subIds = Array.from(
        new Set((rows ?? []).map((r: any) => r.sub_category_id).filter(Boolean)),
      );
      const subImageMap = new Map<string, string | null>();
      if (subIds.length) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, image_url")
          .in("id", subIds);
        (cats ?? []).forEach((c: any) => subImageMap.set(c.id, c.image_url ?? null));
      }

      // Fetch catalog items (name, image) for ALL referenced item_ids across leads
      const allItemIds = Array.from(
        new Set((rows ?? []).flatMap((r: any) => (Array.isArray(r.item_ids) ? r.item_ids : []))),
      ) as string[];
      const itemMap = new Map<string, { name: string; image: string | null }>();
      const priceMap = new Map<string, { price_min: number | null; price_max: number | null }>();
      if (allItemIds.length) {
        const [{ data: items }, { data: mappings }] = await Promise.all([
          supabase.from("catalog_items").select("id, name, image_url").in("id", allItemIds),
          supabase
            .from("vendor_item_mappings")
            .select("item_id, price_min, price_max")
            .eq("vendor_id", user.id)
            .in("item_id", allItemIds),
        ]);
        (items ?? []).forEach((it: any) =>
          itemMap.set(it.id, { name: it.name, image: it.image_url ?? null }),
        );
        (mappings ?? []).forEach((m: any) =>
          priceMap.set(m.item_id, { price_min: m.price_min, price_max: m.price_max }),
        );
      }

      const notifStatusMap = new Map((notifs ?? []).map((n: any) => [n.lead_id, n.status]));
      const mapped: Lead[] = (rows ?? []).map((r: any) => {
        const customer = customerMap.get(r.customer_id);
        const accepted = (r.accepted_vendor_ids ?? []).includes(user.id);
        const nstatus = notifStatusMap.get(r.id);
        let st: LeadStatus = "process";
        if (r.status === "completed" && accepted) st = "success";
        else if (accepted) st = "process";
        else if (nstatus === "rejected") st = "rejected";
        const src: LeadSource = (
          ["whatsapp", "call", "digital", "quick"].includes(r.source) ? r.source : "quick"
        ) as LeadSource;

        const itemIds: string[] = Array.isArray(r.item_ids) ? r.item_ids : [];
        const itemNames: string[] = Array.isArray(r.item_names) ? r.item_names : [];
        const leadImages: string[] = Array.isArray(r.images) ? r.images : [];
        const items = itemIds.map((iid, idx) => {
          const info = itemMap.get(iid);
          const pr = priceMap.get(iid);
          const amt = Number(pr?.price_max ?? pr?.price_min ?? 0);
          return {
            id: iid,
            name: info?.name || itemNames[idx] || r.sub_category_name || "Item",
            image: info?.image ?? leadImages[idx] ?? subImageMap.get(r.sub_category_id) ?? null,
            amount: amt,
            priceMin: pr?.price_min ?? null,
            priceMax: pr?.price_max ?? null,
          };
        });
        // Fallback: if no item_ids, create one synthetic item from sub_category
        if (items.length === 0) {
          items.push({
            id: r.id,
            name: r.sub_category_name ?? "Service",
            image: leadImages[0] ?? subImageMap.get(r.sub_category_id) ?? null,
            amount: Number(r.lead_price_inr ?? 0),
            priceMin: null,
            priceMax: null,
          });
        }

        return {
          id: r.id,
          leadCode: String(r.id).slice(0, 5).toUpperCase(),
          name: customer?.name || r.customer_name || "Customer",
          phone: customer?.phone || r.customer_phone || "",
          avatarUrl: customer?.avatar_url ?? null,
          productImage: items[0]?.image ?? null,
          distanceKm: distanceKm(vendor, { lat: r.lat, lng: r.lng }),
          address: r.address || customer?.address || undefined,
          service: r.sub_category_name ?? "Service",
          amount: Number(r.lead_price_inr ?? 0),
          rating: 4.9,
          source: src,
          status: st,
          time: timeAgo(r.created_at),
          createdAtIso: r.created_at,
          progressPct: st === "success" ? 100 : 55,
          note: r.note ?? "",
          items,
          timeline: [
            { at: timeAgo(r.created_at), label: "Lead received", kind: "created" as const },
          ],
        };
      });

      setLeads(mapped);
      setLoadingLeads(false);
    };
    load();
    const channel = supabase
      .channel(`vendor-leads-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_notifications",
          filter: `vendor_id=eq.${user.id}`,
        },
        () => load(),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, vendor]);

  const toggleAutoAccept = async () => {
    if (!user || savingAuto) return;
    const next = !vendor?.auto_accept_leads;
    haptic();
    console.info("[VendorQuickControls] auto_accept_leads toggle requested", { next });
    setSavingAuto(true);
    const toastId = toast.loading(
      next ? "Auto Accept ON save ho raha hai…" : "Auto Accept OFF save ho raha hai…",
    );
    try {
      const updated = await withQuickControlTimeout(
        updateQuickControl({ data: { key: "auto_accept_leads", value: next } }),
        "Auto Accept",
      );
      setVendor((p) => ({ ...(p ?? {}), ...(updated as any) }));
      console.info("[VendorQuickControls] auto_accept_leads saved", updated);
      toast.success(
        next
          ? "Auto Accept ON — har lead automatic accept hogi"
          : "Manual Accept ON — har lead aapko accept karni hogi",
      );
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("[VendorQuickControls] auto_accept_leads save failed", error);
      toast.error(error?.message || "Auto Accept save nahi hua — permission/network issue", {
        id: toastId,
      });
    } finally {
      setSavingAuto(false);
    }
  };

  const haptic = () => {
    try {
      navigator.vibrate?.(18);
    } catch {
      // Haptics are optional.
    }
  };

  const getFreshGps = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });

  const currentVendorLocation = () =>
    geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;

  useEffect(() => {
    if (!user || !vendor?.is_online || vendor.operation_mode !== "dynamic") return;
    if (vendor.live_lat != null && vendor.live_lng != null) return;
    let cancelled = false;
    (async () => {
      const gps = await getFreshGps();
      if (!gps || cancelled) return;
      const { error } = await supabase
        .from("vendors")
        .update({
          live_lat: gps.lat,
          live_lng: gps.lng,
          lat: vendor.lat ?? gps.lat,
          lng: vendor.lng ?? gps.lng,
          location_updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id);
      if (!error && !cancelled)
        setVendor((p) =>
          p
            ? {
                ...p,
                live_lat: gps.lat,
                live_lng: gps.lng,
                lat: p.lat ?? gps.lat,
                lng: p.lng ?? gps.lng,
              }
            : p,
        );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, vendor?.is_online, vendor?.operation_mode, vendor?.live_lat, vendor?.live_lng]);

  const toggleOnline = async () => {
    if (!user || savingOnline) return;
    haptic();
    const next = !vendor?.is_online;
    console.info("[VendorQuickControls] is_online toggle requested", { next });
    setSavingOnline(true);
    const toastId = toast.loading(
      next ? "Vendor Status ON save ho raha hai…" : "Vendor Status OFF save ho raha hai…",
    );
    try {
      const gps = next ? ((await getFreshGps()) ?? currentVendorLocation()) : null;
      const updated = await withQuickControlTimeout(
        updateQuickControl({
          data: gps
            ? { key: "is_online", value: next, location: gps }
            : { key: "is_online", value: next },
        }),
        "Vendor Status",
      );
      setVendor((p) => ({ ...(p ?? {}), ...(updated as any) }));
      console.info("[VendorQuickControls] is_online saved", updated);
      toast.success(
        next
          ? "Online — ab leads receive kar sakte hain"
          : "Offline — ab broadcast me nahi aayenge",
      );
      toast.dismiss(toastId);

      // Background GPS refresh — non-blocking. Silently times out without freezing the button.
      if (
        next &&
        !gps &&
        ((updated as any)?.operation_mode ?? vendor?.operation_mode) === "dynamic"
      ) {
        getFreshGps()
          .then(async (gps) => {
            if (!gps || !user) return;
            const { error } = await supabase
              .from("vendors")
              .update({
                live_lat: gps.lat,
                live_lng: gps.lng,
                lat: vendor?.lat ?? gps.lat,
                lng: vendor?.lng ?? gps.lng,
                location_updated_at: new Date().toISOString(),
              } as any)
              .eq("user_id", user.id);
            if (error) console.warn("[VendorQuickControls] background GPS update failed", error);
            else
              setVendor((p) =>
                p
                  ? {
                      ...p,
                      live_lat: gps.lat,
                      live_lng: gps.lng,
                      lat: p.lat ?? gps.lat,
                      lng: p.lng ?? gps.lng,
                    }
                  : p,
              );
          })
          .catch((error) => console.warn("[VendorQuickControls] GPS unavailable", error));
      }
    } catch (error: any) {
      console.error("[VendorQuickControls] is_online save failed", error);
      toast.error(error?.message || "Online status save nahi hua — permission/network issue", {
        id: toastId,
      });
    } finally {
      setSavingOnline(false);
    }
  };

  const toggleOperationMode = async () => {
    if (!user || savingMode) return;
    haptic();
    const current = vendor?.operation_mode === "dynamic" ? "dynamic" : "static";
    const next = current === "dynamic" ? "static" : "dynamic";
    console.info("[VendorQuickControls] operation_mode toggle requested", { next });
    setSavingMode(true);
    const toastId = toast.loading(
      next === "dynamic" ? "Live GPS Mode save ho raha hai…" : "Shop Mode save ho raha hai…",
    );
    try {
      const updated = await withQuickControlTimeout(
        updateQuickControl({ data: { key: "operation_mode", value: next } }),
        "Location Mode",
      );
      setVendor((p) => ({ ...(p ?? {}), ...(updated as any) }));
      console.info("[VendorQuickControls] operation_mode saved", updated);
      toast.success(
        next === "dynamic"
          ? "Live GPS Mode ON — aap jahan honge wahin se leads milengi"
          : "Shop Mode ON — registered shop address se leads milengi",
      );
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("[VendorQuickControls] operation_mode save failed", error);
      toast.error(error?.message || "Location Mode save nahi hua — permission/network issue", {
        id: toastId,
      });
    } finally {
      setSavingMode(false);
    }
  };

  const updateServiceRadius = async (km: number) => {
    if (!user || savingRadius) return;
    setSavingRadius(true);
    try {
      const updated = await withQuickControlTimeout(
        updateQuickControl({ data: { key: "service_radius_km", value: km } }),
        "Service Radius",
      );
      setVendor((p) => ({ ...(p ?? {}), ...(updated as any) }));
    } catch (error: any) {
      console.error("[VendorQuickControls] service_radius_km save failed", error);
      toast.error(error?.message || "Radius save nahi hua — permission/network issue");
    } finally {
      setSavingRadius(false);
    }
  };

  const openProfileFinder = () => {
    setProfileFinderOpen(true);
    void loadNeedCategories();
  };

  const startNeedSearch = (cat: NeedCategory) => {
    setFindingNeedId(cat.id);
    toast.loading(`${cat.name} needs find ho rahi hain…`, { id: "vendor-need-find" });
    window.setTimeout(() => {
      const matches = leads.filter(
        (lead) =>
          lead.service === cat.name || (lead.items ?? []).some((item) => item.name === cat.name),
      ).length;
      setFindingNeedId(null);
      toast.success(
        matches
          ? `${matches} matching customer need mili`
          : "Is category ki live customer need abhi nahi hai",
        { id: "vendor-need-find" },
      );
      if (matches) setLeadsSheetOpen(true);
    }, 1200);
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const success = leads.filter((l) => l.status === "success").length;
    const process = leads.filter((l) => l.status === "process").length;
    const rejected = leads.filter((l) => l.status === "rejected").length;
    const action = leads.filter((l) => l.status === "new").length;
    return { total, success, process, rejected, action };
  }, [leads]);

  const unreadByLead = useLeadUnreadCounts(leads.map((l) => l.id));

  const acceptLead = async (id: string) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const { data, error } = await supabase.rpc("accept_lead", { _lead_id: id });
      const res = data as any;
      if (error || !res?.ok) {
        toast.error(
          res?.reason === "insufficient_coins"
            ? "LeadX coins low hain — wallet recharge karein"
            : "Lead accept nahi ho paayi",
        );
        return;
      }
      toast.success("Lead accept ho gayi — customer ko profile dikh rahi hai");
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "process" } : l)));
  };

  const liveGeo = currentVendorLocation();
  const vendorLat = liveGeo?.lat ?? vendor?.live_lat ?? vendor?.lat ?? 28.6692;
  const vendorLng = liveGeo?.lng ?? vendor?.live_lng ?? vendor?.lng ?? 77.2008;

  // Floating nearby customers (10km) — auto-refresh every 60s
  const fetchNearbyCustomers = useServerFn(getNearbyCustomers);
  const [nearbyCustomers, setNearbyCustomers] = useState<
    Array<{
      id: string;
      name: string;
      avatar_url: string | null;
      lat: number;
      lng: number;
      km: number;
      area: string | null;
      is_online: boolean;
    }>
  >([]);
  useEffect(() => {
    if (!Number.isFinite(vendorLat) || !Number.isFinite(vendorLng)) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res: any = await fetchNearbyCustomers({
          data: { origin: { lat: vendorLat, lng: vendorLng }, radiusKm: 10 },
        });
        if (!cancelled && res?.ok) setNearbyCustomers(res.customers ?? []);
      } catch {
        /* silent */
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [vendorLat, vendorLng, fetchNearbyCustomers]);

  const onlineCustomerCount = nearbyCustomers.filter((c) => c.is_online).length;
  const offlineCustomerCount = nearbyCustomers.length - onlineCustomerCount;

  const vendorMapCards: QuickMapVendor[] = [
    {
      id: "vendor-home",
      name: vendor?.business_name || "My Shop",
      avatar: vendor?.avatar_url || avatarUser,
      x: 50,
      y: 50,
      area: vendor?.operation_mode === "dynamic" ? "Live GPS" : "Shop address",
      km: 0,
      status: vendor?.is_online ? "Online" : "Office",
      lat: vendorLat,
      lng: vendorLng,
      onClick: openProfileFinder,
    },
    ...nearbyCustomers.map((c) => ({
      id: `cust-${c.id}`,
      name: c.name,
      avatar: c.avatar_url || avatarUser,
      x: 50,
      y: 50,
      area: c.area ?? "Nearby",
      km: c.km,
      status: (c.is_online ? "Online" : "Offline") as "Online" | "Offline",
      lat: c.lat,
      lng: c.lng,
    })),
  ];

  const statTiles: {
    value: number;
    label: string;
    border: string;
    tint: string;
    filter: "all" | "pending" | "in_process" | "success" | "rejected";
  }[] = [
    {
      value: stats.total,
      label: "All Leads",
      border: "oklch(0.72 0.01 260 / 0.55)",
      tint: "from-[#f5f6f8] to-[#eef0f3]",
      filter: "all",
    },
    {
      value: pendingCount,
      label: "Pending",
      border: "oklch(0.78 0.14 82 / 0.7)",
      tint: "from-[#fff8dc] to-[#f5e9b8]",
      filter: "pending",
    },
    {
      value: stats.process,
      label: "In Process",
      border: "#b91c1c66",
      tint: "from-[#fef2f2] to-[#fde0e0]",
      filter: "in_process",
    },
    {
      value: stats.success,
      label: "Success",
      border: "#15803d66",
      tint: "from-[#f0fdf4] to-[#d6f5df]",
      filter: "success",
    },
    {
      value: stats.rejected,
      label: "Rejected",
      border: "oklch(0.78 0.14 82 / 0.4)",
      tint: "from-[#fffaeb] to-[#fdf3c8]",
      filter: "rejected",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-0 h-dvh overflow-x-hidden overflow-y-auto touch-pan-y pb-[calc(10.5rem+env(safe-area-inset-bottom))]"
      style={{
        background:
          "radial-gradient(ellipse at top, #fffaeb 0%, transparent 55%), linear-gradient(160deg, #fdf8ec 0%, #fdf3c8 60%, #f5e9b8 100%)",
        touchAction: "pan-y",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
      }}
    >
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.28),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.35),transparent_70%)] blur-2xl" />

      <ActionAlertBanner role="vendor" />

      {/* Map hero with vendor pin in center */}
      <section className="relative touch-pan-y">
        <div className="relative h-[240px] w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0 touch-pan-y">
            <VendorMapHero
              center={{ lat: vendorLat, lng: vendorLng }}
              vendors={vendorMapCards}
              businessName={vendor?.business_name ?? "My Shop"}
              locationLabel={
                liveGeo
                  ? geo.label
                  : vendor?.operation_mode === "dynamic"
                    ? "Live GPS"
                    : "Shop address"
              }
            />
          </div>
          <AcceptedLeadFloatingButton />
          {/* Status + nearby customers chip */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <div className="px-3 py-1.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow text-[10px] font-bold text-[color:oklch(0.22_0.05_85)]">
              {vendor?.is_online ? "● On Duty" : "○ Off Duty"}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow text-[10px] font-bold text-[color:oklch(0.22_0.05_85)] flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {onlineCustomerCount} online
              <span className="text-[color:oklch(0.55_0.05_85)]">·</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {offlineCustomerCount} offline
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white/90 border border-[color:oklch(0.78_0.14_82/0.4)] shadow text-[9px] font-bold text-[color:oklch(0.45_0.05_85)]">
              10 km radius
            </div>
          </div>
          <div className="absolute top-3 right-12 flex items-center gap-2">
            <button
              onClick={() => setActionsOpen(true)}
              aria-label="Quick actions"
              className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.6)] shadow-sm active:scale-90 shrink-0"
            >
              <Store className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
            </button>
            <VendorNotificationBell />
          </div>
        </div>
        {/* Soft cream fade into content */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-12 bg-gradient-to-b from-transparent to-[#fdf8ec]" />
      </section>

      <div className="max-w-md mx-auto px-3 pt-3 space-y-3 relative">
        {/* Coin-rate market ticker (dismissable) */}
        <CoinRateTicker />

        {/* Shop icon + search + profile icon */}
        <div className="rounded-2xl flex items-center gap-2 p-2 bg-white/95 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.5)]">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Open customer shop"
            className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.6)] active:scale-90 shadow-sm"
          >
            <ShoppingBag className="h-5 w-5 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
          </button>
          <div className="flex-1 relative">
            <input
              placeholder="Search leads, customer, service…"
              className="w-full h-10 px-3 rounded-xl bg-[#fffaeb] border border-[color:oklch(0.78_0.14_82/0.4)] text-xs text-[color:oklch(0.22_0.05_85)] placeholder:text-[color:oklch(0.55_0.10_82)] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
            />
          </div>
          <button
            onClick={openProfileFinder}
            aria-label="Open menu"
            className="relative h-10 w-10 rounded-xl overflow-hidden border-2 active:scale-90 shrink-0"
            style={{ borderColor: "#d4af37" }}
          >
            <img
              src={vendor?.avatar_url || avatarUser}
              alt=""
              className="h-full w-full object-cover"
            />
            {vendor?.verified && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </button>
        </div>

        {vendor?.status === "pending" && (
          <div className="rounded-xl bg-amber-100 border border-amber-300 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-800">
            ⏳ Pending Admin Approval
          </div>
        )}

        {/* Swipeable dashboard carousel: Leads / Digital Shop / Find Users */}
        <div
          ref={panelScrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            const next = Math.max(0, Math.min(2, idx)) as 0 | 1 | 2;
            if (next !== activePanel) setActivePanel(next);
          }}
          className="-mx-3 px-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-3"
          style={{ scrollPaddingLeft: "0.75rem", scrollPaddingRight: "0.75rem" }}
        >
          {/* Panel 1 — Leads dashboard */}
          <section
            className="snap-center shrink-0 w-[calc(100%-0.5rem)] rounded-3xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_8px_22px_-10px_rgba(212,175,55,0.5)] p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between px-0.5">
              <p className="font-display font-bold text-[13px] text-[color:oklch(0.22_0.05_85)]">
                ✦ Leads Dashboard
              </p>
              <div className="flex items-center gap-0.5 bg-[#fffaeb] border border-[color:oklch(0.78_0.14_82/0.45)] rounded-full p-0.5">
                {(["day", "week", "month", "year"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setStatRange(r)}
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition ${
                      statRange === r
                        ? "bg-gradient-to-br from-[#fff8dc] to-[#d4af37] text-[color:oklch(0.22_0.05_85)] shadow-sm"
                        : "text-[color:oklch(0.55_0.10_82)]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini sparkline */}
            <div className="h-10 rounded-xl bg-gradient-to-br from-[#fffaeb] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.35)] px-2 flex items-end gap-[2px] overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => {
                const seed = (i * 37 + stats.total * 13 + (statRange.length * 11)) % 100;
                const h = 18 + (seed % 22);
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[#d4af37] to-[#fff8dc] opacity-80"
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              {statTiles.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => openLeadsSheet(t.filter)}
                  className={`flex-shrink-0 w-[68px] rounded-2xl bg-gradient-to-br ${t.tint} p-2 text-center shadow-[0_4px_12px_-4px_rgba(212,175,55,0.4)] active:scale-95 transition`}
                  style={{
                    border: `1.5px solid ${t.border}`,
                    animation: `fade-up 0.5s ease-out ${i * 60}ms both`,
                  }}
                >
                  <div className="h-6 w-6 mx-auto rounded-lg bg-white/90 grid place-items-center shadow-sm">
                    <Handshake className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
                  </div>
                  <p className="font-display text-base font-bold text-[color:oklch(0.22_0.05_85)] leading-none mt-1.5">
                    {t.value}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.1em] mt-1 text-[color:oklch(0.45_0.05_85)] font-semibold truncate">
                    {t.label}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex bg-white rounded-2xl border border-[color:oklch(0.72_0.01_260/0.4)] p-1 shadow-sm">
              <button
                onClick={() => setTab("my")}
                className={`flex-1 py-1.5 text-xs font-display font-bold rounded-xl transition-all ${
                  tab === "my" ? "text-[color:oklch(0.20_0.01_260)] shadow-md" : "text-[color:oklch(0.55_0.10_82)]"
                }`}
                style={tab === "my" ? { background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 60%, #a8acb3 100%)" } : undefined}
              >
                My Leads
              </button>
              <button
                onClick={() => setTab("potential")}
                className={`flex-1 py-1.5 text-xs font-display font-bold rounded-xl transition-all ${
                  tab === "potential" ? "text-[color:oklch(0.20_0.01_260)] shadow-md" : "text-[color:oklch(0.55_0.10_82)]"
                }`}
                style={tab === "potential" ? { background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 60%, #a8acb3 100%)" } : undefined}
              >
                Potential
              </button>
            </div>
          </section>

          {/* Panel 2 — Digital POS Dashboard */}
          <section
            className="snap-center shrink-0 w-[calc(100%-0.5rem)] rounded-3xl border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_8px_22px_-10px_rgba(212,175,55,0.5)] p-3 space-y-2.5 text-[color:oklch(0.20_0.01_260)]"
            style={{ background: "linear-gradient(135deg, #fffaeb 0%, #fdf3c8 50%, #f5e9b8 100%)" }}
          >
            <div className="flex items-center justify-between px-0.5">
              <p className="font-display font-bold text-[13px]">✦ Digital POS</p>
              <Link
                to="/vendor/shop"
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 shadow-sm border border-[color:oklch(0.78_0.14_82/0.5)] no-underline text-[color:oklch(0.22_0.05_85)] active:scale-95"
              >
                Bill Now →
              </Link>
            </div>
            <div className="h-10 rounded-xl bg-white/70 border border-[color:oklch(0.78_0.14_82/0.35)] px-2 flex items-end gap-[2px] overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => {
                const seed = (i * 23 + 41) % 100;
                const h = 14 + (seed % 24);
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-200 opacity-80"
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              {[
                { label: "Stock", value: "₹38,467", tint: "from-[#f5f6f8] to-[#eef0f3]" },
                { label: "Profit", value: "₹6,511", tint: "from-[#f0fdf4] to-[#d6f5df]" },
                { label: "Sales", value: "6", tint: "from-[#fffaeb] to-[#fdf3c8]" },
                { label: "Expense", value: "₹22,909", tint: "from-[#fef2f2] to-[#fde0e0]" },
                { label: "Invest", value: "₹81,981", tint: "from-[#fff8dc] to-[#f5e9b8]" },
              ].map((t) => (
                <Link
                  to="/vendor/shop"
                  key={t.label}
                  className={`flex-shrink-0 w-[68px] rounded-2xl bg-gradient-to-br ${t.tint} p-2 text-center shadow-sm border border-[color:oklch(0.78_0.14_82/0.4)] no-underline active:scale-95 transition`}
                >
                  <div className="h-6 w-6 mx-auto rounded-lg bg-white/90 grid place-items-center shadow-sm">
                    <Store className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
                  </div>
                  <p className="font-display text-[12px] font-bold text-[color:oklch(0.22_0.05_85)] leading-none mt-1.5 truncate">
                    {t.value}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.1em] mt-1 text-[color:oklch(0.45_0.05_85)] font-semibold truncate">
                    {t.label}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Panel 3 — Find Users Dashboard */}
          <section
            onClick={openProfileFinder}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openProfileFinder();
            }}
            className="snap-center shrink-0 w-[calc(100%-0.5rem)] rounded-3xl border p-3 space-y-2.5 text-white shadow-[0_8px_22px_-10px_rgba(212,175,55,0.5)] cursor-pointer active:scale-[0.99] transition"
            style={{
              background: "linear-gradient(135deg, #1f2937 0%, #3f4750 40%, #5a6470 80%, #1f2937 100%)",
              borderColor: "rgba(255,255,255,0.25)",
            }}
          >
            <div className="flex items-center justify-between px-0.5">
              <p className="font-display font-bold text-[13px]">✦ Find Users</p>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 border border-white/30">
                Scan →
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              {[
                { label: "Nearby", value: nearbyCustomers.length, tint: "from-white/15 to-white/5" },
                { label: "Online", value: onlineCustomerCount, tint: "from-emerald-500/30 to-emerald-700/10" },
                { label: "Offline", value: offlineCustomerCount, tint: "from-amber-500/25 to-amber-700/10" },
                { label: "Radius", value: `${vendor?.service_radius_km ?? 10}km`, tint: "from-white/15 to-white/5" },
              ].map((t) => (
                <div
                  key={t.label}
                  className={`flex-shrink-0 w-[72px] rounded-2xl bg-gradient-to-br ${t.tint} p-2 text-center border border-white/20`}
                >
                  <div className="h-6 w-6 mx-auto rounded-lg bg-white/15 grid place-items-center">
                    <Radar className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
                  </div>
                  <p className="font-display text-base font-bold leading-none mt-1.5">{t.value}</p>
                  <p className="text-[8px] uppercase tracking-[0.1em] mt-1 opacity-80 font-semibold truncate">
                    {t.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] opacity-80 px-0.5">
              Tap to open category-based find — find leads matching your products near you.
            </p>
          </section>
        </div>

        {/* Carousel dot indicators */}
        <div className="flex items-center justify-center gap-1.5 -mt-1">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              aria-label={`Panel ${i + 1}`}
              onClick={() => {
                const el = panelScrollRef.current;
                if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all ${
                activePanel === i
                  ? "w-5 bg-[color:oklch(0.55_0.14_82)]"
                  : "w-1.5 bg-[color:oklch(0.78_0.14_82/0.4)]"
              }`}
            />
          ))}
        </div>

        {/* Panel-specific content below */}
        {activePanel === 0 && tab === "my" && (
          <div className="space-y-3">
            {loadingLeads && (
              <div className="text-center py-10 text-xs text-[color:oklch(0.45_0.01_260)]">
                Leads load ho rahi hain…
              </div>
            )}
            {!loadingLeads && leads.length === 0 && (
              <div className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-6 text-center shadow-sm">
                <Bell className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)] opacity-60" />
                <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">
                  Abhi koi lead nahi
                </p>
                <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">
                  Naya customer request karte hi yahan pop-up aayega.
                </p>
              </div>
            )}
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                unread={unreadByLead[lead.id] ?? 0}
                onOpen={() => setDetailLeadId(lead.id)}
              />
            ))}
          </div>
        )}

        {activePanel === 0 && tab === "potential" && (
          <div className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-6 text-center shadow-sm">
            <Sparkles className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)] opacity-70" />
            <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">
              Potential Leads coming soon
            </p>
            <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">
              Aapke area ke high-value leads yahan dikhenge.
            </p>
          </div>
        )}

        {activePanel === 1 && (
          <Link
            to="/vendor/shop"
            className="block rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-5 text-center shadow-sm no-underline active:scale-[0.99] transition"
          >
            <Store className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)]" />
            <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">
              Open Digital Shop
            </p>
            <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">
              Products, stock, billing aur invoices yahan se manage karein.
            </p>
            <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#d4af37] text-[color:oklch(0.22_0.05_85)] text-[11px] font-bold shadow-sm">
              Bill Now <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        )}

        {activePanel === 2 && (
          <div className="space-y-2">
            {nearbyCustomers.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-6 text-center shadow-sm">
                <Radar className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)] opacity-70" />
                <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">
                  Koi nearby user nahi
                </p>
                <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">
                  10 km radius mein abhi koi customer online nahi hai.
                </p>
              </div>
            ) : (
              nearbyCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={openProfileFinder}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm active:scale-[0.99] text-left"
                >
                  <img
                    src={c.avatar_url || avatarUser}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border border-[color:oklch(0.78_0.14_82/0.4)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)] truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] truncate">
                      {c.area ?? "Nearby"} · {c.km} km
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                      c.is_online
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.is_online ? "Online" : "Offline"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        <div aria-hidden className="h-36" />
      </div>


      {/* Floating action: open digital shop */}
      <Link
        to="/vendor/shop"
        aria-label="Open Digital Shop"
        className="btn-3d fixed bottom-24 right-5 z-40 h-14 w-14 grid place-items-center rounded-full text-[color:oklch(0.20_0.01_260)] shadow-[0_10px_28px_-6px_rgba(212,175,55,0.7)] active:scale-90"
        style={{
          background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 75%, #3f4750 100%)",
          border: "2px solid rgba(255,255,255,0.7)",
          animation: "breathe 2.6s ease-in-out infinite",
        }}
      >
        <Store className="h-6 w-6" strokeWidth={2.4} />
      </Link>

      {/* Bottom dock — quick actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-6 pb-3">
          <div className="flex items-center justify-around rounded-3xl bg-white/95 border border-[color:oklch(0.72_0.01_260/0.55)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.35)] px-2 py-2">
            <DockItem
              label="Leads"
              icon={<TrendingUp className="h-4 w-4" />}
              active
              badge={pendingCount}
              onClick={() => setLeadsSheetOpen(true)}
            />
            <button
              type="button"
              onClick={openProfileFinder}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl active:scale-95"
              aria-label="Find users"
            >
              <span
                className="h-9 w-9 rounded-full grid place-items-center text-[color:oklch(0.20_0.01_260)] shadow-md"
                style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-[9px] font-bold text-[color:oklch(0.42_0.01_260)]">Find</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <span className="h-8 w-8 rounded-full grid place-items-center text-[color:oklch(0.45_0.01_260)]">
                <Store className="h-4 w-4" />
              </span>
              <span className="text-[9px] font-bold text-[color:oklch(0.45_0.01_260)]">
                Profile
              </span>
            </button>
          </div>
        </div>
      </div>
      <VendorSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} vendor={vendor} />
      <VendorProfileFinderSheet
        open={profileFinderOpen}
        onClose={() => setProfileFinderOpen(false)}
        vendorName={vendor?.business_name || "My Shop"}
        categories={needCategories}
        loading={loadingNeeds}
        findingId={findingNeedId}
        onFind={startNeedSearch}
        onMenu={() => {
          setProfileFinderOpen(false);
          setMenuOpen(true);
        }}
      />
      <VendorPendingLeadsSheet
        open={leadsSheetOpen}
        onClose={() => setLeadsSheetOpen(false)}
        initialFilter={leadsSheetFilter}
        onOpenLead={(id) => {
          const exists = leads.some((l) => l.id === id);
          if (exists) setDetailLeadId(id);
          else navigate({ to: "/vendor/chat", search: { leadId: id } as never });
        }}
      />
      <VendorQuickActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        vendor={vendor}
        saving={{ online: savingOnline, auto: savingAuto, mode: savingMode, radius: savingRadius }}
        onToggleOnline={toggleOnline}
        onToggleAuto={toggleAutoAccept}
        onToggleMode={toggleOperationMode}
        onRadius={updateServiceRadius}
      />
      <VendorLeadDetailSheet
        open={!!detailLeadId}
        lead={leads.find((l) => l.id === detailLeadId) ?? null}
        otherLeads={leads}
        onClose={() => setDetailLeadId(null)}
        onSwitchLead={(id) => setDetailLeadId(id)}
      />
    </div>
  );
}

function VendorMapHero({
  center,
  vendors,
  businessName,
  locationLabel,
}: {
  center: { lat: number; lng: number };
  vendors: QuickMapVendor[];
  businessName: string;
  locationLabel: string;
}) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <QuickServiceMap
          center={center}
          vendors={vendors.filter((v) => v.id !== "vendor-home")}
          userAvatar={vendors[0]?.avatar || avatarUser}
          userLabel={locationLabel || businessName}
          gestureHandling="none"
          showControls
          showUserPin
          radiusKm={10}
          countLabel={vendors[0]?.status === "Online" ? "Online shop" : "My shop"}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 grid place-items-center z-30 opacity-0">
        <span
          className="absolute h-28 w-28 rounded-full border border-[color:oklch(0.78_0.14_82/0.45)]"
          style={{ animation: "finder-radar 2.4s cubic-bezier(0.22,1,0.36,1) infinite" }}
        />
        <button
          type="button"
          onClick={vendors[0]?.onClick}
          className="pointer-events-auto relative h-16 w-16 rounded-full grid place-items-center border-2 border-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.55)] active:scale-95 overflow-hidden"
          style={{
            background: "linear-gradient(180deg,#fff8dc,#f5d97a 45%,#d4af37)",
            borderColor: "rgba(255,255,255,0.9)",
          }}
          aria-label="Open vendor profile finder"
        >
          <img
            src={vendors[0]?.avatar || avatarUser}
            alt=""
            className="h-12 w-12 rounded-full object-cover border-2 border-white"
          />
          <span className="absolute -bottom-1 h-4 w-4 rotate-45 bg-[#d4af37] border-r border-b border-white/80" />
        </button>
      </div>
    </div>
  );
}

function VendorProfileFinderSheet({
  open,
  onClose,
  vendorName,
  categories,
  loading,
  findingId,
  onFind,
  onMenu,
}: {
  open: boolean;
  onClose: () => void;
  vendorName: string;
  categories: NeedCategory[];
  loading: boolean;
  findingId: string | null;
  onFind: (cat: NeedCategory) => void;
  onMenu: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-gradient-to-b from-white via-[#fffaf0] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[90vh] overflow-y-auto"
        style={{ animation: "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1)" }}
      >
        <div className="flex justify-center pb-2">
          <span className="h-1.5 w-14 rounded-full bg-[color:oklch(0.78_0.14_82/0.45)]" />
        </div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[color:oklch(0.50_0.10_82)]">
              Find user needs
            </p>
            <h3 className="font-display text-xl font-bold text-[color:oklch(0.25_0.05_85)] truncate">
              {vendorName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white border grid place-items-center active:scale-90"
            aria-label="Close"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onMenu}
          className="mb-3 w-full rounded-2xl bg-white/90 border p-3 flex items-center gap-3 text-left active:scale-[0.98]"
        >
          <User className="h-5 w-5 text-[color:oklch(0.45_0.10_82)]" />
          <span className="flex-1 text-sm font-bold text-[color:oklch(0.25_0.05_85)]">
            Open full vendor profile menu
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
        {loading ? (
          <div className="py-10 grid place-items-center text-[color:oklch(0.45_0.10_82)]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl bg-white/90 border p-5 text-center text-xs text-[color:oklch(0.45_0.05_85)]">
            Pehle Inventory Mapping me services ON karein.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFind(cat)}
                className="rounded-2xl bg-white/95 border p-3 text-left shadow-sm active:scale-[0.97]"
              >
                <div className="h-20 rounded-xl overflow-hidden bg-[#fff8dc] grid place-items-center mb-2">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Radar className="h-7 w-7 text-[color:oklch(0.55_0.10_82)]" />
                  )}
                </div>
                <p className="font-display font-bold text-sm text-[color:oklch(0.25_0.05_85)] truncate">
                  {cat.name}
                </p>
                <p className="text-[10px] text-[color:oklch(0.50_0.06_85)]">
                  {cat.enabled} mapped · ₹{cat.lead_price_inr ?? 20}/lead
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  {findingId === cat.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3" />
                  )}{" "}
                  Find users
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ value, label, active }: { value: number; label: string; active?: boolean }) {
  return (
    <div className="px-1">
      <p
        className={`font-display font-bold text-xl leading-none ${active ? "text-[#8b1a1a]" : "text-[color:oklch(0.20_0.01_260)]"}`}
      >
        {value}
      </p>
      <p className="text-[8px] uppercase tracking-[0.18em] mt-1 opacity-90">{label}</p>
      {active && (
        <span className="block mx-auto mt-1 h-0.5 w-6 rounded-full bg-[color:oklch(0.20_0.01_260)]" />
      )}
    </div>
  );
}

const SOURCE_META: Record<
  LeadSource,
  { label: string; icon: React.ReactNode; bg: string; text: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageCircle className="h-2.5 w-2.5" />,
    bg: "linear-gradient(135deg, #f5f6f8, #eef0f3)",
    text: "oklch(0.42 0.01 260)",
  },
  call: {
    label: "Calling",
    icon: <Phone className="h-2.5 w-2.5" />,
    bg: "linear-gradient(135deg, #f5f6f8, #d8dde3)",
    text: "oklch(0.30 0.05 85)",
  },
  digital: {
    label: "Digital Dukan",
    icon: <Store className="h-2.5 w-2.5" />,
    bg: "linear-gradient(135deg, #eef0f3, #a8acb3)",
    text: "oklch(0.20 0.01 260)",
  },
  quick: {
    label: "Quick Service",
    icon: <Zap className="h-2.5 w-2.5" />,
    bg: "linear-gradient(135deg, #f5f6f8, #d8dde3)",
    text: "oklch(0.30 0.05 85)",
  },
};

const STATUS_META: Record<LeadStatus, { label: string; icon: React.ReactNode; tint: string }> = {
  new: {
    label: "Action Required",
    icon: <AlertCircle className="h-3 w-3" />,
    tint: "bg-[#eef0f3] text-[#3f4750]",
  },
  process: {
    label: "In Process",
    icon: <Clock className="h-3 w-3" />,
    tint: "bg-[#f5f6f8] text-[color:oklch(0.42_0.01_260)]",
  },
  success: {
    label: "Payout Released",
    icon: <CheckCircle2 className="h-3 w-3" />,
    tint: "bg-[#f0fdf4] text-[#15803d]",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
    tint: "bg-[#fef2f2] text-[#b91c1c]",
  },
};

function formatLiveDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mon = d.toLocaleString("en-IN", { month: "short" }).toLowerCase();
  const day = d.getDate();
  const yr = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${day} ${mon} ${yr}  ${h}:${m} ${ap}`;
}

// Live timer "Xm Ys ago" that updates every second
function useLiveAgo(iso?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return "";
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s ago`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}h ${mm}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

function LeadCard({ lead, unread, onOpen }: { lead: Lead; unread: number; onOpen: () => void }) {
  const st = STATUS_META[lead.status];
  const avatar = lead.avatarUrl;
  const initial = lead.name.charAt(0).toUpperCase();
  const live = useLiveAgo(lead.createdAtIso);
  const { steps, markCall, markMsg, completed } = useLeadSteps(lead.id);
  const items =
    lead.items && lead.items.length > 0
      ? lead.items
      : [
          {
            id: lead.id,
            name: lead.service,
            image: lead.productImage ?? null,
            amount: lead.amount,
          },
        ];
  const allDone = completed >= 3;

  const area =
    lead.address || (lead.distanceKm != null ? `${lead.distanceKm} km away` : "Location pending");

  return (
    <article
      className="rounded-3xl bg-white overflow-hidden shadow-[0_6px_18px_-8px_rgba(15,23,42,0.18)]"
      style={{ border: "1px solid rgba(212,175,55,0.35)" }}
    >
      {/* ===== Centered Lead ID ribbon ===== */}
      <div className="flex items-center justify-center pt-2.5 pb-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:oklch(0.97_0.05_85)] border border-[color:oklch(0.78_0.14_82/0.45)] text-[10px] font-bold text-[color:oklch(0.30_0.05_85)] tracking-wider">
          LEAD&nbsp;ID
          <span className="font-mono text-[color:oklch(0.20_0.01_260)]">{lead.leadCode}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left active:scale-[0.99] transition"
      >
        {/* HEAD: avatar + name + area + live timer (right-side status pill removed) */}
        <div className="px-3.5 pt-1 pb-2 flex items-start gap-2.5">
          <span
            className="h-12 w-12 rounded-full overflow-hidden grid place-items-center font-display text-base font-bold text-white flex-shrink-0 shadow-sm border-2 border-white"
            style={{ background: "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)" }}
          >
            {avatar ? (
              <img src={avatar} alt={lead.name} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[15px] font-bold text-slate-900 leading-tight truncate">
              {lead.name}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5 truncate flex items-center gap-1">
              <span className="text-[10px]">📍</span>
              <span className="truncate">{area}</span>
            </p>
            <p className="text-[10px] text-amber-700 font-bold mt-0.5 tabular-nums">⏱ {live}</p>
          </div>
        </div>

        {/* PRODUCT LIST — one row per item (image + name + vendor's ₹ amount) */}
        <div className="mx-3 mb-2 space-y-1.5">
          {items.map((it, idx) => (
            <div
              key={`${it.id}-${idx}`}
              className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2.5 flex items-center gap-3"
            >
              <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-[#eef0f3] grid place-items-center">
                {it.image ? (
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 px-1 text-center leading-tight">
                    {it.name.split(" ")[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[14px] font-bold text-slate-900 leading-tight truncate">
                  {it.name}
                </p>
                {idx === 0 && lead.note && (
                  <p className="text-[11px] text-slate-600 italic mt-0.5 line-clamp-2 leading-snug">
                    “{lead.note}”
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {it.amount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                      ₹ {it.amount.toLocaleString()}
                      {it.priceMin != null &&
                        it.priceMax != null &&
                        it.priceMin !== it.priceMax && (
                          <span className="text-[9px] font-medium text-emerald-700/80">
                            ({it.priceMin.toLocaleString()}–{it.priceMax.toLocaleString()})
                          </span>
                        )}
                    </span>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">Rate not set</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </button>

      {/* 3-step progress strip: Accept → Call → Message → tap opens status timeline */}
      <Link
        to="/vendor/status"
        search={{ vendorId: "", orderId: lead.id } as never}
        className="block mx-3 mb-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 active:scale-[0.99]"
        aria-label="Open status timeline"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Workflow · {completed}/3
          </span>
          <span
            className={`text-[10px] font-bold ${allDone ? "text-emerald-700" : "text-amber-700"}`}
          >
            {allDone ? "✓ All steps done" : "Tap for status"}
          </span>
        </div>
        <div className="flex items-end gap-1.5">
          <StepDot done={steps.accept} label="Accept" />
          <StepBar done={steps.call} />
          <StepDot done={steps.call} label="Call" />
          <StepBar done={steps.msg} />
          <StepDot done={steps.msg} label="Message" />
        </div>
      </Link>

      {/* Action bar — status text + Call + Chat (with unread badge) */}
      <div className="flex items-stretch border-t border-slate-200/70">
        <div className="flex-1 py-2.5 grid place-items-center text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)] tracking-wider uppercase">
          {st.label}
        </div>
        <a
          href={`tel:${lead.phone}`}
          onClick={() => markCall()}
          aria-label="Call"
          className="px-5 grid place-items-center border-l border-slate-200/70 active:scale-95"
        >
          <Phone
            className={`h-4 w-4 ${steps.call ? "text-emerald-600" : "text-[color:oklch(0.42_0.01_260)]"}`}
          />
        </a>
        <Link
          to="/vendor/chat"
          search={{ leadId: lead.id } as never}
          onClick={() => markMsg()}
          aria-label="Open chat"
          className="relative px-5 grid place-items-center border-l border-slate-200/70 active:scale-95"
        >
          <MessageCircle
            className={`h-4 w-4 ${steps.msg ? "text-emerald-600" : "text-[color:oklch(0.42_0.01_260)]"}`}
          />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold border border-white shadow animate-pulse">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </div>
    </article>
  );
}

function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <span
        className={`h-5 w-5 rounded-full grid place-items-center text-[10px] font-bold border-2 transition ${
          done
            ? "bg-emerald-500 text-white border-emerald-600 shadow"
            : "bg-white text-slate-400 border-slate-300"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span
        className={`text-[8px] font-bold uppercase tracking-wider ${done ? "text-emerald-700" : "text-slate-500"}`}
      >
        {label}
      </span>
    </div>
  );
}

function StepBar({ done }: { done: boolean }) {
  return (
    <span
      className={`flex-1 h-0.5 rounded-full transition mb-2.5 ${done ? "bg-emerald-500" : "bg-slate-300"}`}
    />
  );
}

function DockItem({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 px-3 py-1 active:scale-95 transition"
    >
      <span
        className={`relative h-8 w-8 rounded-full grid place-items-center ${active ? "bg-[color:oklch(0.97_0.05_85)] text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}
      >
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold border border-white shadow animate-pulse">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={`text-[9px] font-bold ${active ? "text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}
      >
        {label}
      </span>
    </button>
  );
}
