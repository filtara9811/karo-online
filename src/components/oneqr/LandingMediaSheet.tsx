import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, Video, ImagePlus, Link2, Film, Plus, Play, Tag, Replace, LockKeyhole, Youtube, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createPremiumLinksOrder, verifyPremiumLinks } from "@/lib/premium-links.functions";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { getInstagramFeed, getPinterestFeed } from "@/lib/social-feed.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-client";
import { useAuth } from "@/hooks/use-auth";
import type { LandingMediaItem, VideoProduct } from "@/lib/landing-types";
import { jsonBytes, sanitizeMediaList, sanitizeProduct, uploadImage, withTimeout } from "@/lib/media-upload";
import { ProductEditor } from "@/components/ProductEditor";
import { fromEditorProduct, toEditorProduct } from "./video-product-adapter";
import { CTA_PRESETS } from "@/components/landing/product-cta";
import { SheetShell } from "./SheetShell";
import { loadLinkSettings, saveLinkSettings } from "./landing-settings";


type MediaItem = LandingMediaItem;

const MAX_SLOTS = 10;
const MAX_PRODUCTS = 10;
const BUCKET = "business-cards";

const newProduct = (): VideoProduct => ({
  id: `vp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  price: "",
  image: null,
  description: "",
  enquiry: "",
  url: "",
  rating: 4.8,
});

/**
 * Video studio: upload / link videos and attach 1-10 products to each one.
 * Products render as a shoppable rail under the video on the landing page.
 */
export function LandingMediaSheet({
  open,
  onClose,
  onSaved,
  projectSlug = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** QR project being edited — keeps each shop's videos separate. */
  projectSlug?: string | null;
}) {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [editing, setEditing] = useState<VideoProduct | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const startOrder = useServerFn(createPremiumLinksOrder);
  const verifyOrder = useServerFn(verifyPremiumLinks);
  const loadYoutube = useServerFn(getYoutubeFeed);

  // ── Dynamic YouTube channel / playlist sync ───────────────────────────
  const [ytSource, setYtSource] = useState("");
  const [ytEnabled, setYtEnabled] = useState(false);
  const [ytProducts, setYtProducts] = useState<Record<string, VideoProduct[]>>({});
  const [ytVideos, setYtVideos] = useState<{ id: string; title: string; thumbnail: string | null }[]>([]);
  const [ytActive, setYtActive] = useState<string | null>(null);
  const [ytBusy, setYtBusy] = useState(false);

  const syncYoutube = async (silent = false) => {
    const src = ytSource.trim();
    if (!src) { if (!silent) toast.error("Channel ID / playlist link daalein"); return; }
    setYtBusy(true);
    try {
      const res = await loadYoutube({ data: { source: src, limit: 25 } });
      if (!res.ok) { if (!silent) toast.error(res.error ?? "YouTube se videos nahi mili"); return; }
      setYtVideos(res.videos.map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail })));
      if (!silent) toast.success(`${res.videos.length} videos mil gayi — Publish dabayein`);
    } catch (e) {
      if (!silent) toast.error((e as Error).message || "Sync fail hua");
    } finally {
      setYtBusy(false);
    }
  };

  // ── Dynamic Instagram / Pinterest sync (same UX as YouTube) ───────────
  const loadInstagram = useServerFn(getInstagramFeed);
  const loadPinterest = useServerFn(getPinterestFeed);

  type SocialKey = "ig" | "pin";
  type SocialThumb = { id: string; title: string; thumbnail: string | null };
  const [socialSource, setSocialSource] = useState<Record<SocialKey, string>>({ ig: "", pin: "" });
  const [socialEnabled, setSocialEnabled] = useState<Record<SocialKey, boolean>>({ ig: false, pin: false });
  const [socialProducts, setSocialProducts] = useState<Record<SocialKey, Record<string, VideoProduct[]>>>({ ig: {}, pin: {} });
  const [socialItems, setSocialItems] = useState<Record<SocialKey, SocialThumb[]>>({ ig: [], pin: [] });
  const [socialBusy, setSocialBusy] = useState<SocialKey | null>(null);
  const [socialActive, setSocialActive] = useState<{ key: SocialKey; id: string } | null>(null);

  const syncSocial = async (key: SocialKey) => {
    const src = socialSource[key].trim();
    if (!src) { toast.error(key === "ig" ? "Instagram @handle ya link daalein" : "Pinterest username ya board link daalein"); return; }
    setSocialBusy(key);
    try {
      const fetcher = key === "ig" ? loadInstagram : loadPinterest;
      const res = await fetcher({ data: { source: src, limit: 24 } });
      if (!res.ok) {
        toast.error(
          res.error === "no_media_found"
            ? "Kuch nahi mila — account private ho sakta hai"
            : res.error === "invalid_source"
              ? "Link sahi nahi hai"
              : res.error ?? "Sync fail hua",
        );
        return;
      }
      setSocialItems((p) => ({
        ...p,
        [key]: (res.items as { id: string; title: string; kind: string; src: string; poster: string | null }[]).map(
          (it) => ({ id: it.id, title: it.title, thumbnail: it.poster ?? (it.kind === "image" ? it.src : null) }),
        ),
      }));
      toast.success(`${res.items.length} items mil gaye — Publish dabayein`);
    } catch (e) {
      toast.error((e as Error).message || "Sync fail hua");
    } finally {
      setSocialBusy(null);
    }
  };

  /** Razorpay checkout for the extra-video pack; unlocks instantly on success. */
  const payToUnlock = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const order = await startOrder();
      if (!order.ok) { toast.error(order.error ?? "Payment start nahi hua"); return; }
      const resp = await openRazorpayCheckout({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        name: "Karo Online",
        description: `Video pack unlock · ₹${order.amount_inr}`,
      });
      const ver = await verifyOrder({ data: { ...resp, amount_inr: order.amount_inr } });
      if (!ver.ok) { toast.error(ver.error ?? "Verification fail"); return; }
      toast.success("Unlock ho gaya — ab zyada videos add karein");
      setUnlockOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Payment cancel ho gaya");
    } finally {
      setPaying(false);
    }
  };
  const fileRef = useRef<HTMLInputElement | null>(null);
  const kindRef = useRef<"image" | "video">("video");

  useEffect(() => {
    if (!open || !user?.id) return;
    const uid = user.id;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const d = await loadLinkSettings<{
        poster_media?: MediaItem[];
        poster_bg_urls?: string[];
        poster_bg_url?: string;
        yt_source?: string | null;
        yt_enabled?: boolean | null;
        yt_products?: Record<string, VideoProduct[]> | null;
        ig_source?: string | null;
        ig_enabled?: boolean | null;
        ig_products?: Record<string, VideoProduct[]> | null;
        pin_source?: string | null;
        pin_enabled?: boolean | null;
        pin_products?: Record<string, VideoProduct[]> | null;
      }>(
        uid,
        projectSlug,
        "poster_media, poster_bg_urls, poster_bg_url, yt_source, yt_enabled, yt_products, ig_source, ig_enabled, ig_products, pin_source, pin_enabled, pin_products",
      );
      if (cancelled) return;
      setYtSource(d?.yt_source ?? "");
      setYtEnabled(!!d?.yt_enabled);
      setYtProducts((d?.yt_products && typeof d.yt_products === "object" ? d.yt_products : {}) as Record<string, VideoProduct[]>);
      const asMap = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, VideoProduct[]>) : {});
      setSocialSource({ ig: d?.ig_source ?? "", pin: d?.pin_source ?? "" });
      setSocialEnabled({ ig: !!d?.ig_enabled, pin: !!d?.pin_enabled });
      setSocialProducts({ ig: asMap(d?.ig_products), pin: asMap(d?.pin_products) });
      setSocialItems({ ig: [], pin: [] });
      setSocialActive(null);
      const list: MediaItem[] = Array.isArray(d?.poster_media) && d!.poster_media!.length
        ? d!.poster_media!.filter((x) => x?.src)
        : (Array.isArray(d?.poster_bg_urls) ? d!.poster_bg_urls!.filter(Boolean) : (d?.poster_bg_url ? [d.poster_bg_url] : []))
            .map((src) => ({ type: "image" as const, src }));

      // Legacy rows carry base64 images inside JSONB (multi-MB) which makes every
      // publish time out. Move them to storage once, then keep only URLs.
      const { items, changed } = await sanitizeMediaList(uid, list.slice(0, MAX_SLOTS));
      if (cancelled) return;
      setMedia(items);
      setActive(0);
      setDirty(changed);
      setLoading(false);
      if (changed) toast.info("Purani heavy images storage me shift kar di — Publish dabayein");
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, user?.id, projectSlug]);

  const persist = useCallback(async (next: MediaItem[]) => {
    if (!user?.id) { toast.error("Login karein"); return false; }
    setSaving(true);
    try {
      const { items } = await sanitizeMediaList(user.id, next);
      const images = items.filter((x) => x.type === "image").map((x) => x.src);
      const payload = {
        poster_media: items,
        poster_bg_urls: images,
        poster_bg_url: images[0] ?? null,
        yt_source: ytSource.trim() || null,
        yt_enabled: ytEnabled && !!ytSource.trim(),
        yt_products: ytProducts,
        ig_source: socialSource.ig.trim() || null,
        ig_enabled: socialEnabled.ig && !!socialSource.ig.trim(),
        ig_products: socialProducts.ig,
        pin_source: socialSource.pin.trim() || null,
        pin_enabled: socialEnabled.pin && !!socialSource.pin.trim(),
        pin_products: socialProducts.pin,
      };
      const size = jsonBytes(payload);
      if (size > 512 * 1024) {
        toast.error("Media data bahut bada hai — kuch items hata kar dobara try karein");
        return false;
      }
      const { error } = await withTimeout(
        saveLinkSettings(payload, projectSlug),
        12_000,
        "Server slow hai — dobara Publish dabayein",
      );
      if (error) { toast.error("Save nahi hua: " + error.message); return false; }
      setMedia(items);
      setDirty(false);
      onSaved?.();
      toast.success("Live ho gaya ✅");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish fail hua");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSaved, user?.id, ytSource, ytEnabled, ytProducts, socialSource, socialEnabled, socialProducts]);

  const update = (next: MediaItem[]) => {
    setMedia(next.slice(0, MAX_SLOTS));
    setDirty(true);
  };

  const pick = (kind: "image" | "video", replacing?: number) => {
    if (media.length >= MAX_SLOTS && replacing === undefined) { setUnlockOpen(true); return; }
    setReplaceIndex(replacing ?? null);
    kindRef.current = kind;
    if (fileRef.current) {
      fileRef.current.accept = kind === "video" ? "video/*" : "image/*";
      fileRef.current.click();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!user?.id) { toast.error("Login karein"); return; }
    if (media.length >= MAX_SLOTS && replaceIndex === null) { setUnlockOpen(true); return; }
    const isVideo = kindRef.current === "video";
    const limit = isVideo ? 90 * 1024 * 1024 : 12 * 1024 * 1024;
    if (f.size > limit) { toast.error(`File bahut badi hai (max ${Math.round(limit / 1024 / 1024)} MB)`); return; }

    setSaving(true);
    try {
      if (isVideo) {
        const path = `${user.id}/video-${Date.now()}.${(f.name.split(".").pop() || "mp4").toLowerCase()}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
          upsert: false,
          contentType: f.type || "video/mp4",
          cacheControl: "31536000",
        });
        if (error) throw new Error(error.message);
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
         const item: MediaItem = { type: "video", src: data.publicUrl, products: replaceIndex === null ? [] : (media[replaceIndex]?.products ?? []) };
         if (replaceIndex === null) { update([...media, item]); setActive(media.length); }
         else { update(media.map((m, i) => i === replaceIndex ? item : m)); setActive(replaceIndex); }
        toast.success("Video add ho gaya — ab products link karein");
      } else {
        // Photos also go to storage (compressed) — never base64 in the database.
        const url = await uploadImage(user.id, f);
         const item: MediaItem = { type: "image", src: url, products: replaceIndex === null ? [] : (media[replaceIndex]?.products ?? []) };
         if (replaceIndex === null) { update([...media, item]); setActive(media.length); }
         else { update(media.map((m, i) => i === replaceIndex ? item : m)); setActive(replaceIndex); }
        toast.success("Photo add ho gaya");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fail hua");
    } finally {
      setReplaceIndex(null);
      setSaving(false);
    }
  };


  const addUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    if (media.length >= MAX_SLOTS) { toast.error(`Max ${MAX_SLOTS} media`); return; }
    setUrlInput("");
    update([...media, { type: "url", src: v, products: [] }]);
    setActive(media.length);
    toast.success("Video link add ho gaya");
  };

  const current = media[Math.min(active, Math.max(media.length - 1, 0))];
  /**
   * When a synced YouTube video is selected, the product editor works on that
   * video's tag list instead of the currently selected uploaded slot.
   */
  const products = useMemo(
    () =>
      ytActive
        ? (ytProducts[ytActive] ?? [])
        : socialActive
          ? (socialProducts[socialActive.key][socialActive.id] ?? [])
          : (current?.products ?? []),
    [current, socialActive, socialProducts, ytActive, ytProducts],
  );

  const setProducts = (list: VideoProduct[]) => {
    if (ytActive) {
      setYtProducts((p) => ({ ...p, [ytActive]: list }));
      setDirty(true);
      return;
    }
    if (socialActive) {
      setSocialProducts((p) => ({
        ...p,
        [socialActive.key]: { ...p[socialActive.key], [socialActive.id]: list },
      }));
      setDirty(true);
      return;
    }
    update(media.map((m, i) => (i === active ? { ...m, products: list } : m)));
  };

  return (
    <>
      <SheetShell
      section="videos"
        open={open}
        onClose={onClose}
        title="Video studio"
        subtitle={`Video + products link karein · ${media.length}/${MAX_SLOTS}`}
        footer={
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => pick("video")}
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-[12px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
              >
                <Video className="h-4 w-4" /> Video
              </button>
              <button
                onClick={() => pick("image")}
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[12px] font-extrabold text-slate-700 active:scale-[0.98] disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" /> Photo
              </button>
            </div>
            <button
              onClick={() => persist(media)}
              disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-[14px] font-extrabold text-white shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Publishing…" : dirty ? "Publish changes" : "Published"}
            </button>
          </div>
        }
      >
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
          <Link2 className="h-4 w-4 shrink-0 text-amber-600" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="YouTube / Instagram video link"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
          />
          <button
            onClick={addUrl}
            className="h-8 shrink-0 rounded-full bg-amber-500 px-3 text-[11px] font-extrabold text-white active:scale-95"
          >
            Add
          </button>
        </div>

        {/* ── Dynamic YouTube channel / playlist sync ───────────────────── */}
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-red-700">
              <Youtube className="h-4 w-4" /> YouTube auto-feed
            </span>
            <button
              type="button"
              onClick={() => { setYtEnabled((v) => !v); setDirty(true); }}
              className={`relative h-6 w-11 rounded-full transition ${ytEnabled ? "bg-red-500" : "bg-slate-300"}`}
              aria-label="YouTube feed toggle"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ytEnabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-red-900/70">
            Channel ID (UC…), @handle ya playlist link daalein — aapke saare shorts landing page par apne aap aa jayenge.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-white px-2.5 py-2 focus-within:border-red-400">
            <Youtube className="h-4 w-4 shrink-0 text-red-500" />
            <input
              value={ytSource}
              onChange={(e) => { setYtSource(e.target.value); setDirty(true); }}
              placeholder="@karoonline / UC… / playlist link"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={() => void syncYoutube()}
              disabled={ytBusy}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-red-500 px-3 text-[11px] font-extrabold text-white active:scale-95 disabled:opacity-60"
            >
              {ytBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync
            </button>
          </div>

          {ytVideos.length > 0 && (
            <>
              <p className="mt-2 text-[10px] font-bold text-red-900/70">
                {ytVideos.length} videos · video tap karke uske products tag karein
              </p>
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ytVideos.map((v) => {
                  const tagged = ytProducts[v.id]?.length ?? 0;
                  const on = ytActive === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setYtActive(on ? null : v.id)}
                      className={`relative h-24 w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-900 active:scale-95 ${on ? "border-red-500" : "border-transparent"}`}
                    >
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-white/70"><Play className="h-5 w-5" /></span>
                      )}
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[8.5px] font-bold text-white">
                        {tagged} <Tag className="inline h-2.5 w-2.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
              {ytActive && (
                <p className="mt-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-red-700">
                  Selected YouTube video ke products niche edit karein · dobara tap karke band karein
                </p>
              )}
            </>
          )}
        </div>

        {(["ig", "pin"] as const).map((key) => {
          const meta = key === "ig"
            ? { name: "Instagram auto-feed", ring: "border-fuchsia-200 bg-fuchsia-50/70", text: "text-fuchsia-900", btn: "bg-gradient-to-r from-fuchsia-600 to-orange-500", note: "text-fuchsia-900/70", ph: "@yourshop / instagram.com/yourshop", tint: "text-fuchsia-600", sel: "border-fuchsia-500" }
            : { name: "Pinterest auto-feed", ring: "border-rose-200 bg-rose-50/70", text: "text-rose-900", btn: "bg-rose-600", note: "text-rose-900/70", ph: "username / pinterest.com/username", tint: "text-rose-600", sel: "border-rose-500" };
          const items = socialItems[key];
          const map = socialProducts[key];
          return (
            <div key={key} className={`mt-3 rounded-2xl border p-3 ${meta.ring}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-extrabold uppercase tracking-wide ${meta.text}`}>{meta.name}</p>
                <button
                  type="button"
                  onClick={() => { setSocialEnabled((p) => ({ ...p, [key]: !p[key] })); setDirty(true); }}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors ${socialEnabled[key] ? (key === "ig" ? "bg-fuchsia-600" : "bg-rose-600") : "bg-slate-300"}`}
                  aria-label="toggle"
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${socialEnabled[key] ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2">
                {key === "ig"
                  ? <Instagram className={`h-4 w-4 shrink-0 ${meta.tint}`} />
                  : <Pin className={`h-4 w-4 shrink-0 ${meta.tint}`} />}
                <input
                  value={socialSource[key]}
                  onChange={(e) => { setSocialSource((p) => ({ ...p, [key]: e.target.value })); setDirty(true); }}
                  placeholder={meta.ph}
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => void syncSocial(key)}
                  disabled={socialBusy === key}
                  className={`flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-extrabold text-white active:scale-95 disabled:opacity-60 ${meta.btn}`}
                >
                  {socialBusy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync
                </button>
              </div>

              {items.length > 0 && (
                <>
                  <p className={`mt-2 text-[10px] font-bold ${meta.note}`}>
                    {items.length} items · tap karke uske products tag karein
                  </p>
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {items.map((v) => {
                      const tagged = map[v.id]?.length ?? 0;
                      const on = socialActive?.key === key && socialActive.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setYtActive(null); setSocialActive(on ? null : { key, id: v.id }); }}
                          className={`relative h-24 w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-900 active:scale-95 ${on ? meta.sel : "border-transparent"}`}
                        >
                          {v.thumbnail ? (
                            <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-white/70"><Play className="h-5 w-5" /></span>
                          )}
                          <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[8.5px] font-bold text-white">
                            {tagged} <Tag className="inline h-2.5 w-2.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}



        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
        ) : !current && !ytActive ? (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 py-10 text-center">
            <Film className="h-6 w-6 text-amber-600" />
            <p className="text-[12px] font-bold text-slate-700">Abhi koi video nahi</p>
            <p className="px-6 text-[11px] text-slate-500">Video upload karein ya link paste karein — phir 1 se 10 products link kar sakte hain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active player card */}
            <div className="relative aspect-[9/14] w-full overflow-hidden rounded-[26px] border border-black/10 bg-slate-900 shadow-lg">
              {ytActive ? (
                <img
                  src={ytVideos.find((v) => v.id === ytActive)?.thumbnail ?? ""}
                  alt="Selected YouTube video"
                  className="h-full w-full object-cover"
                />
              ) : current?.type === "image" ? (
                <img src={current.src} alt="Selected media" className="h-full w-full object-cover" />
              ) : current?.type === "video" ? (
                <video src={current.src} muted playsInline controls className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center px-6 text-center text-[11px] font-bold text-white/80">
                  <Play className="mx-auto mb-2 h-7 w-7" />
                  {current?.src}
                </span>
              )}


              {/* Product slots over the bottom of the player */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <AnimatePresence initial={false}>
                    {products.map((p) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative h-24 w-[74px] shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/10 backdrop-blur"
                      >
                        <button onClick={() => setEditing(p)} className="absolute inset-0">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-white/80"><Tag className="h-4 w-4" /></span>
                          )}
                        </button>
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[8.5px] font-bold text-white">
                          {p.name || "Product"}
                        </span>
                        <button
                          onClick={() => setProducts(products.filter((x) => x.id !== p.id))}
                          aria-label={`Remove ${p.name || "product"}`}
                          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white active:scale-90"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </motion.div>
                    ))}

                  </AnimatePresence>
                  {products.length < MAX_PRODUCTS && (
                    <button
                      onClick={() => setEditing(newProduct())}
                      className="grid h-24 w-[74px] shrink-0 place-items-center rounded-2xl border border-dashed border-white/70 bg-white/10 text-white backdrop-blur active:scale-95"
                    >
                      <span className="flex flex-col items-center gap-1">
                        <Plus className="h-5 w-5" />
                        <span className="text-[8.5px] font-bold">Add products</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Video rail + add new */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Aapki videos</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {media.map((m, i) => (
                  <div
                    key={`${m.src.slice(-24)}-${i}`}
                    className={`relative h-28 w-[86px] shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-900 ${i === active ? "border-amber-500" : "border-black/10"}`}
                  >
                    <button onClick={() => setActive(i)} className="absolute inset-0">
                      {m.type === "image" ? (
                        <img src={m.src} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                      ) : m.type === "video" ? (
                        <video src={m.src} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-white/80"><Play className="h-4 w-4" /></span>
                      )}
                    </button>
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 text-[9px] font-bold text-white">
                      {(m.products?.length ?? 0)} · {i + 1}
                    </span>
                    <button onClick={() => pick(m.type === "image" ? "image" : "video", i)} aria-label="Replace media" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white active:scale-90">
                      <Replace className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {media.length < MAX_SLOTS ? (
                  <button
                    onClick={() => pick("video")}
                    className="grid h-28 w-[86px] shrink-0 place-items-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 text-amber-700 active:scale-95"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-extrabold">Add new</span>
                    </span>
                  </button>
                ) : (
                  <button onClick={() => setUnlockOpen(true)} className="grid h-28 w-[86px] shrink-0 place-items-center rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 active:scale-95"><span className="flex flex-col items-center gap-1"><LockKeyhole className="h-5 w-5"/><span className="text-[9px] font-extrabold">Unlock more</span></span></button>
                )}
              </div>
            </div>

            {/* Button, link and stock for every linked product */}
            {products.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Button, link & stock</p>
                <div className="space-y-2.5">
                  {products.map((p) => {
                    const presetId = p.cta?.preset ?? "inquiry";
                    return (
                      <div key={`link-${p.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                        <p className="mb-1.5 truncate text-[11px] font-extrabold text-slate-700">{p.name || "Product"}</p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {CTA_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => setProducts(products.map((x) => (x.id === p.id
                                ? { ...x, cta: { ...(x.cta ?? {}), preset: preset.id, label: preset.label, color: preset.color } }
                                : x)))}
                              className="h-7 shrink-0 rounded-full px-2.5 text-[10.5px] font-extrabold text-white transition active:scale-95"
                              style={{ background: preset.color, opacity: presetId === preset.id ? 1 : 0.35 }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 focus-within:border-amber-400">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <input
                            value={p.cta?.url ?? p.url ?? ""}
                            onChange={(e) => setProducts(products.map((x) => (x.id === p.id
                              ? { ...x, url: e.target.value, cta: { ...(x.cta ?? {}), url: e.target.value } }
                              : x)))}
                            placeholder="Amazon / Flipkart / website link (khaali = WhatsApp)"
                            className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-900 outline-none"
                          />
                        </div>
                        <div className="mt-1.5 flex gap-2">
                          <input
                            value={p.quantity ?? ""}
                            onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, quantity: e.target.value } : x)))}
                            inputMode="numeric"
                            placeholder="Stock qty"
                            className="h-9 w-1/2 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] text-slate-900 outline-none focus:border-amber-400"
                          />
                          <input
                            value={p.badge ?? ""}
                            onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, badge: e.target.value } : x)))}
                            placeholder="Badge (New / Bestseller)"
                            className="h-9 w-1/2 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] text-slate-900 outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetShell>

      {editing && (
        <div className="fixed inset-0 z-[240]">
          <ProductEditor
            product={toEditorProduct(editing)}
            onClose={() => setEditing(null)}
            onSave={async (ep) => {
              const base = fromEditorProduct(editing, ep);
              if (!base.name.trim()) { toast.error("Product ka naam likhein"); return; }
              const clean = user?.id ? await sanitizeProduct(user.id, base).catch(() => base) : base;
              const exists = products.some((x) => x.id === clean.id);
              setProducts(
                exists
                  ? products.map((x) => (x.id === clean.id ? clean : x))
                  : [...products, clean].slice(0, MAX_PRODUCTS),
              );
              setEditing(null);
              toast.success("Product linked — Publish dabayein");
            }}
          />
        </div>
      )}
      {unlockOpen && (
        <div className="fixed inset-0 z-[260] grid place-items-end bg-black/60 p-3 backdrop-blur-sm" onClick={() => setUnlockOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><LockKeyhole className="h-6 w-6"/></div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">10 more videos unlock karein</h3>
            <p className="mt-1 text-sm text-slate-500">₹500 per pack · sirf ₹50 per additional video</p>
            <button
              type="button"
              onClick={payToUnlock}
              disabled={paying}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
            >
              {paying ? "Payment khul raha hai…" : "Pay & Unlock"}
            </button>
            <button onClick={() => setUnlockOpen(false)} className="mt-2 h-10 w-full text-sm font-bold text-slate-500">Not now</button>
          </div>
        </div>
      )}
    </>
  );
}

