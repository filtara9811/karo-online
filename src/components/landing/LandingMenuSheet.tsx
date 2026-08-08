import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, Link2, Check, X, Apple } from "lucide-react";
import { toast } from "sonner";
import { needsLightText } from "./landing-shared";

/**
 * "⋮" menu on the landing top bar — install this shop page as an app,
 * share it, or copy the link.
 */
export function LandingMenuSheet({
  open,
  onClose,
  accent,
  merchantName,
  pageUrl,
  canInstall,
  installed,
  isIOS,
  onInstall,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  merchantName: string;
  pageUrl: string;
  canInstall: boolean;
  installed: boolean;
  isIOS: boolean;
  onInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}) {
  const fg = needsLightText(accent) ? "#ffffff" : "#1a1208";

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: merchantName, url: pageUrl });
      else {
        await navigator.clipboard.writeText(pageUrl);
        toast.success("Link copied");
      }
    } catch { /* cancelled */ }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Copy nahi hua");
    }
  };

  const install = async () => {
    const r = await onInstall();
    if (r === "accepted") toast.success("Installing…");
    else if (r === "unavailable")
      toast.info(isIOS ? "Share ▸ Add to Home Screen se install karein" : "Browser menu ▸ Install app");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[62] bg-black/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[63] rounded-t-3xl bg-white p-4 pb-6 text-slate-900 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Options</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {installed ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                <Check className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">App installed on this device</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={install}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-bold shadow-lg active:scale-[0.98]"
                style={{ background: accent, color: fg }}
              >
                {isIOS ? <Apple className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                <span className="min-w-0">
                  <span className="block text-sm">Download {merchantName} app</span>
                  <span className="block text-[11px] font-medium opacity-80">
                    {canInstall ? "Install on home screen" : isIOS ? "Share ▸ Add to Home Screen" : "Browser menu ▸ Install app"}
                  </span>
                </span>
              </button>
            )}

            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={share}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left active:scale-[0.99]"
              >
                <Share2 className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold">Share shop page</span>
              </button>
              <button
                type="button"
                onClick={copy}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left active:scale-[0.99]"
              >
                <Link2 className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold">Copy link</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
