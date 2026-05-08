import { useEffect, useState } from "react";
import { Package, Wrench, Sparkles, X, Loader2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconImage } from "@/components/admin/ImageUpload";

type CatalogType = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

type Category = {
  id: string;
  name: string;
  type_id: string | null;
  parent_id: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode is the catalog_type code (e.g. 'product' | 'service' | 'other'). */
  onCategoryPick: (mode: string, category: string) => void;
};

const FALLBACK_ICON: Record<string, LucideIcon> = {
  product: Package,
  service: Wrench,
  other: Sparkles,
};

export function ProductServicePicker({ open, onClose, onCategoryPick }: Props) {
  const [step, setStep] = useState<"choose" | string>("choose"); // "choose" or a type id
  const [types, setTypes] = useState<CatalogType[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Load catalog from DB + subscribe to live changes so admin updates reflect instantly.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [t, c] = await Promise.all([
        supabase.from("catalog_types").select("*").eq("is_active", true).order("sort_order"),
        supabase
          .from("categories")
          .select("id,name,type_id,parent_id,icon,image_url,is_active")
          .eq("is_active", true)
          .is("parent_id", null)
          .order("sort_order")
          .order("name"),
      ]);
      if (!mounted) return;
      setTypes((t.data ?? []) as CatalogType[]);
      setCats((c.data ?? []) as Category[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("catalog-picker-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_types" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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

  const currentType = types.find((t) => t.id === step);
  const visibleCats = currentType ? cats.filter((c) => c.type_id === currentType.id) : [];

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
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-4 pt-3 pb-8 max-h-[85vh] flex flex-col"
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
              ✦ {step === "choose" ? "Browse" : currentType?.name ?? ""} ✦
            </p>
            <h2 className="font-display text-xl text-gold-gradient leading-tight">
              {step === "choose" ? "Kya dhundh rahe ho?" : `${currentType?.name} categories`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-3d h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 grid place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[color:oklch(0.55_0.10_82)]" />
          </div>
        ) : step === "choose" ? (
          <div className={`grid gap-2.5 pb-2 ${types.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {types.length === 0 && (
              <p className="col-span-full text-center text-xs text-[color:oklch(0.45_0.08_85)] py-6">
                No catalog types yet. Admin se add karein.
              </p>
            )}
            {types.map((t, i) => {
              const Fallback = FALLBACK_ICON[t.code] ?? Sparkles;
              return (
                <button
                  key={t.id}
                  onClick={() => setStep(t.id)}
                  className="btn-3d group rounded-2xl p-3 bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border-2 border-[color:oklch(0.78_0.14_82/0.55)] shadow-gold-glow hover:scale-[1.03] active:scale-95 transition-transform"
                  style={{ animation: `fade-up 0.5s ease-out ${i * 0.08}s both` }}
                >
                  <span className="block h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-white to-[#fdf8e8] border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center shadow-inner mb-2 overflow-hidden">
                    {t.icon ? (
                      <IconImage url={t.icon} size={44} />
                    ) : (
                      <Fallback className="h-8 w-8 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2} />
                    )}
                  </span>
                  <p className="font-display text-base text-gold-gradient font-bold leading-tight">
                    {t.name}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-2">
            {visibleCats.length === 0 && (
              <p className="col-span-3 text-center text-xs text-[color:oklch(0.45_0.08_85)] py-8">
                Is type me abhi koi category nahi. Admin se add karein.
              </p>
            )}
            {visibleCats.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onCategoryPick(currentType!.code, c.name)}
                className="btn-3d flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow active:scale-95 transition-all"
                style={{ animation: `fade-up 0.4s ease-out ${i * 0.04}s both` }}
              >
                <span className="h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow overflow-hidden">
                  <IconImage url={c.image_url} icon={c.icon} size={42} />
                </span>
                <span className="text-[10px] font-semibold text-[color:oklch(0.30_0.05_85)] leading-none text-center">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
