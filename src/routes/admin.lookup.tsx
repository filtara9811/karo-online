import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Loader2, User as UserIcon, Store, Wallet as WalletIcon, ShieldCheck, Ban, Save, X, Plus, Minus, Hash } from "lucide-react";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import {
  lookupUser,
  getUserFull,
  updateCustomerProfile,
  updateVendorProfile,
  adjustWallet,
  setUserBlock,
} from "@/lib/admin-lookup.functions";

export const Route = createFileRoute("/admin/lookup")({
  head: () => ({
    meta: [
      { title: "User Lookup — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LookupPage,
});

type LookupHit = {
  customer: any;
  vendor: any | null;
  wallet: any | null;
};

function LookupPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LookupHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const doLookup = useServerFn(lookupUser);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await doLookup({ data: { q: q.trim() } });
      setHits(r.results);
      if (r.results.length === 0) toast.message("No match found");
    } catch (e: any) {
      toast.error(e?.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="🔍 User Lookup (Customer 360)"
        subtitle="4-digit support code, phone, email, name ya user ID se search karo"
      />

      <GoldCard className="p-4 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#d4af37]/70" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="4821 / 9876543210 / user@mail / Name"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/30 border border-[#d4af37]/30 text-[#f5d97a] placeholder:text-[#f5d97a]/40 focus:outline-none focus:border-[#d4af37]"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] text-[#1a1a1a] font-bold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>
      </GoldCard>

      <div className="space-y-2">
        {hits.map((h) => (
          <button
            key={h.customer.id}
            onClick={() => setActiveId(h.customer.user_id)}
            className="block w-full text-left"
          >
            <GoldCard className="p-3 hover:border-[#d4af37]/60 transition">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center font-bold text-[#1a1a1a]">
                  {(h.customer.name || h.customer.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#f5d97a] truncate">{h.customer.name || "Unnamed"}</span>
                    {h.customer.support_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-mono flex items-center gap-0.5">
                        <Hash className="h-2.5 w-2.5" />{h.customer.support_code}
                      </span>
                    )}
                    {h.vendor && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">VENDOR</span>
                    )}
                    {h.customer.is_blocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">BLOCKED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#f5d97a]/70 truncate">
                    {h.customer.phone || "—"} · {h.customer.email || "—"}
                  </p>
                </div>
              </div>
            </GoldCard>
          </button>
        ))}
      </div>

      {activeId && <UserDrawer userId={activeId} onClose={() => setActiveId(null)} />}
    </AdminLayout>
  );
}

function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"profile" | "vendor" | "wallet" | "activity">("profile");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchFull = useServerFn(getUserFull);

  useState(() => {
    // intentional one-shot via key
  });

  // Load
  if (!data && loading) {
    fetchFull({ data: { userId } })
      .then((r) => setData(r))
      .catch((e) => toast.error(e?.message || "Load failed"))
      .finally(() => setLoading(false));
  }

  const refresh = async () => {
    setRefreshKey((k) => k + 1);
    try {
      const r = await fetchFull({ data: { userId } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message || "Reload failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#0f0a02] border border-[#d4af37]/40"
      >
        <div className="sticky top-0 z-10 bg-[#0f0a02]/95 backdrop-blur border-b border-[#d4af37]/20 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#f5d97a]">{data?.customer?.name || "User"}</h3>
            {data?.customer?.support_code && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-mono">#{data.customer.support_code}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/5 text-[#f5d97a]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !data ? (
          <div className="p-12 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>
        ) : (
          <>
            <div className="flex gap-1 p-2 border-b border-[#d4af37]/15 overflow-x-auto">
              {[
                { k: "profile", l: "Profile", I: UserIcon },
                { k: "vendor", l: data.vendor ? "Vendor" : "Vendor (–)", I: Store },
                { k: "wallet", l: "Wallet", I: WalletIcon },
                { k: "activity", l: "Activity", I: ShieldCheck },
              ].map(({ k, l, I }) => (
                <button
                  key={k}
                  onClick={() => setTab(k as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                    tab === k ? "bg-[#d4af37] text-[#1a1a1a]" : "text-[#f5d97a]/70 hover:bg-white/5"
                  }`}
                >
                  <I className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === "profile" && <ProfileTab data={data} onSaved={refresh} />}
              {tab === "vendor" && <VendorTab data={data} onSaved={refresh} />}
              {tab === "wallet" && <WalletTab data={data} onSaved={refresh} />}
              {tab === "activity" && <ActivityTab data={data} />}
              <div className="mt-6 pt-4 border-t border-red-500/20">
                <DangerZone data={data} onSaved={refresh} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: any) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-[#f5d97a]/60">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm focus:outline-none focus:border-[#d4af37]/60"
      />
    </label>
  );
}

function ProfileTab({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [p, setP] = useState(data.customer || {});
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateCustomerProfile);
  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { userId: data.customer.user_id, patch: {
        name: p.name, gender: p.gender, phone: p.phone, email: p.email,
        address: p.address, avatar_url: p.avatar_url, admin_notes: p.admin_notes,
        verified: !!p.verified,
      } } });
      toast.success("Profile saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <Field label="Gender" value={p.gender} onChange={(v) => setP({ ...p, gender: v })} />
        <Field label="Phone" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} />
        <Field label="Email" value={p.email} onChange={(v) => setP({ ...p, email: v })} />
      </div>
      <Field label="Address" value={p.address} onChange={(v) => setP({ ...p, address: v })} />
      <Field label="Avatar URL" value={p.avatar_url} onChange={(v) => setP({ ...p, avatar_url: v })} />
      <Field label="Admin notes" value={p.admin_notes} onChange={(v) => setP({ ...p, admin_notes: v })} />
      <label className="flex items-center gap-2 text-sm text-[#f5d97a]">
        <input type="checkbox" checked={!!p.verified} onChange={(e) => setP({ ...p, verified: e.target.checked })} />
        Verified
      </label>
      <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
      </button>
    </div>
  );
}

function VendorTab({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [v, setV] = useState(data.vendor || {});
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateVendorProfile);

  if (!data.vendor) {
    return <p className="text-sm text-[#f5d97a]/60 text-center py-6">Yeh user vendor nahi hai.</p>;
  }

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { userId: data.customer.user_id, patch: {
        business_name: v.business_name, owner_name: v.owner_name, trade: v.trade,
        deals_in: v.deals_in, whatsapp: v.whatsapp, manager_email: v.manager_email,
        email: v.email, gst: v.gst, pan: v.pan, aadhaar: v.aadhaar, plan: v.plan,
        status: v.status, verified: !!v.verified, admin_notes: v.admin_notes,
      } } });
      toast.success("Vendor saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Business name" value={v.business_name} onChange={(x) => setV({ ...v, business_name: x })} />
        <Field label="Owner name" value={v.owner_name} onChange={(x) => setV({ ...v, owner_name: x })} />
        <Field label="Trade" value={v.trade} onChange={(x) => setV({ ...v, trade: x })} />
        <Field label="Deals in" value={v.deals_in} onChange={(x) => setV({ ...v, deals_in: x })} />
        <Field label="WhatsApp" value={v.whatsapp} onChange={(x) => setV({ ...v, whatsapp: x })} />
        <Field label="Manager email" value={v.manager_email} onChange={(x) => setV({ ...v, manager_email: x })} />
        <Field label="GST" value={v.gst} onChange={(x) => setV({ ...v, gst: x })} />
        <Field label="PAN" value={v.pan} onChange={(x) => setV({ ...v, pan: x })} />
        <Field label="Aadhaar" value={v.aadhaar} onChange={(x) => setV({ ...v, aadhaar: x })} />
        <Field label="Plan" value={v.plan} onChange={(x) => setV({ ...v, plan: x })} />
        <Field label="Status" value={v.status} onChange={(x) => setV({ ...v, status: x })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#f5d97a]">
        <input type="checkbox" checked={!!v.verified} onChange={(e) => setV({ ...v, verified: e.target.checked })} />
        KYC Verified
      </label>
      <Field label="Admin notes" value={v.admin_notes} onChange={(x) => setV({ ...v, admin_notes: x })} />
      <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Vendor
      </button>
    </div>
  );
}

function WalletTab({ data, onSaved }: { data: any; onSaved: () => void }) {
  const w = data.wallet || { leadx_coins: 0, service_balance_paise: 0 };
  const [kind, setKind] = useState<"coin" | "service">("coin");
  const [dir, setDir] = useState<"credit" | "debit">("credit");
  const [amt, setAmt] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const adj = useServerFn(adjustWallet);

  const submit = async () => {
    const n = parseInt(amt, 10);
    if (!n || n <= 0) { toast.error("Amount?"); return; }
    if (!reason.trim()) { toast.error("Reason?"); return; }
    setBusy(true);
    try {
      await adj({ data: { userId: data.customer.user_id, kind, direction: dir, amount: n, reason: reason.trim() } });
      toast.success("Wallet updated");
      setAmt(""); setReason("");
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GoldCard className="p-3">
          <p className="text-[11px] uppercase text-[#f5d97a]/60">LeadX Coins</p>
          <p className="text-2xl font-bold text-[#f5d97a]">{w.leadx_coins}</p>
        </GoldCard>
        <GoldCard className="p-3">
          <p className="text-[11px] uppercase text-[#f5d97a]/60">Service Wallet</p>
          <p className="text-2xl font-bold text-[#f5d97a]">₹{((w.service_balance_paise || 0) / 100).toFixed(2)}</p>
        </GoldCard>
      </div>

      <div className="rounded-lg border border-[#d4af37]/20 p-3 space-y-3">
        <p className="text-xs font-semibold text-[#f5d97a]">Manual adjustment</p>
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="flex-1 px-2 py-1.5 rounded bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm">
            <option value="coin">LeadX Coins</option>
            <option value="service">Service ₹ (in paise)</option>
          </select>
          <select value={dir} onChange={(e) => setDir(e.target.value as any)} className="flex-1 px-2 py-1.5 rounded bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm">
            <option value="credit">Credit (+)</option>
            <option value="debit">Debit (–)</option>
          </select>
        </div>
        <Field label={kind === "coin" ? "Coins" : "Paise (100 = ₹1)"} value={amt} onChange={setAmt} type="number" />
        <Field label="Reason" value={reason} onChange={setReason} />
        <button onClick={submit} disabled={busy} className="w-full py-2 rounded-lg bg-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-1 disabled:opacity-50 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : dir === "credit" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />} Apply
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#f5d97a] mb-2">Recent transactions</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(data.transactions || []).length === 0 && <p className="text-xs text-[#f5d97a]/40">None</p>}
          {(data.transactions || []).map((t: any) => (
            <div key={t.id} className="flex justify-between text-xs p-2 rounded bg-black/30">
              <div>
                <p className="text-[#f5d97a]">{t.txn_type} <span className="text-[#f5d97a]/50">· {t.wallet_kind}</span></p>
                <p className="text-[#f5d97a]/50">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <p className={t.direction === "credit" ? "text-emerald-400" : "text-red-400"}>
                {t.direction === "credit" ? "+" : "–"}{t.coins ?? (t.amount_paise ? `₹${(t.amount_paise / 100).toFixed(2)}` : 0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[#f5d97a] mb-2">Recent leads ({data.leads.length})</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {data.leads.map((l: any) => (
            <div key={l.id} className="text-xs p-2 rounded bg-black/30 text-[#f5d97a]/80 flex justify-between">
              <span>{l.sub_category_name} · {l.status}</span>
              <span className="text-[#f5d97a]/40">{new Date(l.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {data.leads.length === 0 && <p className="text-xs text-[#f5d97a]/40">None</p>}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#f5d97a] mb-2">Referrals ({data.referrals.length})</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {data.referrals.map((r: any) => (
            <div key={r.id} className="text-xs p-2 rounded bg-black/30 text-[#f5d97a]/80">
              {r.status} · {new Date(r.created_at).toLocaleDateString()}
            </div>
          ))}
          {data.referrals.length === 0 && <p className="text-xs text-[#f5d97a]/40">None</p>}
        </div>
      </div>
    </div>
  );
}

function DangerZone({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const block = useServerFn(setUserBlock);
  const isBlocked = !!data.customer?.is_blocked;
  const toggle = async () => {
    if (!confirm(isBlocked ? "Unblock user?" : "Block user? Sab access band ho jayega.")) return;
    setBusy(true);
    try {
      await block({ data: { userId: data.customer.user_id, blocked: !isBlocked } });
      toast.success(isBlocked ? "Unblocked" : "Blocked");
      onSaved();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <p className="text-xs font-semibold text-red-400 mb-2">Danger zone</p>
      <button onClick={toggle} disabled={busy} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${isBlocked ? "bg-emerald-600 text-white" : "bg-red-600 text-white"} disabled:opacity-50`}>
        <Ban className="h-4 w-4" /> {isBlocked ? "Unblock user" : "Block user"}
      </button>
    </div>
  );
}
