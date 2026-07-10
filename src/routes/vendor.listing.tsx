import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Store,
  ClipboardList,
  ShoppingBag,
  Users,
  ThumbsUp,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Camera,
  Pencil,
  MapPin,
  BadgeCheck,
  Crown,
  MoreHorizontal,
  Loader2,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/listing")({
  head: () => ({
    meta: [
      { title: "My Listing / Inventory — Vendor" },
      { name: "description", content: "Apne mapped services & products manage karein." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <VendorAuthGate>
      <VendorListingPage />
    </VendorAuthGate>
  ),
});

type Mapping = {
  id: string;
  item_id: string;
  is_active: boolean;
  price_min: number | null;
  price_max: number | null;
  updated_at: string;
};

type Item = {
  id: string;
  name: string;
  image_url: string | null;
  icon: string | null;
  category_id: string;
  price_min: number | null;
  price_max: number | null;
};

type Cat = { id: string; name: string; parent_id: string | null };

type VendorRow = {
  business_name: string | null;
  owner_name: string | null;
  trade: string | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
  cover_image_url: string | null;
  verified: boolean | null;
  is_premium: boolean | null;
  created_at: string | null;
};

const PAGE_BG = "linear-gradient(180deg, #fffdf6 0%, #fdf6e3 100%)";
const GOLD = "linear-gradient(135deg, #f5d97a 0%, #d4af37 55%, #b8860b 100%)";

function VendorListingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [cats, setCats] = useState<Map<string, Cat>>(new Map());
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    setUid(userId);
    if (!userId) {
      setLoading(false);
      return;
    }
    const [vRes, mRes, iRes, cRes] = await Promise.all([
      supabase
        .from("vendors")
        .select(
          "business_name, owner_name, trade, avatar_url, profile_photo_url, cover_image_url, verified, is_premium, created_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("vendor_item_mappings")
        .select("id, item_id, is_active, price_min, price_max, updated_at")
        .eq("vendor_id", userId)
        .order("updated_at", { ascending: false }),
      supabase.from("catalog_items").select(
        "id, name, image_url, icon, category_id, price_min, price_max",
      ),
      supabase.from("categories").select("id, name, parent_id"),
    ]);
    setVendor((vRes.data ?? null) as VendorRow | null);
    setMappings((mRes.data ?? []) as Mapping[]);
    const im = new Map<string, Item>();
    ((iRes.data ?? []) as Item[]).forEach((r) => im.set(r.id, r));
    setItems(im);
    const cm = new Map<string, Cat>();
    ((cRes.data ?? []) as Cat[]).forEach((r) => cm.set(r.id, r));
    setCats(cm);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`vendor-listing-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_item_mappings", filter: `vendor_id=eq.${uid}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  const toggleActive = async (m: Mapping) => {
    setSavingId(m.id);
    const next = !m.is_active;
    // optimistic
    setMappings((prev) => prev.map((r) => (r.id === m.id ? { ...r, is_active: next } : r)));
    const { error } = await supabase
      .from("vendor_item_mappings")
      .update({ is_active: next })
      .eq("id", m.id);
    setSavingId(null);
    if (error) {
      toast.error("Toggle nahi ho saka");
      setMappings((prev) => prev.map((r) => (r.id === m.id ? { ...r, is_active: !next } : r)));
    }
  };

  const stats = useMemo(() => {
    const active = mappings.filter((m) => m.is_active).length;
    const inactive = mappings.length - active;
    return { active, inactive, total: mappings.length };
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter((m) => {
      const it = items.get(m.item_id);
      if (!it) return false;
      const cat = cats.get(it.category_id);
      return (
        it.name.toLowerCase().includes(q) ||
        (cat?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [mappings, items, cats, query]);

  const memberSince = vendor?.created_at
    ? new Date(vendor.created_at).toLocaleString("en-IN", { month: "short", year: "numeric" })
    : "—";

  const avatar =
    vendor?.profile_photo_url ?? vendor?.avatar_url ?? "/karo-logo.png";
  const cover =
    vendor?.cover_image_url ??
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="min-h-screen pb-32" style={{ background: PAGE_BG }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-3 pb-2" style={{ background: PAGE_BG }}>
        <div className="flex items-center justify-between">
          <button
            aria-label="Back"
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.85_0.05_82)] active:scale-90 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.35_0.08_60)]" />
          </button>
          <button
            onClick={() => navigate({ to: "/vendor/services" })}
            className="h-9 pl-3 pr-4 rounded-full bg-white border-2 border-[color:oklch(0.75_0.14_82)] flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Store className="h-3.5 w-3.5 text-[color:oklch(0.45_0.12_65)]" />
            <span className="text-[12px] font-bold text-[color:oklch(0.35_0.10_60)]">My Listing</span>
          </button>
        </div>
        <div className="mt-3">
          <h1 className="font-display text-[22px] font-bold leading-tight text-[color:oklch(0.25_0.05_60)]">
            My Listing / Inventory
          </h1>
          <p className="text-[11px] text-[color:oklch(0.45_0.04_60)] mt-0.5">
            All your mapped services &amp; products
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[color:oklch(0.55_0.12_65)]" />
        </div>
      ) : (
        <div className="px-4 space-y-4 mt-2">
          {/* Business card */}
          <section className="rounded-3xl bg-white overflow-hidden border border-[color:oklch(0.85_0.05_82/0.6)] shadow-sm">
            <div className="relative h-32 w-full">
              <img src={cover} alt="cover" className="h-full w-full object-cover" />
              <button className="absolute top-2 right-2 h-8 px-2.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1">
                <Camera className="h-3 w-3" /> Change Cover
              </button>
            </div>
            <div className="px-4 pb-4 -mt-8">
              <div className="flex items-end gap-3">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full ring-4 ring-white overflow-hidden bg-white shadow">
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-black/70 grid place-items-center text-white">
                    <Camera className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex-1 pt-8 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-base font-bold text-[color:oklch(0.22_0.05_60)] truncate">
                      {vendor?.business_name ?? vendor?.owner_name ?? "Your Business"}
                    </h2>
                    {vendor?.verified && (
                      <BadgeCheck className="h-4 w-4 text-[color:oklch(0.65_0.15_65)] flex-shrink-0" />
                    )}
                  </div>
                  {vendor?.trade && (
                    <p className="text-[11px] font-semibold text-[color:oklch(0.35_0.04_60)] leading-tight">
                      {vendor.trade}
                    </p>
                  )}
                  <p className="text-[10.5px] text-[color:oklch(0.45_0.04_60)] flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> India
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="h-8 px-3 rounded-full border border-[color:oklch(0.75_0.14_82)] bg-white text-[11px] font-bold text-[color:oklch(0.40_0.10_65)] flex items-center gap-1 active:scale-95"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </div>

              {vendor?.is_premium && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[color:oklch(0.30_0.10_65)]"
                  style={{ background: "linear-gradient(90deg, #fff2c8, #ffe08a)" }}
                >
                  <Crown className="h-3 w-3" /> Premium Member
                </div>
              )}

              {/* mini stats */}
              <div className="mt-3 grid grid-cols-5 gap-1.5 pt-3 border-t border-[color:oklch(0.90_0.02_82)]">
                <MiniStat icon={ClipboardList} label="Total Listings" value={stats.total} />
                <MiniStat icon={ShoppingBag} label="Total Orders" value={0} />
                <MiniStat icon={Users} label="Total Leads" value={0} />
                <MiniStat icon={ThumbsUp} label="Happy" value="—" />
                <MiniStat icon={CalendarCheck} label="Since" value={memberSince} small />
              </div>
            </div>
          </section>

          {/* Search + filter */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 rounded-2xl bg-white border border-[color:oklch(0.88_0.03_82)] flex items-center gap-2 px-3 shadow-sm">
              <Search className="h-4 w-4 text-[color:oklch(0.55_0.04_60)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services, products, categories…"
                className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-[color:oklch(0.60_0.03_60)]"
              />
            </div>
            <button className="h-11 w-11 rounded-2xl bg-white border border-[color:oklch(0.88_0.03_82)] grid place-items-center active:scale-95 shadow-sm">
              <Filter className="h-4 w-4 text-[color:oklch(0.45_0.10_65)]" />
            </button>
          </div>

          {/* Quick stat tiles */}
          <div className="grid grid-cols-4 gap-2">
            <QuickTile icon={CheckCircle2} tone="green" label="Active" value={stats.active} sub={`${pct(stats.active, stats.total)}%`} />
            <QuickTile icon={XCircle} tone="red" label="Inactive" value={stats.inactive} sub={`${pct(stats.inactive, stats.total)}%`} />
            <QuickTile icon={ShoppingBag} tone="violet" label="Orders" value={0} />
            <QuickTile icon={Users} tone="blue" label="Leads" value={0} />
          </div>

          {/* Your Listings */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="font-display text-[15px] font-bold text-[color:oklch(0.25_0.05_60)]">Your Listings</h3>
            <button
              onClick={() => navigate({ to: "/vendor/services" })}
              className="text-[11px] font-bold text-[color:oklch(0.45_0.12_65)] flex items-center gap-0.5"
            >
              View All ›
            </button>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-[color:oklch(0.80_0.10_82)] p-6 text-center">
              <Package className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.12_65)]" />
              <p className="mt-2 text-[13px] font-bold text-[color:oklch(0.30_0.05_60)]">
                {query ? "Koi listing match nahi hui" : "Abhi tak koi listing nahi hai"}
              </p>
              <p className="text-[11px] text-[color:oklch(0.50_0.04_60)] mt-1">
                Neeche + button se apni pehli service / product add karein.
              </p>
              <button
                onClick={() => navigate({ to: "/vendor/services" })}
                className="mt-3 h-10 px-4 rounded-full text-[12px] font-bold text-white shadow"
                style={{ background: GOLD }}
              >
                + Add Your First Listing
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filteredMappings.map((m) => {
                const it = items.get(m.item_id);
                if (!it) return null;
                const cat = cats.get(it.category_id);
                const priceMin = m.price_min ?? it.price_min;
                const priceMax = m.price_max ?? it.price_max;
                const updated = timeAgo(m.updated_at);
                return (
                  <li
                    key={m.id}
                    className="rounded-2xl bg-white border border-[color:oklch(0.88_0.03_82)] shadow-sm overflow-hidden"
                  >
                    <div className="p-3 flex gap-3">
                      <div className="h-16 w-16 rounded-xl bg-[color:oklch(0.96_0.02_82)] overflow-hidden flex-shrink-0 grid place-items-center border border-[color:oklch(0.90_0.03_82)]">
                        {it.image_url || it.icon ? (
                          <img src={it.image_url ?? it.icon ?? ""} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-[color:oklch(0.60_0.05_60)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-[color:oklch(0.22_0.05_60)] truncate">
                              {it.name}
                            </p>
                            <p className="text-[10.5px] font-semibold text-[color:oklch(0.45_0.04_60)] truncate">
                              {cat?.name ?? "—"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                                m.is_active
                                  ? "bg-[color:oklch(0.92_0.10_150)] text-[color:oklch(0.35_0.12_150)]"
                                  : "bg-[color:oklch(0.94_0.02_60)] text-[color:oklch(0.45_0.03_60)]"
                              }`}
                            >
                              {m.is_active ? "Active" : "Inactive"}
                            </span>
                            <button
                              disabled={savingId === m.id}
                              onClick={() => toggleActive(m)}
                              className={`relative h-5 w-9 rounded-full transition ${
                                m.is_active ? "" : "bg-[color:oklch(0.90_0.02_60)]"
                              }`}
                              style={m.is_active ? { background: GOLD } : undefined}
                              aria-label="Toggle active"
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                                  m.is_active ? "left-[18px]" : "left-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-[color:oklch(0.40_0.10_65)]">
                          {priceMin != null || priceMax != null
                            ? `₹${priceMin ?? "—"} – ₹${priceMax ?? "—"}`
                            : "Price not set"}
                        </p>
                        <p className="text-[10px] text-[color:oklch(0.50_0.04_60)] mt-0.5">
                          Updated {updated}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1 border-t border-[color:oklch(0.92_0.02_82)] bg-[color:oklch(0.98_0.01_82)] py-2 px-2 text-center">
                      <MiniKPI label="Orders" value={0} color="oklch(0.45_0.15_150)" />
                      <MiniKPI label="Leads" value={0} color="oklch(0.45_0.15_240)" />
                      <MiniKPI label="Views" value={0} color="oklch(0.40_0.12_290)" />
                      <MiniKPI label="Resp" value="—" color="oklch(0.45_0.15_150)" />
                      <button className="grid place-items-center rounded-lg active:scale-90">
                        <MoreHorizontal className="h-4 w-4 text-[color:oklch(0.50_0.04_60)]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Floating Add Inventory FAB */}
      <button
        onClick={() => navigate({ to: "/vendor/services" })}
        className="fixed bottom-6 right-4 z-30 flex items-center gap-2 active:scale-95"
        aria-label="Add Your Inventory"
      >
        <span className="hidden sm:inline-block h-9 px-3 rounded-full bg-black/80 text-white text-[11px] font-bold grid place-items-center shadow-lg">
          Add Your Inventory
        </span>
        <span
          className="h-14 w-14 rounded-full grid place-items-center text-white shadow-xl ring-4 ring-white/70"
          style={{ background: GOLD }}
        >
          <Plus className="h-7 w-7" strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const day = Math.floor(d / 86400000);
  if (day <= 0) return "today";
  if (day === 1) return "1 day ago";
  if (day < 30) return `${day} days ago`;
  const mo = Math.floor(day / 30);
  return `${mo} mo ago`;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="h-3.5 w-3.5 text-[color:oklch(0.50_0.10_65)]" />
      <p
        className={`font-display font-bold text-[color:oklch(0.22_0.05_60)] mt-0.5 tabular-nums ${
          small ? "text-[11px]" : "text-[13px]"
        }`}
      >
        {value}
      </p>
      <p className="text-[8.5px] uppercase tracking-wide text-[color:oklch(0.50_0.04_60)] leading-tight">
        {label}
      </p>
    </div>
  );
}

function QuickTile({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "red" | "violet" | "blue";
  label: string;
  value: number;
  sub?: string;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    green: { bg: "oklch(0.94_0.08_150)", fg: "oklch(0.40_0.15_150)" },
    red: { bg: "oklch(0.95_0.06_25)", fg: "oklch(0.50_0.18_25)" },
    violet: { bg: "oklch(0.95_0.05_290)", fg: "oklch(0.45_0.14_290)" },
    blue: { bg: "oklch(0.95_0.05_240)", fg: "oklch(0.45_0.14_240)" },
  };
  const t = tones[tone];
  return (
    <div className="rounded-2xl bg-white border border-[color:oklch(0.90_0.02_82)] p-2.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span
          className="h-5 w-5 rounded-full grid place-items-center"
          style={{ background: t.bg }}
        >
          <Icon className="h-3 w-3" style={{ color: t.fg }} />
        </span>
        <p className="text-[9.5px] font-bold text-[color:oklch(0.40_0.04_60)] uppercase tracking-wide truncate">
          {label}
        </p>
      </div>
      <div className="flex items-end justify-between mt-1.5">
        <p className="font-display text-[18px] font-bold text-[color:oklch(0.22_0.05_60)] tabular-nums leading-none">
          {value}
        </p>
        {sub && (
          <span
            className="text-[9px] font-bold px-1 py-0.5 rounded"
            style={{ background: t.bg, color: t.fg }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniKPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] uppercase tracking-wide text-[color:oklch(0.50_0.04_60)]">{label}</p>
      <p className="font-display text-[13px] font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
