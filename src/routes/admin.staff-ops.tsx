import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserPlus, CheckCircle2, XCircle, Send, Copy, Link2, MessageCircle, Phone, ListChecks, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSignupRequests, approveSignupRequest, rejectSignupRequest,
  listAllStaff, createStaffAccount, listAllTasks, createTask, approveTask,
  listWithdrawals, processWithdrawal,
  createStaffInvite, listStaffInvites,
} from "@/lib/staff.functions";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/staff-ops")({
  head: () => ({
    meta: [
      { title: "Staff Operations — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffOpsPage,
});

type Tab = "requests" | "staff" | "invites" | "tasks" | "payouts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function StaffOpsPage() {
  const [tab, setTab] = useState<Tab>("requests");

  return (
    <AdminLayout>
      <PageHeader
        title="Staff Operations"
        subtitle="Approve signups, invite via deep link, create staff, assign tasks, process payouts"
      />
      <div className="mb-4 flex gap-2 flex-wrap">
        {(["requests", "invites", "staff", "tasks", "payouts"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 h-9 rounded-full text-sm font-medium border ${tab === t ? "bg-[oklch(0.55_0.16_82)] text-white border-transparent" : "bg-white border-[color:oklch(0.9_0.03_85)]"}`}>
            {t === "requests" ? "Signup Requests" : t === "invites" ? "Invite Staff" : t === "staff" ? "Staff Members" : t === "tasks" ? "Tasks" : "Payouts"}
          </button>
        ))}
      </div>
      {tab === "requests" && <RequestsPanel />}
      {tab === "invites" && <InvitesPanel />}
      {tab === "staff" && <StaffPanel />}
      {tab === "tasks" && <TasksPanel />}
      {tab === "payouts" && <PayoutsPanel />}
    </AdminLayout>
  );
}

// ---------- Invites (deep-link onboarding) ----------
function InvitesPanel() {
  const create = useServerFn(createStaffInvite);
  const fetchInvites = useServerFn(listStaffInvites);
  const [rows, setRows] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", payout_model: "per_task" as const, monthly_salary_inr: 0 });

  const load = () => fetchInvites().then((r) => setRows(r as Any[])).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    setBusy(true);
    try {
      const res = await create({ data: { ...form, monthly_salary_inr: Number(form.monthly_salary_inr), channel: "manual" } });
      toast.success("Invite link created!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url = (res as any).url as string;
      try { await navigator.clipboard.writeText(url); toast("Copied to clipboard"); } catch { /* ignore */ }
      setForm({ name: "", email: "", phone: "", payout_model: "per_task", monthly_salary_inr: 0 });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const shareUrl = (url: string) => {
    try { navigator.clipboard.writeText(url); toast("Link copied"); } catch { /* ignore */ }
  };
  const whatsappSend = (phone: string | null, name: string, url: string) => {
    const msg = encodeURIComponent(`Hi ${name}, welcome to Karo Online team! Aap yahan click karke apna Staff panel access karein: ${url}\n\nAgar app installed nahi hai to Play Store se "Karo Staff" install kar lena.`);
    const digits = (phone ?? "").replace(/\D/g, "");
    const wa = digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(wa, "_blank");
  };
  const smsSend = (phone: string | null, name: string, url: string) => {
    const body = encodeURIComponent(`Hi ${name}, Karo Online staff invite: ${url}`);
    const digits = (phone ?? "").replace(/\D/g, "");
    window.location.href = digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
  };

  return (
    <div className="space-y-4">
      <GoldCard>
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite new staff via deep link</h3>
          <p className="text-xs text-muted-foreground">Ek link generate hoga, WhatsApp/SMS pe bhej dijiye. Staff link kholega → Staff App (installed) ya browser me sign-in → auto-activate hoke Staff dashboard.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Full name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" placeholder="Raj Kumar" />
            </div>
            <div>
              <label className="text-xs font-medium">Phone (for WhatsApp)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" placeholder="+91 98xxxxxxxx" />
            </div>
            <div>
              <label className="text-xs font-medium">Email (optional)</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" placeholder="raj@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium">Payout</label>
              <select value={form.payout_model} onChange={(e) => setForm({ ...form, payout_model: e.target.value as "per_task" })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm bg-background">
                <option value="per_task">Per task</option>
                <option value="monthly">Monthly salary</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            {form.payout_model !== "per_task" && (
              <div>
                <label className="text-xs font-medium">Monthly salary (₹)</label>
                <input type="number" value={form.monthly_salary_inr}
                  onChange={(e) => setForm({ ...form, monthly_salary_inr: Number(e.target.value) })}
                  className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" />
              </div>
            )}
          </div>
          <button onClick={submit} disabled={busy}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold flex items-center justify-center gap-2 shadow">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} <Send className="h-4 w-4" /> Generate invite link
          </button>
        </div>
      </GoldCard>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent invites</h3>
        {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-4" /> : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Koi invite abhi tak nahi bheja gaya.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : "https://karoonline.in"}/s/onboard/${r.invite_token}`;
              const used = !!r.used_at;
              const expired = new Date(r.expires_at).getTime() < Date.now();
              return (
                <GoldCard key={r.id}>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.phone ?? r.email ?? "no contact"} · {r.payout_model}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${used ? "bg-emerald-100 text-emerald-700" : expired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {used ? "ACCEPTED" : expired ? "EXPIRED" : "PENDING"}
                      </span>
                    </div>
                    {!used && !expired && (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => whatsappSend(r.phone, r.name, url)}
                          className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </button>
                        <button onClick={() => smsSend(r.phone, r.name, url)}
                          className="h-8 px-3 rounded-lg bg-sky-600 text-white text-xs font-semibold flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> SMS
                        </button>
                        <button onClick={() => shareUrl(url)}
                          className="h-8 px-3 rounded-lg bg-slate-800 text-white text-xs font-semibold flex items-center gap-1">
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </button>
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1">
                          <Link2 className="h-3.5 w-3.5" /> Open
                        </a>
                      </div>
                    )}
                  </div>
                </GoldCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



function RequestsPanel() {
  const fetchReqs = useServerFn(listSignupRequests);
  const approve = useServerFn(approveSignupRequest);
  const reject = useServerFn(rejectSignupRequest);
  const [rows, setRows] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchReqs().then((r) => setRows(r as Any[])).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  const doApprove = async (id: string) => {
    setBusy(id);
    try { await approve({ data: { request_id: id, payout_model: "per_task", monthly_salary_inr: 0 } }); toast.success("Approved"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };
  const doReject = async (id: string) => {
    setBusy(id);
    try { await reject({ data: { request_id: id } }); toast.success("Rejected"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" />;
  const pending = rows.filter((r) => r.status === "pending");
  if (!pending.length) return <GoldCard><p className="p-4 text-center text-sm text-muted-foreground">No pending signup requests.</p></GoldCard>;

  return (
    <div className="space-y-3">
      {pending.map((r) => (
        <GoldCard key={r.id}>
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.email} · {r.phone ?? "no phone"}</p>
              {r.note && <p className="text-xs mt-1 text-muted-foreground">{r.note}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => doApprove(r.id)} disabled={busy === r.id}
                className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => doReject(r.id)} disabled={busy === r.id}
                className="h-9 px-3 rounded-lg bg-red-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </div>
        </GoldCard>
      ))}
    </div>
  );
}

function StaffPanel() {
  const fetchStaff = useServerFn(listAllStaff);
  const create = useServerFn(createStaffAccount);
  const [rows, setRows] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", employee_code: "", payout_model: "per_task" as const, monthly_salary_inr: 0 });
  const [busy, setBusy] = useState(false);

  const load = () => fetchStaff().then((r) => setRows(r as Any[])).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("Fill required fields"); return; }
    setBusy(true);
    try {
      await create({ data: { ...form, monthly_salary_inr: Number(form.monthly_salary_inr) } });
      toast.success("Staff created!");
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", password: "", employee_code: "", payout_model: "per_task", monthly_salary_inr: 0 });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-[oklch(0.72_0.16_82)] to-[oklch(0.66_0.18_75)] text-white text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Create Staff
        </button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" /> : (
        <GoldCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Code</th><th className="text-left p-3">Status</th><th className="text-left p-3">Payout</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">{r.name ?? "—"}</td>
                    <td className="p-3 text-xs">{r.email ?? "—"}</td>
                    <td className="p-3 text-xs">{r.employee_code ?? "—"}</td>
                    <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${r.staff_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.staff_status}</span></td>
                    <td className="p-3 text-xs">{r.payout_model}{r.payout_model !== "per_task" ? ` (₹${r.monthly_salary_inr})` : ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground p-6">No staff yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </GoldCard>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => !busy && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Create staff account</h3>
            {(["name","email","phone","password","employee_code"] as const).map((k) => (
              <div key={k}>
                <label className="text-xs font-medium capitalize">{k.replace("_", " ")}{["name","email","password"].includes(k) ? " *" : ""}</label>
                <input type={k === "password" ? "password" : k === "email" ? "email" : "text"}
                  value={form[k] as string}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium">Payout model</label>
              <select value={form.payout_model} onChange={(e) => setForm({ ...form, payout_model: e.target.value as "per_task" })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm bg-background">
                <option value="per_task">Per task</option>
                <option value="monthly">Monthly salary</option>
                <option value="hybrid">Hybrid (both)</option>
              </select>
            </div>
            {form.payout_model !== "per_task" && (
              <div>
                <label className="text-xs font-medium">Monthly salary (₹)</label>
                <input type="number" value={form.monthly_salary_inr}
                  onChange={(e) => setForm({ ...form, monthly_salary_inr: Number(e.target.value) })}
                  className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" />
              </div>
            )}
            <div className="flex gap-2 pt-3">
              <button onClick={() => setShowCreate(false)} disabled={busy} className="flex-1 h-10 rounded-lg border font-medium">Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 h-10 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TasksPanel() {
  const fetchTasks = useServerFn(listAllTasks);
  const fetchStaff = useServerFn(listAllStaff);
  const create = useServerFn(createTask);
  const approve = useServerFn(approveTask);
  const [rows, setRows] = useState<Any[]>([]);
  const [staff, setStaff] = useState<Any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ staff_id: "", title: "", description: "", task_type: "vendor_onboarding" as const, amount_inr: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => Promise.all([fetchTasks(), fetchStaff()]).then(([t, s]) => { setRows(t as Any[]); setStaff(s as Any[]); }).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!form.staff_id || !form.title) { toast.error("Fill required fields"); return; }
    setBusy("create");
    try {
      await create({ data: { ...form, amount_inr: Number(form.amount_inr) } });
      toast.success("Task assigned"); setShowCreate(false);
      setForm({ staff_id: "", title: "", description: "", task_type: "vendor_onboarding", amount_inr: 0 });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  const decide = async (id: string, ok: boolean) => {
    setBusy(id);
    try { await approve({ data: { task_id: id, approved: ok } }); toast.success(ok ? "Approved & paid" : "Rejected"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-[oklch(0.72_0.16_82)] to-[oklch(0.66_0.18_75)] text-white text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Assign Task
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((t) => (
          <GoldCard key={t.id}>
            <div className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.staff?.name ?? "Staff"} · ₹{t.amount_inr} · {t.status}</p>
              </div>
              {t.status === "submitted" && (
                <div className="flex gap-1">
                  <button onClick={() => decide(t.id, true)} disabled={busy === t.id} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs">Approve</button>
                  <button onClick={() => decide(t.id, false)} disabled={busy === t.id} className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs">Reject</button>
                </div>
              )}
            </div>
          </GoldCard>
        ))}
        {rows.length === 0 && <p className="text-center text-sm text-muted-foreground p-6">No tasks yet.</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => busy !== "create" && setShowCreate(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Assign task</h3>
            <div>
              <label className="text-xs font-medium">Staff</label>
              <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm bg-background">
                <option value="">Choose staff...</option>
                {staff.filter(s => s.staff_status === "active").map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" /></div>
            <div><label className="text-xs font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[70px] mt-1 p-3 rounded-lg border border-input text-sm" /></div>
            <div>
              <label className="text-xs font-medium">Type</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value as "vendor_onboarding" })}
                className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm bg-background">
                <option value="vendor_onboarding">Vendor onboarding</option>
                <option value="verification">Verification</option>
                <option value="follow_up">Follow-up</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div><label className="text-xs font-medium">Amount (₹)</label><input type="number" value={form.amount_inr} onChange={(e) => setForm({ ...form, amount_inr: Number(e.target.value) })} className="w-full h-10 mt-1 px-3 rounded-lg border border-input text-sm" /></div>
            <div className="flex gap-2 pt-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-10 rounded-lg border font-medium">Cancel</button>
              <button onClick={submit} disabled={busy === "create"} className="flex-1 h-10 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
                {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutsPanel() {
  const fetchW = useServerFn(listWithdrawals);
  const proc = useServerFn(processWithdrawal);
  const [rows, setRows] = useState<Any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchW().then((r) => setRows(r as Any[])).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    let utr: string | undefined;
    if (action === "paid") { utr = window.prompt("UTR / reference no.") ?? undefined; if (!utr) return; }
    setBusy(id);
    try { await proc({ data: { id, action, utr } }); toast.success(action); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <GoldCard key={r.id}>
          <div className="p-3 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[color:oklch(0.55_0.16_82)]" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{r.staff?.name ?? "Staff"} — ₹{r.amount_inr}</p>
              <p className="text-xs text-muted-foreground">{r.upi_id} · {r.status}</p>
            </div>
            {r.status === "pending" && (
              <div className="flex gap-1">
                <button onClick={() => act(r.id, "approve")} disabled={busy === r.id} className="h-8 px-2 rounded-lg bg-blue-500 text-white text-xs">Approve</button>
                <button onClick={() => act(r.id, "reject")} disabled={busy === r.id} className="h-8 px-2 rounded-lg bg-red-500 text-white text-xs">Reject</button>
              </div>
            )}
            {r.status === "approved" && (
              <button onClick={() => act(r.id, "paid")} disabled={busy === r.id} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs">Mark paid</button>
            )}
          </div>
        </GoldCard>
      ))}
      {rows.length === 0 && <p className="text-center text-sm text-muted-foreground p-6">No withdrawal requests.</p>}
    </div>
  );
}
