import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Store,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Trash2,
  Ban,
  CheckCircle2,
  Pencil,
  X,
  Instagram,
  Facebook,
  Globe,
  IdCard,
  FileText,
  Receipt,
  Building2,
} from "lucide-react";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendorsPage,
});

type Vendor = {
  id: string;
  user_id: string;
  role: string | null;
  owner_name: string | null;
  entity: string | null;
  trade: string | null;
  deals_in: string | null;
  business_name: string | null;
  whatsapp: string | null;
  manager_email: string | null;
  referral: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  aadhaar: string | null;
  pan: string | null;
  gst: string | null;
  plan: string | null;
  is_blocked: boolean;
  status: string;
  avatar_url: string | null;
  created_at: string;
};

function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Vendor | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Vendors load fail");
      console.error(error);
    } else {
      setRows((data as Vendor[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (v) =>
        v.owner_name?.toLowerCase().includes(s) ||
        v.business_name?.toLowerCase().includes(s) ||
        v.manager_email?.toLowerCase().includes(s) ||
        v.whatsapp?.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const toggleBlock = async (v: Vendor) => {
    const next = !v.is_blocked;
    const { error } = await supabase
      .from("vendors")
      .update({ is_blocked: next, status: next ? "blocked" : "active" })
      .eq("id", v.id);
    if (error) return toast.error("Update fail");
    toast.success(next ? "Blocked" : "Unblocked");
    setRows((rs) =>
      rs.map((r) =>
        r.id === v.id ? { ...r, is_blocked: next, status: next ? "blocked" : "active" } : r,
      ),
    );
    setActive((a) => (a?.id === v.id ? { ...a, is_blocked: next, status: next ? "blocked" : "active" } : a));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vendor ko permanently delete karna hai?")) return;
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) return toast.error("Delete fail");
    toast.success("Deleted");
    setRows((rs) => rs.filter((r) => r.id !== id));
    setActive(null);
  };

  return (
    <AdminLayout>
      <PageHeader title="Vendors" subtitle={`${rows.length} registered vendors`} />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37]/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by owner, business, email, phone…"
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f5d97a] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37]/60"
          />
        </div>
        <button
          onClick={load}
          className="h-10 w-10 grid place-items-center rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#d4af37] active:scale-95"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <GoldCard className="p-12 text-center">
          <p className="text-[#f5d97a]/60">Loading vendors…</p>
        </GoldCard>
      ) : filtered.length === 0 ? (
        <GoldCard className="p-12 text-center">
          <Store className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
          <h3
            className="font-display text-xl font-bold mb-2"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {rows.length === 0 ? "No vendors yet" : "No matches"}
          </h3>
          <p className="text-sm text-[#f5d97a]/60 max-w-md mx-auto leading-relaxed">
            {rows.length === 0
              ? "Vendor registration complete hone par yahan list dikhegi."
              : "Try different search terms."}
          </p>
        </GoldCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <GoldCard key={v.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-[#d4af37]/40 flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center">
                  {v.avatar_url ? (
                    <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-lg font-bold text-[#1a1a1a]">
                      {(v.business_name || v.owner_name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display text-base font-bold text-[#f5d97a] truncate">
                      {v.business_name || "Unnamed business"}
                    </h3>
                    {v.is_blocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                        BLOCKED
                      </span>
                    )}
                    {v.plan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 uppercase">
                        {v.plan}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#f5d97a]/75 mt-0.5">
                    {v.owner_name || "—"} {v.role ? `· ${v.role}` : ""}
                  </p>

                  <div className="mt-1 space-y-0.5 text-xs text-[#f5d97a]/70">
                    {v.manager_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {v.manager_email}
                      </div>
                    )}
                    {v.whatsapp && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {v.whatsapp}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#f5d97a]/40 mt-1.5">
                    Joined {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setActive(v)}
                    className="h-9 w-9 grid place-items-center rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20 active:scale-95"
                    aria-label="View"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleBlock(v)}
                    className={`h-9 w-9 grid place-items-center rounded-lg border active:scale-95 ${
                      v.is_blocked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-orange-500/10 border-orange-500/30 text-orange-300"
                    }`}
                    aria-label={v.is_blocked ? "Unblock" : "Block"}
                  >
                    {v.is_blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </GoldCard>
          ))}
        </div>
      )}

      {active && (
        <VendorDetail
          vendor={active}
          onClose={() => setActive(null)}
          onToggleBlock={() => toggleBlock(active)}
          onDelete={() => handleDelete(active.id)}
          onSaved={(updated) => {
            setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
            setActive(updated);
          }}
        />
      )}
    </AdminLayout>
  );
}

function VendorDetail({
  vendor,
  onClose,
  onToggleBlock,
  onDelete,
  onSaved,
}: {
  vendor: Vendor;
  onClose: () => void;
  onToggleBlock: () => void;
  onDelete: () => void;
  onSaved: (v: Vendor) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(vendor);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("vendors")
      .update({
        owner_name: form.owner_name,
        business_name: form.business_name,
        whatsapp: form.whatsapp,
        manager_email: form.manager_email,
        instagram: form.instagram,
        facebook: form.facebook,
        website: form.website,
        plan: form.plan,
        status: form.status,
      })
      .eq("id", vendor.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) return toast.error("Save fail");
    toast.success("Saved");
    onSaved(data as Vendor);
    setEdit(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-6"
        style={{
          background: "linear-gradient(180deg, oklch(0.16 0.03 80) 0%, oklch(0.10 0.02 80) 100%)",
          borderColor: "rgba(212,175,55,0.4)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-display text-xl font-bold"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Vendor Profile
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {edit ? (
          <div className="space-y-3">
            <Field label="Owner name" value={form.owner_name ?? ""} onChange={(v) => setForm({ ...form, owner_name: v })} />
            <Field label="Business name" value={form.business_name ?? ""} onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <Field label="Manager email" value={form.manager_email ?? ""} onChange={(v) => setForm({ ...form, manager_email: v })} />
            <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm({ ...form, instagram: v })} />
            <Field label="Facebook" value={form.facebook ?? ""} onChange={(v) => setForm({ ...form, facebook: v })} />
            <Field label="Website" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
            <Field label="Plan" value={form.plan ?? ""} onChange={(v) => setForm({ ...form, plan: v })} />
            <Field label="Status" value={form.status ?? ""} onChange={(v) => setForm({ ...form, status: v })} />

            <div className="flex gap-2 pt-2">
              <GoldButton variant="outline" className="flex-1" onClick={() => { setForm(vendor); setEdit(false); }}>
                Cancel
              </GoldButton>
              <GoldButton className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </GoldButton>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#d4af37]/50 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center">
                <span className="font-display text-2xl font-bold text-[#1a1a1a]">
                  {(vendor.business_name || vendor.owner_name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-[#fff8dc] truncate">
                  {vendor.business_name || "—"}
                </p>
                <p className="text-xs text-[#f5d97a]/70 truncate">
                  {vendor.owner_name} {vendor.role ? `· ${vendor.role}` : ""}
                </p>
                {vendor.is_blocked && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                    BLOCKED
                  </span>
                )}
              </div>
            </div>

            <Section title="Business">
              <Row icon={Building2} label="Entity" value={vendor.entity} />
              <Row icon={Building2} label="Trade" value={vendor.trade} />
              <Row icon={Building2} label="Deals in" value={vendor.deals_in} />
              <Row icon={Phone} label="WhatsApp" value={vendor.whatsapp} />
              <Row icon={Mail} label="Email" value={vendor.manager_email} />
            </Section>

            <Section title="Social">
              <Row icon={Instagram} label="Instagram" value={vendor.instagram} />
              <Row icon={Facebook} label="Facebook" value={vendor.facebook} />
              <Row icon={Globe} label="Website" value={vendor.website} />
            </Section>

            <Section title="KYC">
              <Row icon={IdCard} label="Aadhaar" value={vendor.aadhaar} />
              <Row icon={FileText} label="PAN" value={vendor.pan} />
              <Row icon={Receipt} label="GST" value={vendor.gst} />
            </Section>

            <Section title="Account">
              <Row icon={Building2} label="Plan" value={vendor.plan} />
              <Row icon={Building2} label="Status" value={vendor.status} />
              <Row icon={Building2} label="Joined" value={new Date(vendor.created_at).toLocaleString()} />
            </Section>

            <div className="flex gap-2 pt-2 mt-4 border-t border-[#d4af37]/20">
              <GoldButton variant="outline" className="flex-1" onClick={() => setEdit(true)}>
                <Pencil className="h-3.5 w-3.5 inline mr-1" /> Edit
              </GoldButton>
              <GoldButton variant="outline" className="flex-1" onClick={onToggleBlock}>
                {vendor.is_blocked ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Unblock</>
                ) : (
                  <><Ban className="h-3.5 w-3.5 inline mr-1" /> Block</>
                )}
              </GoldButton>
              <GoldButton variant="danger" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5 inline" />
              </GoldButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70 font-bold mb-1.5">{title}</p>
      <div className="rounded-xl border border-[#d4af37]/15 bg-black/30 divide-y divide-[#d4af37]/10">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-[#d4af37]/60 flex-shrink-0" />
      <span className="text-[#f5d97a]/70 w-20 flex-shrink-0">{label}</span>
      <span className="text-[#fff8dc] truncate">{value || "—"}</span>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/70 font-bold mb-1 block">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-sm"
      />
    </div>
  );
}
