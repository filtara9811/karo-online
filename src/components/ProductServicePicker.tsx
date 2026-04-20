import { useEffect, useState } from "react";
import {
  Package, Wrench, X, Shirt, Sparkles, ShoppingBasket, Tv, Home as HomeIcon,
  Gem, Footprints, Lamp, Hammer, Zap, Paintbrush2, Scissors, Truck, ChefHat,
  type LucideIcon,
} from "lucide-react";

type Mode = "products" | "services";

const PRODUCT_CATS: { label: string; icon: LucideIcon }[] = [
  { label: "Fashion", icon: Shirt },
  { label: "Beauty", icon: Sparkles },
  { label: "Grocery", icon: ShoppingBasket },
  { label: "Electronics", icon: Tv },
  { label: "Home", icon: HomeIcon },
  { label: "Jewellery", icon: Gem },
  { label: "Footwear", icon: Footprints },
  { label: "Decor", icon: Lamp },
];

const SERVICE_CATS: { label: string; icon: LucideIcon }[] = [
  { label: "Plumber", icon: Wrench },
  { label: "Carpenter", icon: Hammer },
  { label: "Electrician", icon: Zap },
  { label: "Painter", icon: Paintbrush2 },
  { label: "Beauty", icon: Scissors },
  { label: "Movers", icon: Truck },
  { label: "Chef", icon: ChefHat },
  { label: "Cleaning", icon: Sparkles },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCategoryPick: (mode: Mode, category: string) => void;
};

export function ProductServicePicker({ open, onClose, onCategoryPick }: Props) {
  const [step, setStep] = useState<"choose" | Mode>("choose");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setStep("choose");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const cats = step === "products" ? PRODUCT_CATS : step === "services" ? SERVICE_CATS : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.5)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 max-h-[85vh] flex flex-col"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />

        <div className="flex items-center gap-2 mb-4">
          {step !== "choose" && (
            <button
              onClick={() => setStep("choose")}
              className="text-[color:oklch(0.55_0.10_82)] text-sm font-semibold"
            >
              ‹ Back
            </button>
          )}
          <div className="flex-1 text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)]">
              ✦ {step === "choose" ? "Browse" : step === "products" ? "Products" : "Services"} ✦
            </p>
            <h2 className="font-display text-xl text-gold-gradient leading-tight">
              {step === "choose"
                ? "Kya dhundh rahe ho?"
                : step === "products"
                ? "Product categories"
                : "Service categories"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-3d h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
        </div>

        {step === "choose" ? (
          <div className="grid grid-cols-2 gap-3 pb-2">
            {([
              { mode: "products" as const, label: "Products", sub: "Fashion · Beauty · Grocery", Icon: Package },
              { mode: "services" as const, label: "Services", sub: "Plumber · Carpenter · etc", Icon: Wrench },
            ]).map(({ mode, label, sub, Icon }, i) => (
              <button
                key={mode}
                onClick={() => setStep(mode)}
                className="btn-3d group rounded-2xl p-4 bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border-2 border-[color:oklch(0.78_0.14_82/0.55)] shadow-gold-glow hover:scale-[1.03] active:scale-95 transition-transform"
                style={{ animation: `fade-up 0.5s ease-out ${i * 0.08}s both` }}
              >
                <span className="block h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-[#fdf8e8] border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center shadow-inner mb-3">
                  <Icon className="h-9 w-9 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2} />
                </span>
                <p className="font-display text-lg text-gold-gradient font-bold leading-tight">{label}</p>
                <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] mt-1 leading-tight">{sub}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-2">
            {cats.map((c, i) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={() => onCategoryPick(step, c.label)}
                  className="btn-3d flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow active:scale-95 transition-all"
                  style={{ animation: `fade-up 0.4s ease-out ${i * 0.04}s both` }}
                >
                  <span className="h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow">
                    <Icon className="h-6 w-6 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
                  </span>
                  <span className="text-[10px] font-semibold text-[color:oklch(0.30_0.05_85)] leading-none text-center">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
