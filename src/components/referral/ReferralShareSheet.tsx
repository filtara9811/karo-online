import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Copy, MessageCircle, Share2, X, Wallet, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { shareLink } from "@/lib/share";
import type { ReferralContext } from "./use-referral-context";

export function ReferralShareSheet({
  open,
  onClose,
  ctx,
  link,
  code,
  walletTotal,
}: {
  open: boolean;
  onClose: () => void;
  ctx: ReferralContext;
  link: string;
  code: string;
  walletTotal: number;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !link) return;
    let cancelled = false;
    import("qrcode").then(async (QR) => {
      const url = await QR.toDataURL(link, { width: 320, margin: 1, color: { dark: "#111111", light: "#ffffff" } });
      if (!cancelled) setQr(url);
    });
    return () => { cancelled = true; };
  }, [open, link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const native = async () => {
    const r = await shareLink({ title: ctx.shareTitle, text: ctx.shareText(link), url: link });
    if (r === "copied") toast.success("Link copied");
    if (r === "failed") toast.error("Share failed");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md rounded-t-3xl bg-background border-t border-border p-5"
            initial={{ y: 420 }}
            animate={{ y: 0 }}
            exit={{ y: 420 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                  {ctx.label}
                </p>
                <p className="font-display text-xl font-bold leading-tight">Share &amp; earn rewards</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 grid place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mt-4 rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: `linear-gradient(135deg, ${ctx.accentSoft}33, ${ctx.accent}22)`,
                border: `1px solid ${ctx.accent}55`,
              }}
            >
              {qr ? (
                <img src={qr} alt="Referral QR code" className="h-20 w-20 rounded-xl bg-white p-1" />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-muted animate-pulse" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Your code</p>
                <p className="font-display text-lg font-bold">{code || "—"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground break-all leading-snug">{link}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <SheetAction icon={Share2} label="Share" onClick={native} accent={ctx.accent} />
              <SheetAction
                icon={MessageCircle}
                label="WhatsApp"
                accent="#25D366"
                onClick={() =>
                  window.open(`https://wa.me/?text=${encodeURIComponent(ctx.shareText(link))}`, "_blank", "noreferrer")
                }
              />
              <SheetAction icon={Copy} label="Copy" onClick={copy} accent={ctx.accent} />
            </div>

            <Link
              to="/referral"
              onClick={onClose}
              className="mt-4 flex items-center justify-between rounded-2xl border border-border px-4 py-3 active:scale-[0.99] transition"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4" style={{ color: ctx.accent }} />
                Wallet Rs, {Math.round(walletTotal).toLocaleString()}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-border py-3 grid place-items-center gap-1.5 active:scale-95 transition"
    >
      <Icon className="h-5 w-5" style={{ color: accent }} />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}
