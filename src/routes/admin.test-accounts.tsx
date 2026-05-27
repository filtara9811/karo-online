import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Save, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/test-accounts")({
  head: () => ({
    meta: [
      { title: "Test Accounts — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <TestAccountsPage />
    </AdminLayout>
  ),
});

type TestAccount = {
  id: string;
  phone: string;
  otp_code: string;
  label: string;
  role: "customer" | "vendor";
  email: string | null;
  name: string | null;
  enabled: boolean;
  notes: string | null;
  updated_at: string;
};

type Draft = Omit<TestAccount, "id" | "updated_at"> & { id?: string };

const EMPTY: Draft = {
  phone: "",
  otp_code: "1234",
  label: "Reviewer",
  role: "customer",
  email: "",
  name: "",
  enabled: true,
  notes: "",
};

function TestAccountsPage() {
  const [rows, setRows] = useState<TestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_accounts" as never)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as TestAccount[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const phoneValid = /^[0-9]{10}$/.test(draft.phone);
  const otpValid = /^[0-9]{4,6}$/.test(draft.otp_code);
  const canSave = phoneValid && otpValid && !saving;

  const resetDraft = () => setDraft(EMPTY);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      phone: draft.phone,
      otp_code: draft.otp_code,
      label: draft.label.trim() || "Reviewer",
      role: draft.role,
      email: draft.email?.trim() || null,
      name: draft.name?.trim() || null,
      enabled: draft.enabled,
      notes: draft.notes?.trim() || null,
    };
    const { error } = draft.id
      ? await supabase.from("test_accounts" as never).update(payload as never).eq("id", draft.id)
      : await supabase.from("test_accounts" as never).insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(draft.id ? "Test account updated" : "Test account added");
    resetDraft();
    load();
  };

  const toggleEnabled = async (row: TestAccount) => {
    const { error } = await supabase
      .from("test_accounts" as never)
      .update({ enabled: !row.enabled } as never)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${row.phone} ${row.enabled ? "disabled" : "enabled"}`);
    load();
  };

  const remove = async (row: TestAccount) => {
    if (!confirm(`Delete test account +91 ${row.phone}?`)) return;
    const { error } = await supabase.from("test_accounts" as never).delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const beginEdit = (row: TestAccount) => {
    setDraft({
      id: row.id,
      phone: row.phone,
      otp_code: row.otp_code,
      label: row.label,
      role: row.role,
      email: row.email ?? "",
      name: row.name ?? "",
      enabled: row.enabled,
      notes: row.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows]);

  return (
    <div>
      <PageHeader
        title="Test Accounts (Reviewer Mode)"
        subtitle="Apni marzi se reviewer / Play Store / payment-gateway tester accounts manage karein"
      />

      <GoldCard className="p-5 mb-5 border-emerald-500/30">
        <h3 className="text-sm uppercase tracking-widest text-emerald-300 font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          How it works
        </h3>
        <ul className="text-[12px] text-[#f5d97a]/85 space-y-1 list-disc pl-5 leading-relaxed">
          <li>Enable koi bhi 10-digit mobile number — uss number pe live SMS <b>nahi</b> jayega.</li>
          <li>Aap apna fixed OTP set kar sakte hain (<b>4 ya 6 digit</b>) — wahi code accept hoga.</li>
          <li>Disable karte hi number turant normal user ki tarah real SMS gateway use karega.</li>
          <li>Email / Name optional hain — reviewer ko inhi values se signup karne ko bolein.</li>
        </ul>
        <div className="mt-3 text-[11px] text-[#f5d97a]/60">
          Currently <b className="text-emerald-300">{enabledCount}</b> active · <b>{rows.length}</b> total
        </div>
      </GoldCard>

      {/* Editor */}
      <GoldCard className="p-5 mb-6">
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold mb-4 flex items-center gap-2">
          {draft.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {draft.id ? "Edit test account" : "Add test account"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Mobile number (10 digits)" error={draft.phone && !phoneValid ? "Must be 10 digits" : null}>
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              inputMode="numeric"
              placeholder="9999900000"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] font-mono text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <Field label="OTP code (4 or 6 digits)" error={draft.otp_code && !otpValid ? "4–6 digits only" : null}>
            <input
              value={draft.otp_code}
              onChange={(e) => setDraft({ ...draft, otp_code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              inputMode="numeric"
              placeholder="1234"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] font-mono text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <Field label="Label">
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value.slice(0, 60) })}
              placeholder="Razorpay Reviewer"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <Field label="Role">
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as "customer" | "vendor" })}
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] text-sm focus:border-[#d4af37] outline-none"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </Field>
          <Field label="Email (dummy, optional)">
            <input
              value={draft.email ?? ""}
              onChange={(e) => setDraft({ ...draft, email: e.target.value.slice(0, 160) })}
              placeholder="reviewer@karoonline.in"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <Field label="Name (optional)">
            <input
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 120) })}
              placeholder="Play Store Reviewer"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <Field label="Notes (internal, optional)" full>
            <input
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value.slice(0, 240) })}
              placeholder="e.g. Sent to Razorpay on 27-May"
              className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fff8dc] text-sm focus:border-[#d4af37] outline-none"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[#fff8dc] sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            Enabled — bypass real SMS for this number
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            disabled={!canSave}
            onClick={save}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm hover:bg-emerald-500/30 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.id ? "Save changes" : "Add account"}
          </button>
          {draft.id && (
            <button
              onClick={resetDraft}
              className="px-4 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm hover:border-[#d4af37]"
            >
              Cancel
            </button>
          )}
        </div>
      </GoldCard>

      {/* List */}
      <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold mb-3">All Test Accounts</h3>
      {loading ? (
        <GoldCard className="p-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /></GoldCard>
      ) : rows.length === 0 ? (
        <GoldCard className="p-8 text-center text-[#f5d97a]/60 text-sm">No test accounts yet. Add one above.</GoldCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((row) => (
            <GoldCard key={row.id} className={`p-4 ${row.enabled ? "border-emerald-500/30" : "border-[#d4af37]/20 opacity-70"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold">{row.label}</div>
                  <div className="font-mono text-lg text-[#fff8dc] mt-0.5">+91 {row.phone}</div>
                  <div className="font-mono text-sm text-[#f5d97a]/80 mt-0.5">OTP: {row.otp_code}</div>
                </div>
                <button
                  onClick={() => toggleEnabled(row)}
                  className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${
                    row.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-black/40 text-[#d4af37]/60 border-[#d4af37]/30"
                  }`}
                >
                  {row.enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {row.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
              <div className="text-[11px] text-[#f5d97a]/70 space-y-0.5">
                <div>Role: <span className="text-[#fff8dc]">{row.role}</span></div>
                {row.email && <div>Email: <span className="font-mono text-[#fff8dc]">{row.email}</span></div>}
                {row.name && <div>Name: <span className="text-[#fff8dc]">{row.name}</span></div>}
                {row.notes && <div className="italic text-[#f5d97a]/50">{row.notes}</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => beginEdit(row)}
                  className="text-[11px] px-3 py-1 rounded bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] hover:border-[#d4af37]"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(row)}
                  className="text-[11px] px-3 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </GoldCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string | null; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold mb-1">{label}</label>
      {children}
      {error && <div className="text-[10px] text-red-300 mt-1">{error}</div>}
    </div>
  );
}
