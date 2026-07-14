import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet, requestWithdrawal } from "@/lib/staff.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/wallet")({
  component: StaffWalletPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = { balance_inr: number; lifetime_earned: number; lifetime_withdrawn: number } | null;
type Ledger = { id: string; kind: string; amount_inr: number; note: string | null; created_at: string };

function StaffWalletPage() {
  const fetchWallet = useServerFn(getMyWallet);
  const doWithdraw = useServerFn(requestWithdrawal);
  const [wallet, setWallet] = useState<Wallet>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showW, setShowW] = useState(false);
  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetchWallet();
    setWallet(r.wallet as Wallet);
    setLedger(r.ledger as Ledger[]);
  };
  useEffect(() => { load().finally(() => setLoading(false)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Amount daaliye"); return; }
    if (!upi.trim()) { toast.error("UPI ID daaliye"); return; }
    setBusy(true);
    try {
      await doWithdraw({ data: { amount_inr: amt, upi_id: upi.trim() } });
      toast.success("Withdrawal request bhej diya!");
      setShowW(false); setAmount(""); setUpi("");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold mb-4">Wallet</h1>
        <div className="rounded-3xl bg-gradient-to-br from-[oklch(0.72_0.16_82)] to-[oklch(0.55_0.18_75)] p-5 text-white shadow-xl">
          <p className="text-xs opacity-80 uppercase tracking-wide">Available Balance</p>
          <p className="text-4xl font-bold mt-1">₹{Number(wallet?.balance_inr ?? 0).toFixed(2)}</p>
          <div className="flex justify-between mt-4 text-xs">
            <div>
              <p className="opacity-70">Earned</p>
              <p className="font-semibold">₹{Number(wallet?.lifetime_earned ?? 0).toFixed(0)}</p>
            </div>
            <div>
              <p className="opacity-70">Withdrawn</p>
              <p className="font-semibold">₹{Number(wallet?.lifetime_withdrawn ?? 0).toFixed(0)}</p>
            </div>
          </div>
          <button onClick={() => setShowW(true)}
            className="mt-4 w-full h-10 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold backdrop-blur">
            Withdraw
          </button>
        </div>
      </header>

      <div className="px-4">
        <h2 className="text-sm font-semibold mb-2">Recent activity</h2>
        {ledger.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {ledger.map((l) => {
              const credit = l.kind !== "withdrawal";
              const Icon = credit ? TrendingUp : TrendingDown;
              return (
                <li key={l.id} className="flex items-center gap-3 bg-white rounded-xl border border-[color:oklch(0.9_0.03_85)] p-3">
                  <div className={`h-9 w-9 rounded-full grid place-items-center ${credit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{l.note ?? l.kind.replace("_", " ")}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`text-sm font-bold ${credit ? "text-emerald-700" : "text-red-700"}`}>
                    {credit ? "+" : "−"}₹{Number(l.amount_inr).toFixed(0)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showW && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-4" onClick={() => !busy && setShowW(false)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <WalletIcon className="h-5 w-5 text-[color:oklch(0.55_0.16_82)]" />
              <h3 className="font-bold">Withdraw funds</h3>
            </div>
            <label className="text-xs font-medium">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 mt-1 px-3 rounded-xl border border-input bg-background text-sm mb-3" />
            <label className="text-xs font-medium">UPI ID</label>
            <input type="text" placeholder="name@upi" value={upi} onChange={(e) => setUpi(e.target.value)}
              className="w-full h-11 mt-1 px-3 rounded-xl border border-input bg-background text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowW(false)} disabled={busy} className="flex-1 h-11 rounded-xl border border-input font-medium">Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[oklch(0.72_0.16_82)] to-[oklch(0.66_0.18_75)] text-white font-semibold flex items-center justify-center gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
