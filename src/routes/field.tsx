import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Mail, Lock, ShieldCheck, QrCode, LogOut, Package, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "Field Executive — Onboarding Console" },
      { name: "description", content: "Field Executive login for onboarding vendors and linking QR assets." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FieldPage,
});

type Vendor = { id: string; business_name: string | null; owner_name: string | null; whatsapp: string | null };
type Batch = { id: string; batch_code: string; quantity: number; size_preset: string; created_at: string };
type Asset = { id: string; code: string; serial: number; status: string; linked_vendor_id: string | null };

function FieldPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isField, setIsField] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (cancel) return;
      setUserId(uid);
      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        const list = (roles ?? []).map((r) => r.role);
        setIsField(list.includes("field_executive") || list.includes("admin") || list.includes("super_admin"));
      }
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-amber-200">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!userId) return <FieldLogin />;
  if (!isField) return <NoAccess />;
  return <FieldDashboard userId={userId} />;
}

function NoAccess() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-center">
      <div className="max-w-sm">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-amber-100 mb-2">Field Executive access required</h1>
        <p className="text-sm text-amber-200/70 mb-4">
          Aapke account ko Field Executive role nahi assign hua. Admin se contact kariye.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function FieldLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password) { setErr("Email aur password daaliye."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // page will rerender via auth listener
    } catch (e: any) {
      setErr(e?.message ?? "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid place-items-center px-4 py-10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <Link to="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-emerald-200/70 hover:text-emerald-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-5">
          <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3 bg-emerald-500 text-slate-900 shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-300/80">Field Executive</p>
          <h1 className="font-display text-2xl font-bold text-emerald-100 mt-1">Onboarding Console</h1>
          <p className="text-xs text-emerald-200/60 mt-1">QR linking · Vendor signup</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-3xl p-6 backdrop-blur-xl border border-emerald-400/20 bg-white/5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-emerald-200/80 font-bold flex items-center gap-1.5 mb-1.5">
              <Mail className="h-3 w-3" /> Email
            </label>
            <input
              type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="executive@yourdomain.com"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-emerald-400/30 text-emerald-50 placeholder:text-emerald-300/30 outline-none focus:border-emerald-400 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-emerald-200/80 font-bold flex items-center gap-1.5 mb-1.5">
              <Lock className="h-3 w-3" /> Password
            </label>
            <input
              type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-emerald-400/30 text-emerald-50 placeholder:text-emerald-300/30 outline-none focus:border-emerald-400 text-sm"
            />
          </div>
          {err && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</div>}
          <button
            disabled={busy}
            className="w-full py-3 rounded-xl font-bold text-sm text-slate-900 bg-gradient-to-b from-emerald-300 to-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? "Verifying…" : "Sign In"}
          </button>
          <p className="text-center text-[10px] text-emerald-200/50 leading-relaxed">
            Sirf authorized Field Executives. Account chahiye to Admin se request kariye.
          </p>
        </form>
      </div>
    </div>
  );
}

function FieldDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [qrCode, setQrCode] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [chosenVendor, setChosenVendor] = useState<Vendor | null>(null);
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: b } = await supabase
        .from("qr_batches")
        .select("id, batch_code, quantity, size_preset, created_at")
        .eq("assigned_to_user_id", userId)
        .order("created_at", { ascending: false });
      setBatches((b ?? []) as Batch[]);
      if (b && b[0]) setActiveBatch(b[0].id);
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!activeBatch) { setAssets([]); return; }
    (async () => {
      const { data } = await supabase
        .from("qr_assets")
        .select("id, code, serial, status, linked_vendor_id")
        .eq("batch_id", activeBatch)
        .order("serial");
      setAssets((data ?? []) as Asset[]);
    })();
  }, [activeBatch, msg]);

  useEffect(() => {
    const q = vendorQuery.trim();
    if (q.length < 2) { setVendors([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, business_name, owner_name, whatsapp")
        .or(`business_name.ilike.%${q}%,owner_name.ilike.%${q}%,whatsapp.ilike.%${q}%`)
        .limit(8);
      setVendors((data ?? []) as Vendor[]);
    }, 300);
    return () => clearTimeout(t);
  }, [vendorQuery]);

  const stats = useMemo(() => {
    const total = assets.length;
    const linked = assets.filter((a) => a.linked_vendor_id).length;
    return { total, linked, pending: total - linked };
  }, [assets]);

  const onLink = async () => {
    if (!qrCode.trim() || !chosenVendor) { setMsg({ kind: "err", text: "QR code aur vendor dono select kariye." }); return; }
    setLinking(true); setMsg(null);
    try {
      const { error } = await supabase.rpc("link_qr_to_vendor", {
        p_code: qrCode.trim().toUpperCase(),
        p_vendor_id: chosenVendor.id,
      });
      if (error) throw error;
      setMsg({ kind: "ok", text: `Linked ${qrCode.toUpperCase()} → ${chosenVendor.business_name ?? chosenVendor.owner_name}` });
      setQrCode(""); setChosenVendor(null); setVendorQuery("");
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Linking failed." });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-emerald-50">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-emerald-400/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 grid place-items-center text-slate-900">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Field Console</div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/70">Onboarding</div>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/field" }); }}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-emerald-400/20 flex items-center gap-1.5 hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Link card */}
        <section className="rounded-2xl border border-emerald-400/20 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Link QR → Vendor</h2>
          </div>

          <label className="text-[10px] uppercase tracking-widest text-emerald-200/70">QR Code</label>
          <input
            value={qrCode} onChange={(e) => setQrCode(e.target.value)}
            placeholder="e.g. B12-0457"
            className="w-full mt-1 px-3 py-2.5 rounded-lg bg-black/40 border border-emerald-400/20 text-sm tracking-widest uppercase outline-none focus:border-emerald-400"
          />

          <label className="text-[10px] uppercase tracking-widest text-emerald-200/70 mt-3 block">Vendor</label>
          {chosenVendor ? (
            <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold">{chosenVendor.business_name ?? chosenVendor.owner_name}</div>
                <div className="text-[11px] text-emerald-200/70">{chosenVendor.whatsapp ?? "—"}</div>
              </div>
              <button onClick={() => setChosenVendor(null)} className="text-xs text-emerald-200/80 hover:text-white">Change</button>
            </div>
          ) : (
            <>
              <div className="mt-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300/60" />
                <input
                  value={vendorQuery} onChange={(e) => setVendorQuery(e.target.value)}
                  placeholder="Search by business / owner / phone"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-emerald-400/20 text-sm outline-none focus:border-emerald-400"
                />
              </div>
              {vendors.length > 0 && (
                <div className="mt-1 rounded-lg border border-emerald-400/15 bg-slate-900 max-h-56 overflow-auto">
                  {vendors.map((v) => (
                    <button
                      key={v.id} type="button" onClick={() => setChosenVendor(v)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 border-b border-emerald-400/5 last:border-0"
                    >
                      <div className="text-sm">{v.business_name ?? v.owner_name ?? "Unnamed"}</div>
                      <div className="text-[11px] text-emerald-200/60">{v.whatsapp ?? "—"}</div>
                    </button>
                  ))}
                </div>
              )}
              {vendorQuery.length >= 2 && vendors.length === 0 && (
                <p className="mt-1 text-[11px] text-emerald-200/50">No vendors found. Onboard kariye:</p>
              )}
              <Link
                to="/vendor/register"
                className="inline-block mt-2 text-[11px] underline text-emerald-300 hover:text-emerald-100"
              >
                + Onboard new vendor
              </Link>
            </>
          )}

          {msg && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-xs border ${
              msg.kind === "ok"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                : "bg-red-500/10 border-red-500/40 text-red-200"
            }`}>
              {msg.kind === "ok" ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> : <AlertCircle className="inline h-3.5 w-3.5 mr-1" />}
              {msg.text}
            </div>
          )}

          <button
            onClick={onLink} disabled={linking || !qrCode.trim() || !chosenVendor}
            className="mt-4 w-full py-3 rounded-xl font-bold text-sm text-slate-900 bg-gradient-to-b from-emerald-300 to-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {linking ? "Linking…" : "Link QR"}
          </button>
        </section>

        {/* Batches */}
        <section className="rounded-2xl border border-emerald-400/20 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-bold uppercase tracking-widest">My Batches</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-emerald-300" /></div>
          ) : batches.length === 0 ? (
            <p className="text-xs text-emerald-200/60">Koi batch assign nahi hua. Admin se request kariye.</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {batches.map((b) => (
                  <button
                    key={b.id} onClick={() => setActiveBatch(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border ${
                      activeBatch === b.id
                        ? "bg-emerald-500 text-slate-900 border-emerald-500"
                        : "bg-black/30 border-emerald-400/20 text-emerald-200"
                    }`}
                  >
                    {b.batch_code} · {b.quantity}
                  </button>
                ))}
              </div>
              {activeBatch && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Total" value={stats.total} />
                  <Stat label="Linked" value={stats.linked} accent />
                  <Stat label="Pending" value={stats.pending} />
                </div>
              )}
              {assets.length > 0 && (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-emerald-400/10">
                  <table className="w-full text-xs">
                    <thead className="bg-black/40 text-emerald-200/70 uppercase tracking-widest text-[10px]">
                      <tr><th className="text-left px-3 py-2">Code</th><th className="text-left px-3 py-2">Status</th></tr>
                    </thead>
                    <tbody>
                      {assets.map((a) => (
                        <tr key={a.id} className="border-t border-emerald-400/5">
                          <td className="px-3 py-1.5 font-mono">{a.code}</td>
                          <td className="px-3 py-1.5">
                            <span className={a.linked_vendor_id ? "text-emerald-300" : "text-amber-300/80"}>
                              {a.linked_vendor_id ? "Linked" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${accent ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black/30 border-emerald-400/15"}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">{label}</div>
    </div>
  );
}
