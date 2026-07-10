import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
  User as UserIcon,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { SheetShell } from "@/components/vendor/SheetShell";
import { ListingCard, type ListingCardData } from "@/components/vendor/ListingCard";
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
      <SheetShell>
        <VendorListingPage />
      </SheetShell>
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
  city: string | null;
  state: string | null;
  created_at: string | null;
};

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
  const [profileTab, setProfileTab] = useState<"business" | "personal">("business");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"cover" | "avatar" | null>(null);
  const [editPrice, setEditPrice] = useState<Mapping | null>(null);
  const [moreOpen, setMoreOpen] = useState<Mapping | null>(null);

  const coverInput = useRef<HTMLInputElement | null>(null);
  const avatarInput = useRef<HTMLInputElement | null>(null);

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
          "business_name, owner_name, trade, avatar_url, profile_photo_url, cover_image_url, verified, is_premium, city, state, created_at",
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

  const compressImage = async (file: File, maxW: number): Promise<Blob> => {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85)!);
  };

  const uploadImage = async (kind: "cover" | "avatar", file: File) => {
    if (!uid) return;
    setUploading(kind);
    try {
      const blob = await compressImage(file, kind === "cover" ? 1600 : 720);
      const path = `${uid}/vendor-${kind}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("business-cards")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
      const patch = kind === "cover"
        ? { cover_image_url: data.publicUrl }
        : { profile_photo_url: data.publicUrl };
      const { error: uErr } = await supabase
        .from("vendors")
        .update(patch)
        .eq("user_id", uid);
      if (uErr) throw uErr;
      setVendor((v) => (v ? { ...v, ...patch } as VendorRow : v));

      toast.success(kind === "cover" ? "Cover updated" : "Photo updated");
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
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

  const avatar = vendor?.profile_photo_url ?? vendor?.avatar_url ?? "/karo-logo.png";
  const cover = vendor?.cover_image_url ?? null;

  const location = [vendor?.city, vendor?.state].filter(Boolean).join(", ") || "India";
  const displayName =
    (profileTab === "business"
      ? vendor?.business_name ?? vendor?.owner_name
      : vendor?.owner_name ?? vendor?.business_name) ?? "Your Business";

  return (
    <div className="pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-2 pb-2" style={{ background: "linear-gradient(180deg, #fffdf6 92%, #fffdf6/0 100%)" }}>
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
        <div className="mt-2">
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
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-white overflow-hidden border border-[color:oklch(0.90_0.03_82/0.8)] shadow-[0_8px_24px_-12px_rgba(184,134,11,0.25)]"
          >
            <div className="relative h-36 w-full bg-[color:oklch(0.92_0.05_82)]">
              {cover ? (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.90 0.08 82) 0%, oklch(0.82 0.14 65) 100%)",
                  }}
                />
              )}
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage("cover", f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => coverInput.current?.click()}
                disabled={uploading === "cover"}
                className="absolute top-2.5 right-2.5 h-8 px-2.5 rounded-full bg-black/60 backdrop-blur text-white text-[10.5px] font-bold flex items-center gap-1 active:scale-95"
              >
                {uploading === "cover" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                Change Cover
              </button>
            </div>
            <div className="px-4 pb-4 -mt-10">
              <div className="flex items-end gap-3">
                <div className="relative shrink-0">
                  <div className="h-[84px] w-[84px] rounded-full ring-4 ring-white overflow-hidden bg-white shadow-md">
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  </div>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage("avatar", f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploading === "avatar"}
                    className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-black/75 grid place-items-center text-white ring-2 ring-white active:scale-90"
                    aria-label="Change photo"
                  >
                    {uploading === "avatar" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0 pt-9">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-[17px] font-bold text-[color:oklch(0.22_0.05_60)] truncate leading-tight">
                      {displayName}
                    </h2>
                    {vendor?.verified && (
                      <BadgeCheck className="h-4 w-4 text-[color:oklch(0.65_0.15_65)] flex-shrink-0" />
                    )}
                  </div>
                  {vendor?.trade && (
                    <p className="text-[11px] font-semibold text-[color:oklch(0.40_0.04_60)] leading-tight truncate">
                      {vendor.trade}
                    </p>
                  )}
                  <p className="text-[10.5px] text-[color:oklch(0.48_0.04_60)] flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {location}
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="h-8 px-3 rounded-full border border-[color:oklch(0.75_0.14_82)] bg-white text-[11px] font-bold text-[color:oklch(0.40_0.10_65)] flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </div>

              {vendor?.is_premium && (
                <div
                  className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[color:oklch(0.30_0.10_65)]"
                  style={{ background: "linear-gradient(90deg, #fff2c8, #ffe08a)" }}
                >
                  <Crown className="h-3 w-3" /> Premium Member
                </div>
              )}

              {/* Profile tabs */}
              <div
                className="mt-3 h-10 rounded-full p-1 flex items-center gap-1"
                style={{ background: "oklch(0.96 0.02 82)" }}
              >
                {(["business", "personal"] as const).map((k) => {
                  const active = profileTab === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setProfileTab(k)}
                      className={`flex-1 h-full rounded-full text-[11.5px] font-bold flex items-center justify-center gap-1 transition-all ${
                        active ? "text-white shadow" : "text-[color:oklch(0.45_0.04_60)]"
                      }`}
                      style={active ? { background: GOLD } : undefined}
                    >
                      {k === "business" ? (
                        <Store className="h-3.5 w-3.5" />
                      ) : (
                        <UserIcon className="h-3.5 w-3.5" />
                      )}
                      {k === "business" ? "Business Profile" : "Personal Profile"}
                    </button>
                  );
                })}
              </div>

              {/* mini stats */}
              <div className="mt-3 grid grid-cols-5 gap-1.5 pt-3 border-t border-[color:oklch(0.92_0.02_82)]">
                <MiniStat icon={ClipboardList} label="Total Listings" value={stats.total} />
                <MiniStat icon={ShoppingBag} label="Total Orders" value={0} />
                <MiniStat icon={Users} label="Total Leads" value={0} />
                <MiniStat icon={ThumbsUp} label="Happy" value="—" />
                <MiniStat icon={CalendarCheck} label="Since" value={memberSince} small />
              </div>
            </div>
          </motion.section>

          {/* Search + filter */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-12 rounded-2xl bg-white border border-[color:oklch(0.90_0.03_82)] flex items-center gap-2 px-3 shadow-sm">
              <Search className="h-4 w-4 text-[color:oklch(0.55_0.04_60)] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services, products, categories…"
                className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px] placeholder:text-[color:oklch(0.60_0.03_60)]"
              />
            </div>
            <button className="h-12 w-12 rounded-2xl bg-white border border-[color:oklch(0.90_0.03_82)] grid place-items-center active:scale-95 shadow-sm shrink-0">
              <Filter className="h-4 w-4 text-[color:oklch(0.45_0.10_65)]" />
            </button>
          </div>

          {/* Quick stat tiles */}
          <div className="grid grid-cols-2 gap-2">
            <QuickTile
              icon={CheckCircle2}
              tone="green"
              label="Active Listings"
              value={stats.active}
              sub={`${pct(stats.active, stats.total)}%`}
            />
            <QuickTile
              icon={XCircle}
              tone="red"
              label="Inactive Listings"
              value={stats.inactive}
              sub={`${pct(stats.inactive, stats.total)}%`}
            />
            <QuickTile icon={ShoppingBag} tone="violet" label="Total Orders" value={0} />
            <QuickTile icon={Users} tone="blue" label="Total Leads" value={0} />
          </div>

          {/* Your Listings */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="font-display text-[16px] font-bold text-[color:oklch(0.25_0.05_60)]">
              Your Listings
            </h3>
            <button
              onClick={() => navigate({ to: "/vendor/services" })}
              className="text-[11px] font-bold text-[color:oklch(0.45_0.12_65)]"
            >
              View All ›
            </button>
          </div>

          {filteredMappings.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-[color:oklch(0.80_0.10_82)] p-6 text-center">
              <p className="text-[13px] font-bold text-[color:oklch(0.30_0.05_60)]">
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
              {filteredMappings.map((m, idx) => {
                const it = items.get(m.item_id);
                if (!it) return null;
                const cat = cats.get(it.category_id);
                const data: ListingCardData = {
                  id: m.id,
                  name: it.name,
                  subtitle: cat?.name ?? "—",
                  image: it.image_url ?? it.icon,
                  priceMin: m.price_min ?? it.price_min,
                  priceMax: m.price_max ?? it.price_max,
                  isActive: m.is_active,
                  updatedLabel: `Updated ${timeAgo(m.updated_at)}`,
                  duration: undefined,
                  serviceType: "Home Service",
                  grade: "Standard",
                  rating: null,
                  reviews: null,
                  orders: 0,
                  leads: 0,
                  views: 0,
                  responseRate: "—",
                };
                return (
                  <ListingCard
                    key={m.id}
                    data={data}
                    index={idx}
                    saving={savingId === m.id}
                    onToggle={() => toggleActive(m)}
                    onEditPrice={() => setEditPrice(m)}
                    onMore={() => setMoreOpen(m)}
                  />
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
        <span className="h-9 px-3.5 rounded-full bg-black/85 text-white text-[11px] font-bold flex items-center shadow-lg">
          Add Your Inventory
        </span>
        <span
          className="h-14 w-14 rounded-full grid place-items-center text-white shadow-xl ring-4 ring-white/70"
          style={{ background: GOLD }}
        >
          <Plus className="h-7 w-7" strokeWidth={3} />
        </span>
      </button>

      {/* Edit price sheet */}
      <EditPriceSheet
        mapping={editPrice}
        onClose={() => setEditPrice(null)}
        onSaved={(m) => {
          setMappings((prev) => prev.map((r) => (r.id === m.id ? m : r)));
          setEditPrice(null);
        }}
      />

      {/* More menu sheet */}
      <MoreMenu
        mapping={moreOpen}
        onClose={() => setMoreOpen(null)}
        onEdit={() => {
          setEditPrice(moreOpen);
          setMoreOpen(null);
        }}
        onDuplicate={() => {
          toast("Duplicate coming soon");
          setMoreOpen(null);
        }}
        onRemove={async () => {
          if (!moreOpen) return;
          await supabase.from("vendor_item_mappings").update({ is_active: false }).eq("id", moreOpen.id);
          toast.success("Listing hidden");
          setMoreOpen(null);
          load();
        }}
      />
    </div>
  );
}

function EditPriceSheet({
  mapping,
  onClose,
  onSaved,
}: {
  mapping: Mapping | null;
  onClose: () => void;
  onSaved: (m: Mapping) => void;
}) {
  const [pmin, setPmin] = useState("");
  const [pmax, setPmax] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mapping) {
      setPmin(mapping.price_min?.toString() ?? "");
      setPmax(mapping.price_max?.toString() ?? "");
    }
  }, [mapping]);

  const save = async () => {
    if (!mapping) return;
    setSaving(true);
    const payload = {
      price_min: pmin ? Number(pmin) : null,
      price_max: pmax ? Number(pmax) : null,
    };
    const { data, error } = await supabase
      .from("vendor_item_mappings")
      .update(payload)
      .eq("id", mapping.id)
      .select("id, item_id, is_active, price_min, price_max, updated_at")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Save failed");
      return;
    }
    onSaved(data as Mapping);
    toast.success("Price updated");
  };

  return (
    <AnimatePresence>
      {mapping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 grid items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-[16px] font-bold text-[color:oklch(0.22_0.05_60)]">
                Edit Price
              </h4>
              <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center bg-[color:oklch(0.95_0.02_60)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-[color:oklch(0.45_0.04_60)]">
                Min Price (₹)
                <input
                  type="number"
                  inputMode="numeric"
                  value={pmin}
                  onChange={(e) => setPmin(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-[color:oklch(0.88_0.03_82)] px-3 text-[14px] font-bold text-[color:oklch(0.22_0.05_60)] outline-none focus:border-[color:oklch(0.65_0.14_65)]"
                />
              </label>
              <label className="text-[11px] font-semibold text-[color:oklch(0.45_0.04_60)]">
                Max Price (₹)
                <input
                  type="number"
                  inputMode="numeric"
                  value={pmax}
                  onChange={(e) => setPmax(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-[color:oklch(0.88_0.03_82)] px-3 text-[14px] font-bold text-[color:oklch(0.22_0.05_60)] outline-none focus:border-[color:oklch(0.65_0.14_65)]"
                />
              </label>
            </div>
            <button
              disabled={saving}
              onClick={save}
              className="mt-4 w-full h-12 rounded-2xl text-white font-bold text-[13px] shadow disabled:opacity-60"
              style={{ background: GOLD }}
            >
              {saving ? "Saving…" : "Save Price"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MoreMenu({
  mapping,
  onClose,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  mapping: Mapping | null;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <AnimatePresence>
      {mapping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 grid items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full rounded-t-3xl bg-white p-2 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-2 pb-1 grid place-items-center">
              <span className="h-1.5 w-10 rounded-full bg-[color:oklch(0.88_0.03_60)]" />
            </div>
            <MenuItem label="Edit Price" onClick={onEdit} />
            <MenuItem label="Duplicate" onClick={onDuplicate} />
            <MenuItem label="Hide / Remove" onClick={onRemove} danger />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-12 rounded-xl text-[13.5px] font-bold text-left px-4 active:bg-[color:oklch(0.96_0.02_60)] ${
        danger ? "text-[color:oklch(0.50_0.18_25)]" : "text-[color:oklch(0.25_0.05_60)]"
      }`}
    >
      {label}
    </button>
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
      <span
        className="h-6 w-6 rounded-full grid place-items-center mb-0.5"
        style={{ background: "oklch(0.96 0.06 82)" }}
      >
        <Icon className="h-3.5 w-3.5 text-[color:oklch(0.45_0.12_65)]" />
      </span>
      <p
        className={`font-display font-bold text-[color:oklch(0.22_0.05_60)] tabular-nums leading-tight ${
          small ? "text-[11px]" : "text-[14px]"
        }`}
      >
        {value}
      </p>
      <p className="text-[8.5px] uppercase tracking-wide text-[color:oklch(0.50_0.04_60)] leading-tight mt-0.5">
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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
    <div className="rounded-2xl bg-white border border-[color:oklch(0.92_0.02_82)] p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full grid place-items-center shrink-0" style={{ background: t.bg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: t.fg }} />
        </span>
        <p className="text-[11px] font-bold text-[color:oklch(0.35_0.04_60)] truncate">
          {label}
        </p>
      </div>
      <div className="flex items-end justify-between mt-2">
        <p className="font-display text-[22px] font-bold text-[color:oklch(0.22_0.05_60)] tabular-nums leading-none">
          {value}
        </p>
        {sub && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: t.bg, color: t.fg }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
