import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, MoreVertical, Users, Star, MapPin, Bell, Navigation, LocateFixed, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";
import { QuickServiceMap, type QuickMapVendor } from "@/components/QuickServiceMap";
import { useGeolocation } from "@/hooks/use-geolocation";
import { setActiveInquiry, useActiveInquiry } from "@/hooks/use-active-inquiry";
import { playPing } from "@/lib/lead-sound";
import avatarUser from "@/assets/avatar-user.png";

type AcceptedVendor = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  total_reviews: number | null;
  distance_km: number | null;
  quoted_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  cover_image_url?: string | null;
};

type VendorCoords = Record<string, { lat: number; lng: number }>;

type Props = {
  open: boolean;
  leadId: string | null;
  category: string | null;
  productImage?: string | null;
  onClose: () => void;
  onOpenAllVendors: () => void;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70";

function money(v?: number | null) {
  if (v == null) return null;
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

export function VendorChatHub({ open, leadId, category, productImage, onClose, onOpenAllVendors }: Props) {
  const geo = useGeolocation();
  const { inquiry } = useActiveInquiry();
  const [vendors, setVendors] = useState<AcceptedVendor[]>([]);
  const [coords, setCoords] = useState<VendorCoords>({});
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Hide the FloatingDockNav (My Orders / My Shops pill) while hub is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.dataset.finderOpen = "1";
      return () => { delete document.body.dataset.finderOpen; };
    }
  }, [open]);

  // Load accepted vendors (RPC) + coordinates from vendors table.
  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;

    const load = async () => {
      const { data } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      const list = (data ?? []) as AcceptedVendor[];
      const nextIds = new Set(list.map((v) => v.vendor_id));
      if (seenIdsRef.current.size > 0 && list.some((v) => !seenIdsRef.current.has(v.vendor_id))) {
        playPing("message");
      }
      seenIdsRef.current = nextIds;
      setVendors(list);

      // fetch coords for any missing vendor ids
      const missing = list.map((v) => v.vendor_id).filter((id) => !coords[id]);
      if (missing.length > 0) {
        const { data: rows } = await supabase
          .from("vendors")
          .select("user_id, lat, lng, live_lat, live_lng")
          .in("user_id", missing);
        if (alive && rows) {
          setCoords((prev) => {
            const next = { ...prev };
            (rows as any[]).forEach((r) => {
              const lat = r.live_lat ?? r.lat;
              const lng = r.live_lng ?? r.lng;
              if (lat != null && lng != null) next[r.user_id] = { lat: Number(lat), lng: Number(lng) };
            });
            return next;
          });
        }
      }
    };
    load();

    const ch = supabase
      .channel(`hub-accept-${leadId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `lead_id=eq.${leadId}` },
        (p) => { if ((p.new as any)?.status === "accepted") load(); })
      .subscribe();
    const poll = setInterval(load, 4000);
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  // Default-select the closest vendor once list loads.
  useEffect(() => {
    if (!open) return;
    if (activeVendorId && vendors.some((v) => v.vendor_id === activeVendorId)) return;
    if (vendors.length === 0) return;
    const sorted = [...vendors].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    setActiveVendorId(sorted[0].vendor_id);
  }, [vendors, open, activeVendorId]);

  // Keep inquiry vendorCount fresh so floating widget shows correct number.
  useEffect(() => {
    if (!open || !leadId || !inquiry) return;
    if (inquiry.vendorCount !== vendors.length) {
      setActiveInquiry({ ...inquiry, vendorCount: vendors.length });
    }
  }, [vendors.length, open, leadId, inquiry]);

  const activeVendor = useMemo(
    () => vendors.find((v) => v.vendor_id === activeVendorId) ?? null,
    [vendors, activeVendorId],
  );

  const peer: LeadChatPeer | null = activeVendor
    ? {
        id: activeVendor.vendor_id,
        name: activeVendor.business_name || activeVendor.owner_name || "Vendor",
        avatar_url: activeVendor.avatar_url,
        phone: activeVendor.phone || activeVendor.whatsapp,
        subtitle: activeVendor.business_name && activeVendor.owner_name ? activeVendor.owner_name : "Verified vendor",
      }
    : null;

  const priceRange = useMemo(() => {
    const prices = vendors
      .map((v) => v.quoted_price ?? v.price_min)
      .filter((p): p is number => p != null && Number.isFinite(p));
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...vendors.map((v) => v.quoted_price ?? v.price_max ?? v.price_min ?? 0).filter((n) => n > 0));
    return min === max ? money(min) : `${money(min)} – ${money(max)}`;
  }, [vendors]);

  // Build map vendor pins from accepted vendors + coordinates.
  const mapVendors: QuickMapVendor[] = useMemo(() => {
    return vendors.map((v, i) => {
      const c = coords[v.vendor_id];
      return {
        id: v.vendor_id,
        name: v.business_name || v.owner_name || "Vendor",
        avatar: v.avatar_url || FALLBACK_AVATAR,
        x: 20 + ((i * 17) % 60),
        y: 25 + ((i * 23) % 55),
        area: v.business_name || "Nearby",
        km: v.distance_km ?? undefined,
        status: "Online" as const,
        lat: c?.lat,
        lng: c?.lng,
        onClick: () => setActiveVendorId(v.vendor_id),
      };
    });
  }, [vendors, coords]);

  const mapCenter = geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
  const geoLabel = geo.label || "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* MAP — top */}
      <div className="relative w-full flex-shrink-0" style={{ height: "36vh", minHeight: 240 }}>
        <QuickServiceMap
          center={mapCenter}
          vendors={mapVendors}
          userAvatar={avatarUser}
          userLabel={geoLabel ?? "Your location"}
          geoStatus={geo.status}
          gestureHandling="greedy"
          showControls={false}
          radiusKm={10}
        />
        {/* Top overlay chips */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#c26a1a] text-white text-[11px] font-bold shadow-lg">
            <MapPin className="h-3.5 w-3.5" /> 10 km radius
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 grid place-items-center rounded-full bg-white shadow-md active:scale-95"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
            <button
              aria-label="Notifications"
              className="relative h-9 w-9 grid place-items-center rounded-full bg-white shadow-md"
            >
              <Bell className="h-4 w-4 text-slate-700" />
              {vendors.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                  {vendors.length}
                </span>
              )}
            </button>
            <button aria-label="Locate" className="h-9 w-9 grid place-items-center rounded-full bg-white shadow-md">
              <LocateFixed className="h-4 w-4 text-blue-600" />
            </button>
            <button aria-label="Navigate" className="h-9 w-9 grid place-items-center rounded-full bg-white shadow-md">
              <Navigation className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Location chip bottom-center */}
        {geoLabel && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 px-3 py-2 rounded-2xl bg-white shadow-lg flex items-center gap-2 max-w-[85%]">
            <span className="text-base">📍</span>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-bold text-slate-800 truncate">
                {geoLabel.split(",")[0] || "Location"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{geoLabel}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* CONTENT SHEET — bottom */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-t-3xl -mt-4 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] relative">
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Product header */}
        <div className="px-4 pt-1 pb-2 flex items-start gap-3 flex-shrink-0">
          <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {productImage ? (
              <img src={productImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-slate-400 font-bold">
                {(category ?? "?")[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[17px] font-bold text-slate-900 truncate leading-tight">
              {category ?? "Service"}
            </h2>
            <p className="text-[12px] text-slate-500 truncate leading-tight">
              {activeVendor?.business_name ?? "Nearby vendors"}
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {priceRange && (
                <span className="text-[13px] font-bold text-orange-600">{priceRange}</span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                {vendors.length} Vendor{vendors.length === 1 ? "" : "s"} Available
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <a
              href={peer?.phone ? `tel:${peer.phone}` : undefined}
              aria-label="Call"
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 bg-white active:scale-95"
            >
              <Phone className="h-4 w-4 text-slate-700" />
            </a>
            <button
              onClick={onOpenAllVendors}
              aria-label="More"
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 bg-white active:scale-95"
            >
              <MoreVertical className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Vendor rail */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x">
            <AnimatePresence initial={false}>
              {vendors.map((v) => {
                const active = v.vendor_id === activeVendorId;
                const name = v.business_name || v.owner_name || "Vendor";
                const price = v.quoted_price ?? v.price_min;
                return (
                  <motion.button
                    key={v.vendor_id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setActiveVendorId(v.vendor_id)}
                    className={`snap-start flex-shrink-0 w-[92px] rounded-2xl border p-2 flex flex-col items-center text-center transition-all ${
                      active
                        ? "border-orange-400 bg-orange-50/40 ring-2 ring-orange-200 shadow-md"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={v.avatar_url || FALLBACK_AVATAR}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover border-2 border-white shadow"
                        loading="lazy"
                      />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <p className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight line-clamp-1 w-full">
                      {name.split(" ").slice(0, 2).join(" ")}
                    </p>
                    <p className="text-[9px] font-semibold text-emerald-600 leading-tight">Online</p>
                    <div className="mt-0.5 flex items-center gap-0.5 text-[10px] font-bold text-slate-700">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      {(v.rating ?? 4.8).toFixed(1)}
                    </div>
                    {price != null ? (
                      <p className="text-[11px] font-bold text-slate-900 leading-tight">{money(price)}</p>
                    ) : v.distance_km != null ? (
                      <p className="text-[10px] text-slate-500 leading-tight">{v.distance_km.toFixed(1)} km</p>
                    ) : null}
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {vendors.length > 0 && (
              <button
                onClick={onOpenAllVendors}
                className="snap-start flex-shrink-0 w-[92px] rounded-2xl border border-slate-200 bg-slate-50 p-2 flex flex-col items-center justify-center text-center active:scale-95"
              >
                <div className="h-14 w-14 rounded-full bg-white border border-slate-200 grid place-items-center">
                  <Users className="h-6 w-6 text-slate-600" />
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">All Vendors</p>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">{vendors.length}+</p>
              </button>
            )}
          </div>
        </div>

        {/* Active vendor banner */}
        {activeVendor && (
          <div className="mx-3 mb-2 flex-shrink-0 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 flex items-center gap-2">
            <span className="h-6 w-6 grid place-items-center rounded-full bg-white border border-orange-200 text-orange-600 text-[11px] font-bold">i</span>
            <p className="flex-1 text-[12px] text-slate-700 leading-tight">
              You are chatting with{" "}
              <span className="font-bold text-slate-900">
                {activeVendor.business_name || activeVendor.owner_name}
              </span>{" "}
              about <span className="font-bold text-slate-900">{category}</span>
            </p>
            <button
              onClick={onOpenAllVendors}
              className="px-2.5 py-1 rounded-full border border-orange-300 text-orange-700 text-[11px] font-bold bg-white active:scale-95"
            >
              Change Vendor
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 min-h-0 relative">
          {leadId && peer ? (
            <LeadChatThread
              key={`${leadId}-${peer.id}`}
              leadId={leadId}
              peer={peer}
              myRole="customer"
            />
          ) : vendors.length === 0 ? (
            <div className="h-full grid place-items-center px-6 text-center">
              <div>
                <div className="mx-auto h-12 w-12 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Vendors ready ho rahe hain…</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
