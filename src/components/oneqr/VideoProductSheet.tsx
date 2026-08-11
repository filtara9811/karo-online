import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { VideoProduct } from "@/lib/landing-types";
import { SheetShell } from "./SheetShell";

/** Bottom-sheet form for one product attached to a video. */
export function VideoProductSheet({
  open,
  product,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  product: VideoProduct | null;
  onClose: () => void;
  onSave: (p: VideoProduct) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<VideoProduct | null>(product);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setDraft(product); }, [product]);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { toast.error("Image bahut badi hai (max 6 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => (d ? { ...d, image: String(reader.result || "") } : d));
    reader.readAsDataURL(f);
  };

  const submit = () => {
    if (!draft) return;
    if (draft.name.trim().length < 2) { toast.error("Product ka naam likhein"); return; }
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <SheetShell
      open={open && !!draft}
      onClose={onClose}
      title="Product details"
      subtitle="Video ke saath link hone wala product"
      footer={
        <div className="flex gap-2">
          {onDelete && draft && (
            <button
              onClick={() => onDelete(draft.id)}
              aria-label="Delete product"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={submit}
            className="h-11 flex-1 rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98]"
          >
            Save product
          </button>
        </div>
      }
    >
      {draft && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid h-40 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-amber-50/60"
          >
            {draft.image ? (
              <img src={draft.image} alt={draft.name || "Product"} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-amber-700">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-bold">Product photo</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />

          <Field label="Product name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 70) })}
              placeholder="Red anarkali suit"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Price">
            <input
              value={draft.price ?? ""}
              onChange={(e) => setDraft({ ...draft, price: e.target.value.slice(0, 20) })}
              placeholder="₹499"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value.slice(0, 400) })}
              rows={3}
              placeholder="Fabric, size, colour, delivery…"
              className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Enquiry message (WhatsApp me jayega)">
            <input
              value={draft.enquiry ?? ""}
              onChange={(e) => setDraft({ ...draft, enquiry: e.target.value.slice(0, 160) })}
              placeholder="Mujhe is product ke baare me jaankari chahiye"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Buy / redirect link (optional)">
            <input
              value={draft.url ?? ""}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://wa.me/91… ya Amazon / website link"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
        </div>
      )}
    </SheetShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
        {children}
      </div>
    </label>
  );
}
