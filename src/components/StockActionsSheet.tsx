import { useEffect } from "react";
import {
  X,
  PackagePlus,
  PackageMinus,
  PackageSearch,
  ScanLine,
  ClipboardList,
  AlertTriangle,
  Truck,
  History,
} from "lucide-react";

export type StockAction =
  | "add"
  | "reduce"
  | "audit"
  | "scan"
  | "low"
  | "movement"
  | "report"
  | "transfer";

const ACTIONS: {
  key: StockAction;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: "gold" | "rose" | "emerald" | "indigo";
}[] = [
  { key: "add", label: "Add Stock", hint: "Receive new inward", icon: <PackagePlus className="h-4 w-4" />, tone: "emerald" },
  { key: "reduce", label: "Reduce Stock", hint: "Damage / return", icon: <PackageMinus className="h-4 w-4" />, tone: "rose" },
  { key: "scan", label: "Scan Barcode", hint: "Quick lookup", icon: <ScanLine className="h-4 w-4" />, tone: "gold" },
  { key: "audit", label: "Stock Audit", hint: "Count & match", icon: <PackageSearch className="h-4 w-4" />, tone: "indigo" },
  { key: "low", label: "Low Stock", hint: "Re-order alerts", icon: <AlertTriangle className="h-4 w-4" />, tone: "rose" },
  { key: "transfer", label: "Transfer", hint: "Branch ↔ branch", icon: <Truck className="h-4 w-4" />, tone: "indigo" },
  { key: "movement", label: "Movement", hint: "In / out history", icon: <History className="h-4 w-4" />, tone: "gold" },
  { key: "report", label: "Report", hint: "Export PDF / CSV", icon: <ClipboardList className="h-4 w-4" />, tone: "emerald" },
];

const TONES: Record<"gold" | "rose" | "emerald" | "indigo", string> = {
  gold: "from-[#fff3c8] to-[#d4af37] text-[color:oklch(0.18_0.06_18)]",
  rose: "from-rose-50 to-rose-200 text-rose-700",
  emerald: "from-emerald-50 to-emerald-200 text-emerald-700",
  indigo: "from-indigo-50 to-indigo-200 text-indigo-700",
};

/**
 * Bottom sheet shown when the vendor taps the "Stock | value" tile on the
 * live dashboard. Lists every stock-related operation in a tappable grid.
 */
export function StockActionsSheet({
  stockUnits,
  stockValue,
  onPick,
  onClose,
}: {
  stockUnits: number;
  stockValue: number;
  onPick: (action: StockAction) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.25s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] flex flex-col"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <header className="px-5 pb-2 flex items-center gap-3">
          <span
            className="h-11 w-11 rounded-xl grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow"
            style={{
              background:
                "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
            }}
          >
            <PackageSearch className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)] font-bold">
              ✦ Stock Centre ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold leading-tight truncate">
              Manage Inventory
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </header>

        {/* Live snapshot strip */}
        <div className="mx-5 mb-3 rounded-2xl border border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85 backdrop-blur-sm grid grid-cols-2 divide-x divide-[color:oklch(0.78_0.14_82/0.3)]">
          <div className="p-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
              Stock Units
            </p>
            <p className="font-display text-xl text-gold-gradient font-bold leading-none mt-0.5">
              {stockUnits.toLocaleString()}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
              Stock Value
            </p>
            <p className="font-display text-xl text-gold-gradient font-bold leading-none mt-0.5">
              ₹{stockValue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => {
                  onPick(a.key);
                  onClose();
                }}
                className="group relative rounded-2xl border border-[color:oklch(0.78_0.14_82/0.4)] bg-white px-3 py-3 text-left active:scale-[0.97] shadow-sm"
              >
                <span
                  className={`h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br ${TONES[a.tone]} shadow`}
                >
                  {a.icon}
                </span>
                <p className="mt-2 font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
                  {a.label}
                </p>
                <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] leading-tight">
                  {a.hint}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
