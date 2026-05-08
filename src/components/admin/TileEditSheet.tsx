import { useEffect, useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { haptic } from "@/lib/format";

export type SheetField = {
  key: string;
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  readOnly?: boolean;
};

/**
 * Premium Gold/Black bottom sheet for editing dashboard tile values.
 */
export function TileEditSheet({
  open,
  onClose,
  title,
  subtitle,
  fields,
  details,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: SheetField[];
  details?: React.ReactNode;
  onSave?: (values: Record<string, number>) => Promise<void> | void;
}) {
  const [vals, setVals] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const init: Record<string, number> = {};
      fields.forEach((f) => (init[f.key] = f.value));
      setVals(init);
    }
  }, [open, fields]);

  if (!open) return null;

  const handleSave = async () => {
    if (!onSave) return onClose();
    setSaving(true);
    haptic(15);
    try {
      await onSave(vals);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-t-3xl border-t-2 border-x border-[#d4af37]/40 bg-gradient-to-b from-[#1a1208] via-[#0a0604] to-black shadow-[0_-20px_60px_-10px_rgba(212,175,55,0.4)] animate-in slide-in-from-bottom duration-300 max-h-[88vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-gradient-to-b from-[#1a1208] to-[#1a1208]/90 backdrop-blur border-b border-[#d4af37]/20">
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#d4af37]/40" />
          <div className="flex items-start justify-between px-5 py-3">
            <div>
              <h3
                className="font-display text-lg font-bold"
                style={{
                  background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[#f5d97a]/60 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#d4af37]/70 hover:bg-[#d4af37]/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {details}

          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">
                      {f.label}
                    </span>
                    <input
                      type="number"
                      value={vals[f.key] ?? f.value}
                      readOnly={f.readOnly}
                      step={f.step ?? 1}
                      min={f.min}
                      max={f.max}
                      onChange={(e) =>
                        setVals((p) => ({
                          ...p,
                          [f.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-black/60 border border-[#d4af37]/30 text-[#fff8dc] text-base font-bold outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                    />
                  </label>
                  {f.hint && (
                    <p className="text-[10px] text-[#d4af37]/60 mt-1 px-1">
                      {f.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#d4af37]/30 text-[#f5d97a] font-bold text-sm hover:bg-[#d4af37]/10"
            >
              Close
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1a1208] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background:
                    "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
