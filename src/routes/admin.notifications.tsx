import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell, Loader2, Save, Send, AlertTriangle, CheckCircle2, BarChart3,
  Megaphone, Users, Filter, Plus, Trash2, Target, BookMarked, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import { useServerFn } from "@tanstack/react-start";
import { sendTestPush } from "@/lib/push.functions";
import {
  previewAudience, listCampaigns, upsertCampaign, deleteCampaign, sendCampaignNow,
  listTemplates, deleteTemplate, sendDirectTest, getLogDetails,
} from "@/lib/notification-campaigns.functions";
import { SmartMediaPicker } from "@/components/SmartMediaPicker";
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
  id: string; event_key: string; display_name: string; title: string; body: string;
  image_url: string | null; action_url: string | null; notification_type: string;
  channels: { push?: boolean; sms?: boolean; whatsapp?: boolean };
  audience: string; is_active: boolean; last_fired_at: string | null;
};
type Analytics = {
  totals: { sent: number; delivered: number; failed: number; tokens: number; triggers: number; campaigns: number };
  recent: Array<{ id: string; status: string; channel: string | null; provider: string | null; user_id: string | null; error: string | null; created_at: string }>;
};
type Campaign = {
  id: string; name: string; title: string; body: string; image_url: string | null;
  action_url: string | null; notification_type: string; status: string;
  sent_count: number; delivered_count: number; failed_count: number;
  audience_filter: any; manual_targets: string[]; created_at: string;
};
type Template = {
  id: string; name: string; title: string; body: string; image_url: string | null;
  action_url: string | null; notification_type: string;
};
type AudienceFilter = {
  role: "all" | "vendor" | "customer";
  kyc_status: "any" | "verified" | "pending" | "rejected";
  active: "any" | "active" | "blocked";
  city: string;
};

const TYPES = ["basic", "banner", "big_image", "action", "silent"];
const AUDIENCES = ["user", "vendor", "all", "topic:promotions", "topic:orders"];
const TABS = [
  { k: "campaigns", l: "Campaigns" },
  { k: "triggers", l: "Triggers" },
  { k: "logs", l: "Logs" },
  { k: "analytics", l: "Analytics" },
] as const;

function NotificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("campaigns");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Drawer for clickable KPIs
  const [drawerStatus, setDrawerStatus] = useState<"delivered" | "failed" | "sent" | null>(null);

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
      _id: g.id, _event_key: g.event_key, _display_name: g.display_name,
      _title: g.title, _body: g.body, _image_url: g.image_url, _action_url: g.action_url,
      _notification_type: g.notification_type, _channels: g.channels, _audience: g.audience,
      _is_active: g.is_active, _schedule_at: null,
    });
    setSavingId(null);
  };

  const sendTest = useServerFn(sendTestPush);
  const testSend = async (g: Trigger) => {
    setTestingId(g.id);
    try {
      const res: any = await sendTest({ data: { trigger_id: g.id } });
      if (res?.ok) toast.success(`Push sent to ${res.sent} device(s)`);
      else toast.error(`Send failed: ${res?.reason ?? "unknown"}${res?.error ? ` — ${res.error}` : ""}`);
    } catch (e: any) { toast.error(`Test failed: ${e?.message ?? e}`); }
    setTestingId(null);
    load();
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Notification Engine"
        subtitle="Campaigns, segmentation, push triggers, delivery logs & analytics"
      />

      {/* Clickable KPI tiles */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiBtn label="Sent" value={analytics.totals.sent} icon={<Send className="h-3.5 w-3.5" />} onClick={() => setDrawerStatus("sent")} />
          <KpiBtn label="Delivered" value={analytics.totals.delivered} icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setDrawerStatus("delivered")} />
          <KpiBtn label="Failed" value={analytics.totals.failed} icon={<AlertTriangle className="h-3.5 w-3.5" />} onClick={() => setDrawerStatus("failed")} />
          <KpiBtn label="Active Tokens" value={analytics.totals.tokens} icon={<Bell className="h-3.5 w-3.5" />} />
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

      {tab === "campaigns" ? (
        <CampaignsPanel />
      ) : loading ? (
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
                <Field label="Image URL" value={g.image_url ?? ""} onChange={(v) => update(g.id, { image_url: v })} />
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
            </GoldCard>
          ))}
        </div>
      ) : tab === "logs" ? (
        <GoldCard className="p-4">
          <p className="text-[10px] text-[#d4af37]/70 mb-3">Tap any KPI tile above to see full delivery details.</p>
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
          ) : <p className="text-xs text-[#f5d97a]/60 text-center py-12">No notifications sent yet.</p>}
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

      {drawerStatus && (
        <LogDetailDrawer status={drawerStatus} onClose={() => setDrawerStatus(null)} />
      )}
    </AdminLayout>
  );
}

