import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, ShieldCheck, Check, X as XIcon, FileText, IdCard, Camera, Building2, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/kyc-review")({
  head: () => ({
    meta: [
      { title: "KYC Submissions — Review" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KycReviewPage,
});

type Row = {
  id: string;
  subject_user_id: string;
  subject_type: string;
  check_type: string;
  status: string;
  document_number: string | null;
  document_urls: string[] | null;
  request_payload: any;
  reviewer_notes: string | null;
  created_at: string;
};

const ICONS: Record<string, typeof Camera> = {
  selfie: Camera, aadhaar: IdCard, pan: FileText, bank: Building2,
};

function KycReviewPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"submitted" | "verified" | "rejected" | "all">("submitted");
  const [userMap, setUserMap] = useState<Record<string, { name?: string; phone?: string }>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("kyc_verifications").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = (data ?? []) as Row[];
    setRows(list);

    // Fetch customer names in batch
    const ids = Array.from(new Set(list.map((r) => r.subject_user_id)));
    if (ids.length) {
      const { data: cus } = await supabase.from("customers").select("user_id, name, phone").in("user_id", ids);
      const map: Record<string, { name?: string; phone?: string }> = {};
      (cus ?? []).forEach((c: any) => { map[c.user_id] = { name: c.name, phone: c.phone }; });
      setUserMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (row: Row, decision: "verified" | "rejected", notes?: string) => {
    const { error } = await supabase
      .from("kyc_verifications")
      .update({
        status: decision,
        reviewer_notes: notes ?? null,
        verified_at: decision === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(decision === "verified" ? "Approved ✓" : "Rejected");
    load();
  };

  return (
    <AdminLayout>
      <PageHeader
        title="KYC Submissions"
        subtitle="Customer / Vendor ke documents review karein — approve ya reject"
      />

      <GoldCard className="p-3 mb-4 flex items-center gap-2 overflow-x-auto">
        {(["submitted", "verified", "rejected", "all"] as const).map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={`text-[11px] uppercase tracking-wider font-bold px-3 py-2 rounded-full whitespace-nowrap ${
              filter === f
                ? "bg-[#d4af37] text-[#1a1208]"
                : "bg-black/30 text-[#f5d97a]/70 border border-[#d4af37]/30"
            }`}
          >
            {f === "submitted" ? "Pending Review" : f}
          </button>
        ))}
        <button onClick={load} className="ml-auto h-8 w-8 grid place-items-center rounded-full bg-black/30 text-[#f5d97a]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </GoldCard>

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : rows.length === 0 ? (
        <GoldCard className="p-12 grid place-items-center text-[#f5d97a]/70 text-sm">
          <ShieldCheck className="h-10 w-10 text-[#d4af37]/60 mb-2" />
          No {filter === "all" ? "" : filter} submissions
        </GoldCard>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <SubmissionCard
              key={r.id} row={r}
              who={userMap[r.subject_user_id]}
              onDecide={decide}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function SubmissionCard({
  row, who, onDecide,
}: {
  row: Row;
  who?: { name?: string; phone?: string };
  onDecide: (row: Row, d: "verified" | "rejected", notes?: string) => void;
}) {
  const Icon = ICONS[row.check_type] ?? FileText;
  const [urls, setUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const paths = row.document_urls ?? [];
      if (!paths.length) return setUrls([]);
      const signed: string[] = [];
      for (const p of paths) {
        const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 3600);
        if (data?.signedUrl) signed.push(data.signedUrl);
      }
      setUrls(signed);
    })();
  }, [row.id]);

  const rp = row.request_payload ?? {};
  const isVendor = row.subject_type === "vendor";

  return (
    <GoldCard className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}>
            <Icon className="h-5 w-5 text-[#1a1208]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#fff8dc] truncate">
              {who?.name || "Unnamed"} · <span className="text-[#d4af37]/80">{row.check_type.toUpperCase()}</span>
            </div>
            <div className="text-[10px] text-[#f5d97a]/60 truncate">
              {isVendor ? "🏪 Vendor" : "👤 Customer"} · {who?.phone || row.subject_user_id.slice(0, 8)} ·{" "}
              {new Date(row.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <span className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold whitespace-nowrap ${
          row.status === "verified" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          : row.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
        }`}>
          {row.status}
        </span>
      </div>

      {row.document_number && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/20 text-xs font-mono text-[#fff8dc] tracking-wider">
          {row.document_number}
        </div>
      )}

      {Object.keys(rp).length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-1 text-[11px]">
          {Object.entries(rp).map(([k, v]) => (
            <div key={k} className="text-[#f5d97a]/80">
              <span className="text-[#d4af37]/60">{k}:</span> <span className="text-[#fff8dc]">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer"
              className="block aspect-[4/3] rounded-lg overflow-hidden border border-[#d4af37]/30 bg-black/40">
              <img src={u} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {row.status === "submitted" && (
        <div className="space-y-2">
          <input
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason / notes (optional for approve, required for reject)"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37] text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!notes.trim()) return toast.error("Reason required for rejection");
                onDecide(row, "rejected", notes);
              }}
              className="flex-1 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold inline-flex items-center justify-center gap-1"
            >
              <XIcon className="h-3.5 w-3.5" /> Reject
            </button>
            <GoldButton onClick={() => onDecide(row, "verified", notes || undefined)} className="flex-1">
              <Check className="h-3.5 w-3.5 inline mr-1" /> Approve
            </GoldButton>
          </div>
        </div>
      )}

      {row.reviewer_notes && (
        <div className="mt-2 text-[11px] text-[#f5d97a]/80 italic">
          📝 {row.reviewer_notes}
        </div>
      )}
    </GoldCard>
  );
}
