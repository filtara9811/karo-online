import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  X, Phone, MessageCircle, Star, ShieldCheck, ShieldAlert, BadgeCheck,
  MapPin, Navigation, ThumbsUp, ThumbsDown, CheckCircle2, Loader2,
  IndianRupee, Briefcase, Sparkles, Building2, Users, Wrench, Award,
  ChevronRight, Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type VendorProfileData = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  rating: number | null;
  total_reviews: number | null;
  distance_km: number | null;
  cover_image_url?: string | null;
  quoted_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  is_premium?: boolean;
  verified?: boolean;
};

type VendorExtras = {
  is_premium: boolean;
  verified: boolean;
  is_online: boolean;
  operation_mode: string | null;
  entity: string | null;
  trade: string | null;
  deals_in: string | null;
  vendor_type: string | null;
  gst: string | null;
  pan: string | null;
};

type CatalogRow = {
  id: string;
  item_id: string;
  price_min: number | null;
  price_max: number | null;
  notes: string | null;
  catalog_items: {
    name: string;
    image_url?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  vendor: VendorProfileData | null;
  category: string | null;
  isApproved: boolean;
  approving: boolean;
  approveDisabled?: boolean;
  onApprove: () => void;
  onChat: () => void;
  onClose: () => void;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "V";
}
function money(v?: number | null) {
  return v == null ? null : `₹${Number(v).toLocaleString("en-IN")}`;
}

export function VendorProfileSheet({
  open, vendor, category, isApproved, approving, approveDisabled, onApprove, onChat, onClose,
}: Props) {
  const [extras, setExtras] = useState<VendorExtras | null>(null);
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [reviewBreakdown, setReviewBreakdown] = useState<{ good: number; bad: number; total: number } | null>(null);
  const [openJourney, setOpenJourney] = useState<"good" | "bad" | null>(null);

  useEffect(() => {
    if (!open || !vendor) return;
    let alive = true;
    (async () => {
      const [{ data: v }, { data: maps }, { data: reviews }] = await Promise.all([
        supabase
          .from("vendors")
          .select("is_premium, verified, is_online, operation_mode, entity, trade, deals_in, vendor_type, gst, pan")
          .eq("user_id", vendor.vendor_id)
          .maybeSingle(),
        supabase
          .from("vendor_item_mappings")
          .select("id, item_id, price_min, price_max, notes, catalog_items(name, image_url)")
          .eq("is_active", true)
          .in("vendor_id", [vendor.vendor_id])
          .limit(20) as any,
        supabase
          .from("leads")
          .select("lead_rating")
          .eq("accepted_vendor_id", vendor.vendor_id)
          .not("lead_rating", "is", null) as any,
      ]);
      if (!alive) return;
      setExtras((v ?? null) as VendorExtras | null);
      // vendor_item_mappings.vendor_id refers to vendors.id, not user_id. Try a second pass via vendors.id.
      let list = (maps ?? []) as CatalogRow[];
      if (list.length === 0) {
        const { data: vrow } = await supabase.from("vendors").select("id").eq("user_id", vendor.vendor_id).maybeSingle();
        if (vrow?.id) {
          const { data: m2 } = await supabase
            .from("vendor_item_mappings")
            .select("id, item_id, price_min, price_max, notes, catalog_items(name, image_url)")
            .eq("is_active", true)
            .eq("vendor_id", vrow.id)
            .limit(20) as any;
          list = (m2 ?? []) as CatalogRow[];
        }
      }
      if (!alive) return;
      setItems(list);
      const all = (reviews ?? []) as { lead_rating: number | null }[];
      const total = all.length;
      const good = all.filter((r) => (r.lead_rating ?? 0) >= 4).length;
      const bad = all.filter((r) => (r.lead_rating ?? 0) > 0 && (r.lead_rating ?? 0) < 3).length;
      setReviewBreakdown({ good, bad, total });
    })();
    return () => { alive = false; };
  }, [open, vendor?.vendor_id]);

  const displayName = vendor?.business_name || vendor?.owner_name || "Vendor";
  const sub = vendor?.business_name && vendor?.owner_name ? vendor.owner_name! : "Verified vendor";
  const rating = Number(vendor?.rating ?? 4.8);
  const happyPct = reviewBreakdown && reviewBreakdown.total > 0
    ? Math.round((reviewBreakdown.good / reviewBreakdown.total) * 100)
    : Math.round((rating / 5) * 100);
  const badPct = reviewBreakdown && reviewBreakdown.total > 0
    ? Math.round((reviewBreakdown.bad / reviewBreakdown.total) * 100)
    : Math.max(0, 100 - happyPct);

  const priceRange = vendor?.price_min != null && vendor?.price_max != null
    ? `${money(vendor.price_min)} – ${money(vendor.price_max)}`
    : money(vendor?.quoted_price);

  const badges = useMemo(() => {
    if (!vendor) return [] as { icon: any; label: string; sub: string; tone: "ok" | "warn" }[];
    return [
      {
        icon: ShieldCheck,
        label: extras?.verified ? "Successful" : "Pending",
        sub: "KYC Status",
        tone: extras?.verified ? "ok" : "warn",
      },
      {
        icon: ThumbsUp, label: rating >= 4 ? "Good" : "Average", sub: "Experience", tone: rating >= 4 ? "ok" : "warn",
      },
      {
        icon: Sparkles,
        label: extras?.operation_mode === "dynamic" ? "Online + Field" : "Online + Offline",
        sub: "Available business",
        tone: extras?.is_online ? "ok" : "warn",
      },
      {
        icon: Building2,
        label: extras?.entity || "Company",
        sub: "Identity business",
        tone: "ok",
      },
      {
        icon: BadgeCheck,
        label: extras?.gst ? "GST Verified" : extras?.pan ? "PAN Verified" : "Basic",
        sub: "Identity",
        tone: (extras?.gst || extras?.pan) ? "ok" : "warn",
      },
    ] as any;
  }, [vendor, extras, rating]);

  const totalServed = reviewBreakdown?.total ?? 0;

  return (
    <AnimatePresence>
      {open && vendor && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[96] bg-black/55 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.35 }}
            onDragEnd={(_: any, info: PanInfo) => {
              if (info.offset.y > 140 || info.velocity.y > 800) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-[97] flex flex-col bg-gradient-to-b from-white to-[#f7f3ea] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom)]"
            style={{ height: "92vh" }}
          >
            {/* Drag handle + Close */}
            <div className="relative flex-shrink-0">
              <div className="grid place-items-center pt-2 pb-1">
                <span className="block h-1.5 w-12 rounded-full bg-slate-300" />
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-2 right-3 h-9 w-9 grid place-items-center rounded-full bg-white shadow border border-slate-200 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
              {/* ====== Header: centered avatar + name + banner strip ====== */}
              <section className="px-4 pt-2">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {vendor.avatar_url ? (
                      <img
                        src={vendor.avatar_url}
                        alt={displayName}
                        className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg bg-white"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full grid place-items-center font-display text-xl font-bold text-amber-800 bg-gradient-to-br from-amber-50 to-emerald-50 border-4 border-white shadow-lg">
                        {initials(displayName)}
                      </div>
                    )}
                    {extras?.verified && (
                      <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white grid place-items-center shadow border border-emerald-200">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold text-slate-900 text-center">{displayName}</h2>
                  <p className="text-[11px] text-slate-500">{sub}</p>
                  {extras?.is_premium && (
                    <span className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-bold shadow">
                      <Award className="h-3 w-3" /> PREMIUM VENDOR
                    </span>
                  )}
                </div>

                {/* Banner strip */}
                <div className="mt-3 rounded-2xl overflow-hidden border border-amber-200 bg-white shadow-sm h-32 grid grid-cols-3 gap-0.5">
                  {[vendor.cover_image_url, vendor.avatar_url, items[0]?.catalog_items?.image_url]
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((src, i) => (
                      <img key={i} src={src!} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ))}
                  {[vendor.cover_image_url, vendor.avatar_url, items[0]?.catalog_items?.image_url].filter(Boolean).length === 0 && (
                    <div className="col-span-3 grid place-items-center text-slate-300">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </section>

              {/* ====== Badges row ====== */}
              <section className="mt-3 px-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {badges.map((b: { icon: any; label: string; sub: string; tone: "ok" | "warn" }, i: number) => {
                    const Icon = b.icon;
                    const isOk = b.tone === "ok";
                    return (
                      <div
                        key={i}
                        className={`flex-shrink-0 w-[110px] rounded-2xl border px-2.5 py-2 text-center bg-white ${
                          isOk ? "border-emerald-200" : "border-amber-200"
                        }`}
                      >
                        <span className={`mx-auto h-8 w-8 grid place-items-center rounded-full ${
                          isOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="mt-1 text-[11px] font-display font-bold text-slate-800 leading-tight">{b.label}</p>
                        <p className="text-[9px] text-slate-500 underline underline-offset-2">{b.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ====== Stats tiles ====== */}
              <section className="mt-1 px-4 grid grid-cols-3 gap-2">
                <StatTile
                  big={totalServed > 0 ? `${totalServed}+` : "100+"}
                  label="Available client"
                  onClick={() => setOpenJourney("good")}
                />
                <StatTile
                  big="Warranty"
                  label="yes"
                  icon={<Award className="h-4 w-4" />}
                />
                <StatTile
                  big="Full"
                  label="support"
                  icon={<Wrench className="h-4 w-4" />}
                />
              </section>

              {/* ====== Happy / Bad customer breakdown (clickable journey) ====== */}
              <section className="mt-3 mx-4 rounded-2xl bg-white border border-slate-200 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOpenJourney("good")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[12px]">
                        <ThumbsUp className="h-3.5 w-3.5" /> Happy
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <p className="font-display font-bold text-emerald-800 text-lg leading-none mt-1">{happyPct}%</p>
                    <p className="text-[10px] text-emerald-700">{reviewBreakdown?.good ?? 0} happy customers</p>
                  </button>
                  <button
                    onClick={() => setOpenJourney("bad")}
                    className="rounded-xl border border-red-200 bg-red-50/60 p-2 text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[12px]">
                        <ThumbsDown className="h-3.5 w-3.5" /> Concerns
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-red-600" />
                    </div>
                    <p className="font-display font-bold text-red-700 text-lg leading-none mt-1">{badPct}%</p>
                    <p className="text-[10px] text-red-700">{reviewBreakdown?.bad ?? 0} concerns reported</p>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" fill="currentColor" /> {rating.toFixed(1)} · {totalServed} reviews</span>
                  {vendor.distance_km != null && (
                    <span className="inline-flex items-center gap-1"><Navigation className="h-3 w-3 text-emerald-600" /> {vendor.distance_km} km</span>
                  )}
                </div>
              </section>

              {/* ====== Service/product list ====== */}
              <section className="mt-3 mx-4">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <h3 className="font-display font-bold text-slate-900 text-sm inline-flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-amber-600" /> {category ?? "Services"} offered
                  </h3>
                  <span className="text-[10px] text-slate-400 underline underline-offset-2">Recommended</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-center text-[11px] text-slate-400">
                      No catalog items yet — vendor will quote on chat.
                    </div>
                  )}
                  {items.map((it) => {
                    const range = it.price_min != null && it.price_max != null
                      ? `₹${Number(it.price_min).toLocaleString("en-IN")} – ₹${Number(it.price_max).toLocaleString("en-IN")}`
                      : it.price_min != null
                        ? `₹${Number(it.price_min).toLocaleString("en-IN")}+`
                        : "On request";
                    return (
                      <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 grid place-items-center">
                          {it.catalog_items?.image_url ? (
                            <img src={it.catalog_items.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Wrench className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-[13px] font-bold text-slate-900 truncate">
                            {it.catalog_items?.name ?? "Service"}
                          </p>
                          {it.notes && (
                            <p className="text-[10px] text-slate-500 truncate">{it.notes}</p>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-0.5 font-display font-bold text-emerald-700 text-[13px] flex-shrink-0">
                          <IndianRupee className="h-3 w-3" />{range.replace(/₹/g, "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Vendor tags (entity / trade / deals_in) */}
              {(extras?.entity || extras?.trade || extras?.deals_in) && (
                <section className="mt-3 mx-4 rounded-2xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1">About vendor</p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {extras?.entity && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{extras.entity}</span>}
                    {extras?.trade && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{extras.trade}</span>}
                    {extras?.deals_in && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{extras.deals_in}</span>}
                    {extras?.vendor_type && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 capitalize">{extras.vendor_type}</span>}
                  </div>
                </section>
              )}
            </div>

            {/* ====== Sticky bottom action bar ====== */}
            <div className="absolute left-0 right-0 bottom-0 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] bg-gradient-to-t from-white via-white to-white/85 border-t border-slate-200">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <button
                  onClick={onApprove}
                  disabled={approveDisabled || approving}
                  className={`h-12 rounded-2xl font-display font-bold text-base inline-flex items-center justify-center gap-2 transition active:scale-95 ${
                    isApproved
                      ? "bg-emerald-500 text-white"
                      : approveDisabled
                        ? "bg-slate-100 text-slate-400"
                        : "bg-gradient-to-b from-amber-500 to-amber-700 text-white shadow-lg"
                  }`}
                >
                  {approving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isApproved ? (
                    <><CheckCircle2 className="h-5 w-5" /> Approved</>
                  ) : (
                    <>Approve {priceRange ? `· ${priceRange}` : ""}</>
                  )}
                </button>
                <button
                  onClick={onChat}
                  className="h-12 w-12 rounded-2xl bg-white border-2 border-sky-500 text-sky-700 grid place-items-center active:scale-95 shadow"
                  aria-label="Chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                {(vendor.phone || vendor.whatsapp) && (
                  <a
                    href={`tel:${vendor.phone || vendor.whatsapp}`}
                    className="h-12 w-12 rounded-2xl bg-white border-2 border-emerald-500 text-emerald-700 grid place-items-center active:scale-95 shadow"
                    aria-label="Call"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Journey drawer (Happy / Concerns drill-down) */}
          <AnimatePresence>
            {openJourney && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99] grid place-items-end bg-black/55 backdrop-blur-sm"
                onClick={() => setOpenJourney(null)}
              >
                <motion.div
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-4 pb-[env(safe-area-inset-bottom)]"
                >
                  <div className="grid place-items-center pb-2">
                    <span className="h-1.5 w-12 rounded-full bg-slate-200" />
                  </div>
                  <h4 className={`font-display font-bold text-base ${openJourney === "good" ? "text-emerald-800" : "text-red-700"}`}>
                    {openJourney === "good" ? "Happy customers journey" : "Concerns reported"}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {openJourney === "good"
                      ? `${reviewBreakdown?.good ?? 0} out of ${reviewBreakdown?.total ?? 0} customers rated ${displayName} 4★ or above.`
                      : `${reviewBreakdown?.bad ?? 0} customers raised concerns. Vendor is actively improving.`}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniStat n={reviewBreakdown?.total ?? 0} l="Total leads" />
                    <MiniStat n={reviewBreakdown?.good ?? 0} l="Happy" tone="ok" />
                    <MiniStat n={reviewBreakdown?.bad ?? 0} l="Concerns" tone="warn" />
                  </div>
                  <button
                    onClick={() => setOpenJourney(null)}
                    className="mt-4 w-full h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm active:scale-95"
                  >
                    Close
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function StatTile({ big, label, icon, onClick }: { big: string; label: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="rounded-2xl border border-amber-200 bg-white p-2.5 text-center shadow-sm active:scale-[0.97] disabled:active:scale-100"
    >
      <div className="font-display text-lg font-bold text-slate-900 leading-none inline-flex items-center gap-1 justify-center">
        {icon}{big}
      </div>
      <p className="text-[10px] text-slate-500 underline underline-offset-2 mt-1">{label}</p>
    </button>
  );
}

function MiniStat({ n, l, tone }: { n: number; l: string; tone?: "ok" | "warn" }) {
  const cls = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-red-700" : "text-slate-800";
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
      <p className={`font-display font-bold text-lg leading-none ${cls}`}>{n}</p>
      <p className="text-[10px] text-slate-500 mt-1">{l}</p>
    </div>
  );
}
