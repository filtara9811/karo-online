import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Wallet as WalletIcon,
  Coins,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Filter,
  Package,
  Truck,
  Gift,
  RotateCcw,
  CreditCard,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/vendor/wallet")({
  head: () => ({
    meta: [
      { title: "My Wallet — Karo Online" },
      { name: "description", content: "Service wallet, LeadX coins, live rate and full transaction history." },
    ],
  }),
  component: WalletPage,
});

type Wallet = {
  id: string;
  vendor_id: string;
  service_balance_paise: number;
  leadx_coins: number;
  lifetime_recharged_paise: number;
  lifetime_spent_paise: number;
  lifetime_coins_purchased: number;
  lifetime_coins_used: number;
  leads_total: number;
  leads_used: number;
};

type Txn = {
  id: string;
  wallet_kind: "service" | "coin";
  txn_type: string;
  direction: "credit" | "debit";
  amount_paise: number;
  coins: number;
  status: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

type RatePoint = { rate_inr: number; recorded_at: string };
type CoinPack = { id: string; pack_name: string; coins: number; price_inr: number; bonus_coins: number };
type WalletPack = { id: string; label: string; amount_inr: number; bonus_inr: number };

const DEMO_WALLET: Wallet = {
  id: "demo",
  vendor_id: "demo",
  service_balance_paise: 1900025,
  leadx_coins: 7456,
  lifetime_recharged_paise: 2530080,
  lifetime_spent_paise: 630055,
  lifetime_coins_purchased: 12000,
  lifetime_coins_used: 4544,
  leads_total: 7456,
  leads_used: 4544,
};

const DEMO_TXNS: Txn[] = [
  { id: "t1", wallet_kind: "service", txn_type: "shipment", direction: "debit", amount_paise: 4500, coins: 0, status: "success", reference_id: "SHIP-8821", description: "Porter — Delhi sadar bazar → Karol Bagh", created_at: new Date(Date.now() - 3600e3).toISOString() },
  { id: "t2", wallet_kind: "coin", txn_type: "lead_unlock", direction: "debit", amount_paise: 0, coins: 3, status: "success", reference_id: "LEAD-441", description: "AC Service lead — Delhi NCR", created_at: new Date(Date.now() - 7200e3).toISOString() },
  { id: "t3", wallet_kind: "service", txn_type: "recharge", direction: "credit", amount_paise: 200000, coins: 0, status: "success", reference_id: "RZP_pay_QkA", description: "Razorpay wallet recharge", created_at: new Date(Date.now() - 86400e3).toISOString() },
  { id: "t4", wallet_kind: "coin", txn_type: "coin_purchase", direction: "credit", amount_paise: 0, coins: 250, status: "success", reference_id: "RZP_pay_QkB", description: "Bought 250 LeadX (+25 bonus)", created_at: new Date(Date.now() - 172800e3).toISOString() },
  { id: "t5", wallet_kind: "service", txn_type: "refund", direction: "credit", amount_paise: 4200, coins: 0, status: "success", reference_id: "SHIP-8800", description: "Shiprocket — RTO refund", created_at: new Date(Date.now() - 259200e3).toISOString() },
  { id: "t6", wallet_kind: "coin", txn_type: "bonus", direction: "credit", amount_paise: 0, coins: 50, status: "success", reference_id: null, description: "Welcome bonus", created_at: new Date(Date.now() - 604800e3).toISOString() },
];

function inr(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function WalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet>(DEMO_WALLET);
  const [txns, setTxns] = useState<Txn[]>(DEMO_TXNS);
  const [rate, setRate] = useState<RatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "service" | "coin" | "credit" | "debit">("all");
  const [sheet, setSheet] = useState<null | "recharge" | "buy">(null);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [walletPacks, setWalletPacks] = useState<WalletPack[]>([]);
  const [coinRate, setCoinRate] = useState(20);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      const [r, cp, wp, pricing] = await Promise.all([
        supabase.from("leadx_rate_history").select("rate_inr,recorded_at").order("recorded_at", { ascending: true }).limit(60),
        supabase.from("coin_packs").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("wallet_recharge_packs").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("coin_pricing_config").select("coin_rate_inr").limit(1).maybeSingle(),
      ]);
      setRate((r.data ?? []) as RatePoint[]);
      setCoinPacks((cp.data ?? []) as CoinPack[]);
      setWalletPacks((wp.data ?? []) as WalletPack[]);
      if (pricing.data) setCoinRate(Number(pricing.data.coin_rate_inr));
      if (uid) {
        const w = await supabase.from("vendor_wallets").select("*").eq("vendor_id", uid).maybeSingle();
        if (w.data) setWallet(w.data as Wallet);
        const t = await supabase.from("wallet_transactions").select("*").eq("vendor_id", uid).order("created_at", { ascending: false }).limit(200);
        if (t.data && t.data.length) setTxns(t.data as Txn[]);
      }
      setLoading(false);
    })();
  }, []);

  const liveRate = rate.length ? rate[rate.length - 1].rate_inr : coinRate;
  const prevRate = rate.length > 1 ? rate[rate.length - 2].rate_inr : liveRate;
  const change = liveRate - prevRate;
  const changePct = prevRate ? (change / prevRate) * 100 : 0;
  const up = change >= 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter((t) => {
      if (filter === "service" && t.wallet_kind !== "service") return false;
      if (filter === "coin" && t.wallet_kind !== "coin") return false;
      if (filter === "credit" && t.direction !== "credit") return false;
      if (filter === "debit" && t.direction !== "debit") return false;
      if (!q) return true;
      return (
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.reference_id ?? "").toLowerCase().includes(q) ||
        t.txn_type.includes(q)
      );
    });
  }, [txns, search, filter]);

  const leadsLeft = Math.max(0, wallet.leads_total - wallet.leads_used);
  const usedPct = wallet.leads_total ? (wallet.leads_used / wallet.leads_total) * 100 : 0;

  return (
    <div className="relative min-h-dvh pb-32 overflow-x-hidden" style={{ background: "linear-gradient(180deg,#0a0606 0%, #150d05 50%, #0a0606 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-b border-[#d4af37]/20">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/vendor/dashboard" })} className="h-9 w-9 grid place-items-center rounded-full bg-black/60 border border-[#d4af37]/30">
            <ArrowLeft className="h-4 w-4 text-[#f5d97a]" />
          </button>
          <div className="text-center flex-1">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#d4af37]/70">✦ Vendor Wallet ✦</p>
            <h1 className="font-display text-lg font-bold" style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Wallet
            </h1>
          </div>
          <button onClick={() => setShowBalance((v) => !v)} className="h-9 w-9 grid place-items-center rounded-full bg-black/60 border border-[#d4af37]/30">
            {showBalance ? <Eye className="h-4 w-4 text-[#f5d97a]" /> : <EyeOff className="h-4 w-4 text-[#f5d97a]" />}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Credit-card style hero */}
        <CardHero
          serviceInr={wallet.service_balance_paise / 100}
          coins={wallet.leadx_coins}
          liveRate={liveRate}
          change={change}
          changePct={changePct}
          up={up}
          rate={rate}
          showBalance={showBalance}
          investedPaise={wallet.lifetime_recharged_paise}
          spentPaise={wallet.lifetime_spent_paise}
          onRecharge={() => setSheet("recharge")}
          onBuyCoins={() => setSheet("buy")}
        />

        {/* Lead counters */}
        <section className="grid grid-cols-3 gap-2">
          <Counter icon={Package} label="Available" value={leadsLeft} accent="emerald" />
          <Counter icon={Coins} label="Total" value={wallet.leads_total} accent="gold" />
          <Counter icon={TrendingDown} label="Used" value={wallet.leads_used} accent="muted" />
        </section>

        {/* Usage bar */}
        <section className="rounded-2xl bg-black/40 border border-[#d4af37]/20 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/70 font-bold">Lead Utilization</span>
            <span className="text-[10px] text-[#fff8dc] font-bold">{usedPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/60 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: "linear-gradient(90deg, #f5d97a, #d4af37, #8b6508)" }} />
          </div>
        </section>

        {/* Search + filter */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-black/40 border border-[#d4af37]/30">
            <Search className="h-4 w-4 text-[#d4af37]/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by note, reference, type…"
              className="flex-1 bg-transparent text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none text-xs"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#d4af37]/60">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {([
              ["all", "All"],
              ["service", "Wallet ₹"],
              ["coin", "LeadX"],
              ["credit", "Credit"],
              ["debit", "Debit"],
            ] as const).map(([k, l]) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold border transition ${
                    active ? "text-[#1a1208] border-transparent" : "text-[#f5d97a]/70 border-[#d4af37]/30"
                  }`}
                  style={active ? { background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" } : undefined}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </section>

        {/* Transactions */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#fff8dc]">Transaction History</h2>
            <span className="text-[10px] text-[#d4af37]/60">{filtered.length} entries</span>
          </div>
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-black/40 border border-[#d4af37]/20 p-8 text-center text-[#f5d97a]/60 text-xs">
              No transactions found
            </div>
          ) : (
            filtered.map((t) => <TxnRow key={t.id} t={t} hide={!showBalance} />)
          )}
        </section>
      </main>

      {/* Recharge sheet */}
      {sheet === "recharge" && (
        <RechargeSheet packs={walletPacks} onClose={() => setSheet(null)} />
      )}
      {sheet === "buy" && (
        <BuyCoinsSheet packs={coinPacks} rate={liveRate} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

function CardHero({
  serviceInr, coins, liveRate, change, changePct, up, rate, showBalance, investedPaise, spentPaise, onRecharge, onBuyCoins,
}: {
  serviceInr: number; coins: number; liveRate: number; change: number; changePct: number; up: boolean;
  rate: RatePoint[]; showBalance: boolean; investedPaise: number; spentPaise: number;
  onRecharge: () => void; onBuyCoins: () => void;
}) {
  // mini sparkline
  const points = rate.slice(-30);
  const min = Math.min(...points.map((p) => p.rate_inr), liveRate);
  const max = Math.max(...points.map((p) => p.rate_inr), liveRate);
  const range = max - min || 1;
  const w = 100, h = 40;
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - ((p.rate_inr - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <section
      className="relative rounded-3xl overflow-hidden p-4 shadow-[0_15px_40px_-10px_rgba(212,175,55,0.55)]"
      style={{
        background: "linear-gradient(135deg, #1f1505 0%, #3a2a0c 30%, #6b4d18 60%, #d4af37 100%)",
        border: "1.5px solid rgba(245,217,122,0.5)",
      }}
    >
      {/* Circuit pattern overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,248,220,0.5) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(255,248,220,0.5) 0 1px, transparent 1px 18px)",
        }}
      />
      {/* Sparkline as background */}
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-32 opacity-30 pointer-events-none">
        <path d={path} fill="none" stroke="#fff8dc" strokeWidth="1" />
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#g1)" opacity="0.4" />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff8dc" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff8dc" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#fff8dc]/70 font-bold flex items-center gap-1">
            <WalletIcon className="h-3 w-3" /> Service Wallet
          </p>
          <p className="font-display text-2xl font-black text-[#fff8dc] mt-0.5 leading-none">
            ₹{showBalance ? inr(serviceInr * 100) : "•••••"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#fff8dc]/70 font-bold flex items-center gap-1 justify-end">
            <Sparkles className="h-3 w-3" /> LeadX Live
          </p>
          <p className="font-display text-2xl font-black text-[#fff8dc] mt-0.5 leading-none">
            ₹{liveRate.toFixed(2)}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-0.5 justify-end ${up ? "text-emerald-300" : "text-red-300"}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? "+" : ""}{change.toFixed(2)} ({changePct.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="relative my-3 grid grid-cols-3 gap-2 text-[#fff8dc]">
        <MiniStat label="Invested" value={`₹${inr(investedPaise)}`} />
        <MiniStat label="Spent" value={`₹${inr(spentPaise)}`} />
        <MiniStat label="LeadX" value={showBalance ? coins.toLocaleString() : "•••"} highlight />
      </div>

      <div className="relative grid grid-cols-3 gap-2 mt-3">
        <ActionPill icon={Plus} label="Recharge" onClick={onRecharge} />
        <ActionPill icon={Coins} label="Buy LeadX" onClick={onBuyCoins} />
        <Link to="/vendor/dashboard" className="contents">
          <ActionPill icon={CreditCard} label="History" />
        </Link>
      </div>

      {/* Card chip */}
      <div className="absolute top-3 right-3 opacity-60">
        <div className="h-5 w-7 rounded-sm" style={{ background: "linear-gradient(135deg, #ffd700, #8b6508)" }} />
      </div>
    </section>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-2 py-1.5 ${highlight ? "bg-black/40 border border-[#fff8dc]/40" : "bg-black/30"}`}>
      <p className="text-[8px] uppercase tracking-[0.2em] opacity-70 font-bold">{label}</p>
      <p className={`text-xs font-bold ${highlight ? "text-[#fff8dc]" : ""} truncate`}>{value}</p>
    </div>
  );
}

