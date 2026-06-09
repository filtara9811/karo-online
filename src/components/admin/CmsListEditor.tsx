/**
 * A reusable list-editor for any web_* CMS table. Renders list on left, inline form on right.
 * Field schemas are declared per page — keeps individual admin screens tiny.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { GoldCard, GoldButton } from "@/components/admin/AdminLayout";
import { SmartMediaPicker } from "@/components/SmartMediaPicker";
import { cmsUpsert, cmsDelete } from "@/lib/web-cms-admin.functions";
import { useServerFn } from "@tanstack/react-start";

export type CmsField =
  | { key: string; label: string; type: "text" | "url" | "number" }
  | { key: string; label: string; type: "textarea"; rows?: number }
  | { key: string; label: string; type: "image"; folder?: string }
  | { key: string; label: string; type: "bool" }
  | { key: string; label: string; type: "tags" } // comma-separated text[]
  | { key: string; label: string; type: "json"; help?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };

type CmsTable =
  | "web_pages"
  | "web_hero_sections"
  | "web_content_blocks"
  | "web_pricing_plans"
  | "web_apk_releases"
  | "web_offers"
  | "web_testimonials"
  | "web_brand_logos"
  | "web_faqs"
  | "web_forms"
  | "web_blog_posts"
  | "web_media_assets"
  | "web_virtual_devices";

export function CmsListEditor({
  table,
  titleField = "title",
  fields,
  defaults = {},
  orderBy = "sort_order",
  orderAsc = true,
  filter,
  rowBadge,
}: {
  table: CmsTable;
  titleField?: string;
  fields: CmsField[];
  defaults?: Record<string, unknown>;
  orderBy?: string;
  orderAsc?: boolean;
  filter?: { column: string; value: string };
  rowBadge?: (row: Record<string, unknown>) => string | null;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const upsert = useServerFn(cmsUpsert);
  const del = useServerFn(cmsDelete);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from(table as never).select("*").order(orderBy, { ascending: orderAsc });
    if (filter) q = q.eq(filter.column, filter.value);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as Record<string, unknown>[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.value]);

  const active = useMemo(
    () => rows.find((r) => String(r.id) === activeId) ?? null,
    [rows, activeId],
  );

  const update = (patch: Record<string, unknown>) => {
    setRows((prev) =>
      prev.map((r) => (String(r.id) === activeId ? { ...r, ...patch } : r)),
    );
  };

  const handleSave = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const out = await upsert({ data: { table, row: active } });
      toast.success("Saved");
      // Patch local with server-canonical row
      setRows((prev) => prev.map((r) => (String(r.id) === activeId ? (out as never) : r)));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleNew = async () => {
    const seed: Record<string, unknown> = { ...defaults };
    if (filter) seed[filter.column] = filter.value;
    setSaving(true);
    try {
      const out = (await upsert({ data: { table, row: seed } })) as Record<string, unknown>;
      setRows((prev) => [out, ...prev]);
      setActiveId(String(out.id));
      toast.success("Created");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!confirm("Delete this row?")) return;
    try {
      await del({ data: { table, id: String(active.id) } });
      setRows((prev) => prev.filter((r) => String(r.id) !== activeId));
      setActiveId(null);
      toast.success("Deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      <GoldCard className="p-2 max-h-[75vh] overflow-y-auto">
        <button
          onClick={handleNew}
          disabled={saving}
          className="w-full mb-2 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-[#1a1208]"
          style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
        >
          <Plus className="h-3 w-3" /> New
        </button>
        {rows.length === 0 && (
          <p className="text-xs text-[#f5d97a]/60 p-3">No rows yet</p>
        )}
        {rows.map((r) => {
          const title = String(r[titleField] ?? r.id ?? "(untitled)");
          const isActive = String(r.id) === activeId;
          const badge = rowBadge?.(r);
          return (
            <button
              key={String(r.id)}
              onClick={() => setActiveId(String(r.id))}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition ${
                isActive
                  ? "bg-[#d4af37]/20 text-[#fff8dc] border border-[#d4af37]/40"
                  : "text-[#f5d97a]/80 hover:bg-[#d4af37]/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate font-semibold">{title}</span>
                {r.is_active === false && <EyeOff className="h-3 w-3 text-red-400" />}
                {r.is_active === true && <Eye className="h-3 w-3 text-emerald-400/80" />}
              </div>
              {badge && (
                <div className="text-[10px] uppercase tracking-wider text-[#d4af37]/60 mt-0.5">
                  {badge}
                </div>
              )}
            </button>
          );
        })}
      </GoldCard>

      {active ? (
        <GoldCard className="p-5 space-y-4">
          {fields.map((f) => (
            <FieldRow key={f.key} field={f} value={active[f.key]} onChange={(v) => update({ [f.key]: v })} />
          ))}
          <div className="flex justify-between gap-2 pt-3 border-t border-[#d4af37]/20">
            <GoldButton variant="danger" onClick={handleDelete}>
              <Trash2 className="h-3 w-3 inline -mt-0.5 mr-1" /> Delete
            </GoldButton>
            <GoldButton onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 inline animate-spin" /> : <><Save className="h-3 w-3 inline -mt-0.5 mr-1" /> Save</>}
            </GoldButton>
          </div>
        </GoldCard>
      ) : (
        <GoldCard className="p-10 text-center text-[#f5d97a]/60 text-sm">
          Select a row to edit, or create new
        </GoldCard>
      )}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: CmsField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold block mb-1">
      {field.label}
    </label>
  );
  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm";

  if (field.type === "image") {
    return (
      <div>
        {label}
        <SmartMediaPicker
          value={(value as string) ?? null}
          onChange={(v) => onChange(v)}
          folder={field.folder ?? "marketing"}
          label={field.label}
        />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={field.rows ?? 4}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </div>
    );
  }
  if (field.type === "bool") {
    return (
      <label className="flex items-center gap-2 text-xs text-[#f5d97a]">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "number") {
    return (
      <div>
        {label}
        <input
          type="number"
          value={(value as number | null) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className={inputCls}
        />
      </div>
    );
  }
  if (field.type === "tags") {
    const str = Array.isArray(value) ? (value as string[]).join(", ") : "";
    return (
      <div>
        {label}
        <input
          value={str}
          placeholder="comma, separated, tags"
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className={inputCls}
        />
      </div>
    );
  }
  if (field.type === "json") {
    const str =
      value == null
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value, null, 2);
    return (
      <div>
        {label}
        <textarea
          rows={8}
          value={str}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          className={`${inputCls} font-mono text-[11px]`}
        />
        {field.help && (
          <p className="text-[10px] text-[#f5d97a]/50 mt-1">{field.help}</p>
        )}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  // text / url
  return (
    <div>
      {label}
      <input
        type={field.type === "url" ? "url" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}
