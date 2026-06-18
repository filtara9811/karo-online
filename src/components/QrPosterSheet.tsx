import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Download, Share2, Upload, Pencil, X, Plus, Camera } from "lucide-react";
import { toast } from "sonner";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Premium QR Poster — Canva-aligned layout:
 *   - Shop photo dominates the upper 60–65% of the canvas, never obscured.
 *   - QR card overlaps only the bottom edge of the photo (~25% overlap).
 *   - Center of QR shows the real Karo Online logo (not a plain "K").
 *   - "Karo Online" subtle gold watermark sits on the photo.
 *   - 2-3 rotating image slots — merchant taps a thumbnail to switch.
 *   - Bottom row: Download QR (offset, half-overlapping the poster) · "+" · Share.
 */
const MAX_SLOTS = 3;
const LOGO_URL = "/karo-logo.png";

export function QrPosterSheet({
  open,
  onOpenChange,
  code,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  shareUrl?: string;
  defaultName: string;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const replaceIdx = useRef<number | null>(null);

  const landingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/s/${encodeURIComponent(code || "")}`
    : `https://karoonline.in/s/${code}`;
  const activeBg = slots[activeIdx] ?? null;

  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);

  // Load persisted shop background slots.
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("poster_bg_url, poster_bg_urls")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { poster_bg_url?: string; poster_bg_urls?: string[] } | null;
      const arr = Array.isArray(d?.poster_bg_urls) ? d!.poster_bg_urls!.filter(Boolean) : [];
      const list = arr.length ? arr : (d?.poster_bg_url ? [d.poster_bg_url] : []);
      setSlots(list.slice(0, MAX_SLOTS));
      setActiveIdx(0);
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
        const size = 150;
        const cx = cnv.width / 2;
        const cy = cnv.height / 2;
        // gold ring backdrop
        ctx.fillStyle = "#fdf6e3";
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 10, 0, Math.PI * 2); ctx.stroke();
        // Try real logo, fallback to "K"
        try {
          const logo = await loadImage(LOGO_URL);
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
          ctx.restore();
        } catch {
          ctx.fillStyle = "#d4af37";
          ctx.font = "700 100px 'Times New Roman', serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("K", cx, cy + 6);
        }
      }
      if (!cancelled) setQrDataUrl(cnv.toDataURL("image/png"));
    })();
    return () => { cancelled = true; };
  }, [open, landingUrl]);

  const persistSlots = useCallback(async (next: string[]) => {
    if (!user?.id) return;
    await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: { poster_bg_urls: next, poster_bg_url: next[0] ?? null },
    } as never);
  }, [user?.id]);

  const onPickPhoto = (idx: number) => {
    replaceIdx.current = idx;
    fileRef.current?.click();
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8 MB)"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result || "");
      const idx = replaceIdx.current ?? slots.length;
      const next = [...slots];
      if (idx >= next.length) next.push(url); else next[idx] = url;
      const trimmed = next.slice(0, MAX_SLOTS);
      setSlots(trimmed);
      setActiveIdx(Math.min(idx, trimmed.length - 1));
      void persistSlots(trimmed);
    };
    reader.readAsDataURL(file);
  };

  // ── Canvas export — matches the on-screen Canva layout ─────────────
  const renderPosterBlob = async (): Promise<Blob | null> => {
    const W = 1080, H = 1620;
    const cnv = document.createElement("canvas");
    cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext("2d"); if (!ctx) return null;

    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fdf6e3"); grad.addColorStop(1, "#f4e9c8");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 14; ctx.strokeRect(28, 28, W - 56, H - 56);

    // Shop photo — upper 60% of canvas
    const photoH = Math.round(H * 0.62);
    const photoX = 60, photoY = 60, photoW = W - 120;
    if (activeBg) {
      const img = await loadImage(activeBg).catch(() => null);
      if (img) {
        const r = Math.max(photoW / img.width, photoH / img.height);
        const dw = img.width * r, dh = img.height * r;
        ctx.save();
        roundRect(ctx, photoX, photoY, photoW, photoH, 36); ctx.clip();
        ctx.drawImage(img, photoX + (photoW - dw) / 2, photoY + (photoH - dh) / 2, dw, dh);
        ctx.restore();
      }
    }
    // photo frame
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 8;
    roundRect(ctx, photoX, photoY, photoW, photoH, 36); ctx.stroke();

    // "Karo Online" watermark on photo
    ctx.fillStyle = "rgba(253, 246, 227, 0.85)";
    ctx.font = "italic 700 38px 'Times New Roman', serif";
    ctx.textAlign = "left";
    ctx.fillText("Karo Online", photoX + 24, photoY + 60);

    // QR card — overlaps the BOTTOM EDGE of the photo only
    const qrSize = 620;
    const qrX = (W - qrSize) / 2;
    const qrY = photoY + photoH - Math.round(qrSize * 0.30); // ~30% overlap
    if (qrDataUrl) {
      const qrImg = await loadImage(qrDataUrl).catch(() => null);
      if (qrImg) {
        ctx.fillStyle = "#fdf6e3";
        roundRect(ctx, qrX - 22, qrY - 22, qrSize + 44, qrSize + 44, 32); ctx.fill();
        ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 8;
        roundRect(ctx, qrX - 22, qrY - 22, qrSize + 44, qrSize + 44, 32); ctx.stroke();
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }
    }

    // caption pill
    const capY = qrY + qrSize + 60;
    ctx.fillStyle = "#fff8dc"; ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 5;
    roundRect(ctx, 120, capY, W - 240, 140, 32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1a1208";
    ctx.font = "700 58px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText((name || "Karo Online").slice(0, 30), W / 2, capY + 70);
    ctx.font = "italic 26px 'Times New Roman', serif";
    ctx.fillStyle = "#8b6508";
    ctx.fillText(`Karo Online · Code ${code}`, W / 2, capY + 110);

    return await new Promise<Blob | null>((res) => cnv.toBlob((b) => res(b), "image/png", 0.95));
  };

  // ── Share ─────────────────────────────────────────────────────────
  const sharePoster = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) { toast.error("Could not prepare poster"); return; }
      const file = new File([blob], `karo-${code}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        share?: (d: ShareData) => Promise<void>;
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Karo Online", text: `Scan · ${landingUrl}` });
        toast.success("Shared");
        return;
      }
      if (nav.share) {
        await nav.share({ title: "Karo Online", text: `Scan · ${landingUrl}`, url: landingUrl });
        toast.success("Shared");
        return;
      }
      await navigator.clipboard.writeText(landingUrl);
      toast.success("Link copied to clipboard");
    } catch (err) {
      const msg = (err as Error)?.message || "";
      if (!/abort|cancel/i.test(msg)) toast.error("Couldn't share — link copied instead");
      try { await navigator.clipboard.writeText(landingUrl); } catch { /* noop */ }
    } finally { setBusy(false); }
  };

  // ── Download — Android/iOS-resilient save-to-gallery ──────────────
  const downloadPoster = async () => {
    setBusy(true);
    try {
      const blob = await renderPosterBlob();
      if (!blob) { toast.error("Could not export poster"); return; }
      const filename = `karo-online-qr-${code || "poster"}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & {
        share?: (d: ShareData) => Promise<void>;
        canShare?: (d: ShareData) => boolean;
      };

      // Preferred on Android: share-with-file lets the user pick "Save to Gallery".
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Karo Online QR" });
          toast.success("Tap 'Save image' to keep it in your gallery");
          return;
        } catch (e) {
          const m = (e as Error)?.message || "";
          if (!/abort|cancel/i.test(m)) {
            // fall through to anchor path
          } else {
            return;
          }
        }
      }

      // Classic anchor download (works on desktop + Chrome Android).
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_self";
      a.style.display = "none";
      document.body.appendChild(a);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 2000);
      toast.success("Poster saved to your device");
    } catch {
      toast.error("Download failed — try Share instead");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] border-t-2 border-[#d4af37] max-h-[96vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-[#1a1208] font-display text-lg">Your Shop QR Poster</DrawerTitle>
              <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/70 text-[#1a1208]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>

          <div className="px-3 pb-6 overflow-y-auto">
            {/* Poster preview — image upper half, QR overlapping only the bottom edge */}
            <div className="relative rounded-3xl border-2 border-[#d4af37] bg-[#fdf6e3] shadow-lg overflow-hidden">
              {/* Photo layer: ~62% of poster height */}
              <button
                type="button"
                onClick={() => onPickPhoto(activeIdx)}
                className="block w-full relative"
                style={{ aspectRatio: "4 / 3" }}
                aria-label="Replace shop photo"
              >
                {activeBg ? (
                  <img src={activeBg} alt="Shop" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#fdf6e3] to-[#f4e9c8] text-[#8b6508]">
                    <div className="text-center">
                      <Upload className="h-10 w-10 mx-auto" />
                      <p className="mt-2 text-xs uppercase tracking-widest font-bold">Tap to add shop photo</p>
                    </div>
                  </div>
                )}
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-[10px] uppercase tracking-widest text-amber-200 font-bold">
                  Karo Online
                </span>
                <span className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-black/55 text-white shadow">
                  <Camera className="h-4 w-4" />
                </span>
              </button>

              {/* QR — sits below the photo but overlaps its bottom edge by ~25% */}
              <div className="relative -mt-16 grid place-items-center px-6">
                <div className="bg-[#fdf6e3] p-2.5 rounded-2xl border-2 border-[#d4af37] shadow-2xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR code" className="w-52 h-52 block" />
                  ) : (
                    <div className="w-52 h-52 bg-[#f4e9c8] animate-pulse rounded" />
                  )}
                </div>
              </div>

              {/* Editable name pill */}
              <div className="mx-4 mt-4 mb-5 rounded-2xl bg-[#fff8dc] border-2 border-[#d4af37] shadow px-3 py-2.5 flex items-center gap-2">
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
                  <button onClick={() => setEditingName(true)} className="flex-1 text-center font-display text-lg text-[#1a1208] underline decoration-[#d4af37]/70 underline-offset-4">
                    {name || "Tap to set name"}
                  </button>
                )}
                <Pencil className="h-4 w-4 text-[#8b6508]" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

            {/* Rotation slots — 2-3 photos */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                const url = slots[i];
                const active = i === activeIdx && !!url;
                return (
                  <button
                    key={i}
                    onClick={() => url ? setActiveIdx(i) : onPickPhoto(i)}
                    onDoubleClick={() => onPickPhoto(i)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 ${active ? "border-[#d4af37] ring-2 ring-[#d4af37]/40" : "border-[#d4af37]/40 border-dashed bg-white/60"}`}
                    aria-label={`Photo slot ${i + 1}`}
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-[#8b6508]">
                        <Plus className="h-5 w-5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-[#8b6508]/70 mt-1">Tap a thumbnail to rotate · double-tap to replace</p>

            {/* Bottom 3-button row — Download QR (half-out), + (center), Share | QR */}
            <div className="relative mt-5">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {/* Download — offset half-outside the poster like Canva ref */}
                <button
                  disabled={busy}
                  onClick={downloadPoster}
                  className="-translate-y-2 rounded-full bg-emerald-600 text-white px-5 py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" /> Download QR
                </button>

                <div className="grid place-items-center">
                  <button
                    onClick={() => setSetupOpen(true)}
                    className="h-14 w-14 rounded-full bg-emerald-600 text-white grid place-items-center shadow-lg active:scale-95"
                    aria-label="Setup actions"
                  >
                    <Plus className="h-7 w-7" />
                  </button>
                </div>

                <button
                  disabled={busy}
                  onClick={sharePoster}
                  className="-translate-y-2 rounded-full bg-white border-2 border-[#d4af37] text-[#1a1208] px-5 py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" /> Share | QR
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-[#8b6508]/80 pt-3">
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
