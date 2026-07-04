import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Camera,
  Phone,
  Building2,
  Wrench,
  Package,
  ClipboardList,
  Check,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const Route = createFileRoute("/vendor/join")({
  head: () => ({
    meta: [
      { title: "Vendor Joining — Karo Online" },
      { name: "description", content: "Apna business Karo Online pe list karein aur leads paayein." },
    ],
  }),
  component: VendorJoinPage,
});

// ── Draft state ────────────────────────────────────────────────────────────
type Draft = {
  location: { lat: number | null; lng: number | null; address: string; radiusKm: number };
  photos: { profile: string; shop: string; cover: string; gallery: string[]; intro: string };
  contact: { mobile: string; whatsapp: string; email: string; primary: "mobile" | "whatsapp" };
  business: {
    name: string;
    type: string;
    experience: string;
    hoursOpen: string;
    hoursClose: string;
    gst: string;
  };
  services: string[];
  products: Array<{ category: string; name: string; price: string; description: string }>;
};

const EMPTY_DRAFT: Draft = {
  location: { lat: null, lng: null, address: "", radiusKm: 10 },
  photos: { profile: "", shop: "", cover: "", gallery: [], intro: "" },
  contact: { mobile: "", whatsapp: "", email: "", primary: "mobile" },
  business: { name: "", type: "", experience: "", hoursOpen: "", hoursClose: "", gst: "" },
  services: [],
  products: [],
};

const DRAFT_KEY = "ko-vendor-join-draft-v1";

function readDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function saveDraft(d: Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch { /* ignore */ }
}

// ── Sections ───────────────────────────────────────────────────────────────
type SectionKey = "location" | "photos" | "contact" | "business" | "services" | "products";

const SECTIONS: Array<{ key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }>; required: boolean; sub: string }> = [
  { key: "location", label: "Business Location", icon: MapPin, required: true, sub: "Select your business location" },
  { key: "photos", label: "Profile & Photos", icon: Camera, required: false, sub: "Add your photo, shop images etc." },
  { key: "contact", label: "Contact Details", icon: Phone, required: true, sub: "Mobile, WhatsApp, Email" },
  { key: "business", label: "Business Information", icon: Building2, required: true, sub: "Business type, Name, Experience" },
  { key: "services", label: "Services", icon: Wrench, required: true, sub: "Select your services / skills" },
  { key: "products", label: "Products", icon: Package, required: false, sub: "Add your products (optional)" },
];

const POPULAR_SERVICES = [
  "Plumber", "AC Repair", "Electrician", "Carpenter", "Painting", "Cleaning",
  "Appliance", "Salon", "Pest Control", "Packers & Movers", "Tailor", "Boutique",
];

const BUSINESS_TYPES = [
  "Sole Proprietor", "Partnership", "Pvt Ltd", "LLP", "Freelancer",
];

const EXPERIENCE_OPTIONS = [
  "Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years",
];

