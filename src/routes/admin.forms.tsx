import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, GripVertical, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/forms")({
  head: () => ({
    meta: [
      { title: "Form Builder — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FormsPage,
});

type FieldType =
  | "text" | "textarea" | "number" | "phone" | "email"
  | "date" | "select" | "checkbox" | "file" | "image";

type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hidden?: boolean;
  placeholder?: string;
  options?: string[]; // for select
  min?: number;
  max?: number;
};
type Step = { title: string; fields: Field[] };
type Schema = { steps: Step[] };
type FormRow = {
  id: string;
  form_type: "customer" | "vendor" | "staff";
  is_active: boolean;
  schema: Schema;
  payment_after_step: number | null;
  payment_amount_inr: number | null;
  payment_purpose: string | null;
};

const FORM_TYPES = [
  { v: "customer", l: "Customer Form" },
  { v: "vendor", l: "Vendor Form" },
  { v: "staff", l: "Staff Form" },
] as const;

const FIELD_TYPES: FieldType[] = [
  "text", "textarea", "number", "phone", "email",
  "date", "select", "checkbox", "file", "image",
];

const PAYMENT_PURPOSES = [
  "none", "vendor_subscription", "customer_payment",
  "leadx_purchase", "vendor_wallet_recharge",
];

function FormsPage() {
  const [activeType, setActiveType] = useState<"customer" | "vendor" | "staff">("vendor");
  const [row, setRow] = useState<FormRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("form_schemas")
      .select("*")
      .eq("form_type", activeType)
      .eq("is_active", true)
      .maybeSingle();
    setRow(data as FormRow | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeType]);

  const updateSchema = (s: Schema) => row && setRow({ ...row, schema: s });

  const addStep = () => {
    if (!row) return;
    updateSchema({ steps: [...row.schema.steps, { title: `Step ${row.schema.steps.length + 1}`, fields: [] }] });
  };
  const removeStep = (i: number) => {
    if (!row) return;
    updateSchema({ steps: row.schema.steps.filter((_, idx) => idx !== i) });
  };
  const renameStep = (i: number, t: string) => {
    if (!row) return;
    updateSchema({ steps: row.schema.steps.map((s, idx) => idx === i ? { ...s, title: t } : s) });
  };
  const addField = (si: number) => {
    if (!row) return;
    const f: Field = { key: `field_${Date.now()}`, label: "New Field", type: "text", required: false };
    updateSchema({ steps: row.schema.steps.map((s, idx) => idx === si ? { ...s, fields: [...s.fields, f] } : s) });
  };
  const updateField = (si: number, fi: number, patch: Partial<Field>) => {
    if (!row) return;
    updateSchema({
      steps: row.schema.steps.map((s, idx) => idx === si ? {
        ...s, fields: s.fields.map((f, j) => j === fi ? { ...f, ...patch } : f),
      } : s),
    });
  };
  const removeField = (si: number, fi: number) => {
    if (!row) return;
    updateSchema({
      steps: row.schema.steps.map((s, idx) => idx === si ? {
        ...s, fields: s.fields.filter((_, j) => j !== fi),
      } : s),
    });
  };
  const moveField = (si: number, fi: number, dir: -1 | 1) => {
    if (!row) return;
    const step = row.schema.steps[si];
    const j = fi + dir;
    if (j < 0 || j >= step.fields.length) return;
    const fields = [...step.fields];
    [fields[fi], fields[j]] = [fields[j], fields[fi]];
    updateSchema({ steps: row.schema.steps.map((s, idx) => idx === si ? { ...s, fields } : s) });
  };

  const save = async () => {
    if (!row) return;
    setSaving(true); setMsg(null);
    const { error } = await (supabase as any).from("form_schemas").update({
      schema: row.schema,
      payment_after_step: row.payment_after_step,
      payment_amount_inr: row.payment_amount_inr,
      payment_purpose: row.payment_purpose,
    }).eq("id", row.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved ✓");
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Form Builder"
        subtitle="Customer / Vendor / Staff registration forms — apni marzi se fields add karo"
        action={<GoldButton onClick={save} disabled={saving || !row}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : <Save className="h-3 w-3 inline mr-1" />}
          Save Form
        </GoldButton>}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {FORM_TYPES.map(t => (
          <button key={t.v}
            onClick={() => setActiveType(t.v)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
              activeType === t.v
                ? "text-[#1a1208]"
                : "text-[#f5d97a] border border-[#d4af37]/40 hover:bg-[#d4af37]/10"
            }`}
            style={activeType === t.v ? { background: "linear-gradient(180deg,#fff8dc,#f5d97a,#d4af37)" } : undefined}
          >{t.l}</button>
        ))}
      </div>

      {msg && <div className="mb-4 px-4 py-2 rounded-lg text-xs text-[#fff8dc] border border-[#d4af37]/40 bg-[#d4af37]/10">{msg}</div>}

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" /></div>
      ) : !row ? (
        <GoldCard className="p-8 text-center text-[#f5d97a]/70">No active schema for this form.</GoldCard>
      ) : (
        <div className="space-y-4">
          {/* Payment trigger */}
          <GoldCard className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#fff8dc] font-bold text-sm"><ListChecks className="h-4 w-4 text-[#d4af37]" /> Payment Gateway Trigger</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">After Step #</label>
                <input type="number" min={0} value={row.payment_after_step ?? ""} onChange={(e) => setRow({ ...row, payment_after_step: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm" placeholder="e.g. 2" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">Amount (₹)</label>
                <input type="number" value={row.payment_amount_inr ?? ""} onChange={(e) => setRow({ ...row, payment_amount_inr: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm" placeholder="99" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">Purpose</label>
                <select value={row.payment_purpose ?? "none"} onChange={(e) => setRow({ ...row, payment_purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm">
                  {PAYMENT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </GoldCard>

          {row.schema.steps.map((step, si) => (
            <GoldCard key={si} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <input value={step.title} onChange={(e) => renameStep(si, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] font-bold text-sm" />
                <GoldButton size="sm" variant="danger" onClick={() => removeStep(si)}><Trash2 className="h-3 w-3" /></GoldButton>
              </div>

              <div className="space-y-2">
                {step.fields.map((f, fi) => (
                  <div key={fi} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-black/30 border border-[#d4af37]/15">
                    <div className="col-span-12 sm:col-span-1 flex flex-row sm:flex-col gap-1">
                      <button onClick={() => moveField(si, fi, -1)} className="text-[#d4af37] text-xs px-2 py-0.5 rounded hover:bg-[#d4af37]/10">↑</button>
                      <button onClick={() => moveField(si, fi, 1)} className="text-[#d4af37] text-xs px-2 py-0.5 rounded hover:bg-[#d4af37]/10">↓</button>
                    </div>
                    <input value={f.label} onChange={(e) => updateField(si, fi, { label: e.target.value })}
                      placeholder="Label"
                      className="col-span-12 sm:col-span-3 px-2 py-1.5 rounded-md bg-black/50 border border-[#d4af37]/25 text-[#fff8dc] text-xs" />
                    <input value={f.key} onChange={(e) => updateField(si, fi, { key: e.target.value })}
                      placeholder="key"
                      className="col-span-6 sm:col-span-2 px-2 py-1.5 rounded-md bg-black/50 border border-[#d4af37]/25 text-[#f5d97a] text-xs font-mono" />
                    <select value={f.type} onChange={(e) => updateField(si, fi, { type: e.target.value as FieldType })}
                      className="col-span-6 sm:col-span-2 px-2 py-1.5 rounded-md bg-black/50 border border-[#d4af37]/25 text-[#fff8dc] text-xs">
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {f.type === "select" ? (
                      <input value={(f.options ?? []).join(",")} onChange={(e) => updateField(si, fi, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        placeholder="opt1,opt2,opt3"
                        className="col-span-12 sm:col-span-2 px-2 py-1.5 rounded-md bg-black/50 border border-[#d4af37]/25 text-[#fff8dc] text-xs" />
                    ) : (
                      <input value={f.placeholder ?? ""} onChange={(e) => updateField(si, fi, { placeholder: e.target.value })}
                        placeholder="placeholder"
                        className="col-span-12 sm:col-span-2 px-2 py-1.5 rounded-md bg-black/50 border border-[#d4af37]/25 text-[#fff8dc] text-xs" />
                    )}
                    <label className="col-span-6 sm:col-span-1 flex items-center gap-1 text-[10px] text-[#f5d97a]">
                      <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(si, fi, { required: e.target.checked })} /> Req
                    </label>
                    <button onClick={() => removeField(si, fi)} className="col-span-6 sm:col-span-1 text-red-300 text-xs px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10">
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={() => addField(si)}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-[#d4af37]/40 text-[#f5d97a] text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37]/10 transition">
                <Plus className="h-3 w-3 inline mr-1" /> Add Field
              </button>
            </GoldCard>
          ))}

          <button onClick={addStep}
            className="w-full py-3 rounded-xl border border-dashed border-[#d4af37]/50 text-[#fff8dc] text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37]/10 transition">
            <Plus className="h-3 w-3 inline mr-1" /> Add Step / Section
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
