import { useState } from "react";
import { Search, RefreshCw, Download, FileDown, Filter } from "lucide-react";

export type DateRange = "all" | "today" | "week" | "month" | "year" | "custom";

export interface ListFilters {
  q: string;
  range: DateRange;
  from: string;
  to: string;
  status: string; // "" | "active" | "blocked" | "verified" | "unverified" | plan code
}

interface Props {
  filters: ListFilters;
  onChange: (f: ListFilters) => void;
  onRefresh: () => void;
  loading?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
  onExportCsv: () => void;
  onExportPdf: () => void;
  total: number;
  filtered: number;
}

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7d" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_STATUS: { value: string; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active only" },
  { value: "blocked", label: "Blocked only" },
  { value: "verified", label: "Verified only" },
  { value: "unverified", label: "Unverified only" },
];

export function AdminListToolbar({
  filters,
  onChange,
  onRefresh,
  loading,
  statusOptions,
  onExportCsv,
  onExportPdf,
  total,
  filtered,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const opts = statusOptions ?? DEFAULT_STATUS;
  const set = (patch: Partial<ListFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37]/60" />
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search…"
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f5d97a] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37]/60"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`h-10 w-10 grid place-items-center rounded-xl border active:scale-95 ${showFilters ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#fff8dc]" : "bg-black/40 border-[#d4af37]/30 text-[#d4af37]"}`}
          aria-label="Filters"
        >
          <Filter className="h-4 w-4" />
        </button>
        <button
          onClick={onRefresh}
          className="h-10 w-10 grid place-items-center rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#d4af37] active:scale-95"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-[#d4af37]/30 bg-black/30 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.range}
              onChange={(e) => set({ range: e.target.value as DateRange })}
              className="px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => set({ status: e.target.value })}
              className="px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
            >
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {filters.range === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => set({ from: e.target.value })}
                className="px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(e) => set({ to: e.target.value })}
                className="px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
              />
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-[#f5d97a]/60">
              {filtered} of {total} shown
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={onExportCsv}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#1a1208]"
                style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)" }}
              >
                <Download className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={onExportPdf}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#fff8dc] border border-[#d4af37]/40 bg-black/40"
              >
                <FileDown className="h-3 w-3" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const emptyFilters: ListFilters = {
  q: "",
  range: "all",
  from: "",
  to: "",
  status: "",
};

export function applyFilters<T extends { created_at: string; is_blocked?: boolean; verified?: boolean; status?: string }>(
  rows: T[],
  f: ListFilters,
  searchFields: (r: T) => string[],
): T[] {
  const now = new Date();
  let fromDate: Date | null = null;
  if (f.range === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (f.range === "week") {
    fromDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  } else if (f.range === "month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (f.range === "year") {
    fromDate = new Date(now.getFullYear(), 0, 1);
  } else if (f.range === "custom" && f.from) {
    fromDate = new Date(f.from);
  }
  const toDate = f.range === "custom" && f.to ? new Date(f.to + "T23:59:59") : null;

  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    const created = new Date(r.created_at);
    if (fromDate && created < fromDate) return false;
    if (toDate && created > toDate) return false;
    if (f.status === "active" && r.is_blocked) return false;
    if (f.status === "blocked" && !r.is_blocked) return false;
    if (f.status === "verified" && !r.verified) return false;
    if (f.status === "unverified" && r.verified) return false;
    if (f.status && !["active", "blocked", "verified", "unverified"].includes(f.status)) {
      // custom status (e.g. plan code)
      if (r.status !== f.status) return false;
    }
    if (q) {
      const fields = searchFields(r).join(" ").toLowerCase();
      if (!fields.includes(q)) return false;
    }
    return true;
  });
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    alert("No rows to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(title: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    alert("No rows to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 12px}
  .meta{font-size:11px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top;word-break:break-word}
  th{background:#f4ecd0}
  tr:nth-child(even) td{background:#fafafa}
  @media print{ @page{size:A4 landscape;margin:12mm} }
</style></head><body>
<h1>${title}</h1>
<div class="meta">Generated ${new Date().toLocaleString()} · ${rows.length} rows</div>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => {
            const v = r[h];
            const s = v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);
            return `<td>${s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return alert("Popup blocked");
  w.document.write(html);
  w.document.close();
}
