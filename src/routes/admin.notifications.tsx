import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Send, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { sendTestPush } from "@/lib/push.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Engine — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

type Trigger = {
  id: string;
  event_key: string;
  display_name: string;
  title: string;
  body: string;
  image_url: string | null;
  action_url: string | null;
  notification_type: string;
  channels: { push?: boolean; sms?: boolean; whatsapp?: boolean };
  audience: string;
  is_active: boolean;
  last_fired_at: string | null;
};

type Analytics = {
  totals: { sent: number; delivered: number; failed: number; tokens: number; triggers: number; campaigns: number };
  recent: Array<{ id: string; status: string; channel: string | null; provider: string | null; user_id: string | null; error: string | null; created_at: string }>;
};

const TYPES = ["basic", "banner", "big_image", "action", "silent"];
const AUDIENCES = ["user", "vendor", "all", "topic:promotions", "topic:orders"];
const TABS = [
  { k: "triggers", l: "Triggers" },
  { k: "logs", l: "Logs" },
  { k: "analytics", l: "Analytics" },
] as const;

function NotificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("triggers");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([
      (supabase as any).from("notification_triggers").select("*").order("display_name"),
      (supabase as any).rpc("get_notification_analytics"),
    ]);
    setTriggers((t.data ?? []) as Trigger[]);
    setAnalytics((a.data as Analytics) ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Trigger>) =>
    setTriggers((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const save = async (g: Trigger) => {
    setSavingId(g.id);
    await (supabase as any).rpc("admin_upsert_notification_trigger", {
      _id: g.id,
      _event_key: g.event_key,
      _display_name: g.display_name,
      _title: g.title,
      _body: g.body,
      _image_url: g.image_url,
      _action_url: g.action_url,
      _notification_type: g.notification_type,
      _channels: g.channels,
      _audience: g.audience,
      _is_active: g.is_active,
      _schedule_at: null,
    });
    setSavingId(null);
  };

  const sendTest = useServerFn(sendTestPush);
  const testSend = async (g: Trigger) => {
    setTestingId(g.id);
    try {
      const res: any = await sendTest({ data: { trigger_id: g.id } });
      if (res?.ok) {
        toast.success(`Push sent to ${res.sent} device(s)`);
      } else if (res?.reason === "no_device_tokens") {
        toast.error("No active device tokens for your account. Allow notifications in the app first.");
      } else if (res?.reason === "fcm_not_configured") {
        toast.error("FCM not configured (missing service account / project id).");
      } else {
        toast.error(`Send failed: ${res?.reason ?? "unknown"}${res?.error ? ` — ${res.error}` : ""}`);
      }
    } catch (e: any) {
      toast.error(`Test failed: ${e?.message ?? e}`);
    }
    setTestingId(null);
    load();
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Notification Engine"
        subtitle="FCM push, SMS & WhatsApp fallback, trigger-based automation, campaigns & analytics"
      />

      {/* KPI tiles */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kpi label="Sent" value={analytics.totals.sent} icon={<Send className="h-3.5 w-3.5" />} />
          <Kpi label="Delivered" value={analytics.totals.delivered} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          <Kpi label="Failed" value={analytics.totals.failed} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <Kpi label="Active Tokens" value={analytics.totals.tokens} icon={<Bell className="h-3.5 w-3.5" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition ${tab === t.k ? "text-[#1a1208]" : "text-[#f5d97a]/70 border border-[#d4af37]/30 hover:bg-[#d4af37]/10"}`}
            style={tab === t.k ? { background: "linear-gradient(180deg,#fff8dc,#f5d97a,#d4af37)" } : undefined}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : tab === "triggers" ? (
        <div className="grid gap-4">
          {triggers.map((g) => (
            <GoldCard key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-[#fff8dc]">{g.display_name}</h3>
                  <p className="text-[10px] text-[#d4af37]/70 mt-0.5 font-mono">{g.event_key}</p>
                </div>
                <Toggle label={g.is_active ? "ON" : "OFF"} value={g.is_active} onChange={(v) => update(g.id, { is_active: v })} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title" value={g.title} onChange={(v) => update(g.id, { title: v })} />
                <Field label="Audience" value={g.audience} onChange={(v) => update(g.id, { audience: v })} list={AUDIENCES} />
              </div>
              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Body</label>
                <textarea rows={2} value={g.body} onChange={(e) => update(g.id, { body: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <Field label="Image URL (banner / big_image)" value={g.image_url ?? ""} onChange={(v) => update(g.id, { image_url: v })} />
                <Field label="Deep Link / Action URL" value={g.action_url ?? ""} onChange={(v) => update(g.id, { action_url: v })} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <Select label="Type" value={g.notification_type} onChange={(v) => update(g.id, { notification_type: v })} options={TYPES} />
                <ChannelToggle label="Push" value={!!g.channels?.push} onChange={(v) => update(g.id, { channels: { ...g.channels, push: v } })} />
                <ChannelToggle label="WhatsApp" value={!!g.channels?.whatsapp} onChange={(v) => update(g.id, { channels: { ...g.channels, whatsapp: v } })} />
                <ChannelToggle label="SMS" value={!!g.channels?.sms} onChange={(v) => update(g.id, { channels: { ...g.channels, sms: v } })} />
              </div>

              <div className="flex gap-2 mt-4">
                <GoldButton onClick={() => save(g)} disabled={savingId === g.id} className="flex-1">
                  <Save className="h-3.5 w-3.5 inline mr-1.5" />
                  {savingId === g.id ? "Saving..." : "Save"}
                </GoldButton>
                <GoldButton onClick={() => testSend(g)} disabled={testingId === g.id} variant="outline">
                  <Send className="h-3.5 w-3.5 inline mr-1.5" />
                  {testingId === g.id ? "Sending..." : "Test"}
                </GoldButton>
              </div>
              {g.last_fired_at && (
                <p className="text-[10px] text-[#d4af37]/60 mt-2">Last fired: {new Date(g.last_fired_at).toLocaleString()}</p>
              )}
            </GoldCard>
          ))}
        </div>
      ) : tab === "logs" ? (
        <GoldCard className="p-4">
          {analytics?.recent?.length ? (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {analytics.recent.map((l) => (
                <div key={l.id} className={`p-3 rounded-xl border text-[11px] ${l.status === "failed" ? "border-red-500/30 bg-red-500/5" : "border-[#d4af37]/20 bg-black/30"}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[#f5d97a]">{l.provider ?? "—"} · {l.channel ?? "push"}</span>
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${l.status === "delivered" || l.status === "sent" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{l.status}</span>
                  </div>
                  <div className="text-[#fff8dc]/80">User: {l.user_id?.slice(0, 8) ?? "—"}</div>
                  {l.error && <div className="text-red-300/80 mt-1 font-mono">{l.error}</div>}
                  <div className="text-[#d4af37]/50 text-[9px] mt-1">{new Date(l.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#f5d97a]/60 text-center py-12">No notifications sent yet.</p>
          )}
        </GoldCard>
      ) : (
        <GoldCard className="p-5">
          <div className="flex items-center gap-2 mb-4 text-[#fff8dc]">
            <BarChart3 className="h-4 w-4 text-[#d4af37]" />
            <h3 className="font-display text-base font-bold">Engagement Overview</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat l="Active triggers" v={analytics?.totals.triggers ?? 0} />
            <Stat l="Total campaigns" v={analytics?.totals.campaigns ?? 0} />
            <Stat l="Delivery rate" v={`${analytics && analytics.totals.sent ? Math.round((analytics.totals.delivered / analytics.totals.sent) * 100) : 0}%`} />
          </div>
        </GoldCard>
      )}
    </AdminLayout>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <GoldCard className="p-4">
      <div className="flex items-center gap-2 text-[#d4af37] mb-1">{icon}<span className="text-[9px] uppercase tracking-widest font-bold">{label}</span></div>
      <div className="text-2xl font-display font-bold text-[#fff8dc]">{value.toLocaleString()}</div>
    </GoldCard>
  );
}
function Stat({ l, v }: { l: string; v: number | string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-black/40 border border-[#d4af37]/20">
      <div className="text-[9px] uppercase tracking-widest text-[#d4af37]/70 font-bold mb-1">{l}</div>
      <div className="text-xl font-display font-bold text-[#fff8dc]">{v}</div>
    </div>
  );
}
function Field({ label, value, onChange, list }: { label: string; value: string; onChange: (v: string) => void; list?: string[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} list={list ? `dl-${label}` : undefined}
        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
      {list && (
        <datalist id={`dl-${label}`}>
          {list.map((o) => <option key={o} value={o} />)}
        </datalist>
      )}
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold mb-1.5 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none text-xs">
        {options.map((o) => <option key={o} value={o} className="bg-[#0F0A05]">{o}</option>)}
      </select>
    </div>
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
      <div className={`relative h-5 w-9 rounded-full transition ${value ? "" : "bg-black/60"}`}
        style={value ? { background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" } : undefined}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">{label}</span>
    </button>
  );
}
function ChannelToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold border ${value ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" : "bg-black/40 text-[#d4af37]/60 border-[#d4af37]/20"}`}>
      {label} {value ? "✓" : ""}
    </button>
  );
}
