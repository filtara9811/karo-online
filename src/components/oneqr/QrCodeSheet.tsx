import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { X, Share2, Download, Printer } from "lucide-react";

/**
 * Bottom sheet with the project's QR code — share, download and poster tools.
 */
export function QrCodeSheet({
  open,
  onClose,
  title,
  landingUrl,
  onPoster,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  landingUrl: string;
  onPoster: () => void;
  onShare: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !canvasRef.current || !landingUrl) return;
    QRCode.toCanvas(canvasRef.current, landingUrl, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => { /* ignore */ });
  }, [open, landingUrl]);

  const download = () => {
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] bg-black/55 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto rounded-t-[30px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
          >
            <div className="flex items-center">
              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-amber-700">My QR code</p>
                <h3 className="truncate font-display text-[16px] font-bold text-slate-900">{title}</h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close QR sheet"
                className="ml-auto h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-[26px] border border-amber-200 bg-amber-50/60 p-4 text-center">
              <canvas ref={canvasRef} className="mx-auto h-[220px] w-[220px] rounded-2xl bg-white" />
              <p className="mt-2 break-all text-[10px] text-slate-500">{landingUrl}</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <SheetBtn icon={Share2} label="Share" onClick={onShare} primary />
              <SheetBtn icon={Download} label="Download" onClick={download} />
              <SheetBtn icon={Printer} label="Poster" onClick={() => { onClose(); onPoster(); }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetBtn({
  icon: Icon, label, onClick, primary,
}: { icon: typeof Share2; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`h-12 rounded-2xl text-[12px] font-extrabold inline-flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
        primary ? "bg-amber-500 text-white" : "border border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
