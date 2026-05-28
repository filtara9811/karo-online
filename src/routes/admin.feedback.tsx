import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, Trash2, MessageSquareWarning } from "lucide-react";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Feedback / Support — Admin" }] }),
  component: AdminFeedbackPage,
});

type Row = {
  id: string;
  user_id: string | null;
  reporter_role: "user" | "vendor" | "technical";
  page_path: string | null;
  page_title: string | null;
  message: string;
  screenshot_url: string | null;
  user_agent: string | null;
  viewport: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_notes: string | null;
  created_at: string;
};

const TABS: { key: Row["reporter_role"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "user", label: "User-Reported" },
  { key: "vendor", label: "Vendor-Reported" },
  { key: "technical", label: "Technical / Marketplace" },
];

function AdminFeedbackPage() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}

function Inner() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Row["status"]>("open");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("feedback_reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab !== "all") q = q.eq("reporter_role", tab);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [tab, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, user: 0, vendor: 0, technical: 0 };
    rows.forEach((r) => { c[r.reporter_role] = (c[r.reporter_role] ?? 0) + 1; });
    return c;
  }, [rows]);

  const setStatus = async (id: string, status: Row["status"]) => {
    const { error } = await supabase.from("feedback_reports").update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const { error } = await supabase.from("feedback_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareWarning className="h-5 w-5 text-[#8b6508]" />
        <h1 className="text-2xl font-display font-bold text-gold-gradient">Feedback / Support</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.key ? "bg-[#1a1208] text-white border-[#1a1208]" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            {t.label} {counts[t.key] ? <span className="ml-1 opacity-70">({counts[t.key]})</span> : null}
          </button>
        ))}
        <span className="mx-2 w-px self-stretch bg-gray-200" />
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              statusFilter === s ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400 border border-dashed rounded-2xl">No reports.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                {r.screenshot_url ? (
                  <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block w-24 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={r.screenshot_url} alt="" className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-gray-50 grid place-items-center text-[10px] text-gray-400 flex-shrink-0">
                    no shot
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.reporter_role === "vendor" ? "bg-amber-100 text-amber-700"
                        : r.reporter_role === "technical" ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>{r.reporter_role}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === "resolved" ? "bg-emerald-100 text-emerald-700"
                        : r.status === "in_progress" ? "bg-blue-100 text-blue-700"
                        : r.status === "closed" ? "bg-gray-200 text-gray-600"
                        : "bg-rose-100 text-rose-700"
                    }`}>{r.status}</span>
                    <span className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1 line-clamp-4 whitespace-pre-wrap">{r.message}</p>
                  {r.page_path && (
                    <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">{r.page_path}</code>
                      <a href={r.page_path} target="_blank" rel="noreferrer" className="hover:text-blue-600">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {r.viewport && <div className="text-[10px] text-gray-400 mt-0.5">📱 {r.viewport}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                {r.status !== "in_progress" && (
                  <button onClick={() => setStatus(r.id, "in_progress")} className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">
                    Start
                  </button>
                )}
                {r.status !== "resolved" && (
                  <button onClick={() => setStatus(r.id, "resolved")} className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </button>
                )}
                {r.status !== "closed" && (
                  <button onClick={() => setStatus(r.id, "closed")} className="text-xs py-1.5 px-2 rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200">
                    Close
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="text-xs py-1.5 px-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
