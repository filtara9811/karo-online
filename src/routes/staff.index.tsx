import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Wallet as WalletIcon, Trophy, ChevronRight, Loader2, Store, ClipboardList, Zap, Sparkles, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMyStaff, getMyWallet, listMyTasks, getTopEarners } from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/")({
  head: () => ({ meta: [{ title: "Staff Marketplace — Earn per task" }, { name: "robots", content: "noindex" }] }),
  component: StaffHome,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = any;
type Earner = { staff_id: string; name: string; avatar_url: string | null; earned_inr: number };

const TASK_ICON: Record<string, typeof Store> = {
  vendor_onboarding: Store,
  verification: ClipboardList,
  follow_up: Zap,
  custom: Sparkles,
};

function StaffHome() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyStaff);
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTasks = useServerFn(listMyTasks);
  const fetchTop = useServerFn(getTopEarners);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [me, setMe] = useState<any>(null);
  const [wallet, setWallet] = useState<Wallet>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [top, setTop] = useState<Earner[]>([]);
  const [category, setCategory] = useState<"all" | "field" | "remote">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, w, t, e] = await Promise.all([fetchMe(), fetchWallet(), fetchTasks(), fetchTop()]);
        setMe(m); setWallet(w.wallet); setTasks(t as Task[]); setTop(e as Earner[]);
      } finally { setLoading(false); }
    })();

    const ch = supabase
      .channel("staff-home-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_tasks" }, () => {
        fetchTasks().then((r) => setTasks(r as Task[])).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_wallet_ledger" }, () => {
        fetchWallet().then((r) => setWallet(r.wallet)).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMe, fetchWallet, fetchTasks, fetchTop]);

  const openTasks = tasks.filter((t) => ["assigned", "in_progress"].includes(t.status));
  const filtered = openTasks.filter((t) => {
    if (category === "all") return true;
    if (category === "field") return ["vendor_onboarding", "field_visit"].includes(t.task_type);
    return !["vendor_onboarding", "field_visit"].includes(t.task_type);
  });

  const balance = Number(wallet?.balance_inr ?? 0);
  const lifetime = Number(wallet?.lifetime_earned ?? 0);
  const firstName = (me?.name ?? "there").split(" ")[0];

  const tier = lifetime >= 25000 ? { label: "Gold", color: "bg-amber-400 text-black" }
             : lifetime >= 5000 ? { label: "Silver", color: "bg-slate-300 text-slate-900" }
             : { label: "Bronze", color: "bg-orange-300 text-orange-900" };

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[color:oklch(0.55_0.16_82)]" /></div>;
  }

  return (
    <div className="max-w-md mx-auto pb-4">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center text-white font-bold overflow-hidden">
            {me?.avatar_url ? <img src={me.avatar_url} alt="" className="h-full w-full object-cover" /> : firstName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Hi,</div>
            <div className="font-bold text-base leading-tight">{firstName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${tier.color}`}>
            {tier.label}
          </span>
          <button onClick={() => navigate({ to: "/staff/wallet" })}
            className="h-10 w-10 grid place-items-center rounded-full bg-white border border-[color:oklch(0.92_0.02_85)] shadow-sm">
            <Bell className="h-4 w-4 text-violet-600" />
          </button>
        </div>
      </header>

      {/* Earnings hero */}
      <section className="px-4">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white shadow-xl">
          <div className="p-5 flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center backdrop-blur">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs opacity-80">Balance</div>
              <div className="text-3xl font-extrabold tracking-tight">₹{balance.toFixed(0)}</div>
            </div>
            <button onClick={() => navigate({ to: "/staff/wallet" })}
              className="rounded-xl bg-white text-purple-700 font-bold text-xs px-4 py-2 shadow-sm hover:bg-white/90">
              WITHDRAW
            </button>
          </div>
          <div className="bg-black/20 px-5 py-3 flex items-center justify-between text-sm">
            <span className="opacity-80">Total Earning</span>
            <span className="font-bold">₹{lifetime.toFixed(0)}</span>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Available Tasks</h2>
          <span className="text-[11px] text-muted-foreground">{filtered.length} open</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {([
            { k: "all", label: "All" },
            { k: "field", label: "Field" },
            { k: "remote", label: "Remote" },
          ] as const).map((c) => (
            <button key={c.k} onClick={() => setCategory(c.k)}
              className={`shrink-0 px-4 h-9 rounded-full text-xs font-semibold border transition ${
                category === c.k
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-700 border-slate-200"
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center mt-2">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600 font-medium">Koi task available nahi hai abhi.</p>
            <p className="text-xs text-muted-foreground mt-1">Admin naye task assign karega toh yahan dikhega.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {filtered.map((t) => {
              const Icon = TASK_ICON[t.task_type] ?? Sparkles;
              const isField = ["vendor_onboarding", "field_visit"].includes(t.task_type);
              return (
                <div key={t.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-9 w-9 rounded-xl bg-violet-100 grid place-items-center text-violet-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    {isField && <MapPin className="h-3.5 w-3.5 text-orange-500" />}
                  </div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.5rem]">{t.title}</p>
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Earn upto</p>
                    <p className="text-lg font-extrabold text-emerald-600">₹{Number(t.amount_inr).toFixed(0)}</p>
                  </div>
                  <button onClick={() => navigate({ to: "/staff/tasks" })}
                    className="mt-2 h-9 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1 hover:opacity-95">
                    Start Task <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Top Earners · 30d</h2>
        </div>
        {top.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 text-center">
            <p className="text-xs text-amber-800 font-medium">Be the first to reach the leaderboard 🏆</p>
            <p className="text-[11px] text-amber-700/70 mt-1">Complete tasks to earn — top 5 show here.</p>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {top.map((e, i) => (
              <div key={e.staff_id} className="shrink-0 w-40 rounded-2xl bg-white border border-slate-100 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-slate-100 text-slate-600"
                  }`}>#{i + 1}</span>
                  <div className="h-8 w-8 rounded-full bg-violet-100 grid place-items-center text-violet-700 text-xs font-bold overflow-hidden">
                    {e.avatar_url ? <img src={e.avatar_url} alt="" className="h-full w-full object-cover" /> : e.name.slice(0, 1).toUpperCase()}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{e.name}</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">₹{e.earned_inr.toFixed(0)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick nav */}
      <section className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => navigate({ to: "/staff/tasks" })} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <ClipboardList className="h-5 w-5 mx-auto text-violet-600 mb-1" />
            <div className="text-[11px] font-semibold text-slate-700">All Tasks</div>
          </button>
          <button onClick={() => navigate({ to: "/staff/vendors" })} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <Store className="h-5 w-5 mx-auto text-violet-600 mb-1" />
            <div className="text-[11px] font-semibold text-slate-700">Vendors</div>
          </button>
          <button onClick={() => navigate({ to: "/staff/wallet" })} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <WalletIcon className="h-5 w-5 mx-auto text-violet-600 mb-1" />
            <div className="text-[11px] font-semibold text-slate-700">Wallet</div>
          </button>
        </div>
      </section>
    </div>
  );
}
