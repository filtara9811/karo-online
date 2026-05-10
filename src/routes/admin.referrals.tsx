import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Gift, Users, IndianRupee, CheckCircle2, Clock, XCircle, Plus, Trash2, Image as ImageIcon, Save, RefreshCw, Crown, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader, GoldButton } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/referrals")({
  head: () => ({
    meta: [
      { title: "Referral Program — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReferralsPage,
});

type Overview = {
  totals: {
    invited: number; successful: number; pending: number; rejected: number;
    rewards_pending: number; rewards_approved: number; rewards_rejected: number;
  };
  top_referrers: Array<{ user_id: string; name?: string; phone?: string; avatar_url?: string; total: number; successful: number; earnings: number }>;
  recent: Array<{ id: string; created_at: string; status: string; kind: string; referrer: any; referred: any }>;
  rewards_queue: Array<{ id: string; amount: number; status: string; trigger: string; created_at: string; user_id: string; name?: string; phone?: string; referral_id: string }>;
};

type Campaign = {
  id?: string;
  name: string;
  kind: string;
  is_active: boolean;
  reward_amount: number;
  release_trigger: string;
  min_order_value: number;
  max_per_user: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

type Banner = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
  sort_order: number;
  is_active: boolean;
};

const TRIGGERS = ["registered", "otp_verified", "kyc_completed", "became_seller", "first_order_placed", "payment_completed"];
const TABS = ["Overview", "Rewards Queue", "Campaigns", "Banners", "Top Referrers"] as const;

function AdminReferralsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Overview");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: r } = await supabase.rpc("admin_get_referral_overview");
    setData(r as Overview);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const t = data?.totals;

  return (
    <AdminLayout>
      <PageHeader
        title="Referral Program"
        subtitle="Banners, campaigns, rewards approval & analytics — full control"
        action={
          <GoldButton variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3 w-3 inline mr-1" /> Refresh
          </GoldButton>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Users}   label="Total Invited"      value={t?.invited ?? 0} />
        <Kpi icon={CheckCircle2} label="Successful"    value={t?.successful ?? 0} tone="green" />
        <Kpi icon={Clock}   label="Pending"            value={t?.pending ?? 0} tone="amber" />
        <Kpi icon={XCircle} label="Rejected"           value={t?.rejected ?? 0} tone="red" />
        <Kpi icon={IndianRupee} label="Payouts Pending"  value={`₹${(t?.rewards_pending ?? 0).toLocaleString()}`} tone="amber" />
        <Kpi icon={IndianRupee} label="Payouts Approved" value={`₹${(t?.rewards_approved ?? 0).toLocaleString()}`} tone="green" />
        <Kpi icon={IndianRupee} label="Payouts Rejected" value={`₹${(t?.rewards_rejected ?? 0).toLocaleString()}`} tone="red" />
        <Kpi icon={Gift}    label="Top Referrer"
             value={data?.top_referrers?.[0]?.name?.slice(0,12) ?? data?.top_referrers?.[0]?.phone ?? "—"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition ${
              tab === t
                ? "text-[#1a1208]"
                : "text-[#f5d97a]/70 border border-[#d4af37]/30 hover:bg-[#d4af37]/10"
            }`}
            style={tab === t ? { background: "linear-gradient(180deg, #fff8dc 0%, #f5d97a 35%, #d4af37 100%)" } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[#f5d97a]/60">Loading…</p>}

      {!loading && tab === "Overview" && <OverviewTab data={data} />}
      {!loading && tab === "Rewards Queue" && <RewardsTab data={data} onChange={refresh} />}
      {!loading && tab === "Campaigns" && <CampaignsTab />}
      {!loading && tab === "Banners" && <BannersTab />}
      {!loading && tab === "Top Referrers" && <TopReferrersTab data={data} />}
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone?: "green" | "amber" | "red" }) {
  const color =
    tone === "green" ? "text-emerald-300"
    : tone === "amber" ? "text-amber-300"
    : tone === "red" ? "text-red-300"
    : "text-[#fff8dc]";
  return (
    <GoldCard className="p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/70 font-bold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${color}`}>{value}</p>
    </GoldCard>
  );
}

function OverviewTab({ data }: { data: Overview | null }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <GoldCard className="p-5">
        <h3 className="font-display font-bold text-[#fff8dc] mb-3">Recent Referrals</h3>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {(data?.recent ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#d4af37]/15 bg-black/20">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#fff8dc] truncate">
                  {r.referrer?.name || r.referrer?.phone || "—"} <span className="text-[#d4af37]/60">→</span> {r.referred?.name || r.referred?.phone || "—"}
                </p>
                <p className="text-[10px] text-[#f5d97a]/60 mt-0.5">
                  {new Date(r.created_at).toLocaleString()} · {r.kind}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
          ))}
          {(!data?.recent || data.recent.length === 0) && <p className="text-xs text-[#f5d97a]/50">No referrals yet.</p>}
        </div>
      </GoldCard>

      <GoldCard className="p-5">
        <h3 className="font-display font-bold text-[#fff8dc] mb-3">Top Referrers (preview)</h3>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {(data?.top_referrers ?? []).slice(0, 8).map((u, i) => (
            <div key={u.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#d4af37]/15 bg-black/20">
              <div className="h-8 w-8 rounded-full bg-[#d4af37]/20 grid place-items-center text-[#fff8dc] text-xs font-bold">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#fff8dc] truncate">{u.name || u.phone || u.user_id.slice(0, 8)}</p>
                <p className="text-[10px] text-[#f5d97a]/60">{u.successful} successful · {u.total} total</p>
              </div>
              <p className="text-xs font-bold text-emerald-300">₹{Number(u.earnings).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </GoldCard>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    locked: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${map[status] ?? "bg-white/10 text-white/70 border-white/20"}`}>
      {status}
    </span>
  );
}

function RewardsTab({ data, onChange }: { data: Overview | null; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (id: string) => {
    setBusy(id);
    await supabase.rpc("admin_approve_referral_reward", { _reward_id: id });
    setBusy(null); onChange();
  };
  const reject = async (id: string) => {
    const notes = window.prompt("Reason for rejection? (optional)") ?? "";
    setBusy(id);
    await supabase.rpc("admin_reject_referral_reward", { _reward_id: id, _notes: notes });
    setBusy(null); onChange();
  };

  const callUser = async (userId: string) => {
    const { data: c } = await supabase.from("customers").select("phone").eq("user_id", userId).maybeSingle();
    if (c?.phone) window.location.href = `tel:${c.phone}`;
    else alert("No phone on file.");
  };

  return (
    <GoldCard className="p-5">
      <h3 className="font-display font-bold text-[#fff8dc] mb-4">Reward Approvals</h3>
      <div className="space-y-2">
        {(data?.rewards_queue ?? []).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[#d4af37]/15 bg-black/20">
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-[#fff8dc] font-bold">{r.name || r.phone || r.user_id.slice(0, 8)}</p>
              <p className="text-[10px] text-[#f5d97a]/60">{r.trigger} · {new Date(r.created_at).toLocaleString()}</p>
            </div>
            <p className="font-bold text-[#fff8dc]">₹{Number(r.amount).toLocaleString()}</p>
            <StatusPill status={r.status} />
            <div className="flex gap-2 ml-auto">
              <button onClick={() => callUser(r.user_id)} className="px-2.5 py-1.5 rounded-lg border border-[#d4af37]/40 text-[#f5d97a] text-[10px] font-bold uppercase tracking-widest hover:bg-[#d4af37]/10">
                <Phone className="h-3 w-3 inline mr-1" /> Call
              </button>
              {r.status !== "approved" && (
                <GoldButton size="sm" onClick={() => approve(r.id)} disabled={busy === r.id}>
                  {busy === r.id ? "…" : "Approve & Pay"}
                </GoldButton>
              )}
              {r.status !== "rejected" && r.status !== "approved" && (
                <GoldButton size="sm" variant="danger" onClick={() => reject(r.id)} disabled={busy === r.id}>
                  Reject
                </GoldButton>
              )}
            </div>
          </div>
        ))}
        {(!data?.rewards_queue || data.rewards_queue.length === 0) && <p className="text-xs text-[#f5d97a]/50">No rewards yet.</p>}
      </div>
    </GoldCard>
  );
}

function CampaignsTab() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("referral_campaigns").select("*").order("created_at", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const blank = (): Campaign => ({
    name: "", kind: "customer", is_active: true, reward_amount: 200,
    release_trigger: "first_order_placed", min_order_value: 0, max_per_user: 0,
    starts_at: null, ends_at: null,
  });

  const save = async () => {
    if (!editing) return;
    await supabase.rpc("admin_upsert_referral_campaign", {
      _id: editing.id ?? null,
      _name: editing.name,
      _kind: editing.kind,
      _is_active: editing.is_active,
      _reward_amount: editing.reward_amount,
      _release_trigger: editing.release_trigger,
      _min_order_value: editing.min_order_value,
      _max_per_user: editing.max_per_user,
      _starts_at: editing.starts_at,
      _ends_at: editing.ends_at,
    });
    setEditing(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await supabase.from("referral_campaigns").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GoldButton onClick={() => setEditing(blank())}>
          <Plus className="h-3 w-3 inline mr-1" /> New Campaign
        </GoldButton>
      </div>

      {loading && <p className="text-sm text-[#f5d97a]/60">Loading…</p>}
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((c) => (
          <GoldCard key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-bold text-[#fff8dc]">{c.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-[#f5d97a]/60 mt-0.5">{c.kind} · {c.release_trigger}</p>
              </div>
              <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${c.is_active ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-white/10 text-white/60 border-white/20"}`}>
                {c.is_active ? "Active" : "Off"}
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-[#fff8dc]">₹{Number(c.reward_amount).toLocaleString()}</p>
            <p className="text-[10px] text-[#f5d97a]/60">Min order ₹{c.min_order_value} · Max/user {c.max_per_user || "∞"}</p>
            <div className="flex gap-2 mt-3">
              <GoldButton size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</GoldButton>
              <GoldButton size="sm" variant="danger" onClick={() => c.id && remove(c.id)}><Trash2 className="h-3 w-3" /></GoldButton>
            </div>
          </GoldCard>
        ))}
      </div>

      {editing && (
        <GoldCard className="p-5">
          <h3 className="font-display font-bold text-[#fff8dc] mb-4">{editing.id ? "Edit" : "New"} Campaign</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><input className={inp} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Kind">
              <select className={inp} value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
              </select>
            </Field>
            <Field label="Reward Amount (₹)"><input type="number" className={inp} value={editing.reward_amount} onChange={(e) => setEditing({ ...editing, reward_amount: Number(e.target.value) })} /></Field>
            <Field label="Release Trigger">
              <select className={inp} value={editing.release_trigger} onChange={(e) => setEditing({ ...editing, release_trigger: e.target.value })}>
                {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Min Order Value (₹)"><input type="number" className={inp} value={editing.min_order_value} onChange={(e) => setEditing({ ...editing, min_order_value: Number(e.target.value) })} /></Field>
            <Field label="Max Per User (0 = unlimited)"><input type="number" className={inp} value={editing.max_per_user} onChange={(e) => setEditing({ ...editing, max_per_user: Number(e.target.value) })} /></Field>
            <Field label="Starts At"><input type="datetime-local" className={inp} value={editing.starts_at?.slice(0,16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} /></Field>
            <Field label="Ends At"><input type="datetime-local" className={inp} value={editing.ends_at?.slice(0,16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} /></Field>
            <Field label="Active">
              <label className="flex items-center gap-2 text-[#fff8dc] text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Enabled
              </label>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <GoldButton onClick={save}><Save className="h-3 w-3 inline mr-1" /> Save</GoldButton>
            <GoldButton variant="outline" onClick={() => setEditing(null)}>Cancel</GoldButton>
          </div>
        </GoldCard>
      )}
    </div>
  );
}

function BannersTab() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("referral_banners").select("*").order("sort_order");
    setRows((data as any) ?? []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const blank = (): Banner => ({ title: "", subtitle: "", image_url: "", cta_label: "Refer Now", cta_link: "/referral", sort_order: rows.length, is_active: true });

  const save = async () => {
    if (!editing) return;
    if (editing.id) {
      await supabase.from("referral_banners").update(editing as any).eq("id", editing.id);
    } else {
      await supabase.from("referral_banners").insert(editing as any);
    }
    setEditing(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete banner?")) return;
    await supabase.from("referral_banners").delete().eq("id", id);
    refresh();
  };

  const upload = async (file: File) => {
    const path = `referral-banners/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("catalog").upload(path, file, { upsert: true });
    if (error) { alert(error.message); return; }
    const { data: pub } = supabase.storage.from("catalog").getPublicUrl(path);
    if (editing) setEditing({ ...editing, image_url: pub.publicUrl });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GoldButton onClick={() => setEditing(blank())}><Plus className="h-3 w-3 inline mr-1" /> New Banner</GoldButton>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((b) => (
          <GoldCard key={b.id} className="p-4">
            {b.image_url ? (
              <img src={b.image_url} alt={b.title || ""} className="w-full h-32 object-cover rounded-lg mb-3" />
            ) : (
              <div className="w-full h-32 rounded-lg bg-black/40 grid place-items-center text-[#d4af37]/40 mb-3">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <p className="font-display font-bold text-[#fff8dc]">{b.title || "Untitled"}</p>
            <p className="text-xs text-[#f5d97a]/70 mt-1">{b.subtitle}</p>
            <div className="flex gap-2 mt-3">
              <GoldButton size="sm" variant="outline" onClick={() => setEditing(b)}>Edit</GoldButton>
              <GoldButton size="sm" variant="danger" onClick={() => b.id && remove(b.id)}><Trash2 className="h-3 w-3" /></GoldButton>
            </div>
          </GoldCard>
        ))}
      </div>

      {editing && (
        <GoldCard className="p-5">
          <h3 className="font-display font-bold text-[#fff8dc] mb-4">{editing.id ? "Edit" : "New"} Banner</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title"><input className={inp} value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Subtitle"><input className={inp} value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
            <Field label="CTA Label"><input className={inp} value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
            <Field label="CTA Link"><input className={inp} value={editing.cta_link ?? ""} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} /></Field>
            <Field label="Sort Order"><input type="number" className={inp} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            <Field label="Active">
              <label className="flex items-center gap-2 text-[#fff8dc] text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Enabled
              </label>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Banner Image">
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-xs text-[#f5d97a]" />
                {editing.image_url && <img src={editing.image_url} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />}
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <GoldButton onClick={save}><Save className="h-3 w-3 inline mr-1" /> Save</GoldButton>
            <GoldButton variant="outline" onClick={() => setEditing(null)}>Cancel</GoldButton>
          </div>
        </GoldCard>
      )}
    </div>
  );
}

function TopReferrersTab({ data }: { data: Overview | null }) {
  return (
    <GoldCard className="p-5">
      <h3 className="font-display font-bold text-[#fff8dc] mb-4 flex items-center gap-2"><Crown className="h-4 w-4 text-[#d4af37]" /> Leaderboard</h3>
      <div className="space-y-2">
        {(data?.top_referrers ?? []).map((u, i) => (
          <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-[#d4af37]/15 bg-black/20">
            <div className="h-9 w-9 rounded-full grid place-items-center text-[#1a1208] text-sm font-bold"
                 style={{ background: i < 3 ? "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)" : "rgba(212,175,55,0.2)", color: i < 3 ? "#1a1208" : "#fff8dc" }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#fff8dc] font-bold truncate">{u.name || u.phone || u.user_id.slice(0, 8)}</p>
              <p className="text-[10px] text-[#f5d97a]/60">{u.successful} successful · {u.total} invites</p>
            </div>
            <p className="text-sm font-bold text-emerald-300">₹{Number(u.earnings).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </GoldCard>
  );
}

const inp = "w-full bg-black/30 border border-[#d4af37]/30 rounded-lg px-3 py-2 text-sm text-[#fff8dc] focus:outline-none focus:border-[#d4af37]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/70 font-bold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
