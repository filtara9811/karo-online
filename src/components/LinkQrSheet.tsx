import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { X, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Dynamic QR sheet for any single link (social profile, payment, shop page).
 * The QR always encodes the *shop link*, so the merchant can print it once and
 * keep changing the destination from the dashboard — the image never changes.
 */
export function LinkQrSheet({
  open,
  onClose,
  title,
  subtitle,
  url,
  accent = "#f59e0b",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
  accent?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => undefined);
  }, [open, url]);

  const download = () => {
    const data = canvasRef.current?.toDataURL("image/png");
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copy ho gaya");
      }
    } catch { /* cancelled */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[280] flex items-end bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-md rounded-t-[30px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
                  Dynamic QR
                </p>
                <h3 className="truncate font-display text-[16px] font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close QR"
                className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-[26px] border border-amber-200 bg-amber-50/60 p-4 text-center">
              <canvas ref={canvasRef} className="mx-auto h-[220px] w-[220px] rounded-2xl bg-white" />
              <p className="mt-2 break-all text-[10px] text-slate-500">{url}</p>
              <p className="mt-1 text-[10.5px] font-semibold text-amber-800">
                Print karke chipka dein — link baad me badla to bhi yahi QR chalega.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={download}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-extrabold text-white active:scale-95"
                style={{ background: accent }}
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={share}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-extrabold text-slate-700 active:scale-95"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
