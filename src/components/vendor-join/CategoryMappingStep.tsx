import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Check, Loader2, Plus } from "lucide-react";
import { suggestCategoriesFromScan, type CategorySuggestion } from "@/lib/category-suggest.functions";
import { toast } from "sonner";

type Props = {
  hint: {
    shop_type_hint?: string | null;
    services?: string[] | null;
    products?: string[] | null;
    business_name?: string | null;
  };
  onApply: (selected: CategorySuggestion[]) => void;
  onSkip?: () => void;
};

/**
 * Shown right after vendor submits their basic profile.
 * Calls Gemini with the scanned hints and pre-selects the top-ranked
 * trade path so the vendor can confirm with one tap.
 */
export function CategoryMappingStep({ hint, onApply, onSkip }: Props) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set([0]));
  const run = useServerFn(suggestCategoriesFromScan);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await run({ data: hint });
        if (cancelled) return;
        setSuggestions(r.suggestions);
        setSelectedIdx(r.suggestions.length > 0 ? new Set([0]) : new Set());
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message || "AI suggest failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (idx: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const apply = () => {
    const chosen = suggestions.filter((_, i) => selectedIdx.has(i));
    if (chosen.length === 0) {
      toast.error("Kam se kam ek category select karein");
      return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(30); } catch { /* ignore */ }
    }
    onApply(chosen);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-amber-100 grid place-items-center shrink-0">
          <Sparkles className="h-5 w-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-extrabold text-neutral-900">
            AI-suggested categories
          </div>
          <div className="text-xs text-neutral-500">
            Scanned data ke basis pe humne aapke liye categories suggest ki hain
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI se categories match kar rahe hain…
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Suggest karne ke liye sufficient signal nahi mila — aap manually
          category select kar sakte hain.
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => {
            const selected = selectedIdx.has(i);
            const pct = Math.round(s.confidence * 100);
            const isTop = i === 0;
            return (
              <button
                key={s.path.join(">")}
                type="button"
                onClick={() => toggle(i)}
                className={`w-full text-left rounded-2xl border-2 p-3 transition-all ${
                  selected
                    ? "border-amber-500 bg-amber-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-6 w-6 rounded-full grid place-items-center shrink-0 ${
                      selected ? "bg-amber-500 text-white" : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {selected ? <Check className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-neutral-900">
                        {s.labels.join(" › ")}
                      </span>
                      {isTop && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Top match
                        </span>
                      )}
                    </div>
                    {s.reason && (
                      <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        {s.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] font-extrabold text-neutral-600 shrink-0">
                    {pct}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="h-11 px-4 rounded-2xl border border-neutral-300 bg-white text-sm font-bold text-neutral-700"
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={apply}
          disabled={loading || suggestions.length === 0}
          className="flex-1 h-11 rounded-2xl bg-amber-500 text-white text-sm font-extrabold disabled:opacity-50"
        >
          Apply & Continue
        </button>
      </div>
    </div>
  );
}
