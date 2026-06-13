import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ImagePlus, Plus, Trash2 } from "lucide-react";

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  /** Either gradient string or image URL */
  bg: string;
  isImage?: boolean;
};

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "festive",
    title: "Festive Gold Sale",
    subtitle: "Up to 40% off · Diwali special",
    bg: "linear-gradient(135deg, #fff3c8 0%, #f5d97a 50%, #d4af37 100%)",
  },
  {
    id: "bestseller",
    title: "Top Bestsellers",
    subtitle: "Trending picks this week",
    bg: "linear-gradient(135deg, #fffaeb 0%, #fdf3c8 60%, #f5d97a 100%)",
  },
  {
    id: "wholesale",
    title: "Wholesale Hub",
    subtitle: "Bulk pricing for retailers",
    bg: "linear-gradient(135deg, #fbf3d9 0%, #f5d97a 55%, #b8860b 100%)",
  },
];

/**
 * Auto-advancing horizontally swipeable banner carousel.
 * Long-press any banner to open the inline editor sheet.
 */
export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);
  const [idx, setIdx] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(id);
  }, [banners.length]);

  // Sync scroll to active index
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (child) {
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
    }
  }, [idx]);

  const onPressStart = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setEditorOpen(true), 500);
  };
  const onPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1 overscroll-x-contain"
          onMouseDown={onPressStart}
          onMouseUp={onPressEnd}
          onMouseLeave={onPressEnd}
          onTouchStart={onPressStart}
          onTouchEnd={onPressEnd}
        >
          {banners.map((b, i) => (
            <article
              key={b.id}
              className="snap-center flex-shrink-0 w-[88%] h-24 rounded-2xl border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_8px_22px_-10px_rgba(212,175,55,0.5)] overflow-hidden relative"
              style={
                b.isImage
                  ? { backgroundImage: `url(${b.bg})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: b.bg }
              }
            >
              {b.isImage && <div className="absolute inset-0 bg-black/30" />}
              <div className="relative h-full flex flex-col justify-center px-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="h-3 w-3 text-[#8b6508]" />
                  <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-[color:oklch(0.32_0.10_60)]">
                    {i + 1} / {banners.length}
                  </span>
                </div>
                <h4
                  className={`font-display font-bold leading-tight text-base ${
                    b.isImage ? "text-white" : "text-[color:oklch(0.18_0.06_18)]"
                  }`}
                >
                  {b.title}
                </h4>
                <p
                  className={`text-[10px] font-medium ${
                    b.isImage ? "text-white/85" : "text-[color:oklch(0.32_0.08_60)]"
                  }`}
                >
                  {b.subtitle}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1 mt-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIdx(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-[#d4af37]" : "w-1.5 bg-[color:oklch(0.78_0.14_82/0.4)]"
              }`}
            />
          ))}
        </div>
      </div>

      {editorOpen && (
        <BannerEditorSheet
          banners={banners}
          onSave={setBanners}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}

function BannerEditorSheet({
  banners,
  onSave,
  onClose,
}: {
  banners: Banner[];
  onSave: (b: Banner[]) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<Banner[]>(banners);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setList((prev) => [
      ...prev,
      {
        id: `banner-${Date.now()}`,
        title: "Custom Banner",
        subtitle: "Tap to edit",
        bg: url,
        isImage: true,
      },
    ]);
  };

  const removeBanner = (id: string) =>
    setList((prev) => prev.filter((b) => b.id !== id));

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.25s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)] font-bold">
              ✦ Customize ✦
            </p>
            <h3 className="font-display text-base text-gold-gradient font-bold leading-tight">
              Banner Editor
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
          {list.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-[color:oklch(0.78_0.14_82/0.4)] bg-white p-2"
            >
              <div
                className="h-12 w-20 rounded-lg border border-[color:oklch(0.78_0.14_82/0.4)]"
                style={
                  b.isImage
                    ? { backgroundImage: `url(${b.bg})`, backgroundSize: "cover" }
                    : { background: b.bg }
                }
              />
              <div className="flex-1 min-w-0">
                <p className="font-display text-xs font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                  {b.title}
                </p>
                <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] truncate">
                  {b.subtitle}
                </p>
              </div>
              <button
                onClick={() => removeBanner(b.id)}
                aria-label="Remove"
                className="h-8 w-8 grid place-items-center rounded-full bg-rose-50 text-rose-600 active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] bg-white/60 py-4 cursor-pointer active:scale-[0.98]">
            <ImagePlus className="h-5 w-5 text-[#d4af37]" />
            <span className="font-display text-xs font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider">
              Add Image Banner
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
            />
          </label>
        </div>

        <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
          <button
            onClick={() => {
              onSave(list);
              onClose();
            }}
            className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
            style={{
              background:
                "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
            }}
          >
            <Plus className="inline h-4 w-4 mr-1" strokeWidth={3} /> Save Banners
          </button>
        </div>
      </div>
    </div>
  );
}
