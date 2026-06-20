import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QrCode,
  Plus,
  Download,
  Loader2,
  Package,
  Palette,
  ImageIcon,
  Sparkles,
  X,
  Upload,
  Layout,
} from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader, GoldButton } from "@/components/admin/AdminLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/qr-assets")({
  head: () => ({
    meta: [
      { title: "QR Assets & Printing — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminQrAssetsPage,
});

type Batch = {
  id: string;
  batch_code: string;
  size_preset: "a4" | "a5" | "sticker";
  quantity: number;
  linked_count: number;
  unlinked_count: number;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  notes: string | null;
  created_at: string;
};

type FieldExec = { user_id: string; full_name: string | null };

type DesignOptions = {
  qrColor: string;
  bgColor: string;
  accentColor: string;
  logoDataUrl: string | null;
  headline: string;
  footer: string;
  labelFontSize: number;
  margin: number;
  showSerial: boolean;
};

const DEFAULT_DESIGN: DesignOptions = {
  qrColor: "#0a0a0a",
  bgColor: "#ffffff",
  accentColor: "#d4af37",
  logoDataUrl: null,
  headline: "Scan to visit shop",
  footer: "karoonline.in",
  labelFontSize: 14,
  margin: 12,
  showSerial: true,
};

const BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://karoonline.in";

const SIZE_INFO: Record<
  "a4" | "a5" | "sticker",
  { label: string; per: number; desc: string }
> = {
  a4: { label: "A4 Poster", per: 12, desc: "12 QRs per sheet · 3×4 grid" },
  a5: { label: "A5 Standee", per: 1, desc: "1 large QR per page" },
  sticker: { label: "Sticker", per: 24, desc: "24 stickers per A4 · 4×6 grid" },
};

function AdminQrAssetsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [execs, setExecs] = useState<FieldExec[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_qr_batches");
    if (error) toast.error(error.message);
    setBatches((data as Batch[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, staff_profiles!inner(full_name)")
        .eq("role", "field_executive" as never);
      const items: FieldExec[] = (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        full_name: r.staff_profiles?.full_name ?? null,
      }));
      setExecs(items);
    })();
  }, [refresh]);

  const downloadPdf = useCallback(async (batch: Batch) => {
    setDownloading(batch.id);
    try {
      const { data, error } = await supabase.rpc("admin_list_batch_codes", {
        p_batch_id: batch.id,
      });
      if (error) throw error;
      const codes = (data as { code: string }[]) ?? [];
      await renderBatchPdf(batch, codes.map((c) => c.code), DEFAULT_DESIGN);
    } catch (e: any) {
      toast.error(e.message ?? "PDF failed");
    } finally {
      setDownloading(null);
    }
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="QR Assets & Printing"
        subtitle="Design, print and assign branded QR batches"
        action={
          <GoldButton onClick={() => setShowCreate(true)}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> New Batch
            </span>
          </GoldButton>
        }
      />

      {loading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : batches.length === 0 ? (
        <GoldCard className="p-10 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-[#d4af37]" />
          <p className="text-sm text-[#f5d97a]/70">
            No QR batches yet. Create one to start printing.
          </p>
        </GoldCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((b) => (
            <GoldCard key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#d4af37]" />
                    <h3 className="font-bold text-[#fff8dc] text-base tracking-wide">
                      {b.batch_code}
                    </h3>
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#d4af37]/40 text-[#f5d97a]">
                      {b.size_preset}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#f5d97a]/60 mt-1">
                    {b.quantity} codes · {b.linked_count} linked · {b.unlinked_count} unlinked
                  </p>
                  {b.assigned_to_name && (
                    <p className="text-[10px] text-[#f5d97a]/50 mt-0.5">
                      Assigned to {b.assigned_to_name}
                    </p>
                  )}
                  {b.notes && (
                    <p className="text-[10px] text-[#f5d97a]/40 mt-0.5">{b.notes}</p>
                  )}
                </div>
                <GoldButton
                  size="sm"
                  variant="outline"
                  onClick={() => downloadPdf(b)}
                  disabled={downloading === b.id}
                >
                  {downloading === b.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3 w-3" /> PDF
                    </span>
                  )}
                </GoldButton>
              </div>
              <div className="h-1.5 rounded-full bg-[#d4af37]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{
                    width: `${b.quantity > 0 ? (b.linked_count / b.quantity) * 100 : 0}%`,
                  }}
                />
              </div>
            </GoldCard>
          ))}
        </div>
      )}

      {showCreate && (
        <QrStudioModal
          execs={execs}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </AdminLayout>
  );
}

