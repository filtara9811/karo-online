import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, User as UserIcon, Store, Wallet as WalletIcon,
  ShieldCheck, Package, FileText, Bell, Activity, Hash, CreditCard, Inbox,
  Check, X as XIcon, Ban, Save, Plus, Minus, Trash2, Eye, EyeOff,
  Phone, Mail, MapPin, Tag, Calendar, ExternalLink,
} from "lucide-react";
import { AdminLayout, GoldCard } from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import {
  getUserFull, getUserDashboard,
  updateCustomerProfile, updateVendorProfile,
  adjustWallet, setUserBlock, setVendorApproval, setKycStatus,
  toggleVendorItem, deleteVendorItem,
} from "@/lib/admin-lookup.functions";
import { fetchProfileHistory, type ProfileAuditRow } from "@/lib/profile-audit";

export const Route = createFileRoute("/admin/view/$userId")({
  head: () => ({
    meta: [
      { title: "User 360 — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ViewPage,
});

type Tab = "overview" | "profile" | "vendor" | "products" | "card" | "kyc" | "wallet" | "orders" | "inbox" | "leads" | "notifications" | "history";

function ViewPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [full, setFull] = useState<any>(null);
  const [extra, setExtra] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const fetchFull = useServerFn(getUserFull);
  const fetchExtra = useServerFn(getUserDashboard);

  const refresh = async () => {
    try {
      const [f, e] = await Promise.all([
        fetchFull({ data: { userId } }),
        fetchExtra({ data: { userId } }),
      ]);
      setFull(f);
      setExtra(e);
    } catch (err: any) {
      toast.error(err?.message || "Load failed");
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#d4af37]" />
        </div>
      </AdminLayout>
    );
  }
  if (!full?.customer) {
    return (
      <AdminLayout>
        <GoldCard className="p-8 text-center">
          <p className="text-[#f5d97a]/70">User not found.</p>
          <button onClick={() => navigate({ to: "/admin/customers" })} className="mt-3 text-[#d4af37] underline text-sm">
            Back to customers
          </button>
        </GoldCard>
      </AdminLayout>
    );
  }

  const c = full.customer;
  const v = full.vendor;
  const w = full.wallet || { leadx_coins: 0, service_balance_paise: 0 };

  const tabs: { k: Tab; l: string; I: any; show?: boolean }[] = ([
    { k: "overview" as Tab, l: "Overview", I: Activity },
    { k: "profile" as Tab, l: "Profile", I: UserIcon },
    { k: "card" as Tab, l: "Card", I: CreditCard },
    { k: "vendor" as Tab, l: "Vendor", I: Store, show: !!v },
    { k: "products" as Tab, l: "Products", I: Package, show: !!v },
    { k: "inbox" as Tab, l: "Lead Inbox", I: Inbox, show: !!v },
    { k: "orders" as Tab, l: "Orders Raised", I: FileText },
    { k: "kyc" as Tab, l: "KYC", I: ShieldCheck },
    { k: "wallet" as Tab, l: "Wallet", I: WalletIcon },
    { k: "leads" as Tab, l: "All Leads", I: FileText },
    { k: "notifications" as Tab, l: "Notify", I: Bell },
    { k: "history" as Tab, l: "Change History", I: Activity },
  ] as { k: Tab; l: string; I: any; show?: boolean }[]).filter((t) => t.show !== false);


  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate({ to: "/admin/customers" })}
          className="text-[#f5d97a]/70 hover:text-[#f5d97a] text-xs flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <GoldCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#d4af37]/40 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center flex-shrink-0">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-[#1a1a1a]">
                  {(c.name || c.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold text-[#f5d97a] truncate">{c.name || "Unnamed"}</h1>
                {c.support_code && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-mono flex items-center gap-1">
                    <Hash className="h-2.5 w-2.5" />{c.support_code}
                  </span>
                )}
                {v && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">VENDOR</span>
                )}
                {c.verified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">VERIFIED</span>
                )}
                {c.is_blocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">BLOCKED</span>
                )}
              </div>
              <div className="mt-1 text-xs text-[#f5d97a]/70 space-y-0.5">
                {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>}
                {c.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address}</div>}
              </div>
            </div>
          </div>

          {/* Quick admin actions */}
          <QuickActions userId={userId} customer={c} vendor={v} onRefresh={refresh} />
        </GoldCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(({ k, l, I }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              tab === k ? "bg-[#d4af37] text-[#1a1a1a]" : "bg-black/30 text-[#f5d97a]/70 hover:bg-white/5"
            }`}
          >
            <I className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "overview" && <OverviewTab full={full} extra={extra} w={w} />}
      {tab === "profile" && <ProfileEdit userId={userId} customer={c} onSaved={refresh} />}
      {tab === "card" && <CardTab customer={c} />}
      {tab === "vendor" && v && <VendorEdit userId={userId} vendor={v} onSaved={refresh} />}
      {tab === "products" && v && <ProductsTab items={extra?.items || []} onChanged={refresh} />}
      {tab === "inbox" && v && <VendorInboxTab items={extra?.vendor_lead_notifications || []} />}
      {tab === "orders" && <OrdersRaisedTab leads={extra?.customer_leads_raised || []} />}
      {tab === "kyc" && <KycTab vendor={v} customer={c} records={extra?.kyc_records || []} onChanged={refresh} />}
      {tab === "wallet" && <WalletTab userId={userId} wallet={w} txns={full.transactions || []} onChanged={refresh} />}
      {tab === "leads" && <LeadsTab leads={full.leads || []} />}
      {tab === "notifications" && <NotificationsTab items={extra?.notifications || []} />}
      {tab === "history" && <HistoryTab userId={userId} />}
    </AdminLayout>
  );
}

function QuickActions({ userId, customer, vendor, onRefresh }: any) {
  const [busy, setBusy] = useState<string | null>(null);
  const block = useServerFn(setUserBlock);
  const approve = useServerFn(setVendorApproval);

  const doBlock = async (blocked: boolean) => {
    setBusy("block");
    try {
      await block({ data: { userId, blocked } });
      toast.success(blocked ? "User blocked" : "User unblocked");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setBusy(null); }
  };
  const doApprove = async (approved: boolean) => {
    setBusy("approve");
    try {
      await approve({ data: { userId, approved } });
      toast.success(approved ? "Vendor approved" : "Vendor disapproved");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#d4af37]/15 flex flex-wrap gap-2">
      {vendor && (
        vendor.status === "active" && vendor.verified ? (
          <button
            onClick={() => doApprove(false)}
            disabled={busy === "approve"}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <XIcon className="h-3.5 w-3.5" /> Disapprove vendor
          </button>
        ) : (
          <button
            onClick={() => doApprove(true)}
            disabled={busy === "approve"}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Approve vendor
          </button>
        )
      )}
      {customer.is_blocked ? (
        <button
          onClick={() => doBlock(false)}
          disabled={busy === "block"}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Unblock
        </button>
      ) : (
        <button
          onClick={() => doBlock(true)}
          disabled={busy === "block"}
          className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          <Ban className="h-3.5 w-3.5" /> Block user
        </button>
      )}
      {vendor && (
        <a
          href={`/c/${customer.support_code || ""}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-black/30 text-[#f5d97a] border border-[#d4af37]/30 text-xs font-semibold flex items-center gap-1"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Public card
        </a>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <GoldCard className="p-3">
      <p className="text-[10px] uppercase tracking-wide text-[#f5d97a]/60">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent || "text-[#f5d97a]"}`}>{value}</p>
    </GoldCard>
  );
}

function OverviewTab({ full, extra, w }: any) {
  const v = full.vendor;
  const c = full.customer;
  const leadsCount = (full.leads || []).length;
  const itemsCount = (extra?.items || []).length;
  const kycCount = (extra?.kyc_records || []).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="LeadX Coins" value={w.leadx_coins ?? 0} />
        <Stat label="Service ₹" value={`₹${((w.service_balance_paise || 0) / 100).toFixed(2)}`} />
        <Stat label="Leads" value={leadsCount} />
        <Stat label="Products" value={itemsCount} />
        <Stat label="KYC Records" value={kycCount} />
        <Stat label="Card Shares" value={c.card_share_count ?? 0} />
        <Stat label="Card Views" value={c.card_view_count ?? 0} />
        <Stat label="Status" value={v?.status || c.status || "—"} accent="text-emerald-300 text-base" />
      </div>

      {v && (
        <GoldCard className="p-4">
          <p className="text-xs font-bold text-[#f5d97a] mb-2 flex items-center gap-1"><Store className="h-3.5 w-3.5" /> Business</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="Business" value={v.business_name} />
            <Info label="Owner" value={v.owner_name} />
            <Info label="Trade" value={v.trade} />
            <Info label="Deals in" value={v.deals_in} />
            <Info label="Plan" value={v.plan} />
            <Info label="Radius" value={v.service_radius_km ? `${v.service_radius_km} km` : "—"} />
            <Info label="WhatsApp" value={v.whatsapp} />
            <Info label="Auto-accept" value={v.auto_accept_leads ? "Yes" : "No"} />
          </div>
        </GoldCard>
      )}

      <GoldCard className="p-4">
        <p className="text-xs font-bold text-[#f5d97a] mb-2 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Timeline</p>
        <div className="text-xs text-[#f5d97a]/75 space-y-1">
          <div>Joined: {new Date(c.created_at).toLocaleString()}</div>
          {v && <div>Vendor since: {new Date(v.created_at).toLocaleString()}</div>}
          {c.signup_method && <div>Signed up via: {c.signup_method}</div>}
        </div>
        {(c.tags || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {c.tags.map((t: string) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" /> {t}
              </span>
            ))}
          </div>
        )}
      </GoldCard>

      {c.admin_notes && (
        <GoldCard className="p-4 border-amber-500/30">
          <p className="text-xs font-bold text-amber-300 mb-1">Admin notes</p>
          <p className="text-xs text-[#f5d97a]/80 whitespace-pre-wrap">{c.admin_notes}</p>
        </GoldCard>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#f5d97a]/50">{label}</p>
      <p className="text-[#f5d97a] truncate">{value || "—"}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea }: any) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-[#f5d97a]/60">{label}</span>
      {textarea ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm focus:outline-none focus:border-[#d4af37]/60"
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm focus:outline-none focus:border-[#d4af37]/60"
        />
      )}
    </label>
  );
}

function ProfileEdit({ userId, customer, onSaved }: any) {
  const [p, setP] = useState<any>(customer);
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateCustomerProfile);
  useEffect(() => setP(customer), [customer]);

  const save = async () => {
    setSaving(true);
    try {
      await update({
        data: {
          userId,
          patch: {
            name: p.name, gender: p.gender, phone: p.phone, email: p.email,
            address: p.address, avatar_url: p.avatar_url, admin_notes: p.admin_notes,
            verified: !!p.verified, status: p.status,
          },
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <GoldCard className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" value={p.name} onChange={(v: any) => setP({ ...p, name: v })} />
        <Field label="Gender" value={p.gender} onChange={(v: any) => setP({ ...p, gender: v })} />
        <Field label="Phone" value={p.phone} onChange={(v: any) => setP({ ...p, phone: v })} />
        <Field label="Email" value={p.email} onChange={(v: any) => setP({ ...p, email: v })} />
        <Field label="Status" value={p.status} onChange={(v: any) => setP({ ...p, status: v })} />
        <Field label="Avatar URL" value={p.avatar_url} onChange={(v: any) => setP({ ...p, avatar_url: v })} />
      </div>
      <Field label="Address" value={p.address} onChange={(v: any) => setP({ ...p, address: v })} textarea />
      <Field label="Admin notes" value={p.admin_notes} onChange={(v: any) => setP({ ...p, admin_notes: v })} textarea />
      <label className="flex items-center gap-2 text-sm text-[#f5d97a]">
        <input type="checkbox" checked={!!p.verified} onChange={(e) => setP({ ...p, verified: e.target.checked })} />
        Verified
      </label>
      <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
      </button>
    </GoldCard>
  );
}

function VendorEdit({ userId, vendor, onSaved }: any) {
  const [v, setV] = useState<any>(vendor);
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateVendorProfile);
  useEffect(() => setV(vendor), [vendor]);

  const save = async () => {
    setSaving(true);
    try {
      await update({
        data: {
          userId,
          patch: {
            business_name: v.business_name, owner_name: v.owner_name,
            trade: v.trade, deals_in: v.deals_in,
            whatsapp: v.whatsapp, manager_email: v.manager_email, email: v.email,
            gst: v.gst, pan: v.pan, aadhaar: v.aadhaar,
            plan: v.plan, status: v.status, verified: !!v.verified,
            admin_notes: v.admin_notes,
          },
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <GoldCard className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Business name" value={v.business_name} onChange={(x: any) => setV({ ...v, business_name: x })} />
        <Field label="Owner name" value={v.owner_name} onChange={(x: any) => setV({ ...v, owner_name: x })} />
        <Field label="Trade" value={v.trade} onChange={(x: any) => setV({ ...v, trade: x })} />
        <Field label="Deals in" value={v.deals_in} onChange={(x: any) => setV({ ...v, deals_in: x })} />
        <Field label="WhatsApp" value={v.whatsapp} onChange={(x: any) => setV({ ...v, whatsapp: x })} />
        <Field label="Email" value={v.email || v.manager_email} onChange={(x: any) => setV({ ...v, email: x })} />
        <Field label="Plan" value={v.plan} onChange={(x: any) => setV({ ...v, plan: x })} />
        <Field label="Status" value={v.status} onChange={(x: any) => setV({ ...v, status: x })} />
        <Field label="GST" value={v.gst} onChange={(x: any) => setV({ ...v, gst: x })} />
        <Field label="PAN" value={v.pan} onChange={(x: any) => setV({ ...v, pan: x })} />
        <Field label="Aadhaar" value={v.aadhaar} onChange={(x: any) => setV({ ...v, aadhaar: x })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#f5d97a]">
        <input type="checkbox" checked={!!v.verified} onChange={(e) => setV({ ...v, verified: e.target.checked })} />
        KYC Verified
      </label>
      <Field label="Admin notes" value={v.admin_notes} onChange={(x: any) => setV({ ...v, admin_notes: x })} textarea />
      <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Vendor
      </button>
    </GoldCard>
  );
}

function ProductsTab({ items, onChanged }: { items: any[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = useServerFn(toggleVendorItem);
  const del = useServerFn(deleteVendorItem);

  if (items.length === 0) {
    return <GoldCard className="p-6 text-center text-[#f5d97a]/60 text-sm">No products mapped.</GoldCard>;
  }

  const doToggle = async (id: string, isActive: boolean) => {
    setBusy(id);
    try { await toggle({ data: { mappingId: id, isActive: !isActive } }); toast.success("Updated"); onChanged(); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };
  const doDelete = async (id: string) => {
    if (!confirm("Delete this product mapping?")) return;
    setBusy(id);
    try { await del({ data: { mappingId: id } }); toast.success("Removed"); onChanged(); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-2">
      {items.map((m) => {
        const ci = m.catalog_items;
        return (
          <GoldCard key={m.id} className={`p-3 ${!m.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-black/30 border border-[#d4af37]/20 overflow-hidden grid place-items-center flex-shrink-0">
                {ci?.image_url ? (
                  <img src={ci.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-[#d4af37]/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f5d97a] truncate">{ci?.name || "Unknown item"}</p>
                <p className="text-[11px] text-[#f5d97a]/60">
                  {ci?.price_min ? `₹${ci.price_min}` : ""}{ci?.price_max ? `–₹${ci.price_max}` : ""}
                  {!ci?.price_min && !ci?.price_max && "—"}
                </p>
                {!m.is_active && <p className="text-[10px] text-amber-400">Disabled</p>}
              </div>
              <button
                disabled={busy === m.id}
                onClick={() => doToggle(m.id, m.is_active)}
                className="p-2 rounded-md bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] disabled:opacity-50"
                title={m.is_active ? "Disable" : "Enable"}
              >
                {m.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                disabled={busy === m.id}
                onClick={() => doDelete(m.id)}
                className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </GoldCard>
        );
      })}
    </div>
  );
}

function KycTab({ vendor, customer, records, onChanged }: any) {
  const setStatus = useServerFn(setKycStatus);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (kycId: string, status: "approved" | "rejected") => {
    setBusy(kycId);
    try { await setStatus({ data: { kycId, status } }); toast.success(status); onChanged(); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      {vendor && (
        <GoldCard className="p-4">
          <p className="text-xs font-bold text-[#f5d97a] mb-2">Current vendor KYC fields</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <Info label="GST" value={vendor.gst} />
            <Info label="PAN" value={vendor.pan} />
            <Info label="Aadhaar" value={vendor.aadhaar} />
            <Info label="Verified" value={vendor.verified ? "Yes" : "No"} />
          </div>
          <p className="text-[10px] text-[#f5d97a]/50 mt-2">Edit these in the Vendor tab.</p>
        </GoldCard>
      )}

      <p className="text-xs font-bold text-[#f5d97a]">KYC Verification records</p>
      {records.length === 0 && <GoldCard className="p-4 text-center text-xs text-[#f5d97a]/60">No KYC records.</GoldCard>}
      {records.map((r: any) => (
        <GoldCard key={r.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-[#f5d97a]">{r.check_type} · {r.subject_type}</p>
              <p className="text-[11px] text-[#f5d97a]/60">{r.provider || "manual"} · {new Date(r.created_at).toLocaleString()}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              r.status === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
              r.status === "rejected" ? "bg-red-500/15 text-red-300 border-red-500/30" :
              "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}>{r.status}</span>
          </div>
          {r.document_number && <p className="text-xs text-[#f5d97a]/80">Doc: <span className="font-mono">{r.document_number}</span></p>}
          {Array.isArray(r.document_urls) && r.document_urls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {r.document_urls.map((u: string, i: number) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                  <img src={u} alt="" className="h-16 w-16 object-cover rounded border border-[#d4af37]/30" />
                </a>
              ))}
            </div>
          )}
          {r.reviewer_notes && <p className="text-[11px] text-[#f5d97a]/70 italic">"{r.reviewer_notes}"</p>}
          {r.status === "pending" && (
            <div className="flex gap-2">
              <button disabled={busy === r.id} onClick={() => act(r.id, "approved")}
                className="flex-1 py-1.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button disabled={busy === r.id} onClick={() => act(r.id, "rejected")}
                className="flex-1 py-1.5 rounded-md bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                <XIcon className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          )}
        </GoldCard>
      ))}
    </div>
  );
}

function WalletTab({ userId, wallet, txns, onChanged }: any) {
  const [kind, setKind] = useState<"coin" | "service">("coin");
  const [dir, setDir] = useState<"credit" | "debit">("credit");
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const adj = useServerFn(adjustWallet);

  const submit = async () => {
    const n = parseInt(amt, 10);
    if (!n || n <= 0) return toast.error("Amount?");
    if (!reason.trim()) return toast.error("Reason?");
    setBusy(true);
    try {
      await adj({ data: { userId, kind, direction: dir, amount: n, reason: reason.trim() } });
      toast.success("Wallet updated");
      setAmt(""); setReason("");
      onChanged();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="LeadX Coins" value={wallet.leadx_coins ?? 0} />
        <Stat label="Service ₹" value={`₹${((wallet.service_balance_paise || 0) / 100).toFixed(2)}`} />
      </div>

      <GoldCard className="p-3 space-y-2">
        <p className="text-xs font-bold text-[#f5d97a]">Manual adjustment</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="px-2 py-1.5 rounded bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm">
            <option value="coin">LeadX Coins</option>
            <option value="service">Service ₹ (paise)</option>
          </select>
          <select value={dir} onChange={(e) => setDir(e.target.value as any)} className="px-2 py-1.5 rounded bg-black/30 border border-[#d4af37]/20 text-[#f5d97a] text-sm">
            <option value="credit">Credit (+)</option>
            <option value="debit">Debit (−)</option>
          </select>
        </div>
        <Field label={kind === "coin" ? "Coins" : "Paise (100 = ₹1)"} value={amt} onChange={setAmt} type="number" />
        <Field label="Reason" value={reason} onChange={setReason} />
        <button onClick={submit} disabled={busy} className="w-full py-2 rounded-lg bg-[#d4af37] text-[#1a1a1a] font-bold flex items-center justify-center gap-1 disabled:opacity-50 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : dir === "credit" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />} Apply
        </button>
      </GoldCard>

      <div>
        <p className="text-xs font-bold text-[#f5d97a] mb-2">Recent transactions</p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {txns.length === 0 && <p className="text-xs text-[#f5d97a]/40">No transactions.</p>}
          {txns.map((t: any) => (
            <div key={t.id} className="flex justify-between text-xs p-2 rounded bg-black/30 border border-[#d4af37]/10">
              <div>
                <p className="text-[#f5d97a]">{t.txn_type} <span className="text-[#f5d97a]/50">· {t.wallet_kind}</span></p>
                <p className="text-[#f5d97a]/50 text-[10px]">{new Date(t.created_at).toLocaleString()}</p>
                {t.description && <p className="text-[#f5d97a]/70 text-[10px]">{t.description}</p>}
              </div>
              <p className={t.direction === "credit" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                {t.direction === "credit" ? "+" : "−"}{t.coins ?? (t.amount_paise ? `₹${(t.amount_paise / 100).toFixed(2)}` : 0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadsTab({ leads }: { leads: any[] }) {
  if (leads.length === 0) return <GoldCard className="p-6 text-center text-xs text-[#f5d97a]/60">No leads yet.</GoldCard>;
  return (
    <div className="space-y-2">
      {leads.map((l) => (
        <GoldCard key={l.id} className="p-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f5d97a] truncate">{l.sub_category_name}</p>
              <p className="text-[11px] text-[#f5d97a]/60">{new Date(l.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                l.status === "fulfilled" || l.status === "accepted" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}>{l.status}</span>
              {l.lead_price_inr > 0 && <p className="text-xs text-[#f5d97a] mt-1">₹{l.lead_price_inr}</p>}
            </div>
          </div>
        </GoldCard>
      ))}
    </div>
  );
}

function NotificationsTab({ items }: { items: any[] }) {
  if (items.length === 0) return <GoldCard className="p-6 text-center text-xs text-[#f5d97a]/60">No notifications.</GoldCard>;
  return (
    <div className="space-y-2">
      {items.map((n) => (
        <GoldCard key={n.id} className={`p-3 ${!n.is_read ? "border-[#d4af37]/50" : ""}`}>
          <p className="text-sm font-semibold text-[#f5d97a]">{n.title}</p>
          <p className="text-xs text-[#f5d97a]/70 mt-0.5">{n.message}</p>
          <p className="text-[10px] text-[#f5d97a]/40 mt-1">{new Date(n.created_at).toLocaleString()}</p>
        </GoldCard>
      ))}
    </div>
  );
}

function CardTab({ customer }: { customer: any }) {
  const code = customer.support_code || customer.referral_code;
  if (!code) {
    return <GoldCard className="p-6 text-center text-xs text-[#f5d97a]/60">No public card code yet.</GoldCard>;
  }
  const url = `/c/${code}`;
  return (
    <div className="space-y-2">
      <GoldCard className="p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#f5d97a]/60">Public visiting card</p>
          <p className="text-sm font-semibold text-[#f5d97a]">/c/{code}</p>
        </div>
        <a href={url} target="_blank" rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-[#1a1a1a] text-xs font-bold flex items-center gap-1">
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </GoldCard>
      <div className="rounded-xl overflow-hidden border border-[#d4af37]/30 bg-black/40" style={{ height: "70vh" }}>
        <iframe src={url} title="Visiting card" className="w-full h-full" />
      </div>
    </div>
  );
}

function OrdersRaisedTab({ leads }: { leads: any[] }) {
  if (leads.length === 0) return <GoldCard className="p-6 text-center text-xs text-[#f5d97a]/60">This user hasn't raised any orders/leads yet.</GoldCard>;
  return (
    <div className="space-y-2">
      {leads.map((l) => (
        <GoldCard key={l.id} className="p-3 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f5d97a] truncate">{l.sub_category_name}</p>
              <p className="text-[11px] text-[#f5d97a]/60">{new Date(l.created_at).toLocaleString()}</p>
              {l.address && <p className="text-[11px] text-[#f5d97a]/60 flex items-center gap-1"><MapPin className="h-3 w-3" />{l.address}</p>}
              {Array.isArray(l.item_names) && l.item_names.length > 0 && (
                <p className="text-[11px] text-[#f5d97a]/70 mt-0.5">Items: {l.item_names.join(", ")}</p>
              )}
              {l.note && <p className="text-[11px] text-[#f5d97a]/70 italic mt-0.5">"{l.note}"</p>}
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                l.status === "fulfilled" || l.status === "accepted" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}>{l.status}</span>
              <p className="text-[10px] text-[#f5d97a]/60 mt-1">{l.accepted_count}/{l.max_slots} vendors</p>
              {l.lead_price_inr > 0 && <p className="text-xs text-[#f5d97a] mt-0.5">₹{l.lead_price_inr}</p>}
            </div>
          </div>
          {Array.isArray(l.images) && l.images.length > 0 && (
            <div className="flex gap-1 flex-wrap pt-1">
              {l.images.slice(0, 4).map((u: string, i: number) => (
                <img key={i} src={u} alt="" className="h-12 w-12 rounded object-cover border border-[#d4af37]/20" />
              ))}
            </div>
          )}
        </GoldCard>
      ))}
    </div>
  );
}

function VendorInboxTab({ items }: { items: any[] }) {
  if (items.length === 0) return <GoldCard className="p-6 text-center text-xs text-[#f5d97a]/60">No leads received by this vendor yet.</GoldCard>;
  const statusColor = (s: string) =>
    s === "accepted" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : s === "rejected" || s === "expired" || s === "sold_out" ? "bg-red-500/15 text-red-300 border-red-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return (
    <div className="space-y-2">
      {items.map((n) => {
        const lead = n.leads || {};
        return (
          <GoldCard key={n.id} className="p-3 space-y-1">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f5d97a] truncate">{lead.sub_category_name || n.sub_category_name || "Lead"}</p>
                <p className="text-[11px] text-[#f5d97a]/70">
                  From: <span className="text-[#f5d97a]">{lead.customer_name || "—"}</span>
                  {lead.customer_phone && <span className="text-[#f5d97a]/60"> · {lead.customer_phone}</span>}
                </p>
                <p className="text-[11px] text-[#f5d97a]/60">{new Date(n.created_at).toLocaleString()}</p>
                {lead.address && <p className="text-[11px] text-[#f5d97a]/60 flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.address}</p>}
                {lead.note && <p className="text-[11px] text-[#f5d97a]/70 italic mt-0.5">"{lead.note}"</p>}
                {n.vendor_note && <p className="text-[11px] text-emerald-300/80 mt-0.5">Vendor note: {n.vendor_note}</p>}
                {n.quoted_price && <p className="text-[11px] text-[#f5d97a]">Quote: ₹{n.quoted_price}</p>}
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(n.status)}`}>{n.status}</span>
                {lead.lead_price_inr > 0 && <p className="text-xs text-[#f5d97a] mt-1">₹{lead.lead_price_inr}</p>}
              </div>
            </div>
          </GoldCard>
        );
      })}
    </div>
  );
}
