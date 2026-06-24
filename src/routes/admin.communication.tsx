import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Phone, MessageCircle, ListFilter, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldButton, GoldCard, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/communication")({
  head: () => ({
    meta: [
      { title: "Communication Hub — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <CommunicationPage />
    </AdminLayout>
  ),
});

type TabKey = "voice" | "groups" | "logs";

function CommunicationPage() {
  const [tab, setTab] = useState<TabKey>("voice");

  return (
    <>
      <PageHeader
        title="Communication Hub"
        subtitle="AI Voice Agent (DialNexa) + per-group WhatsApp/Voice toggles + Voice call log"
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <TabBtn active={tab === "voice"} onClick={() => setTab("voice")} icon={<Phone className="h-3.5 w-3.5" />}>
          AI Voice Providers
        </TabBtn>
        <TabBtn active={tab === "groups"} onClick={() => setTab("groups")} icon={<MessageCircle className="h-3.5 w-3.5" />}>
          Per-Group Toggles
        </TabBtn>
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")} icon={<ListFilter className="h-3.5 w-3.5" />}>
          Voice Call Log
        </TabBtn>
      </div>

      {tab === "voice" && <VoiceProvidersTab />}
      {tab === "groups" && <GroupTogglesTab />}
      {tab === "logs" && <VoiceLogTab />}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition ${
        active
          ? "text-[#1a1208]"
          : "border border-[#d4af37]/40 text-[#f5d97a] hover:bg-[#d4af37]/10"
      }`}
      style={
        active
          ? {
              background: "linear-gradient(180deg, #fff8dc 0%, #f5d97a 35%, #d4af37 100%)",
              boxShadow: "0 8px 24px -10px rgba(212,175,55,0.6)",
            }
          : undefined
      }
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- Tab 1: Voice Providers ---------------- */

type VoiceProvider = {
  id: string;
  provider: string;
  display_name: string;
  api_base_url: string | null;
  api_key: string | null;
  agent_id: string | null;
  caller_id: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
};

function emptyProvider(): VoiceProvider {
  return {
    id: "",
    provider: "dialnexa",
    display_name: "DialNexa",
    api_base_url: "https://api.dialnexa.com/v1",
    api_key: "",
    agent_id: "",
    caller_id: "",
    webhook_secret: "",
    is_active: false,
    is_test_mode: true,
    priority: 100,
  };
}

function VoiceProvidersTab() {
  const [rows, setRows] = useState<VoiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("voice_providers")
      .select("*")
      .order("priority", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as VoiceProvider[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addRow = () => setRows((r) => [emptyProvider(), ...r]);

  const updateField = (idx: number, patch: Partial<VoiceProvider>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const save = async (row: VoiceProvider, idx: number) => {
    setSavingId(row.id || `new-${idx}`);
    const payload: any = { ...row };
    if (!payload.id) delete payload.id;
    const { error } = await (supabase as any).from("voice_providers").upsert(payload).select();
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    load();
  };

  const remove = async (row: VoiceProvider) => {
    if (!row.id) {
      setRows((r) => r.filter((x) => x !== row));
      return;
    }
    if (!confirm(`Delete ${row.display_name}?`)) return;
    const { error } = await (supabase as any).from("voice_providers").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GoldButton onClick={addRow}>
          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Provider
        </GoldButton>
      </div>

      {rows.length === 0 && (
        <GoldCard className="p-8 text-center">
          <p className="text-[#f5d97a]/70 text-sm">
            कोई voice provider configured नहीं। DialNexa add करने के लिए ऊपर "Add Provider" दबाएँ।
          </p>
        </GoldCard>
      )}

      {rows.map((row, idx) => (
        <GoldCard key={row.id || `new-${idx}`} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Provider" value={row.provider} onChange={(v) => updateField(idx, { provider: v })} />
            <Field
              label="Display Name"
              value={row.display_name}
              onChange={(v) => updateField(idx, { display_name: v })}
            />
            <Field
              label="API Base URL"
              value={row.api_base_url ?? ""}
              onChange={(v) => updateField(idx, { api_base_url: v })}
            />
            <Field
              label="API Key"
              value={row.api_key ?? ""}
              onChange={(v) => updateField(idx, { api_key: v })}
              type="password"
            />
            <Field
              label="Agent ID"
              value={row.agent_id ?? ""}
              onChange={(v) => updateField(idx, { agent_id: v })}
            />
            <Field
              label="Caller ID (number)"
              value={row.caller_id ?? ""}
              onChange={(v) => updateField(idx, { caller_id: v })}
            />
            <Field
              label="Webhook Secret"
              value={row.webhook_secret ?? ""}
              onChange={(v) => updateField(idx, { webhook_secret: v })}
              type="password"
            />
            <Field
              label="Priority (lower = first)"
              value={String(row.priority)}
              onChange={(v) => updateField(idx, { priority: Number(v) || 100 })}
              type="number"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Toggle
              label="Active"
              checked={row.is_active}
              onChange={(v) => updateField(idx, { is_active: v })}
            />
            <Toggle
              label="Test Mode"
              checked={row.is_test_mode}
              onChange={(v) => updateField(idx, { is_test_mode: v })}
            />
            <div className="ml-auto flex gap-2">
              <GoldButton variant="danger" size="sm" onClick={() => remove(row)}>
                <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Delete
              </GoldButton>
              <GoldButton
                size="sm"
                onClick={() => save(row, idx)}
                disabled={savingId === (row.id || `new-${idx}`)}
              >
                {savingId === (row.id || `new-${idx}`) ? (
                  <Loader2 className="h-3.5 w-3.5 inline animate-spin" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 inline mr-1" /> Save
                  </>
                )}
              </GoldButton>
            </div>
          </div>
        </GoldCard>
      ))}

      <GoldCard className="p-5 mt-6">
        <h3 className="text-sm font-bold text-[#fff8dc] mb-2">📚 Setup Notes</h3>
        <ul className="text-xs text-[#f5d97a]/70 space-y-1 list-disc list-inside">
          <li>WhatsApp Business credentials manage करने के लिए → <b>WhatsApp API</b> tab में जाएँ।</li>
          <li>SMS / OTP gateway के लिए → <b>SMS Gateways</b> tab।</li>
          <li>Webhook URL जो DialNexa में paste करनी है: <code className="text-[#f5d97a]">https://karoonline.in/api/public/dialnexa/callback</code></li>
          <li>API key paste करते ही "Save" दबाएँ; phase B में हम initiate-call route activate करेंगे।</li>
        </ul>
      </GoldCard>
    </div>
  );
}

/* ---------------- Tab 2: Per-Group Toggles ---------------- */

type GroupRow = {
  id: string;
  name: string;
  category_name?: string;
  voice_agent_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  settings_id?: string;
};

function GroupTogglesTab() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: groups, error } = await (supabase as any)
      .from("catalog_groups")
      .select("id, name, categories(name)")
      .eq("is_active", true)
      .order("name");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const { data: settings } = await (supabase as any)
      .from("group_communication_settings")
      .select("*");
    const sMap = new Map<string, any>((settings ?? []).map((s: any) => [s.group_id, s]));
    const merged: GroupRow[] = (groups ?? []).map((g: any) => {
      const s = sMap.get(g.id);
      return {
        id: g.id,
        name: g.name,
        category_name: g.categories?.name,
        voice_agent_enabled: s?.voice_agent_enabled ?? false,
        whatsapp_enabled: s?.whatsapp_enabled ?? true,
        push_enabled: s?.push_enabled ?? true,
        settings_id: s?.id,
      };
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const upsert = async (row: GroupRow) => {
    setSavingId(row.id);
    const payload: any = {
      group_id: row.id,
      voice_agent_enabled: row.voice_agent_enabled,
      whatsapp_enabled: row.whatsapp_enabled,
      push_enabled: row.push_enabled,
    };
    if (row.settings_id) payload.id = row.settings_id;
    const { error } = await (supabase as any)
      .from("group_communication_settings")
      .upsert(payload, { onConflict: "group_id" });
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${row.name} saved`);
  };

  const toggle = (idx: number, key: keyof GroupRow, val: boolean) => {
    setRows((r) => {
      const next = r.map((row, i) => (i === idx ? { ...row, [key]: val } : row));
      void upsert(next[idx]);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.category_name ?? "").toLowerCase().includes(s),
    );
  }, [q, rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search group / category..."
        className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-[#d4af37]/30 text-[#fff8dc] text-sm placeholder:text-[#d4af37]/40 focus:outline-none focus:border-[#d4af37]"
      />

      <GoldCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-[#d4af37]/70">
              <th className="text-left px-4 py-3">Group</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-center px-4 py-3">Push</th>
              <th className="text-center px-4 py-3">WhatsApp</th>
              <th className="text-center px-4 py-3">AI Voice</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={row.id} className="border-t border-[#d4af37]/15">
                <td className="px-4 py-3 text-[#fff8dc] font-medium">{row.name}</td>
                <td className="px-4 py-3 text-[#f5d97a]/70">{row.category_name ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Toggle
                    checked={row.push_enabled}
                    onChange={(v) => toggle(idx, "push_enabled", v)}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle
                    checked={row.whatsapp_enabled}
                    onChange={(v) => toggle(idx, "whatsapp_enabled", v)}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <Toggle
                    checked={row.voice_agent_enabled}
                    onChange={(v) => toggle(idx, "voice_agent_enabled", v)}
                  />
                </td>
                <td className="px-4 py-3 text-center text-[10px] text-[#d4af37]/70">
                  {savingId === row.id ? <Loader2 className="h-3 w-3 inline animate-spin" /> : "✓"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#f5d97a]/60 text-sm">
                  No groups match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GoldCard>
    </div>
  );
}

/* ---------------- Tab 3: Voice Log ---------------- */

type CallLog = {
  id: string;
  created_at: string;
  lead_id: string | null;
  vendor_id: string | null;
  external_call_id: string | null;
  to_phone: string | null;
  status: string;
  outcome: string | null;
  rejection_reason: string | null;
  duration_sec: number | null;
};

function VoiceLogTab() {
  const [rows, setRows] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("voice_call_logs")
        .select("id, created_at, lead_id, vendor_id, external_call_id, to_phone, status, outcome, rejection_reason, duration_sec")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error(error.message);
      setRows((data as CallLog[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <GoldCard className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-[#d4af37]/70">
            <th className="text-left px-3 py-3">Time</th>
            <th className="text-left px-3 py-3">Lead</th>
            <th className="text-left px-3 py-3">Vendor</th>
            <th className="text-left px-3 py-3">Phone</th>
            <th className="text-left px-3 py-3">Status</th>
            <th className="text-left px-3 py-3">Outcome</th>
            <th className="text-left px-3 py-3">Reason</th>
            <th className="text-right px-3 py-3">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#d4af37]/15 text-[#fff8dc]">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-3 py-2 font-mono text-[10px]">{r.lead_id?.slice(0, 8) ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-[10px]">{r.vendor_id?.slice(0, 8) ?? "—"}</td>
              <td className="px-3 py-2">{r.to_phone ?? "—"}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === "completed"
                      ? "bg-green-500/20 text-green-300"
                      : r.status === "failed"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2">{r.outcome ?? "—"}</td>
              <td className="px-3 py-2 max-w-[200px] truncate">{r.rejection_reason ?? "—"}</td>
              <td className="px-3 py-2 text-right">{r.duration_sec ?? 0}s</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-[#f5d97a]/60">
                अभी तक कोई voice call नहीं हुई। Phase C के बाद यहाँ data आएगा।
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </GoldCard>
  );
}

/* ---------------- Shared inputs ---------------- */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 font-bold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/30 text-[#fff8dc] text-sm focus:outline-none focus:border-[#d4af37]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          checked ? "bg-[#d4af37]" : "bg-black/40 border border-[#d4af37]/30"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      {label && <span className="text-xs text-[#f5d97a]">{label}</span>}
    </label>
  );
}