// ── Main ───────────────────────────────────────────────────────────────────
function VendorJoinPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [openSheet, setOpenSheet] = useState<SectionKey | "review" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const completeness = useMemo(() => {
    const checks: Record<SectionKey, boolean> = {
      location: !!draft.location.address,
      photos: !!draft.photos.profile || !!draft.photos.shop,
      contact: !!draft.contact.mobile,
      business: !!draft.business.name && !!draft.business.type,
      services: draft.services.length > 0,
      products: draft.products.length > 0,
    };
    const done = Object.values(checks).filter(Boolean).length;
    return { checks, percent: Math.round((done / SECTIONS.length) * 100) };
  }, [draft]);

  const canSubmit =
    completeness.checks.location &&
    completeness.checks.contact &&
    completeness.checks.business &&
    completeness.checks.services;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Pehle login karein");
        navigate({ to: "/register" });
        return;
      }
      const { error } = await supabase.from("vendors").upsert({
        user_id: user.id,
        business_name: draft.business.name,
        entity: draft.business.type,
        experience_years: parseExperience(draft.business.experience),
        gst: draft.business.gst || null,
        whatsapp: draft.contact.whatsapp || draft.contact.mobile,
        email: draft.contact.email || null,
        profile_photo_url: draft.photos.profile || null,
        avatar_url: draft.photos.profile || null,
        cover_image_url: draft.photos.cover || null,
        gallery_urls: draft.photos.gallery,
        intro_video_url: draft.photos.intro || null,
        lat: draft.location.lat,
        lng: draft.location.lng,
        service_radius_km: draft.location.radiusKm,
        working_hours: draft.business.hoursOpen || draft.business.hoursClose
          ? { open: draft.business.hoursOpen, close: draft.business.hoursClose }
          : null,
        tags: draft.services,
        deals_in: draft.products.length ? "product" : "service",
        role: "owner",
        trade: "service",
        status: "pending",
      }, { onConflict: "user_id" });

      if (error) {
        console.error("[vendor.join] upsert", error);
        toast.error(error.message || "Save fail hua");
        return;
      }

      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      try { window.localStorage.setItem("ko-vendor-mode-v1", "vendor"); } catch { /* ignore */ }

      toast.success("Vendor profile created — welcome!");
      navigate({ to: "/vendor/dashboard", replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-dvh pb-32"
      style={{ background: "linear-gradient(180deg, #f8f0d6 0%, #fdf6e2 60%, #ffffff 100%)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:oklch(0.85_0.08_85/0.4)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/quick" })}
          aria-label="Back"
          className="h-9 w-9 rounded-full grid place-items-center hover:bg-[color:oklch(0.94_0.05_85)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
            Vendor Joining
          </h1>
          <p className="text-[11px] text-[color:oklch(0.50_0.03_85)] leading-tight">
            Complete your profile to start getting leads
          </p>
        </div>
        <span className="h-9 min-w-[44px] px-2 rounded-full bg-[color:oklch(0.78_0.14_82)] text-white text-[12px] font-bold grid place-items-center">
          {completeness.percent}%
        </span>
      </header>

      {/* Progress dots */}
      <div className="px-4 pt-4 pb-2 overflow-x-auto no-scrollbar">
        <ol className="flex items-center gap-1 min-w-max">
          {SECTIONS.map((s, i) => {
            const done = completeness.checks[s.key];
            return (
              <li key={s.key} className="flex items-center gap-1">
                <span
                  className={`h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold border ${
                    done
                      ? "bg-[color:oklch(0.78_0.14_82)] border-[color:oklch(0.78_0.14_82)] text-white"
                      : "bg-white border-[color:oklch(0.85_0.05_85)] text-[color:oklch(0.55_0.05_85)]"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {i < SECTIONS.length - 1 && (
                  <span className={`h-[2px] w-6 ${done ? "bg-[color:oklch(0.78_0.14_82)]" : "bg-[color:oklch(0.90_0.03_85)]"}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Rows */}
      <div className="px-4 mt-2 space-y-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const done = completeness.checks[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setOpenSheet(s.key)}
              className={`w-full text-left rounded-2xl bg-white border-2 p-3 flex items-center gap-3 shadow-sm active:scale-[0.99] transition ${
                done ? "border-emerald-300" : "border-[color:oklch(0.88_0.05_85)]"
              }`}
            >
              <span className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${
                done ? "bg-emerald-50" : "bg-[color:oklch(0.95_0.05_85)]"
              }`}>
                <Icon className={`h-5 w-5 ${done ? "text-emerald-600" : "text-[color:oklch(0.55_0.12_75)]"}`} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
                    {s.label}
                  </span>
                  {!s.required && (
                    <span className="text-[10px] font-semibold text-[color:oklch(0.55_0.05_85)]">
                      (Optional)
                    </span>
                  )}
                </span>
                <span className="block text-[12px] text-[color:oklch(0.50_0.03_85)] leading-tight mt-0.5 truncate">
                  {sectionSummary(s.key, draft) || s.sub}
                </span>
              </span>
              {done ? (
                <span className="h-6 w-6 rounded-full bg-emerald-500 text-white grid place-items-center shrink-0">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 text-[color:oklch(0.55_0.05_85)] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-[color:oklch(0.85_0.08_85/0.5)] px-4 py-3">
        <button
          onClick={() => setOpenSheet("review")}
          disabled={!canSubmit || submitting}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#d4a017] to-[#b8860b] text-white font-display font-bold text-[15px] disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 active:scale-[0.99] transition"
        >
          {submitting ? "Saving…" : canSubmit ? "Submit & Get Started" : "Complete required steps"}
        </button>
      </div>

      {/* Sheets */}
      <SectionSheet
        section={openSheet}
        draft={draft}
        setDraft={setDraft}
        onClose={() => setOpenSheet(null)}
        onSubmit={submit}
        submitting={submitting}
        canSubmit={canSubmit}
      />
    </main>
  );
}

// ── Section summary helper ─────────────────────────────────────────────────
function sectionSummary(key: SectionKey, d: Draft): string {
  switch (key) {
    case "location":
      return d.location.address ? `${d.location.address} · ${d.location.radiusKm} KM` : "";
    case "photos": {
      const n = [d.photos.profile, d.photos.shop, d.photos.cover].filter(Boolean).length + d.photos.gallery.length;
      return n ? `${n} photo${n > 1 ? "s" : ""} added` : "";
    }
    case "contact":
      return d.contact.mobile ? `+91 ${d.contact.mobile}${d.contact.email ? " · " + d.contact.email : ""}` : "";
    case "business":
      return d.business.name ? `${d.business.name}${d.business.type ? " · " + d.business.type : ""}` : "";
    case "services":
      return d.services.length ? `${d.services.length} selected: ${d.services.slice(0, 3).join(", ")}${d.services.length > 3 ? "…" : ""}` : "";
    case "products":
      return d.products.length ? `${d.products.length} product${d.products.length > 1 ? "s" : ""} added` : "";
  }
}

function parseExperience(v: string): number | null {
  if (!v) return null;
  const m = v.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// ── The bottom-sheet container ─────────────────────────────────────────────
function SectionSheet({
  section,
  draft,
  setDraft,
  onClose,
  onSubmit,
  submitting,
  canSubmit,
}: {
  section: SectionKey | "review" | null;
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
}) {
  const open = section !== null;
  const title = section
    ? section === "review"
      ? "Review & Submit"
      : SECTIONS.find((s) => s.key === section)?.label ?? ""
    : "";

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[90dvh] bg-white">
        <DrawerHeader className="flex items-center justify-between border-b border-[color:oklch(0.90_0.03_85)] py-3">
          <DrawerTitle className="text-[16px] font-display font-bold">{title}</DrawerTitle>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full grid place-items-center hover:bg-[color:oklch(0.95_0.03_85)]">
            <X className="h-5 w-5" />
          </button>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {section === "location" && <LocationBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "photos" && <PhotosBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "contact" && <ContactBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "business" && <BusinessBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "services" && <ServicesBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "products" && <ProductsBody draft={draft} setDraft={setDraft} onDone={onClose} />}
          {section === "review" && (
            <ReviewBody
              draft={draft}
              onSubmit={onSubmit}
              submitting={submitting}
              canSubmit={canSubmit}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Individual sheet bodies ────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13px] font-semibold text-[color:oklch(0.25_0.03_85)] mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-11 px-3 rounded-xl border border-[color:oklch(0.88_0.05_85)] bg-white text-[14px] placeholder:text-[color:oklch(0.65_0.03_85)] focus:outline-none focus:border-[color:oklch(0.78_0.14_82)]"
    />
  );
}

function DoneBtn({ onClick, label = "Save & Continue" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#d4a017] to-[#b8860b] text-white font-display font-bold text-[15px] active:scale-[0.99] mt-4"
    >
      {label}
    </button>
  );
}

function LocationBody({ draft, setDraft, onDone }: BodyProps) {
  return (
    <div>
      <Label required>Address / Area</Label>
      <textarea
        value={draft.location.address}
        onChange={(e) => setDraft((d) => ({ ...d, location: { ...d.location, address: e.target.value } }))}
        placeholder="Andheri East, Mumbai, Maharashtra"
        rows={3}
        className="w-full px-3 py-2 rounded-xl border border-[color:oklch(0.88_0.05_85)] bg-white text-[14px] focus:outline-none focus:border-[color:oklch(0.78_0.14_82)]"
      />

      <button
        onClick={async () => {
          if (!("geolocation" in navigator)) return toast.error("GPS available nahi hai");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setDraft((d) => ({
                ...d,
                location: { ...d.location, lat: pos.coords.latitude, lng: pos.coords.longitude },
              }));
              toast.success("Location captured");
            },
            () => toast.error("Location permission denied"),
          );
        }}
        className="mt-2 text-[13px] font-semibold text-[color:oklch(0.55_0.12_75)]"
      >
        📍 Use my current location
      </button>

      <div className="mt-4">
        <Label>Service Radius</Label>
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 20, 50].map((km) => (
            <button
              key={km}
              onClick={() => setDraft((d) => ({ ...d, location: { ...d.location, radiusKm: km } }))}
              className={`h-11 rounded-xl border-2 text-[13px] font-bold ${
                draft.location.radiusKm === km
                  ? "bg-[color:oklch(0.78_0.14_82)] text-white border-[color:oklch(0.78_0.14_82)]"
                  : "bg-white text-[color:oklch(0.30_0.03_85)] border-[color:oklch(0.88_0.05_85)]"
              }`}
            >
              {km} KM
            </button>
          ))}
        </div>
      </div>

      <DoneBtn onClick={onDone} label="Confirm Location" />
    </div>
  );
}

function PhotoInput({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Field
        type="url"
        placeholder="Paste image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <img src={value} alt={label} className="mt-2 h-20 w-20 rounded-xl object-cover border border-[color:oklch(0.88_0.05_85)]" />
      )}
    </div>
  );
}

function PhotosBody({ draft, setDraft, onDone }: BodyProps) {
  return (
    <div className="space-y-3">
      <PhotoInput
        label="Profile Photo"
        value={draft.photos.profile}
        onChange={(v) => setDraft((d) => ({ ...d, photos: { ...d.photos, profile: v } }))}
      />
      <PhotoInput
        label="Shop / Work Photo"
        value={draft.photos.shop}
        onChange={(v) => setDraft((d) => ({ ...d, photos: { ...d.photos, shop: v } }))}
      />
      <PhotoInput
        label="Cover Image"
        value={draft.photos.cover}
        onChange={(v) => setDraft((d) => ({ ...d, photos: { ...d.photos, cover: v } }))}
      />
      <div>
        <Label>Intro Video URL (Optional)</Label>
        <Field
          type="url"
          placeholder="15-sec YouTube / Instagram video link"
          value={draft.photos.intro}
          onChange={(e) => setDraft((d) => ({ ...d, photos: { ...d.photos, intro: e.target.value } }))}
        />
      </div>
      <DoneBtn onClick={onDone} />
    </div>
  );
}

function ContactBody({ draft, setDraft, onDone }: BodyProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label required>Mobile Number</Label>
        <Field
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter mobile number"
          value={draft.contact.mobile}
          onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) } }))}
        />
      </div>
      <div>
        <Label>WhatsApp Number (Optional)</Label>
        <Field
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter WhatsApp number"
          value={draft.contact.whatsapp}
          onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) } }))}
        />
      </div>
      <div>
        <Label>Preferred Call Number</Label>
        <div className="flex gap-2">
          {(["mobile", "whatsapp"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setDraft((d) => ({ ...d, contact: { ...d.contact, primary: k } }))}
              className={`flex-1 h-11 rounded-xl border-2 text-[13px] font-bold capitalize ${
                draft.contact.primary === k
                  ? "bg-[color:oklch(0.78_0.14_82)] text-white border-[color:oklch(0.78_0.14_82)]"
                  : "bg-white text-[color:oklch(0.30_0.03_85)] border-[color:oklch(0.88_0.05_85)]"
              }`}
            >
              {k === "mobile" ? "Primary (Mobile)" : "Secondary (WhatsApp)"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Email (Optional)</Label>
        <Field
          type="email"
          placeholder="Enter email address"
          value={draft.contact.email}
          onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, email: e.target.value } }))}
        />
      </div>
      <DoneBtn onClick={onDone} />
    </div>
  );
}

function BusinessBody({ draft, setDraft, onDone }: BodyProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label required>Business / Shop Name</Label>
        <Field
          placeholder="Enter business name"
          value={draft.business.name}
          onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, name: e.target.value } }))}
        />
      </div>
      <div>
        <Label required>Business Type</Label>
        <select
          value={draft.business.type}
          onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, type: e.target.value } }))}
          className="w-full h-11 px-3 rounded-xl border border-[color:oklch(0.88_0.05_85)] bg-white text-[14px] focus:outline-none focus:border-[color:oklch(0.78_0.14_82)]"
        >
          <option value="">Select business type</option>
          {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <Label required>Experience</Label>
        <select
          value={draft.business.experience}
          onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, experience: e.target.value } }))}
          className="w-full h-11 px-3 rounded-xl border border-[color:oklch(0.88_0.05_85)] bg-white text-[14px] focus:outline-none focus:border-[color:oklch(0.78_0.14_82)]"
        >
          <option value="">Select experience</option>
          {EXPERIENCE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <Label required>Working Hours</Label>
        <div className="grid grid-cols-2 gap-2">
          <Field type="time" value={draft.business.hoursOpen} onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, hoursOpen: e.target.value } }))} />
          <Field type="time" value={draft.business.hoursClose} onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, hoursClose: e.target.value } }))} />
        </div>
      </div>
      <div>
        <Label>GST Number (Optional)</Label>
        <Field
          placeholder="Enter GST number"
          value={draft.business.gst}
          onChange={(e) => setDraft((d) => ({ ...d, business: { ...d.business, gst: e.target.value.toUpperCase() } }))}
        />
      </div>
      <DoneBtn onClick={onDone} />
    </div>
  );
}

function ServicesBody({ draft, setDraft, onDone }: BodyProps) {
  const [q, setQ] = useState("");
  const filtered = POPULAR_SERVICES.filter((s) => s.toLowerCase().includes(q.toLowerCase()));
  const toggle = (s: string) =>
    setDraft((d) => ({
      ...d,
      services: d.services.includes(s) ? d.services.filter((x) => x !== s) : [...d.services, s],
    }));
  return (
    <div>
      <Field placeholder="Search service or category" value={q} onChange={(e) => setQ(e.target.value)} />
      <Label>Popular Categories</Label>
      <div className="grid grid-cols-4 gap-2">
        {filtered.map((s) => {
          const on = draft.services.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`h-20 rounded-xl border-2 text-[11px] font-bold text-center px-1 ${
                on
                  ? "bg-[color:oklch(0.95_0.08_85)] border-[color:oklch(0.78_0.14_82)] text-[color:oklch(0.30_0.05_85)]"
                  : "bg-white border-[color:oklch(0.88_0.05_85)] text-[color:oklch(0.35_0.03_85)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {draft.services.length > 0 && (
        <>
          <Label>Selected Services ({draft.services.length})</Label>
          <div className="flex flex-wrap gap-2">
            {draft.services.map((s) => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[color:oklch(0.95_0.08_85)] border border-[color:oklch(0.78_0.14_82)] text-[12px] font-bold text-[color:oklch(0.30_0.05_85)]"
              >
                {s} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </>
      )}
      <DoneBtn onClick={onDone} />
    </div>
  );
}

function ProductsBody({ draft, setDraft, onDone }: BodyProps) {
  const addProduct = () =>
    setDraft((d) => ({
      ...d,
      products: [...d.products, { category: "", name: "", price: "", description: "" }],
    }));
  const updateProduct = (i: number, patch: Partial<Draft["products"][0]>) =>
    setDraft((d) => ({
      ...d,
      products: d.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  const removeProduct = (i: number) =>
    setDraft((d) => ({ ...d, products: d.products.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-4">
      {draft.products.length === 0 && (
        <p className="text-[13px] text-[color:oklch(0.50_0.03_85)] text-center py-4">
          No products yet. Add your first product to showcase.
        </p>
      )}
      {draft.products.map((p, i) => (
        <div key={i} className="rounded-xl border border-[color:oklch(0.88_0.05_85)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[color:oklch(0.45_0.03_85)]">Product {i + 1}</span>
            <button onClick={() => removeProduct(i)} className="text-red-500 text-[12px] font-semibold">Remove</button>
          </div>
          <Field placeholder="Category" value={p.category} onChange={(e) => updateProduct(i, { category: e.target.value })} />
          <Field placeholder="Product name" value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} />
          <Field type="number" placeholder="Price ₹" value={p.price} onChange={(e) => updateProduct(i, { price: e.target.value })} />
          <textarea
            placeholder="Description"
            value={p.description}
            onChange={(e) => updateProduct(i, { description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[color:oklch(0.88_0.05_85)] bg-white text-[14px] focus:outline-none focus:border-[color:oklch(0.78_0.14_82)]"
          />
        </div>
      ))}
      <button
        onClick={addProduct}
        className="w-full h-11 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82)] text-[color:oklch(0.55_0.12_75)] font-semibold text-[14px]"
      >
        + Add Product
      </button>
      <DoneBtn onClick={onDone} />
    </div>
  );
}

function ReviewBody({
  draft,
  onSubmit,
  submitting,
  canSubmit,
}: {
  draft: Draft;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
}) {
  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => (
        <div key={s.key} className="flex items-start gap-3 p-3 rounded-xl border border-[color:oklch(0.88_0.05_85)]">
          <s.icon className="h-5 w-5 mt-0.5 text-[color:oklch(0.55_0.12_75)]" />
          <div className="flex-1">
            <div className="text-[13px] font-display font-bold">{s.label}</div>
            <div className="text-[12px] text-[color:oklch(0.50_0.03_85)] mt-0.5">
              {sectionSummary(s.key, draft) || <span className="italic text-red-500">Not filled</span>}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#d4a017] to-[#b8860b] text-white font-display font-bold text-[15px] disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 active:scale-[0.99]"
      >
        {submitting ? "Saving…" : "Submit & Get Started"}
      </button>
    </div>
  );
}

type BodyProps = {
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  onDone: () => void;
};
