import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useReferralOverview } from "@/hooks/use-referral";

/**
 * Premium referral strip rendered directly underneath the user's business / personal
 * card in the side menu drawers. Left: live wallet total. Right: glowing gold-bordered
 * Referral button with a red notification dot when there are pending referrals.
 * The entire row is a Link to the full /referral dashboard.
 */
export function ReferralStrip({ onNavigate, variant = "dark" }: { onNavigate?: () => void; variant?: "dark" | "light" }) {
  const { data } = useReferralOverview();
  const total = data?.wallet.total ?? 0;
  const pending = data?.stats.pending ?? 0;

  const isDark = variant === "dark";
  return (
    <Link
      to="/referral"
      onClick={onNavigate}
      className="block mx-3 mt-3 rounded-2xl active:scale-[0.98] transition"
      style={{
        background: isDark
          ? "linear-gradient(180deg, rgba(212,175,55,0.12), rgba(0,0,0,0.35))"
          : "linear-gradient(180deg, #fff8dc, #fdf6e3)",
        border: `1px solid ${isDark ? "rgba(212,175,55,0.45)" : "rgba(212,175,55,0.55)"}`,
        boxShadow: isDark
          ? "0 6px 18px -8px rgba(212,175,55,0.35)"
          : "0 6px 18px -10px rgba(180,83,9,0.35)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="min-w-0">
          <p className={`text-[9px] uppercase tracking-[0.22em] ${isDark ? "text-[#d4af37]/80" : "text-[#8b6508]"} font-semibold`}>
            Wallet Balance
          </p>
          <p
            className={`font-display text-xl font-bold leading-none mt-0.5 ${isDark ? "text-[#fff8dc]" : "text-[#1a1208]"}`}
            style={isDark ? { textShadow: "0 1px 6px rgba(212,175,55,0.45)" } : undefined}
          >
            Rs, {Math.round(total).toLocaleString()}
          </p>
        </div>
        <div className="relative">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[12px]"
            style={{
              background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
              color: "#1a1208",
              boxShadow: "0 0 0 2px rgba(255,248,220,0.25), 0 6px 14px -6px rgba(212,175,55,0.75)",
            }}
          >
            <Users className="h-4 w-4" />
            <span>Referral</span>
          </div>
          {pending > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#fff8dc]" />
          )}
        </div>
      </div>
    </Link>
  );
}
