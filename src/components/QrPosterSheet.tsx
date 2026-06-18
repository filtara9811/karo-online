import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Download, Globe, Upload, Pencil, X, Plus, Camera, Image as ImageIcon, Film, Link2 } from "lucide-react";
import { toast } from "sonner";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { DownloadShareSheet } from "@/components/DownloadShareSheet";
import { PanZoomFrame, type Transform } from "@/components/PanZoomFrame";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import karoLogoAsset from "@/assets/karo-logo.png.asset.json";
import karoCoverAsset from "@/assets/karo-cover.png.asset.json";

const MAX_SLOTS = 3;
const LOGO_URL = karoLogoAsset.url;
const DEFAULT_COVER_URL = karoCoverAsset.url;

type MediaItem = { type: "image" | "video" | "url"; src: string; poster?: string };

function detectProvider(url: string): "youtube" | "instagram" | "video" {
  if (/youtu\.?be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  return "video";
}
function ytEmbed(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${m[1]}` : url;
}

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
  const { user, profile } = useAuth();
  const [name, setName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [transforms, setTransforms] = useState<Record<number, Transform>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [chooserIdx, setChooserIdx] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const replaceIdx = useRef<number | null>(null);
  const replaceKind = useRef<"image" | "video">("image");

  const landingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/s/${encodeURIComponent(code || "")}`
    : `https://karoonline.in/s/${code}`;
  const active = media[activeIdx];
  const activeBgSrc = active?.type === "image" ? active.src : (media[0]?.type === "image" ? media[0].src : DEFAULT_COVER_URL);
  const activeTransform = useMemo(() => transforms[activeIdx] ?? { x: 0, y: 0, scale: 1 }, [transforms, activeIdx]);

  useEffect(() => { if (open) setName(defaultName); }, [open, defaultName]);
  useEffect(() => { setAvatarUrl(profile?.avatar_url ?? null); }, [profile?.avatar_url]);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("poster_bg_url, poster_bg_urls, poster_media, poster_bg_transforms")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { poster_bg_url?: string; poster_bg_urls?: string[]; poster_media?: MediaItem[]; poster_bg_transforms?: Record<number, Transform> } | null;
      const m: MediaItem[] = Array.isArray(d?.poster_media) && d!.poster_media!.length
        ? d!.poster_media!.filter((x) => x?.src)
        : (Array.isArray(d?.poster_bg_urls) ? d!.poster_bg_urls!.filter(Boolean) : (d?.poster_bg_url ? [d.poster_bg_url] : []))
            .map((src) => ({ type: "image" as const, src }));
      setMedia(m.slice(0, MAX_SLOTS));
      setTransforms(d?.poster_bg_transforms ?? {});
      setActiveIdx(0);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  // QR with center logo (no letter fallback)
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
        const size = 160;
        const cx = cnv.width / 2;
        const cy = cnv.height / 2;
        ctx.fillStyle = "#fdf6e3";
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 12, 0, Math.PI * 2); ctx.stroke();
        try {
          const logo = await loadImage(LOGO_URL);
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
          ctx.restore();
        } catch { /* leave the gold ring blank */ }
      }
      if (!cancelled) setQrDataUrl(cnv.toDataURL("image/png"));
    })();
    return () => { cancelled = true; };
  }, [open, landingUrl]);

  const persist = useCallback(async (nextMedia: MediaItem[], nextTransforms?: Record<number, Transform>) => {
    if (!user?.id) return;
    const firstImage = nextMedia.find((x) => x.type === "image")?.src ?? null;
    const urls = nextMedia.filter((x) => x.type === "image").map((x) => x.src);
    await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: {
        poster_media: nextMedia,
        poster_bg_urls: urls,
        poster_bg_url: firstImage,
        poster_bg_transforms: nextTransforms ?? transforms,
      },
    } as never);
  }, [user?.id, transforms]);

  const onPickFile = (idx: number, kind: "image" | "video") => {
    replaceIdx.current = idx;
    replaceKind.current = kind;
    if (fileRef.current) {
      fileRef.current.accept = kind === "video" ? "video/*" : "image/*";
      fileRef.current.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const limit = replaceKind.current === "video" ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > limit) { toast.error(`File too large (max ${limit / 1024 / 1024} MB)`); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const item: MediaItem = { type: replaceKind.current, src };
      const idx = replaceIdx.current ?? media.length;
      const next = [...media];
      if (idx >= next.length) next.push(item); else next[idx] = item;
      const trimmed = next.slice(0, MAX_SLOTS);
      setMedia(trimmed);
      setActiveIdx(Math.min(idx, trimmed.length - 1));
      void persist(trimmed);
    };
    reader.readAsDataURL(file);
  };

  const onUrlAdd = () => {
    if (!urlInput.trim() || chooserIdx === null) return;
    const item: MediaItem = { type: "url", src: urlInput.trim() };
    const next = [...media];
    if (chooserIdx >= next.length) next.push(item); else next[chooserIdx] = item;
    const trimmed = next.slice(0, MAX_SLOTS);
    setMedia(trimmed);
    setActiveIdx(Math.min(chooserIdx, trimmed.length - 1));
    setUrlInput("");
    setChooserIdx(null);
    void persist(trimmed);
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !user?.id) return;
    if (f.size > 4 * 1024 * 1024) { toast.error("Avatar too large (max 4 MB)"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result || "");
      setAvatarUrl(url);
      await supabase.from("customers").update({ avatar_url: url }).eq("user_id", user.id);
    };
    reader.readAsDataURL(f);
  };

  const renderPosterBlob = async (): Promise<Blob | null> => {
    const W = 1080, H = 1620;
    const cnv = document.createElement("canvas");
    cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext("2d"); if (!ctx) return null;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fdf6e3"); grad.addColorStop(1, "#f4e9c8");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 14; ctx.strokeRect(28, 28, W - 56, H - 56);

    const photoH = Math.round(H * 0.62);
    const photoX = 60, photoY = 60, photoW = W - 120;
    const bgSrc = activeBgSrc;
    if (bgSrc) {
      const img = await loadImage(bgSrc).catch(() => null);
      if (img) {
        const r = Math.max(photoW / img.width, photoH / img.height) * (activeTransform.scale || 1);
        const dw = img.width * r, dh = img.height * r;
        ctx.save();
        roundRect(ctx, photoX, photoY, photoW, photoH, 36); ctx.clip();
        ctx.drawImage(img, photoX + (photoW - dw) / 2 + activeTransform.x, photoY + (photoH - dh) / 2 + activeTransform.y, dw, dh);
        ctx.restore();
      }
    }
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 8;
    roundRect(ctx, photoX, photoY, photoW, photoH, 36); ctx.stroke();

    const qrSize = 620;
    const qrX = (W - qrSize) / 2;
    const qrY = photoY + photoH - Math.round(qrSize * 0.30);
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

    const capY = qrY + qrSize + 60;
    ctx.fillStyle = "#fff8dc"; ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 5;
    roundRect(ctx, 120, capY, W - 240, 140, 32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1a1208";
    ctx.font = "800 64px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText((name || "Karo Online").slice(0, 30), W / 2, capY + 72);
    ctx.font = "italic 26px 'Times New Roman', serif";
    ctx.fillStyle = "#8b6508";
    ctx.fillText(`Karo Online · Code ${code}`, W / 2, capY + 112);

    return await new Promise<Blob | null>((res) => cnv.toBlob((b) => res(b), "image/png", 0.95));
  };

  const sharePoster = async () => {
    const blob = await renderPosterBlob();
    if (!blob) throw new Error("Render failed");
    const file = new File([blob], `karo-${code}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean; };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: "Karo Online", text: `Scan · ${landingUrl}` });
      return;
    }
    if (nav.share) { await nav.share({ title: "Karo Online", text: `Scan · ${landingUrl}`, url: landingUrl }); return; }
    await navigator.clipboard.writeText(landingUrl);
    toast.success("Link copied");
  };

  const downloadPoster = async () => {
    const blob = await renderPosterBlob();
    if (!blob) throw new Error("Render failed");
    const filename = `karo-online-qr-${code || "poster"}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean; };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: "Karo Online QR" }); return; } catch { /* fall through */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
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
            <div className="relative rounded-3xl border-2 border-[#d4af37] bg-[#fdf6e3] shadow-lg overflow-hidden">
              {/* Hero media — pan/zoom for image, native player for video/url */}
              <div className="block w-full relative" style={{ aspectRatio: "4 / 3" }}>
                {active?.type === "video" ? (
                  <video src={active.src} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : active?.type === "url" ? (
                  detectProvider(active.src) === "youtube" ? (
                    <iframe src={ytEmbed(active.src)} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                  ) : (
                    <iframe src={active.src} className="absolute inset-0 w-full h-full" allowFullScreen />
                  )
                ) : (
                  <PanZoomFrame
                    src={activeBgSrc}
                    alt="Shop"
                    className="absolute inset-0 w-full h-full"
                    transform={activeTransform}
                    onChange={(t) => {
                      const next = { ...transforms, [activeIdx]: t };
                      setTransforms(next);
                      void persist(media, next);
                    }}
                  />
                )}
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-[10px] uppercase tracking-widest text-amber-200 font-bold pointer-events-none">
                  Karo Online
                </span>
                <button
                  onClick={() => setChooserIdx(activeIdx)}
                  className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-black/55 text-white shadow"
                  aria-label="Replace media"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="relative -mt-16 grid place-items-center px-6">
                <div className="bg-[#fdf6e3] p-2.5 rounded-2xl border-2 border-[#d4af37] shadow-2xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR code" className="w-52 h-52 block" />
                  ) : (
                    <div className="w-52 h-52 bg-[#f4e9c8] animate-pulse rounded" />
                  )}
                </div>
              </div>

              {/* Avatar + bold name strip */}
              <div className="mx-4 mt-4 mb-5 rounded-2xl bg-[#fff8dc] border-2 border-[#d4af37] shadow px-3 py-2.5 flex items-center gap-2">
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  className="h-10 w-10 rounded-full overflow-hidden border-2 border-[#d4af37] bg-white grid place-items-center shrink-0"
                  aria-label="Set merchant photo"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Merchant" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-4 w-4 text-[#8b6508]" />
                  )}
                </button>
                {editingName ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 40))}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                    className="flex-1 bg-transparent text-[#1a1208] font-display font-extrabold text-lg tracking-tight outline-none text-center"
                  />
                ) : (
                  <button onClick={() => setEditingName(true)} className="flex-1 text-center font-display font-extrabold tracking-tight text-lg text-[#1a1208] underline decoration-[#d4af37]/70 underline-offset-4">
                    {name || "Tap to set name"}
                  </button>
                )}
                <Pencil className="h-4 w-4 text-[#8b6508]" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />

            {/* Multi-media slots */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                const item = media[i];
                const isActive = i === activeIdx && !!item;
                return (
                  <button
                    key={i}
                    onClick={() => item ? setActiveIdx(i) : setChooserIdx(i)}
                    onDoubleClick={() => setChooserIdx(i)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isActive ? "border-[#d4af37] ring-2 ring-[#d4af37]/40" : "border-[#d4af37]/40 border-dashed bg-white/60"}`}
                    aria-label={`Slot ${i + 1}`}
                  >
                    {item?.type === "image" ? (
                      <img src={item.src} alt="" className="w-full h-full object-cover" />
                    ) : item?.type === "video" ? (
                      <>
                        <video src={item.src} muted className="w-full h-full object-cover" />
                        <Film className="absolute top-1 right-1 h-3 w-3 text-white drop-shadow" />
                      </>
                    ) : item?.type === "url" ? (
                      <div className="w-full h-full grid place-items-center bg-gradient-to-br from-rose-100 to-amber-100">
                        <Link2 className="h-5 w-5 text-rose-700" />
                      </div>
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

            {/* Split bottom pill — Download/Share | Link Menu */}
            <div className="mt-5 rounded-full border-2 border-[#d4af37] bg-white shadow-lg overflow-hidden grid grid-cols-2 divide-x-2 divide-[#d4af37]">
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center justify-center gap-2 py-3.5 font-bold text-[#1a1208] active:bg-[#fff8dc]"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={() => setSetupOpen(true)}
                className="flex items-center justify-center gap-2 py-3.5 font-bold text-[#1a1208] active:bg-[#fff8dc]"
              >
                <Globe className="h-4 w-4" /> Link Menu
              </button>
            </div>
            <p className="text-[10px] text-center text-[#8b6508]/80 pt-3">
              Print and stick at your shop. Scans open your trusted Karo Online page.
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Media chooser */}
      <Drawer open={chooserIdx !== null} onOpenChange={(v) => !v && setChooserIdx(null)}>
        <DrawerContent className="bg-gradient-to-b from-[#fdf6e3] to-[#f4e9c8] border-t-2 border-[#d4af37]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-[#1a1208] font-display text-lg">Choose media</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ChooserTile icon={<ImageIcon className="h-6 w-6" />} label="Photo" onClick={() => { const i = chooserIdx; setChooserIdx(null); if (i !== null) onPickFile(i, "image"); }} />
              <ChooserTile icon={<Film className="h-6 w-6" />} label="Video" onClick={() => { const i = chooserIdx; setChooserIdx(null); if (i !== null) onPickFile(i, "video"); }} />
            </div>
            <div className="rounded-2xl border border-[#d4af37]/40 bg-white/80 p-3">
              <label className="text-xs font-bold text-[#8b6508]">YouTube / Instagram / video URL</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtu.be/…"
                  className="flex-1 rounded-lg border border-[#d4af37]/40 bg-white px-2 py-2 text-sm"
                />
                <button onClick={onUrlAdd} className="rounded-lg bg-amber-600 text-white px-3 font-bold text-sm">Add</button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <DownloadShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        onDownload={downloadPoster}
        onShare={sharePoster}
      />

      <MerchantLinksSetupSheet open={setupOpen} onOpenChange={setSetupOpen} />
    </>
  );
}

function ChooserTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-white border-2 border-[#d4af37] py-5 grid place-items-center gap-2 active:scale-95">
      <div className="h-12 w-12 grid place-items-center rounded-full bg-amber-100 text-amber-700">{icon}</div>
      <span className="font-bold text-[#1a1208]">{label}</span>
    </button>
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
