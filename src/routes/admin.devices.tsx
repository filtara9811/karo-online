import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Unlock, Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unlockDeviceFingerprint } from "@/lib/registration-backend.functions";

export const Route = createFileRoute("/admin/devices")({
  head: () => ({
    meta: [
      { title: "Device Unlock — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDevices,
});

type DeviceRow = {
  id: string;
  fingerprint: string;
  phone: string;
  panel: string;
  user_agent: string | null;
  last_seen_at: string;
  unlocked_at: string | null;
  unlock_reason: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  phone: string;
  panel: string | null;
  reason: string | null;
  rows_affected: number;
  created_at: string;
};

function AdminDevices() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const unlock = useServerFn(unlockDeviceFingerprint);

  const load = async () => {
    setLoading(true);
    const q = supabase
      .from("device_fingerprints")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(200);
    const { data } = search.trim() ? await q.ilike("phone", `%${search.trim()}%`) : await q;
    setRows((data ?? []) as DeviceRow[]);

    const { data: aud } = await supabase
      .from("device_unlock_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit((aud ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async (row: DeviceRow) => {
    const reason = window.prompt(
      `Unlock device for ${row.phone} (${row.panel})?\nEnter audit reason:`,
      "User lost device",
    );
    if (reason == null) return;
    setBusyId(row.id);
    try {
      const res = await unlock({ data: { phone: row.phone, panel: row.panel, reason } });
      setFlash({ kind: "ok", msg: `Unlocked ${res.unlocked} binding(s) for ${row.phone}` });
      await load();
    } catch (e: any) {
      setFlash({ kind: "err", msg: e?.message ?? "Failed to unlock" });
    } finally {
      setBusyId(null);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="🔓 Device Unlock"
        subtitle="Customer/vendor device-lock bindings. Staff onboarding devices are auto-bypassed."
      />

      {flash && (
        <div
          className="mb-4 px-4 py-3 rounded-xl border-2 text-sm flex items-center gap-2"
          style={{
            borderColor: flash.kind === "ok" ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
            background: flash.kind === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            color: flash.kind === "ok" ? "rgb(134,239,172)" : "rgb(252,165,165)",
          }}
        >
          {flash.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {flash.msg}
        </div>
      )}

      <GoldCard className="p-4 mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#d4af37]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by phone…"
            className="flex-1 bg-transparent text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none text-sm"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-[#1a1208]"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
          >
            Search
          </button>
        </div>
      </GoldCard>

      <GoldCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-[#f5d97a]/70">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-[#f5d97a]/60 text-sm">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No device bindings found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#d4af37]/20">
                <TableHead className="text-[#f5d97a]">Phone</TableHead>
                <TableHead className="text-[#f5d97a]">Panel</TableHead>
                <TableHead className="text-[#f5d97a]">Fingerprint</TableHead>
                <TableHead className="text-[#f5d97a]">Last Seen</TableHead>
                <TableHead className="text-[#f5d97a]">Status</TableHead>
                <TableHead className="text-[#f5d97a] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const locked = !row.unlocked_at;
                return (
                  <TableRow key={row.id} className="border-[#d4af37]/10">
                    <TableCell className="text-[#fff8dc] font-mono text-xs">{row.phone}</TableCell>
                    <TableCell>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold"
                        style={{
                          background: "rgba(212,175,55,0.15)",
                          color: "#f5d97a",
                        }}
                      >
                        {row.panel}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#f5d97a]/70 font-mono text-[10px]">
                      {row.fingerprint.slice(0, 16)}…
                    </TableCell>
                    <TableCell className="text-[#f5d97a]/70 text-xs">
                      {new Date(row.last_seen_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {locked ? (
                        <span className="text-red-300 text-xs font-bold">🔒 Locked</span>
                      ) : (
                        <span className="text-green-300 text-xs">✓ Unlocked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {locked && (
                        <button
                          onClick={() => handleUnlock(row)}
                          disabled={busyId === row.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-[#1a1208] disabled:opacity-50"
                          style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                          Unlock
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GoldCard>

      {audit.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-[#f5d97a] mb-2 uppercase tracking-widest">
            Recent Unlock Audit
          </h3>
          <GoldCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#d4af37]/20">
                  <TableHead className="text-[#f5d97a]">When</TableHead>
                  <TableHead className="text-[#f5d97a]">Phone</TableHead>
                  <TableHead className="text-[#f5d97a]">Panel</TableHead>
                  <TableHead className="text-[#f5d97a]">Reason</TableHead>
                  <TableHead className="text-[#f5d97a] text-right">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.id} className="border-[#d4af37]/10">
                    <TableCell className="text-[#f5d97a]/70 text-xs">
                      {new Date(a.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-[#fff8dc] font-mono text-xs">{a.phone}</TableCell>
                    <TableCell className="text-[#f5d97a]/70 text-xs">{a.panel ?? "—"}</TableCell>
                    <TableCell className="text-[#f5d97a]/70 text-xs">{a.reason ?? "—"}</TableCell>
                    <TableCell className="text-[#fff8dc] text-right text-xs">{a.rows_affected}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GoldCard>
        </div>
      )}
    </AdminLayout>
  );
}
