import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Wallet as WalletIcon, Car, CreditCard, Landmark, TrendingUp, ShieldCheck, HandCoins, Smartphone, Loader2, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMyStaff, getMyWallet, listMyTasks } from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/")({
  head: () => ({ meta: [{ title: "Staff — Earn per lead" }, { name: "robots", content: "noindex" }] }),
  component: StaffHome,
});

const TABS = ["Earning", "My Team", "Potential", "Referral", "My Leads"] as const;

const SELL_ITEMS = [
  { key: "cars", title: "Cars", icon: Car, earn: "₹10500", tone: "from-violet-500 to-purple-600" },
  { key: "credit_cards", title: "Credit Cards", icon: CreditCard, earn: "₹3200", tone: "from-violet-500 to-purple-600" },
  { key: "personal_loan", title: "Personal Loan", icon: HandCoins, earn: "4.5%", tone: "from-violet-500 to-purple-600" },
  { key: "bank_accounts", title: "Bank Accounts", icon: Landmark, earn: "₹1100", tone: "from-violet-500 to-purple-600" },
  { key: "demat", title: "Demat Accounts", icon: TrendingUp, earn: "₹1500", tone: "from-violet-500 to-purple-600" },
  { key: "insurance", title: "Insurance", icon: ShieldCheck, earn: "35%", tone: "from-violet-500 to-purple-600" },
  { key: "mobile", title: "Mobile Plans", icon: Smartphone, earn: "₹250", tone: "from-violet-500 to-purple-600" },
];

const PROMOS = [
  { title: "Personal Loan", subtitle: "upto 15 Lakh", tag: "Fully online + Affordable interest rates", earn: "Earn upto 4%", cta: "Check Now" },
  { title: "Credit Card", subtitle: "Zero Joining Fee", tag: "Instant approval + Lifetime free options", earn: "Earn upto ₹3200", cta: "Apply Now" },
  { title: "Demat Account", subtitle: "Start Investing", tag: "Zero brokerage on delivery + Free advisory", earn: "Earn upto ₹1500", cta: "Open Now" },
];

function StaffHome() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyStaff);
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTasks = useServerFn(listMyTasks);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [me, setMe] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wallet, setWallet] = useState<any>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Earning");
  const [loading, setLoading] = useState(true);
  const promoRef = useRef<HTMLDivElement>(null);
  const [promoIdx, setPromoIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [m, w] = await Promise.all([fetchMe(), fetchWallet(), fetchTasks()]);
        setMe(m); setWallet(w.wallet);
      } finally { setLoading(false); }
    })();
    const ch = supabase
      .channel("staff-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_wallet_ledger" }, () => {
        fetchWallet().then((r) => setWallet(r.wallet)).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMe, fetchWallet, fetchTasks]);

  // Promo auto-scroll indicator
  useEffect(() => {
    const el = promoRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setPromoIdx(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const balance = Number(wallet?.balance_inr ?? 0);
  const lifetime = Number(wallet?.lifetime_earned ?? 0);
  const firstName = (me?.name ?? "there").split(" ")[0];
  const tier = useMemo(() => {
    if (lifetime >= 25000) return { label: "Gold", next: null };
    if (lifetime >= 5000) return { label: "Silver", next: "Gold" };
    return { label: "Bronze", next: "Gold" };
  }, [lifetime]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center text-white font-bold overflow-hidden ring-2 ring-white shadow">
            {me?.avatar_url ? <img src={me.avatar_url} alt="" className="h-full w-full object-cover" /> : firstName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-slate-900 font-semibold text-lg leading-tight truncate">
              Hi, <span className="font-extrabold">{firstName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {tier.next && (
            <span className="text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border-2 border-amber-400 text-amber-600 bg-white">
              To {tier.next}
            </span>
          )}
          <button className="relative">
            <Bell className="h-6 w-6 text-violet-600" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-4 pt-2 pb-3 border-b border-slate-100">
        <div className="flex gap-5 overflow-x-auto scrollbar-none -mx-4 px-4">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 pb-2 text-[15px] font-semibold transition ${
                tab === t
                  ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50 px-3 rounded-t-lg"
                  : "text-slate-500"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* Wallet card */}
      <section className="px-4 pt-4">
        <div className="rounded-3xl overflow-hidden shadow-lg">
          <div className="relative bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white p-5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_30%,white,transparent_50%)]" />
            <div className="relative flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-white/15 backdrop-blur grid place-items-center">
                <WalletIcon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold leading-tight">Balance</div>
                <div className="text-lg font-semibold opacity-95">₹{balance.toFixed(2)}</div>
              </div>
              <button onClick={() => navigate({ to: "/staff/wallet" })}
                className="rounded-full bg-white text-purple-700 font-extrabold text-[13px] px-5 py-3 shadow hover:bg-white/90">
                WITHDRAW
              </button>
            </div>
          </div>
          <div className="bg-violet-600 text-white px-5 py-3 flex items-center justify-between">
            <span className="font-semibold">Total Earning</span>
            <span className="font-extrabold text-lg">₹{lifetime.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Promo carousel */}
      <section className="pt-4">
        <div ref={promoRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 pb-1">
          {PROMOS.map((p, i) => (
            <div key={i} className="snap-center shrink-0 w-[92%] rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-100 p-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-2xl font-extrabold text-sky-900 leading-tight">{p.title}</h3>
                  <p className="text-lg text-emerald-600 font-bold">{p.subtitle}</p>
                  <div className="mt-2 inline-block bg-amber-50 border border-amber-200 rounded-md px-2 py-1 text-[11px] text-slate-700 font-medium">
                    {p.tag}
                  </div>
                </div>
                <div className="shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 grid place-items-center text-white text-center shadow-lg">
                  <div>
                    <div className="text-[9px] font-medium leading-none">Earn upto</div>
                    <div className="text-base font-extrabold leading-tight">{p.earn.replace("Earn upto ", "")}</div>
                  </div>
                </div>
              </div>
              <button className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-full shadow float-right">
                {p.cta}
              </button>
              <div className="clear-both" />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 pt-2">
          {PROMOS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === promoIdx ? "w-5 bg-violet-600" : "w-1.5 bg-slate-300"}`} />
          ))}
        </div>
      </section>

      {/* Sell & Earn */}
      <section className="px-4 pt-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <h2 className="text-[15px] font-bold tracking-widest text-slate-800">SELL &amp; EARN</h2>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SELL_ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.key} onClick={() => navigate({ to: "/staff/tasks" })}
                className="rounded-2xl bg-gradient-to-br from-violet-50 to-white border border-violet-100 shadow-sm overflow-hidden text-left hover:shadow-md transition">
                <div className="p-3 pb-2 flex items-start justify-between">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{it.title}</h3>
                  <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="px-3 pb-2">
                  <p className="text-[11px] text-slate-500">Earn upto</p>
                </div>
                <div className={`bg-gradient-to-r ${it.tone} text-white text-center py-2 font-extrabold`}>
                  {it.earn}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Additional earning banner */}
      <section className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-slate-200" />
          <h2 className="text-[13px] font-bold tracking-widest text-slate-600">ADDITIONAL EARNING OPTIONS</h2>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <button onClick={() => navigate({ to: "/staff/tasks" })}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white p-4 flex items-center justify-between shadow-md">
          <div className="text-left">
            <div className="font-bold text-base">View All Tasks</div>
            <div className="text-xs opacity-90">Field visits, onboarding, verification & more</div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>
    </div>
  );
}