/* ============================ QR STUDIO MODAL ============================ */

function QrStudioModal({
  execs,
  onClose,
  onCreated,
}: {
  execs: FieldExec[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [sizePreset, setSizePreset] = useState<"a4" | "a5" | "sticker">("a4");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [design, setDesign] = useState<DesignOptions>(DEFAULT_DESIGN);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"basics" | "design" | "branding">("basics");

  const updateDesign = useCallback((patch: Partial<DesignOptions>) => {
    setDesign((d) => ({ ...d, ...patch }));
  }, []);

  const onLogoUpload = useCallback(
    (file: File) => {
      if (file.size > 1024 * 1024) {
        toast.error("Logo must be under 1 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => updateDesign({ logoDataUrl: reader.result as string });
      reader.readAsDataURL(file);
    },
    [updateDesign],
  );

  const perSheet = SIZE_INFO[sizePreset].per;
  const sheets = Math.max(1, Math.ceil(quantity / perSheet));

  const submit = async () => {
    const code = batchCode.trim().toUpperCase();
    if (!code || !/^[A-Z0-9]{1,8}$/.test(code)) {
      toast.error("Batch code must be 1-8 letters/numbers (e.g. B12)");
      return;
    }
    if (quantity < 1 || quantity > 1000) {
      toast.error("Quantity must be 1-1000");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_create_qr_batch", {
      p_batch_code: code,
      p_quantity: quantity,
      p_size_preset: sizePreset,
      p_assigned_to: assignedTo || undefined,
      p_notes: notes.trim() || undefined,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // Fetch generated serial codes and render PDF with chosen design
    const { data: codeRows, error: listErr } = await supabase.rpc(
      "admin_list_batch_codes_by_code",
      { p_batch_code: code } as any,
    );
    let codes: string[] = [];
    if (!listErr && Array.isArray(codeRows)) {
      codes = (codeRows as { code: string }[]).map((r) => r.code);
    } else {
      // Fallback: synthesize serial preview codes
      codes = Array.from({ length: quantity }, (_, i) => `${code}-${String(i + 1).padStart(4, "0")}`);
    }
    try {
      await renderBatchPdf(
        {
          id: "",
          batch_code: code,
          size_preset: sizePreset,
          quantity,
          linked_count: 0,
          unlinked_count: quantity,
          assigned_to_user_id: null,
          assigned_to_name: null,
          notes: null,
          created_at: "",
        },
        codes,
        design,
      );
    } catch (e: any) {
      toast.error(e.message ?? "PDF failed");
    }
    setBusy(false);
    toast.success(`Batch ${code} created · ${sheets} sheet${sheets > 1 ? "s" : ""} ready`);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-2 md:p-6 overflow-y-auto">
      <div
        className="mx-auto w-full max-w-6xl rounded-2xl border overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(40,30,15,0.98) 0%, rgba(14,10,5,0.98) 100%)",
          borderColor: "rgba(212,175,55,0.4)",
          boxShadow: "0 30px 80px -20px rgba(212,175,55,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-[#d4af37] to-[#8a6b1c] shadow-lg">
              <Sparkles className="h-5 w-5 text-[#1a1208]" />
            </div>
            <div>
              <h3 className="font-bold text-[#fff8dc] text-lg">QR Print Studio</h3>
              <p className="text-[10px] text-[#f5d97a]/60 uppercase tracking-widest">
                Design · Preview · Print
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full grid place-items-center border border-[#d4af37]/30 text-[#f5d97a] hover:bg-[#d4af37]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.1fr] gap-0">
          {/* LEFT — controls */}
          <div className="p-5 space-y-5 border-r border-[#d4af37]/15">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-[#d4af37]/20">
              {([
                ["basics", "Basics", Package],
                ["design", "Design", Palette],
                ["branding", "Branding", ImageIcon],
              ] as const).map(([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] uppercase tracking-widest font-bold transition ${
                    tab === k
                      ? "bg-gradient-to-b from-[#d4af37] to-[#a8851f] text-[#1a1208] shadow"
                      : "text-[#f5d97a]/70 hover:text-[#f5d97a]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === "basics" && (
              <div className="space-y-4">
                <Field label="Batch Code (e.g. B12)">
                  <input
                    value={batchCode}
                    onChange={(e) =>
                      setBatchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    placeholder="B12"
                    className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2.5 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
                  />
                  <p className="text-[10px] text-[#f5d97a]/50 mt-1">
                    Each code will be auto-numbered as <b>{(batchCode || "B12")}-0001</b>, <b>{(batchCode || "B12")}-0002</b>…
                  </p>
                </Field>

                <Field label={`Quantity — ${quantity} codes`}>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full accent-[#d4af37]"
                  />
                  <div className="flex justify-between text-[10px] text-[#f5d97a]/50 mt-1">
                    <span>1</span><span>250</span><span>500</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 0)))}
                    className="mt-2 w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
                  />
                </Field>

                <Field label="Size Preset">
                  <div className="grid grid-cols-3 gap-2">
                    {(["a4", "a5", "sticker"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSizePreset(s)}
                        className={`p-3 rounded-xl text-left border transition ${
                          sizePreset === s
                            ? "bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/5 border-[#d4af37]"
                            : "border-[#d4af37]/20 hover:border-[#d4af37]/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Layout className="h-3.5 w-3.5 text-[#d4af37]" />
                          <span className="text-[11px] font-bold uppercase text-[#fff8dc]">
                            {SIZE_INFO[s].label}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#f5d97a]/60 mt-1 leading-tight">
                          {SIZE_INFO[s].desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Assign to Field Executive (optional)">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2.5 text-sm text-[#fff8dc]"
                  >
                    <option value="">— None —</option>
                    {execs.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name || u.user_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Notes (optional)">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Pune North zone"
                    className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2.5 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
                  />
                </Field>
              </div>
            )}

            {tab === "design" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <ColorPick label="QR Color" value={design.qrColor} onChange={(v) => updateDesign({ qrColor: v })} />
                  <ColorPick label="Background" value={design.bgColor} onChange={(v) => updateDesign({ bgColor: v })} />
                  <ColorPick label="Accent" value={design.accentColor} onChange={(v) => updateDesign({ accentColor: v })} />
                </div>

                <Field label="Quick Themes">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Gold", qr: "#1a1208", bg: "#fff8dc", ac: "#d4af37" },
                      { name: "Mono", qr: "#000000", bg: "#ffffff", ac: "#333333" },
                      { name: "Royal", qr: "#0a0a3a", bg: "#ffffff", ac: "#4f46e5" },
                      { name: "Forest", qr: "#0a2818", bg: "#f0fdf4", ac: "#16a34a" },
                    ].map((t) => (
                      <button
                        key={t.name}
                        onClick={() => updateDesign({ qrColor: t.qr, bgColor: t.bg, accentColor: t.ac })}
                        className="p-2 rounded-lg border border-[#d4af37]/30 hover:border-[#d4af37] text-[10px] text-[#fff8dc] font-bold"
                        style={{ background: `linear-gradient(135deg, ${t.bg} 0%, ${t.ac} 100%)` }}
                      >
                        <span style={{ color: t.qr, mixBlendMode: "normal" }}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={`Outer Margin — ${design.margin} mm`}>
                  <input
                    type="range" min={4} max={20}
                    value={design.margin}
                    onChange={(e) => updateDesign({ margin: parseInt(e.target.value) })}
                    className="w-full accent-[#d4af37]"
                  />
                </Field>

                <Field label={`Label Font Size — ${design.labelFontSize} pt`}>
                  <input
                    type="range" min={8} max={28}
                    value={design.labelFontSize}
                    onChange={(e) => updateDesign({ labelFontSize: parseInt(e.target.value) })}
                    className="w-full accent-[#d4af37]"
                  />
                </Field>

                <label className="flex items-center justify-between p-3 rounded-lg border border-[#d4af37]/20 bg-black/30">
                  <span className="text-xs text-[#fff8dc]">Show Serial Number ({batchCode || "B12"}-0001)</span>
                  <input
                    type="checkbox"
                    checked={design.showSerial}
                    onChange={(e) => updateDesign({ showSerial: e.target.checked })}
                    className="h-4 w-4 accent-[#d4af37]"
                  />
                </label>
              </div>
            )}

            {tab === "branding" && (
              <div className="space-y-4">
                <Field label="Center Logo (PNG, transparent recommended)">
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[#d4af37]/40 cursor-pointer hover:border-[#d4af37] hover:bg-[#d4af37]/5">
                    {design.logoDataUrl ? (
                      <>
                        <img src={design.logoDataUrl} alt="logo" className="h-16 w-16 object-contain" />
                        <span className="text-[10px] text-[#f5d97a]/70">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-[#d4af37]" />
                        <span className="text-xs text-[#fff8dc]">Upload logo</span>
                        <span className="text-[10px] text-[#f5d97a]/50">PNG / JPG · &lt; 1 MB</span>
                      </>
                    )}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && onLogoUpload(e.target.files[0])}
                    />
                  </label>
                  {design.logoDataUrl && (
                    <button
                      onClick={() => updateDesign({ logoDataUrl: null })}
                      className="text-[10px] text-red-400 mt-1.5 underline"
                    >
                      Remove logo
                    </button>
                  )}
                </Field>

                <Field label="Headline (top of QR)">
                  <input
                    value={design.headline}
                    onChange={(e) => updateDesign({ headline: e.target.value })}
                    placeholder="Scan to visit shop"
                    className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2.5 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
                  />
                </Field>

                <Field label="Footer">
                  <input
                    value={design.footer}
                    onChange={(e) => updateDesign({ footer: e.target.value })}
                    placeholder="karoonline.in"
                    className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2.5 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* RIGHT — preview + summary */}
          <div className="p-5 space-y-4 bg-black/30">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] uppercase tracking-widest text-[#d4af37] font-bold">
                Live Preview
              </h4>
              <span className="text-[10px] text-[#f5d97a]/60">{SIZE_INFO[sizePreset].label}</span>
            </div>

            <LivePreview
              batchCode={batchCode || "B12"}
              sizePreset={sizePreset}
              design={design}
            />

            {/* Summary */}
            <div
              className="rounded-xl p-4 border"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.02) 100%)",
                borderColor: "rgba(212,175,55,0.35)",
              }}
            >
              <h4 className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold mb-2">
                Print Summary
              </h4>
              <p className="text-sm text-[#fff8dc] leading-relaxed">
                You are about to print{" "}
                <b className="text-[#d4af37]">{sheets} sheet{sheets > 1 ? "s" : ""}</b>{" "}
                covering{" "}
                <b className="text-[#d4af37]">{quantity} unique QR codes</b>{" "}
                in <b>{SIZE_INFO[sizePreset].label}</b> format.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <Stat label="QRs" value={String(quantity)} />
                <Stat label="Sheets" value={String(sheets)} />
                <Stat label="Per sheet" value={String(perSheet)} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <GoldButton variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </GoldButton>
              <GoldButton onClick={submit} disabled={busy} className="flex-1">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" /> Create &amp; Print PDF
                  </span>
                )}
              </GoldButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ PREVIEW ============================ */

function LivePreview({
  batchCode,
  sizePreset,
  design,
}: {
  batchCode: string;
  sizePreset: "a4" | "a5" | "sticker";
  design: DesignOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCode = `${batchCode}-0001`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = async () => {
      // QR
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, `${BASE_URL}/q/${sampleCode}`, {
        width: 400,
        margin: 1,
        color: { dark: design.qrColor, light: design.bgColor },
      });

      // page proportions
      const isA5 = sizePreset === "a5";
      const isSticker = sizePreset === "sticker";
      const W = 320;
      const H = isA5 ? 460 : isSticker ? 280 : 460;
      canvas.width = W * 2;
      canvas.height = H * 2;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.scale(2, 2);

      // bg
      ctx.fillStyle = design.bgColor;
      ctx.fillRect(0, 0, W, H);

      // accent border
      ctx.strokeStyle = design.accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(design.margin / 2 + 4, design.margin / 2 + 4, W - design.margin - 8, H - design.margin - 8);

      // headline
      ctx.fillStyle = design.qrColor;
      ctx.font = `bold ${Math.max(10, design.labelFontSize - 2)}px Helvetica`;
      ctx.textAlign = "center";
      ctx.fillText(design.headline, W / 2, 30);

      // QR
      const qrSize = isSticker ? 160 : 220;
      const qrX = (W - qrSize) / 2;
      const qrY = 50;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // logo overlay
      if (design.logoDataUrl) {
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = design.logoDataUrl!;
        });
        const logoSize = qrSize * 0.22;
        const lx = qrX + (qrSize - logoSize) / 2;
        const ly = qrY + (qrSize - logoSize) / 2;
        ctx.fillStyle = design.bgColor;
        ctx.fillRect(lx - 4, ly - 4, logoSize + 8, logoSize + 8);
        ctx.drawImage(img, lx, ly, logoSize, logoSize);
      }

      // serial
      if (design.showSerial) {
        ctx.fillStyle = design.qrColor;
        ctx.font = `bold ${design.labelFontSize + 2}px Helvetica`;
        ctx.fillText(sampleCode, W / 2, qrY + qrSize + 28);
      }

      // footer
      ctx.fillStyle = design.accentColor;
      ctx.font = `${Math.max(9, design.labelFontSize - 4)}px Helvetica`;
      ctx.fillText(design.footer, W / 2, H - 18);
    };

    draw();
  }, [design, sizePreset, sampleCode]);

  return (
    <div className="grid place-items-center p-4 rounded-xl border border-[#d4af37]/20 bg-black/40 min-h-[300px]">
      <canvas
        ref={canvasRef}
        className="rounded-md shadow-2xl"
        style={{ boxShadow: "0 20px 60px -10px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
}

/* ============================ UTILS ============================ */

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-widest text-[#f5d97a]/70 mb-1 block">{label}</span>
      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-[#d4af37]/30 bg-black/40">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
        />
        <span className="text-[10px] text-[#fff8dc] font-mono">{value.toUpperCase()}</span>
      </div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 border border-[#d4af37]/20 py-2">
      <div className="text-base font-bold text-[#d4af37]">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#f5d97a]/60">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-[#f5d97a]/70 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ============================ PDF RENDER ============================ */

async function renderBatchPdf(batch: Batch, codes: string[], design: DesignOptions) {
  const urls = codes.map((c) => `${BASE_URL}/q/${c}`);
  const qrOpts = {
    margin: 1,
    color: { dark: design.qrColor, light: design.bgColor },
  };

  const addLogo = async (doc: jsPDF, cx: number, cy: number, qrSize: number) => {
    if (!design.logoDataUrl) return;
    const logoSize = qrSize * 0.22;
    const lx = cx - logoSize / 2;
    const ly = cy - logoSize / 2;
    doc.setFillColor(design.bgColor);
    doc.rect(lx - 1.5, ly - 1.5, logoSize + 3, logoSize + 3, "F");
    try {
      doc.addImage(design.logoDataUrl, "PNG", lx, ly, logoSize, logoSize);
    } catch {
      /* ignore */
    }
  };

  if (batch.size_preset === "a5") {
    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    for (let i = 0; i < codes.length; i++) {
      if (i > 0) doc.addPage();
      const png = await QRCode.toDataURL(urls[i], { width: 800, ...qrOpts });
      doc.setFillColor(design.bgColor);
      doc.rect(0, 0, 148, 210, "F");
      doc.setDrawColor(design.accentColor);
      doc.setLineWidth(0.6);
      doc.rect(design.margin / 2, design.margin / 2, 148 - design.margin, 210 - design.margin);
      doc.setTextColor(design.qrColor);
      doc.setFontSize(design.labelFontSize);
      doc.text(design.headline, 74, design.margin + 8, { align: "center" });
      const qrSize = 100;
      doc.addImage(png, "PNG", 24, 30, qrSize, qrSize);
      await addLogo(doc, 74, 80, qrSize);
      if (design.showSerial) {
        doc.setFontSize(design.labelFontSize + 6);
        doc.setFont("helvetica", "bold");
        doc.text(codes[i], 74, 145, { align: "center" });
      }
      doc.setFontSize(design.labelFontSize - 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(design.accentColor);
      doc.text(design.footer, 74, 200, { align: "center" });
    }
    doc.save(`${batch.batch_code}_A5.pdf`);
    return;
  }

  if (batch.size_preset === "sticker") {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cols = 4;
    const rows = 6;
    const perPage = cols * rows;
    const margin = design.margin;
    const cellW = (210 - margin * 2) / cols;
    const cellH = (297 - margin * 2) / rows;
    const qrSize = Math.min(cellW, cellH) - 14;
    for (let i = 0; i < codes.length; i++) {
      if (i % perPage === 0) {
        if (i > 0) doc.addPage();
        doc.setFillColor(design.bgColor);
        doc.rect(0, 0, 210, 297, "F");
      }
      const slot = i % perPage;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = margin + col * cellW + (cellW - qrSize) / 2;
      const y = margin + row * cellH + 3;
      const png = await QRCode.toDataURL(urls[i], { width: 400, ...qrOpts });
      doc.addImage(png, "PNG", x, y, qrSize, qrSize);
      await addLogo(doc, x + qrSize / 2, y + qrSize / 2, qrSize);
      doc.setTextColor(design.qrColor);
      doc.setFontSize(Math.max(6, design.labelFontSize - 6));
      if (design.showSerial) {
        doc.setFont("helvetica", "bold");
        doc.text(codes[i], margin + col * cellW + cellW / 2, y + qrSize + 4, { align: "center" });
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(design.accentColor);
      doc.text(design.footer, margin + col * cellW + cellW / 2, y + qrSize + 7.5, { align: "center" });
    }
    doc.save(`${batch.batch_code}_Stickers.pdf`);
    return;
  }

  // A4 — 12 per sheet
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cols = 3;
  const rows = 4;
  const perPage = cols * rows;
  const margin = design.margin;
  const cellW = (210 - margin * 2) / cols;
  const cellH = (297 - margin * 2) / rows;
  const qrSize = Math.min(cellW, cellH) - 18;
  for (let i = 0; i < codes.length; i++) {
    if (i % perPage === 0) {
      if (i > 0) doc.addPage();
      doc.setFillColor(design.bgColor);
      doc.rect(0, 0, 210, 297, "F");
    }
    const slot = i % perPage;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = margin + col * cellW + (cellW - qrSize) / 2;
    const y = margin + row * cellH + 4;
    const png = await QRCode.toDataURL(urls[i], { width: 600, ...qrOpts });
    doc.addImage(png, "PNG", x, y, qrSize, qrSize);
    await addLogo(doc, x + qrSize / 2, y + qrSize / 2, qrSize);
    doc.setTextColor(design.qrColor);
    doc.setFontSize(design.labelFontSize);
    if (design.showSerial) {
      doc.setFont("helvetica", "bold");
      doc.text(codes[i], margin + col * cellW + cellW / 2, y + qrSize + 5, { align: "center" });
    }
    doc.setFontSize(Math.max(6, design.labelFontSize - 6));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(design.accentColor);
    doc.text(`${design.headline} · ${design.footer}`, margin + col * cellW + cellW / 2, y + qrSize + 9, { align: "center" });
  }
  doc.save(`${batch.batch_code}_A4.pdf`);
}

// silence unused-import warning when memo not used
void useMemo;
