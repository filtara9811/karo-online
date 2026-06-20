import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QrCode, Plus, Download, Loader2, Package } from "lucide-react";
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

const BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://karoonline.in";

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

  const downloadPdf = useCallback(
    async (batch: Batch) => {
      setDownloading(batch.id);
      try {
        const { data, error } = await supabase.rpc("admin_list_batch_codes", {
          p_batch_id: batch.id,
        });
        if (error) throw error;
        const codes = (data as { code: string }[]) ?? [];
        await renderBatchPdf(batch, codes.map((c) => c.code));
      } catch (e: any) {
        toast.error(e.message ?? "PDF failed");
      } finally {
        setDownloading(null);
      }
    },
    [],
  );

  return (
    <AdminLayout>
      <PageHeader
        title="QR Assets & Printing"
        subtitle="Print batches, assign to field executives, track scans"
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
        <CreateBatchModal
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

function CreateBatchModal({
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
  const [busy, setBusy] = useState(false);

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
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Batch ${code} created with ${quantity} codes`);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl border p-5 space-y-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(40,30,15,0.98) 0%, rgba(20,15,8,0.98) 100%)",
          borderColor: "rgba(212,175,55,0.4)",
        }}
      >
        <h3 className="font-bold text-[#fff8dc]">Create QR Batch</h3>

        <Field label="Batch Code (e.g. B12)">
          <input
            value={batchCode}
            onChange={(e) =>
              setBatchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            placeholder="B12"
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
          />
        </Field>

        <Field label="Quantity (1-1000)">
          <input
            type="number"
            min={1}
            max={1000}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
          />
        </Field>

        <Field label="Size Preset">
          <div className="grid grid-cols-3 gap-2">
            {(["a4", "a5", "sticker"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSizePreset(s)}
                className={`py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest border ${
                  sizePreset === s
                    ? "bg-[#d4af37] text-[#1a1208] border-[#d4af37]"
                    : "border-[#d4af37]/30 text-[#f5d97a]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#f5d97a]/50 mt-1">
            A4 = 12 QRs/sheet · A5 = 1 standee/page · Sticker = 24/sheet
          </p>
        </Field>

        <Field label="Assign to Field Executive (optional)">
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
          >
            <option value="">— None —</option>
            {execs.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name || u.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          {execs.length === 0 && (
            <p className="text-[10px] text-amber-400/70 mt-1">
              No field executives. Assign the field_executive role via Staff &amp; Roles.
            </p>
          )}
        </Field>

        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pune North zone"
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          <GoldButton variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </GoldButton>
          <GoldButton onClick={submit} disabled={busy} className="flex-1">
            {busy ? "Creating…" : "Create Batch"}
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-[#f5d97a]/70 mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}

async function renderBatchPdf(batch: Batch, codes: string[]) {
  const urls = codes.map((c) => `${BASE_URL}/q/${c}`);

  if (batch.size_preset === "a5") {
    // A5 standee — 1 large QR per page
    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    for (let i = 0; i < codes.length; i++) {
      if (i > 0) doc.addPage();
      const png = await QRCode.toDataURL(urls[i], { width: 800, margin: 1 });
      doc.setFontSize(14);
      doc.text("Scan to visit shop", 74, 15, { align: "center" });
      doc.addImage(png, "PNG", 24, 25, 100, 100);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(codes[i], 74, 140, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("karoonline.in", 74, 150, { align: "center" });
      doc.text("Powered by Karo Online", 74, 200, { align: "center" });
    }
    doc.save(`${batch.batch_code}_A5.pdf`);
    return;
  }

  if (batch.size_preset === "sticker") {
    // 24 stickers/sheet (4 cols x 6 rows) on A4
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cols = 4;
    const rows = 6;
    const perPage = cols * rows;
    const margin = 10;
    const cellW = (210 - margin * 2) / cols;
    const cellH = (297 - margin * 2) / rows;
    const qrSize = Math.min(cellW, cellH) - 14;
    for (let i = 0; i < codes.length; i++) {
      if (i > 0 && i % perPage === 0) doc.addPage();
      const slot = i % perPage;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = margin + col * cellW + (cellW - qrSize) / 2;
      const y = margin + row * cellH + 3;
      const png = await QRCode.toDataURL(urls[i], { width: 400, margin: 1 });
      doc.addImage(png, "PNG", x, y, qrSize, qrSize);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(codes[i], margin + col * cellW + cellW / 2, y + qrSize + 4, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.text("karoonline.in", margin + col * cellW + cellW / 2, y + qrSize + 7.5, {
        align: "center",
      });
    }
    doc.save(`${batch.batch_code}_Stickers.pdf`);
    return;
  }

  // Default A4: 12 QRs/sheet (3 cols x 4 rows) for wall posters
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cols = 3;
  const rows = 4;
  const perPage = cols * rows;
  const margin = 12;
  const cellW = (210 - margin * 2) / cols;
  const cellH = (297 - margin * 2) / rows;
  const qrSize = Math.min(cellW, cellH) - 18;
  for (let i = 0; i < codes.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const slot = i % perPage;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = margin + col * cellW + (cellW - qrSize) / 2;
    const y = margin + row * cellH + 4;
    const png = await QRCode.toDataURL(urls[i], { width: 600, margin: 1 });
    doc.addImage(png, "PNG", x, y, qrSize, qrSize);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(codes[i], margin + col * cellW + cellW / 2, y + qrSize + 5, {
      align: "center",
    });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Scan • karoonline.in", margin + col * cellW + cellW / 2, y + qrSize + 9, {
      align: "center",
    });
  }
  doc.save(`${batch.batch_code}_A4.pdf`);
}