/* ============================================================
   CAMPAIGNS PANEL
   ============================================================ */
function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editor, setEditor] = useState<Partial<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);

  const fnList = useServerFn(listCampaigns);
  const fnListT = useServerFn(listTemplates);
  const fnDel = useServerFn(deleteCampaign);
  const fnDelT = useServerFn(deleteTemplate);
  const fnSend = useServerFn(sendCampaignNow);

  const load = async () => {
    setLoading(true);
    const [c, t]: any[] = await Promise.all([fnList(), fnListT()]);
    setCampaigns((c?.items ?? []) as Campaign[]);
    setTemplates((t?.items ?? []) as Template[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sendNow = async (id: string) => {
    if (!confirm("Send this campaign to all matched recipients now?")) return;
    const t = toast.loading("Sending campaign...");
    try {
      const r: any = await fnSend({ data: { id } });
      toast.dismiss(t);
      if (r?.ok) toast.success(`Sent to ${r.recipients} users • ${r.delivered} delivered • ${r.failed} failed`);
      else toast.error(r?.error ?? "Send failed");
      load();
    } catch (e: any) { toast.dismiss(t); toast.error(e?.message ?? "Send failed"); }
  };

  return (
    <div className="space-y-5">
      <DirectSendCard />

      <GoldCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-[#fff8dc] flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#d4af37]" /> Campaigns
          </h3>
          <GoldButton onClick={() => setEditor({})}>
            <Plus className="h-3.5 w-3.5 inline mr-1.5" /> Create New
          </GoldButton>
        </div>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-xs text-[#f5d97a]/60 text-center py-8">No campaigns yet. Click "Create New" to start.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-[#d4af37]/20 bg-black/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#fff8dc]">{c.name}</span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${c.status === "sent" ? "bg-emerald-500/20 text-emerald-300" : c.status === "sending" ? "bg-amber-500/20 text-amber-300" : "bg-zinc-500/20 text-zinc-300"}`}>{c.status}</span>
                    </div>
                    <p className="text-[11px] text-[#fff8dc]/70 mt-1 truncate">{c.title} — {c.body}</p>
                    <div className="text-[10px] text-[#d4af37]/70 mt-1">
                      Recipients: {c.sent_count} • Delivered: {c.delivered_count} • Failed: {c.failed_count}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-col">
                    <button onClick={() => sendNow(c.id)} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Send Now</button>
                    <button onClick={() => setEditor(c)} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-[#d4af37]/20 text-[#fff8dc] border border-[#d4af37]/40">Edit</button>
                    <button onClick={async () => { if (confirm("Delete?")) { await fnDel({ data: { id: c.id } }); load(); } }} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-500/20 text-red-200 border border-red-500/40">
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldCard>

      <GoldCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-[#fff8dc] flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-[#d4af37]" /> Saved Templates
          </h3>
        </div>
        {templates.length === 0 ? (
          <p className="text-[11px] text-[#f5d97a]/60 text-center py-6">No templates saved yet. Save one from the campaign editor.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {templates.map((t) => (
              <div key={t.id} className="p-3 rounded-xl border border-[#d4af37]/20 bg-black/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[#fff8dc]">{t.name}</div>
                    <div className="text-[10px] text-[#fff8dc]/70 truncate">{t.title}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditor({ name: t.name, title: t.title, body: t.body, image_url: t.image_url, action_url: t.action_url, notification_type: t.notification_type })}
                      className="text-[10px] px-2 py-1 rounded bg-[#d4af37]/20 text-[#fff8dc] border border-[#d4af37]/40">Use</button>
                    <button onClick={async () => { if (confirm("Delete template?")) { await fnDelT({ data: { id: t.id } }); load(); } }}
                      className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-200 border border-red-500/40"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldCard>

      {editor && (
        <CampaignEditor
          initial={editor}
          onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); load(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   DIRECT SEND CARD
   ============================================================ */
function DirectSendCard() {
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("Test notification");
  const [body, setBody] = useState("This is a test from Admin Panel.");
  const [actionUrl, setActionUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fn = useServerFn(sendDirectTest);

  const send = async () => {
    if (!target.trim()) return toast.error("Enter a user ID or phone");
    setBusy(true);
    try {
      const r: any = await fn({ data: { target: target.trim(), title, body, action_url: actionUrl || null } });
      if (r?.ok) toast.success(`Delivered to ${r.sent ?? 0} device(s)`);
      else toast.error(r?.error ?? r?.reason ?? "Send failed");
    } catch (e: any) { toast.error(e?.message ?? "Send failed"); }
    setBusy(false);
  };

  return (
    <GoldCard className="p-4">
      <h3 className="font-display text-sm font-bold text-[#fff8dc] flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-[#d4af37]" /> Direct Test Send
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <Field label="User ID or 10-digit Phone" value={target} onChange={setTarget} />
        <Field label="Deep Link (optional)" value={actionUrl} onChange={setActionUrl} />
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Body" value={body} onChange={setBody} />
      </div>
      <div className="mt-3">
        <GoldButton onClick={send} disabled={busy}>
          <Send className="h-3.5 w-3.5 inline mr-1.5" /> {busy ? "Sending..." : "Send Test"}
        </GoldButton>
      </div>
    </GoldCard>
  );
}

/* ============================================================
   CAMPAIGN EDITOR (bottom sheet)
   ============================================================ */
function CampaignEditor({
  initial, onClose, onSaved,
}: { initial: Partial<Campaign>; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<any>({
    name: initial.name ?? "",
    title: initial.title ?? "",
    body: initial.body ?? "",
    image_url: initial.image_url ?? null,
    action_url: initial.action_url ?? "",
    notification_type: initial.notification_type ?? "basic",
    audience_filter: initial.audience_filter ?? { role: "all", kyc_status: "any", active: "any", city: "" },
    manual_targets: (initial.manual_targets ?? []).join("\n"),
  });
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  const fnPreview = useServerFn(previewAudience);
  const fnSave = useServerFn(upsertCampaign);
  const fnSend = useServerFn(sendCampaignNow);

  const parseManual = (): string[] =>
    String(c.manual_targets || "")
      .split(/[\s,]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);

  const preview = async () => {
    setPreviewing(true);
    try {
      const r: any = await fnPreview({ data: { filter: cleanFilter(c.audience_filter) } });
      setPreviewCount(r?.total ?? 0);
    } catch (e: any) { toast.error(e?.message ?? "Preview failed"); }
    setPreviewing(false);
  };

  const save = async (sendAfter = false) => {
    if (!c.name || !c.title || !c.body) return toast.error("Name, Title and Body are required");
    setBusy(true);
    try {
      const r: any = await fnSave({
        data: {
          id: initial.id,
          name: c.name, title: c.title, body: c.body,
          image_url: c.image_url || null, action_url: c.action_url || null,
          notification_type: c.notification_type,
          audience_filter: cleanFilter(c.audience_filter),
          manual_targets: parseManual(),
          save_as_template: saveAsTemplate,
          template_name: templateName || c.name,
        },
      });
      if (!r?.ok) { toast.error("Save failed"); setBusy(false); return; }
      toast.success("Campaign saved");
      if (sendAfter && r.id) {
        const s: any = await fnSend({ data: { id: r.id } });
        if (s?.ok) toast.success(`Sent to ${s.recipients} users`);
        else toast.error(s?.error ?? "Send failed");
      }
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 grid place-items-end sm:place-items-center">
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-t-2xl sm:rounded-2xl border border-[#d4af37]/40 bg-[#0F0A05] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-[#fff8dc]">
            {initial.id ? "Edit Campaign" : "New Campaign"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#f5d97a]"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-3">
          <Field label="Campaign Name (internal)" value={c.name} onChange={(v) => setC({ ...c, name: v })} />
          <Field label="Title (shown to user)" value={c.title} onChange={(v) => setC({ ...c, title: v })} />
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Body</label>
            <textarea rows={3} value={c.body} onChange={(e) => setC({ ...c, body: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none text-xs" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Image</label>
            <SmartMediaPicker value={c.image_url} onChange={(v) => setC({ ...c, image_url: v })} folder="notifications" label="Notification Image" />
          </div>

          <Field label="Deep Link / Action URL" value={c.action_url} onChange={(v) => setC({ ...c, action_url: v })} />
          <Select label="Notification Type" value={c.notification_type} onChange={(v) => setC({ ...c, notification_type: v })} options={TYPES} />

          {/* Segmentation */}
          <div className="rounded-xl border border-[#d4af37]/30 p-3 bg-black/30">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a] font-bold">Audience Filter</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select label="Role" value={c.audience_filter.role} onChange={(v) => setC({ ...c, audience_filter: { ...c.audience_filter, role: v } })} options={["all", "vendor", "customer"]} />
              <Select label="KYC Status" value={c.audience_filter.kyc_status} onChange={(v) => setC({ ...c, audience_filter: { ...c.audience_filter, kyc_status: v } })} options={["any", "verified", "pending", "rejected"]} />
              <Select label="Active Status" value={c.audience_filter.active} onChange={(v) => setC({ ...c, audience_filter: { ...c.audience_filter, active: v } })} options={["any", "active", "blocked"]} />
              <Field label="City (contains)" value={c.audience_filter.city} onChange={(v) => setC({ ...c, audience_filter: { ...c.audience_filter, city: v } })} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={preview} disabled={previewing}
                className="text-[10px] uppercase font-bold px-3 py-1.5 rounded bg-[#d4af37]/20 text-[#fff8dc] border border-[#d4af37]/40">
                {previewing ? "Counting..." : "Preview Count"}
              </button>
              {previewCount !== null && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold">
                  <Users className="h-3.5 w-3.5" /> {previewCount} users match
                </div>
              )}
            </div>
          </div>

          {/* Manual targets */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
              Manual Targets (user IDs or 10-digit phones, comma/newline separated)
            </label>
            <textarea rows={3} value={c.manual_targets} onChange={(e) => setC({ ...c, manual_targets: e.target.value })}
              placeholder="9876543210, 9540068380&#10;or paste user UUIDs"
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none text-xs font-mono" />
            <p className="text-[9px] text-[#d4af37]/60 mt-1">These are merged with the filter audience.</p>
          </div>

          {/* Save as template */}
          <div className="rounded-xl border border-[#d4af37]/20 p-3 bg-black/30 flex items-center gap-3 flex-wrap">
            <Toggle label="Save as Template" value={saveAsTemplate} onChange={setSaveAsTemplate} />
            {saveAsTemplate && (
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name"
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none text-xs" />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <GoldButton onClick={() => save(false)} disabled={busy} className="flex-1">
              <Save className="h-3.5 w-3.5 inline mr-1.5" /> {busy ? "Saving..." : "Save Draft"}
            </GoldButton>
            <GoldButton onClick={() => save(true)} disabled={busy} variant="outline">
              <Send className="h-3.5 w-3.5 inline mr-1.5" /> Save & Send Now
            </GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanFilter(f: AudienceFilter) {
  return {
    role: f.role || "all",
    kyc_status: f.kyc_status || "any",
    active: f.active || "any",
    city: f.city?.trim() || null,
  };
}

/* ============================================================
   LOG DETAIL DRAWER
   ============================================================ */
function LogDetailDrawer({ status, onClose }: { status: "sent" | "delivered" | "failed"; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fn = useServerFn(getLogDetails);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r: any = await fn({ data: { status, limit: 300 } });
        setRows(r?.items ?? []);
      } catch (e: any) { toast.error(e?.message ?? "Load failed"); }
      setLoading(false);
    })();
  }, [status]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 grid place-items-end sm:place-items-center">
      <div className="w-full sm:max-w-3xl max-h-[92vh] overflow-auto rounded-t-2xl sm:rounded-2xl border border-[#d4af37]/40 bg-[#0F0A05] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-[#fff8dc] uppercase">{status} — Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#f5d97a]"><X className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[#f5d97a]/60 text-center py-12">No rows.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className={`p-3 rounded-xl border text-[11px] ${r.status === "failed" ? "border-red-500/30 bg-red-500/5" : "border-[#d4af37]/20 bg-black/30"}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-bold text-[#fff8dc]">{r.display_name || "Unknown"}</div>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${r.status === "delivered" || r.status === "sent" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{r.status}</span>
                </div>
                <div className="text-[10px] text-[#fff8dc]/70 mt-1">📞 {r.phone || "—"} • {r.channel ?? "push"} / {r.provider ?? "—"}</div>
                <div className="text-[9px] text-[#d4af37]/60 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                {r.error && <div className="text-red-300/80 mt-1 font-mono break-all">{r.error}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SHARED UI HELPERS
   ============================================================ */
function KpiBtn({ label, value, icon, onClick }: { label: string; value: number; icon: React.ReactNode; onClick?: () => void }) {
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="text-left">
      <GoldCard className={`p-4 ${onClick ? "hover:bg-[#d4af37]/10 transition cursor-pointer" : ""}`}>
        <div className="flex items-center gap-2 text-[#d4af37] mb-1">{icon}<span className="text-[9px] uppercase tracking-widest font-bold">{label}</span></div>
        <div className="text-2xl font-display font-bold text-[#fff8dc]">{value.toLocaleString()}</div>
      </GoldCard>
    </Tag>
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
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} list={list ? `dl-${label}` : undefined}
        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
      {list && <datalist id={`dl-${label}`}>{list.map((o) => <option key={o} value={o} />)}</datalist>}
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
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
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