function ActionPill({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-[#fff8dc] text-[#1a1208] text-xs font-bold active:scale-95 transition"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Counter({ icon: Icon, label, value, accent }: { icon: typeof Plus; label: string; value: number; accent: "emerald" | "gold" | "muted" }) {
  const colors = {
    emerald: "from-emerald-500/20 border-emerald-500/40 text-emerald-300",
    gold: "from-[#d4af37]/20 border-[#d4af37]/40 text-[#f5d97a]",
    muted: "from-black/40 border-[#d4af37]/20 text-[#f5d97a]/60",
  }[accent];
  return (
    <div className={`rounded-2xl bg-gradient-to-b ${colors} to-black/40 border p-3`}>
      <Icon className="h-4 w-4 mb-1" />
      <p className="text-[9px] uppercase tracking-[0.2em] opacity-80 font-bold">{label}</p>
      <p className="font-display text-xl font-black text-[#fff8dc]">{value.toLocaleString()}</p>
    </div>
  );
}

function TxnRow({ t, hide }: { t: Txn; hide: boolean }) {
  const credit = t.direction === "credit";
  const isCoin = t.wallet_kind === "coin";
  const Icon = txnIcon(t.txn_type);
  const date = new Date(t.created_at);
  return (
    <article className="rounded-2xl bg-black/40 border border-[#d4af37]/20 p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${credit ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#fff8dc] truncate">{t.description ?? t.txn_type}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] uppercase tracking-wider text-[#d4af37]/70 font-bold">{t.txn_type.replace("_", " ")}</span>
          <span className="text-[9px] text-[#f5d97a]/40">·</span>
          <span className="text-[9px] text-[#f5d97a]/60">{date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {t.reference_id && <p className="text-[9px] font-mono text-[#d4af37]/60 truncate mt-0.5">#{t.reference_id}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-black ${credit ? "text-emerald-300" : "text-red-300"} flex items-center gap-0.5 justify-end`}>
          {credit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {hide ? "•••" : isCoin ? `${t.coins}` : `₹${inr(t.amount_paise)}`}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-[#f5d97a]/60 font-bold">{isCoin ? "LeadX" : "INR"}</p>
      </div>
    </article>
  );
}

function txnIcon(type: string) {
  switch (type) {
    case "recharge": return Plus;
    case "coin_purchase": return Coins;
    case "lead_unlock": return Package;
    case "shipment": return Truck;
    case "refund": return RotateCcw;
    case "bonus": return Gift;
    default: return Filter;
  }
}

function RechargeSheet({ packs, onClose }: { packs: WalletPack[]; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  return (
    <Sheet title="Recharge Service Wallet" onClose={onClose}>
      <p className="text-[11px] text-[#f5d97a]/70 mb-3">Real ₹ for shipping, SMS & gateway fees. Auto-debited on use.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {packs.length === 0 && [500, 1000, 2000, 5000].map((a) => (
          <PackBtn key={a} title={`₹${a}`} subtitle="Quick add" />
        ))}
        {packs.map((p) => (
          <PackBtn key={p.id} title={p.label} subtitle={p.bonus_inr ? `+₹${p.bonus_inr} bonus` : `₹${p.amount_inr.toLocaleString()}`} />
        ))}
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">Custom amount (₹)</span>
        <input
          type="number"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="500"
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm"
        />
      </label>
      <button className="mt-4 w-full py-3 rounded-xl text-[#1a1208] font-bold text-sm" style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}>
        Pay with Razorpay
      </button>
    </Sheet>
  );
}

function BuyCoinsSheet({ packs, rate, onClose }: { packs: CoinPack[]; rate: number; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const customCost = custom ? Number(custom) * rate : 0;
  return (
    <Sheet title="Buy LeadX Coins" onClose={onClose}>
      <p className="text-[11px] text-[#f5d97a]/70 mb-3">Live rate: <b className="text-[#fff8dc]">₹{rate.toFixed(2)}</b> / coin · 2-5 coins per lead</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {packs.length === 0 && [50, 100, 250, 500].map((c) => (
          <PackBtn key={c} title={`${c} coins`} subtitle={`₹${(c * rate).toFixed(0)}`} />
        ))}
        {packs.map((p) => (
          <PackBtn key={p.id} title={`${p.coins} coins`} subtitle={`₹${p.price_inr.toLocaleString()}${p.bonus_coins ? ` · +${p.bonus_coins}` : ""}`} />
        ))}
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">Custom coins</span>
        <input
          type="number"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="100"
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm"
        />
        {custom && <p className="text-[10px] text-[#f5d97a]/70 mt-1">Total: <b className="text-[#fff8dc]">₹{customCost.toFixed(2)}</b></p>}
      </label>
      <button className="mt-4 w-full py-3 rounded-xl text-[#1a1208] font-bold text-sm" style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}>
        Buy Coins
      </button>
    </Sheet>
  );
}

function PackBtn({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <button className="text-left rounded-2xl bg-black/40 border border-[#d4af37]/30 p-3 hover:border-[#d4af37] active:scale-95 transition">
      <p className="font-display text-base font-bold text-[#fff8dc]">{title}</p>
      <p className="text-[10px] text-[#f5d97a]/60">{subtitle}</p>
    </button>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #1f1505 0%, #0a0606 100%)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderBottom: "none",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold" style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full bg-black/40 border border-[#d4af37]/30 text-[#f5d97a]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
