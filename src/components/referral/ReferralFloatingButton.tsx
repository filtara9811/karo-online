import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { useReferralOverview } from "@/hooks/use-referral";
import { useReferralContext } from "./use-referral-context";
import { ReferralShareSheet } from "./ReferralShareSheet";

/**
 * Right-side 3D floating referral button, present on every app surface.
 * The link it shares depends on the surface (customer / One QR / vendor / shop),
 * but the reward always lands in the sharer's own wallet.
 */
export function ReferralFloatingButton({ shopCode }: { shopCode?: string | null }) {
  const ctx = useReferralContext();
  const { data } = useReferralOverview();
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const code = data?.code ?? "";
  const link = code ? ctx.buildLink(code, shopCode) : "";
  const pending = data?.stats.pending ?? 0;

  useEffect(() => () => { if (pressTimer.current) window.clearTimeout(pressTimer.current); }, []);

  const startPress = () => {
    pressTimer.current = window.setTimeout(async () => {
      pressTimer.current = null;
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Referral link copied");
      } catch {
        /* ignore */
      }
    }, 500);
  };
  const endPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
      setOpen(true);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={ctx.label}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={() => {
          if (pressTimer.current) {
            window.clearTimeout(pressTimer.current);
            pressTimer.current = null;
          }
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="fixed right-3 z-[70] rounded-full pl-2.5 pr-3.5 py-2.5 flex items-center gap-2"
        style={{
          bottom: "calc(6.5rem + env(safe-area-inset-bottom))",
          background: `linear-gradient(160deg, ${ctx.accentSoft}, ${ctx.accent} 55%, rgba(0,0,0,0.35))`,
          color: "#1a1208",
          boxShadow: `0 10px 22px -8px ${ctx.accent}cc, inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 6px rgba(0,0,0,0.25)`,
          border: "1px solid rgba(255,255,255,0.35)",
        }}
      >
        <span
          className="h-7 w-7 rounded-full grid place-items-center"
          style={{
            background: "rgba(255,255,255,0.35)",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.7)",
          }}
        >
          <Gift className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-extrabold leading-none tracking-tight max-w-[86px] text-left">
          {ctx.label}
        </span>
        {pending > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-background">
            {pending > 9 ? "9+" : pending}
          </span>
        )}
        <span
          className="absolute inset-0 rounded-full pointer-events-none animate-ping"
          style={{ border: `1px solid ${ctx.accent}66`, animationDuration: "2.8s" }}
        />
      </motion.button>

      <ReferralShareSheet
        open={open}
        onClose={() => setOpen(false)}
        ctx={ctx}
        link={link}
        code={code}
        walletTotal={data?.wallet.total ?? 0}
      />
    </>
  );
}
