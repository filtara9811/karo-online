import { useEffect, useRef, useState } from "react";
import { X, Mic, Camera, ShoppingCart, Check, Star } from "lucide-react";

export type VariationItem = {
  id: string;
  title: string;
  sub: string;
  price: string;
  img: string;
  tone?: "gold" | "green";
};

type Props = {
  open: boolean;
  category: string | null;
  vendorLabel?: string;
  items: VariationItem[];
  onClose: () => void;
  onSubmit: (payload: { cart: string[]; note: string; images: string[] }) => void;
};

const FILTER_TABS = ["Filter | wholesaler", "Filter | selver", "Filter | other"];
const VENDOR_TABS = [
  "Vander | wholesaler",
  "Vender | Retail",
  "Vender | Trader",
  "Vender | Trader",
  "Vender | Resalig",
  "Vender | Resaler",
  "Vender | manufacture",
];

export function VariationSheet({ open, category, vendorLabel, items, onClose, onSubmit }: Props) {
  const [cart, setCart] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-variation-open", "true");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.removeAttribute("data-variation-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setCart([items[0]?.id].filter(Boolean) as string[]);
      setNote("");
      setImages([]);
      setRecording(false);
    }
  }, [open, items]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 3).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string].slice(0, 3));
      reader.readAsDataURL(f);
    });
  };

  const toggleCart = (id: string) =>
    setCart((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[88vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-[color:oklch(0.78_0.14_82/0.25)] flex-shrink-0">
          <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)] underline underline-offset-4">
            Choice variations
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero card */}
          <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[color:oklch(0.55_0.10_82)] font-display italic">{vendorLabel ?? "Filter | wholesaler"}</p>
              <h4 className="font-display text-xl font-bold text-[color:oklch(0.25_0.05_85)] mt-1">
                {category ?? "Service"} | <span className="font-semibold">Vander</span>
              </h4>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 text-amber-500" fill="currentColor" />
                ))}
              </div>
              <span className="text-[10px] font-bold text-[color:oklch(0.30_0.05_85)]">⭐ Top rated</span>
            </div>
          </div>

          {/* Filter tabs row 1 */}
          <div className="px-4 mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map((t, i) => (
              <button
                key={t}
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-all ${
                  i === 0
                    ? "bg-gradient-to-b from-[#f5b342] to-[#d97706] text-white shadow-[0_3px_8px_-2px_rgba(217,119,6,0.5)]"
                    : "bg-white border border-[color:oklch(0.78_0.14_82/0.4)] text-[color:oklch(0.45_0.08_85)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Filter tabs row 2 — vendor types */}
          <div className="px-4 mt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {VENDOR_TABS.map((t, i) => (
              <button
                key={`${t}-${i}`}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                  i === 0
                    ? "bg-gradient-to-b from-[#f5b342] to-[#d97706] text-white"
                    : "bg-[#fef3c7]/60 text-[color:oklch(0.50_0.08_85/0.7)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="px-4 mt-3 space-y-2.5 pb-4">
            {items.map((item, i) => {
              const inCart = cart.includes(item.id);
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl bg-white border-2 p-2.5 flex items-center gap-3 transition-all ${
                    inCart
                      ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow"
                      : "border-[color:oklch(0.78_0.14_82/0.25)]"
                  }`}
                  style={{ animation: `fade-up 0.4s ease-out ${i * 0.06}s both` }}
                >
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] grid place-items-center flex-shrink-0 overflow-hidden border border-[color:oklch(0.78_0.14_82/0.3)]">
                    <img src={item.img} alt={item.title} loading="lazy" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-display text-base font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-[color:oklch(0.50_0.08_85/0.8)] mt-0.5">{item.sub}</p>
                    <p className="text-[11px] font-bold text-[color:oklch(0.55_0.18_60)] mt-0.5">{item.price}</p>
                  </div>
                  <button
                    onClick={() => toggleCart(item.id)}
                    className={`btn-3d flex-shrink-0 px-3 py-2 rounded-full font-display font-bold text-[11px] flex items-center gap-1.5 active:scale-95 ${
                      inCart
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_3px_10px_-2px_rgba(5,150,105,0.5)]"
                        : "bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white shadow-[0_3px_10px_-2px_rgba(217,119,6,0.5)]"
                    }`}
                  >
                    {inCart ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    {inCart ? "ADDED" : "ADD TO CART"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        {/* Quick notes footer — orange band */}
        <div
          className="flex-shrink-0 mx-3 mb-3 rounded-2xl bg-gradient-to-b from-[#f59e0b] to-[#d97706] p-3 shadow-[0_-4px_18px_-4px_rgba(217,119,6,0.6)]"
          style={{ animation: "fade-up 0.4s ease-out 0.2s both" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Quick nots......"
              className="flex-1 bg-transparent border-b-2 border-white/50 text-white placeholder:text-white/70 text-sm py-1 outline-none font-display italic"
            />
            <button
              onClick={() => setRecording((r) => !r)}
              aria-label="Record"
              className={`h-9 w-9 rounded-full grid place-items-center transition-all ${
                recording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white/20 text-white"
              }`}
            >
              <Mic className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative h-12 w-16 rounded-xl overflow-hidden border-2 border-white/70 bg-gradient-to-b from-sky-300 to-emerald-300 grid place-items-center active:scale-95"
              aria-label="Add image"
            >
              {images[0] ? (
                <img src={images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-5 w-5 text-white drop-shadow" strokeWidth={2.4} />
              )}
            </button>
            <span className="text-white text-xs font-display italic">
              {images.length} item{images.length !== 1 ? "'s" : ""}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <button
              onClick={() => onSubmit({ cart, note, images })}
              disabled={cart.length === 0}
              className="btn-3d ml-auto px-5 py-2.5 rounded-2xl bg-white text-[color:oklch(0.55_0.18_60)] font-display font-bold text-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] active:scale-95 disabled:opacity-50 underline underline-offset-2"
            >
              Request | Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
