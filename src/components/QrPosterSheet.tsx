import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Download, Share2, Upload, Pencil, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Premium QR Poster (matches reference screenshot #1):
 *   - Shop photo background fills the top.
 *   - Centered QR card sits over the photo, with the Karo "K" badge in the QR center.
 *   - Editable shop / name caption.
 *   - Bottom row: Download (left) · "+" Setup actions (center) · Share (right).
 *   - The QR encodes the public scan page /s/<CODE>, which (per admin / merchant
 *     settings) shows banners, ads, and a Play Store / Payment / Digital Shop sheet.
 *   - Download path is mobile-resilient: it tries Web Share with file first
 *     (which lands in the gallery on Android), then falls back to a real anchor.
 */
export function QrPosterSheet({
  open,
  onOpenChange,
  code,
  shareUrl,           // legacy prop — Play Store URL with referrer, used as fallback target for "Share | QR" text
  defaultName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  shareUrl: string;
  defaultName: string;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [shopBgUrl, setShopBgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);

  // Landing URL the QR encodes — public scan page hosted by the app.
  const landingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/s/${encodeURIComponent(code || "")}`
    : `https://karoonline.in/s/${code}`;

  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);

  // Load persisted shop background.
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("poster_bg_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const url = (data as { poster_bg_url?: string } | null)?.poster_bg_url ?? null;
      setShopBgUrl(url);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  // Render the QR with the Karo logo in the middle.
  useEffect(() => {
    if (!open || !landingUrl) return;
    let cancelled = false;
    (async () => {
      const cnv = document.createElement("canvas");
      await QRCode.toCanvas(cnv, landingUrl, {
        errorCorrectionLevel: "H",
        width: 720,
        margin: 1,
        color: { dark: "#1a1208", light: "#fdf6e3" },
      });
      const ctx = cnv.getContext("2d");
      if (ctx) {
        const size = 130;
        const cx = cnv.width / 2;
        const cy = cnv.height / 2;
        // gold ring
        ctx.fillStyle = "#fdf6e3";
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2); ctx.stroke();
        // K letter
        ctx.fillStyle = "#d4af37";
        ctx.font = "700 90px 'Times New Roman', serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("K", cx, cy + 4);
      }
      if (!cancelled) setQrDataUrl(cnv.toDataURL("image/png"));
    })();
    return () => { cancelled = true; };
  }, [open, landingUrl]);

  const onPickPhoto = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8 MB)"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result || "");
      setShopBgUrl(url);
      // persist (silent)
      if (user?.id) {
        await supabase.rpc("upsert_merchant_link_settings" as never, {
          _payload: { poster_bg_url: url },
        } as never);
      }
    };
    reader.readAsDataURL(file);
  };

  // Render the visible poster <div> to a Blob (1080×1440) by drawing each layer
  // onto a fresh canvas. Avoids html2canvas — keeps bundle small.
  const renderPosterBlob = async (): Promise<Blob | null> => {
    const W = 1080, H = 1440;
    const cnv = document.createElement("canvas");
    cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext("2d"); if (!ctx) return null;

    // bg
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fdf6e3"); grad.addColorStop(1, "#f4e9c8");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 14; ctx.strokeRect(28, 28, W - 56, H - 56);

    // Shop photo top half
    if (shopBgUrl) {
      const img = await loadImage(shopBgUrl).catch(() => null);
      if (img) {
        const ph = 760;
        // cover crop
        const r = Math.max((W - 80) / img.width, ph / img.height);
        const dw = img.width * r, dh = img.height * r;
        ctx.save();
        roundRect(ctx, 40, 40, W - 80, ph, 32); ctx.clip();
        ctx.drawImage(img, (W - dw) / 2, 40 + (ph - dh) / 2, dw, dh);
        ctx.restore();
      }
    }

    // QR (with logo) — drawn over the photo
    if (qrDataUrl) {
      const qrImg = await loadImage(qrDataUrl).catch(() => null);
      if (qrImg) {
        const size = 720;
        ctx.fillStyle = "#fdf6e3";
        roundRect(ctx, (W - size) / 2 - 16, 320 - 16, size + 32, size + 32, 28); ctx.fill();
        ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 6;
        roundRect(ctx, (W - size) / 2 - 16, 320 - 16, size + 32, size + 32, 28); ctx.stroke();
        ctx.drawImage(qrImg, (W - size) / 2, 320, size, size);
      }
    }

    // caption
    const capY = 1100;
    ctx.fillStyle = "#fff8dc"; ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 4;
    roundRect(ctx, 90, capY, W - 180, 130, 28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1a1208";
    ctx.font = "700 54px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText((name || "Karo Online").slice(0, 30), W / 2, capY + 64);
    ctx.font = "italic 28px 'Times New Roman', serif";
    ctx.fillStyle = "#8b6508";
    ctx.fillText(`Code · ${code}`, W / 2, capY + 102);

    ctx.fillStyle = "#8b6508";
    ctx.font = "italic 24px 'Times New Roman', serif";
    ctx.fillText("Scan to visit · Karo Online", W / 2, H - 70);

    return await new Promise<Blob | null>((res) => cnv.toBlob((b) => res(b), "image/png", 0.95));
  };

  const sharePoster = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) { toast.error("Could not prepare share"); return; }
      const file = new File([blob], `karo-${code}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Karo Online", text: `Scan · Code ${code}\n${landingUrl}` });
      } else if (nav.share) {
        await nav.share({ title: "Karo Online", text: `Scan · Code ${code}\n${landingUrl}` });
      } else {
        await navigator.clipboard.writeText(landingUrl);
        toast.success("Link copied");
      }
    } catch { /* user cancelled */ } finally { setBusy(false); }
  };

  // Mobile-resilient download. Tries Web-Share-with-file first (this is the
  // most reliable way to land in the Android gallery via "Save image"), then
  // falls back to a real anchor click attached to the DOM.
  const downloadPoster = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) { toast.error("Could not export poster"); return; }
      const file = new File([blob], `karo-online-qr-${code || "poster"}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };

      // Path A — Web Share with file. On mobile the share sheet exposes
      // "Save image" / "Save to Photos" which writes to the gallery.
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Karo Online QR" });
          toast.success("Choose 'Save image' to keep it in your gallery");
          return;
        } catch { /* user cancelled — fall through to anchor download */ }
      }

      // Path B — classic anchor download, but appended to DOM for Android Chrome.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `karo-online-qr-${code || "poster"}.png`;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
      toast.success("Poster downloaded");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] border-t-2 border-[#d4af37] max-h-[95vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-[#1a1208] font-display text-lg">Your Shop QR Poster</DrawerTitle>
              <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/70 text-[#1a1208]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>

          <div className="px-3 pb-4 overflow-y-auto">
            {/* Poster preview */}
            <div ref={posterRef} className="relative rounded-3xl overflow-hidden border-2 border-[#d4af37] bg-[#fdf6e3] shadow-lg aspect-[3/4]">
              {/* Shop background */}
              <button
                onClick={onPickPhoto}
                className="absolute inset-0 w-full h-full"
                aria-label="Upload shop photo"
              >
                {shopBgUrl ? (
                  <img src={shopBgUrl} alt="Shop" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#fdf6e3] to-[#f4e9c8] text-[#8b6508]">
                    <div className="text-center">
                      <Upload className="h-10 w-10 mx-auto" />
                      <p className="mt-2 text-xs uppercase tracking-widest font-bold">Tap to add shop photo</p>
                    </div>
                  </div>
                )}
                {shopBgUrl && (
                  <span className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-black/55 text-white shadow">
                    <Upload className="h-4 w-4" />
                  </span>
                )}
              </button>

              {/* QR overlay */}
              <div className="absolute inset-x-0 bottom-20 grid place-items-center pointer-events-none">
                <div className="bg-[#fdf6e3] p-2 rounded-2xl border-2 border-[#d4af37] shadow-xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR code" className="w-56 h-56 block" />
                  ) : (
                    <div className="w-56 h-56 bg-[#f4e9c8] animate-pulse rounded" />
                  )}
                </div>
              </div>

              {/* Editable name pill */}
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#fff8dc] border-2 border-[#d4af37] shadow px-3 py-2 flex items-center gap-2 pointer-events-auto">
                {editingName ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 40))}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                    className="flex-1 bg-transparent text-[#1a1208] font-display text-lg outline-none text-center"
                  />
                ) : (
                  <button onClick={() => setEditingName(true)} className="flex-1 text-center font-display text-lg text-[#1a1208] underline decoration-[#d4af37]/60 underline-offset-4">
                    {name || "Tap to set name"}
                  </button>
                )}
                <Pencil className="h-4 w-4 text-[#8b6508]" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

            {/* Bottom 3-button row: Download | + | Share */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-3 items-stretch">
              <button
                disabled={busy}
                onClick={downloadPoster}
                className="rounded-full bg-emerald-600 text-white px-3 py-3 font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> Download QR
              </button>
              <button
                onClick={() => setSetupOpen(true)}
                className="h-12 w-14 rounded-full bg-emerald-600 text-white grid place-items-center shadow active:scale-95"
                aria-label="Setup actions"
              >
                <Plus className="h-6 w-6" />
              </button>
              <button
                disabled={busy}
                onClick={sharePoster}
                className="rounded-full bg-white border border-[#d4af37] text-[#1a1208] px-3 py-3 font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" /> Share | QR
              </button>
            </div>
            <p className="text-[10px] text-center text-[#8b6508]/80 pt-2">
              Print and stick at your shop. Scans open your trusted Karo Online page.
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      <MerchantLinksSetupSheet open={setupOpen} onOpenChange={setSetupOpen} />
    </>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
