import { motion } from "framer-motion";
import { X, Download, Share2, Copy, MessageCircle, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  shareUrl: string;
  title?: string;
  imageUrl?: string;          // optional QR / card image to download
  downloadFilename?: string;
  onClose: () => void;
};

export function ShareCardSheet({ shareUrl, title = "My Karo Online Card", imageUrl, downloadFilename = "karo-card.png", onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const text = `${title}\n${shareUrl}`;

  const openWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const nativeShare = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) await nav.share({ title, text, url: shareUrl });
      else openWhatsApp();
    } catch { /* cancelled */ }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  const download = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end"
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-gradient-to-b from-white to-amber-50 rounded-t-3xl p-5"
      >
        <div className="relative flex items-center mb-4">
          <div className="h-1.5 w-12 rounded-full bg-amber-200 mx-auto" />
          <button onClick={onClose} className="absolute right-0 h-8 w-8 grid place-items-center rounded-full bg-slate-100 active:scale-90">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <h3 className="font-display text-xl font-bold bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent text-center">
          Share your card
        </h3>
        <p className="text-xs text-slate-500 text-center mt-1 mb-5">Send via WhatsApp, copy the link, or save the image</p>

        {imageUrl && (
          <div className="mx-auto mb-5 h-40 w-40 rounded-2xl overflow-hidden border border-amber-200 bg-white p-2 shadow-inner grid place-items-center">
            <img src={imageUrl} alt="Card preview" className="h-full w-full object-contain" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <ActionTile
            onClick={openWhatsApp}
            icon={<MessageCircle className="h-6 w-6" />}
            label="WhatsApp"
            sub="Quick share"
            tone="from-emerald-500 to-emerald-600"
          />
          <ActionTile
            onClick={nativeShare}
            icon={<Share2 className="h-6 w-6" />}
            label="More apps"
            sub="System share"
            tone="from-amber-400 to-amber-600"
          />
          <ActionTile
            onClick={copyLink}
            icon={copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
            label={copied ? "Copied!" : "Copy link"}
            sub={shareUrl.replace(/^https?:\/\//, "").slice(0, 24) + "…"}
            tone="from-sky-500 to-sky-600"
          />
          <ActionTile
            onClick={download}
            icon={<Download className="h-6 w-6" />}
            label="Download"
            sub={imageUrl ? "Save to gallery" : "No image"}
            tone="from-rose-500 to-rose-600"
            disabled={!imageUrl}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActionTile({
  icon, label, sub, tone, onClick, disabled,
}: { icon: React.ReactNode; label: string; sub: string; tone: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-2xl p-3 text-left bg-gradient-to-br ${tone} text-white shadow-lg active:shadow-md transition disabled:opacity-50`}
    >
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-white/25 backdrop-blur-sm mb-2">
        {icon}
      </div>
      <p className="font-display text-sm font-bold">{label}</p>
      <p className="text-[10px] opacity-90 truncate">{sub}</p>
    </motion.button>
  );
}
