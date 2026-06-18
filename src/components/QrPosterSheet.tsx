import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Download, Share2, Upload, Pencil, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Printable QR Poster bottom sheet.
 *
 * - Editable shop / name caption (defaults to the user's display name).
 * - Optional custom logo composited at QR center (gallery upload, client-only).
 * - Renders a high-res 1080×1440 poster onto an offscreen canvas, encoding the
 *   Play Store deep link with the user's 4+4 referral code.
 * - Download exports a print-ready PNG. Share uses native share with file
 *   fallback to text.
 */
export function QrPosterSheet({
  open,
  onOpenChange,
  code,
  shareUrl,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  shareUrl: string;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);

  // Render poster whenever inputs change
  useEffect(() => {
    if (!open) return;
    const cnv = canvasRef.current;
    if (!cnv || !shareUrl) return;
    let cancelled = false;

    (async () => {
      const W = 1080, H = 1440;
      cnv.width = W; cnv.height = H;
      const ctx = cnv.getContext("2d");
      if (!ctx) return;

      // Cream background w/ gold border
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#fdf6e3");
      bg.addColorStop(1, "#f4e9c8");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, W - 40, H - 40);

      // Header strip
      ctx.fillStyle = "#1a1208";
      ctx.font = "700 56px 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText("Karo Online", W / 2, 130);
      ctx.font = "italic 28px 'Times New Roman', serif";
      ctx.fillStyle = "#8b6508";
      ctx.fillText("Har Zarurat, Har Jagah Humare Saath", W / 2, 175);

      // QR
      const qrSize = 720;
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, shareUrl, {
        errorCorrectionLevel: "H",
        width: qrSize,
        margin: 1,
        color: { dark: "#1a1208", light: "#fdf6e3" },
      });
      const qrX = (W - qrSize) / 2;
      const qrY = 230;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Center logo overlay (cover the QR center hole)
      const overlaySize = 180;
      const ox = (W - overlaySize) / 2;
      const oy = qrY + (qrSize - overlaySize) / 2;
      // White cutout disc
      ctx.fillStyle = "#fdf6e3";
      ctx.beginPath();
      ctx.arc(W / 2, oy + overlaySize / 2, overlaySize / 2 + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(W / 2, oy + overlaySize / 2, overlaySize / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();

      if (logoDataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(W / 2, oy + overlaySize / 2, overlaySize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, ox, oy, overlaySize, overlaySize);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoDataUrl;
        });
      } else {
        ctx.fillStyle = "#d4af37";
        ctx.font = "700 64px 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("K", W / 2, oy + overlaySize / 2 + 4);
        ctx.textBaseline = "alphabetic";
      }

      // Caption box
      const capY = qrY + qrSize + 60;
      ctx.fillStyle = "#fff8dc";
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 4;
      const capX = 90, capW = W - 180, capH = 110;
      roundRect(ctx, capX, capY, capW, capH, 24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a1208";
      ctx.font = "700 48px 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText(name || "Karo Online", W / 2, capY + 55);
      ctx.font = "italic 26px 'Times New Roman', serif";
      ctx.fillStyle = "#8b6508";
      ctx.fillText(`Code · ${code}`, W / 2, capY + 92);

      // Footer
      ctx.fillStyle = "#1a1208";
      ctx.font = "italic 22px 'Times New Roman', serif";
      ctx.fillText("Scan to install Karo Online · Play Store", W / 2, H - 60);

      if (cancelled) return;
    })();

    return () => { cancelled = true; };
  }, [open, shareUrl, code, name, logoDataUrl]);

  const onPickLogo = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const downloadPoster = async () => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    setBusy(true);
    try {
      cnv.toBlob((blob) => {
        if (!blob) { toast.error("Could not export poster"); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `karo-online-qr-${code || "poster"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Poster downloaded");
      }, "image/png", 0.95);
    } finally { setBusy(false); }
  };

  const sharePoster = async () => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    setBusy(true);
    try {
      const blob: Blob | null = await new Promise((res) => cnv.toBlob((b) => res(b), "image/png", 0.95));
      if (!blob) { toast.error("Could not prepare share"); return; }
      const file = new File([blob], `karo-online-qr-${code}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Karo Online", text: `Install Karo Online · Code: ${code}` });
      } else if (nav.share) {
        await nav.share({ title: "Karo Online", text: `Install Karo Online · Code: ${code}\n${shareUrl}` });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied");
      }
    } catch { /* user cancelled */ } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] border-t-2 border-[#d4af37] max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-[#1a1208] font-display text-lg">Your Shop QR Poster</DrawerTitle>
            <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/70 text-[#1a1208]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto space-y-3">
          {/* Name editor */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-[#d4af37]/40">
            <Pencil className="h-4 w-4 text-[#8b6508]" />
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                className="flex-1 bg-transparent text-[#1a1208] font-bold outline-none"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="flex-1 text-left font-bold text-[#1a1208]">
                {name || "Tap to set shop name"}
              </button>
            )}
            <span className="text-[10px] uppercase tracking-widest text-[#8b6508]">edit</span>
          </div>

          {/* Logo picker */}
          <button
            onClick={onPickLogo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#d4af37] bg-white/60 text-[#1a1208] font-semibold text-sm active:scale-95"
          >
            <Upload className="h-4 w-4" />
            {logoDataUrl ? "Change shop logo" : "Upload shop logo (optional)"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

          {/* Poster preview */}
          <div className="rounded-2xl overflow-hidden bg-white border-2 border-[#d4af37] shadow-lg">
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={busy}
              onClick={downloadPoster}
              className="rounded-xl bg-emerald-600 text-white px-3 py-3 font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 disabled:opacity-60"
            >
              <Download className="h-4 w-4" /> Download QR
            </button>
            <button
              disabled={busy}
              onClick={sharePoster}
              className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b45309] text-[#1a1208] px-3 py-3 font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" /> Share | QR
            </button>
          </div>
          <p className="text-[10px] text-center text-[#8b6508]/80 pt-1">
            Print and stick at your shop. Scans open Play Store with your referral code pre-filled.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
