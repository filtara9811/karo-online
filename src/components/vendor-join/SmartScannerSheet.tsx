import { useRef, useState } from "react";
import { X, Camera, ImageIcon, Loader2, ScanLine, Sparkles, IdCard, ReceiptText, Store, Check } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractBusinessCard, type OcrExtraction } from "@/lib/ocr.functions";

type Kind = "visiting_card" | "bill_book" | "shop_board";

const KINDS: { id: Kind; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "visiting_card", label: "Visiting Card", Icon: IdCard },
  { id: "bill_book", label: "Bill Book", Icon: ReceiptText },
  { id: "shop_board", label: "Shop Board", Icon: Store },
];

const FIELD_LABELS: Record<keyof OcrExtraction, string> = {
  business_name: "Business Name",
  owner_name: "Owner Name",
  mobile: "Mobile",
  whatsapp: "WhatsApp",
  email: "Email",
  address: "Full Address",
  city: "City",
  pincode: "Pincode",
  shop_type_hint: "Shop Type",
  raw_text: "Raw Text",
};

const APPLIABLE: (keyof OcrExtraction)[] = [
  "business_name",
  "owner_name",
  "mobile",
  "whatsapp",
  "email",
  "address",
  "city",
  "pincode",
  "shop_type_hint",
];

async function compressImage(file: File, maxSide = 1600): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image");
  if (typeof createImageBitmap === "undefined") {
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.82);
}

export function SmartScannerSheet({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (data: OcrExtraction) => void;
}) {
  const [kind, setKind] = useState<Kind>("visiting_card");
  const [phase, setPhase] = useState<"pick" | "scanning" | "review">("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrExtraction | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(APPLIABLE));
  const camRef = useRef<HTMLInputElement | null>(null);
  const galRef = useRef<HTMLInputElement | null>(null);
  const runExtract = useServerFn(extractBusinessCard);

  if (!open) return null;

  const reset = () => {
    setPhase("pick");
    setPreview(null);
    setResult(null);
    setSelected(new Set(APPLIABLE));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhase("scanning");
      const dataUrl = await compressImage(file, 1600);
      setPreview(dataUrl);
      const out = await runExtract({ data: { image_data_url: dataUrl, kind } });
      const nonEmpty = APPLIABLE.some((k) => (out as Record<string, unknown>)[k]);
      if (!nonEmpty) {
        toast.error("Kuch details nahi mili — dobara clear photo lein");
        setPhase("pick");
        setPreview(null);
        return;
      }
      setResult(out);
      // pre-select only fields that have a value
      setSelected(new Set(APPLIABLE.filter((k) => (out as Record<string, unknown>)[k])));
      setPhase("review");
    } catch (e) {
      toast.error((e as Error).message || "Scan failed");
      setPhase("pick");
      setPreview(null);
    }
  };

  const apply = () => {
    if (!result) return;
    const filtered: OcrExtraction = {};
    for (const k of APPLIABLE) {
      if (selected.has(k)) (filtered as Record<string, unknown>)[k] = (result as Record<string, unknown>)[k];
    }
    onApply(filtered);
    toast.success("Details bhar diye — please check karein");
    reset();
    onClose();
  };

  const closeAll = () => {
    if (phase === "scanning") return;
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end bg-black/55" onClick={closeAll}>
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-16px_45px_-22px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-200" />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-100 grid place-items-center">
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-neutral-950">Smart Scanner</h3>
              <p className="text-[11px] font-medium text-neutral-500">Scan and auto fill business details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAll}
            disabled={phase === "scanning"}
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700 disabled:opacity-50"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === "pick" && (
          <>
            <div className="rounded-2xl bg-gradient-to-b from-amber-100 to-amber-50 border border-amber-200 p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => camRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-3 active:scale-[0.98]"
                >
                  <div className="h-14 w-14 rounded-full bg-white grid place-items-center shadow-sm">
                    <Camera className="h-7 w-7 text-amber-700" />
                  </div>
                  <div className="text-sm font-extrabold text-neutral-900">Tap to Scan</div>
                  <div className="text-[10px] leading-tight text-neutral-600 text-center px-2">
                    Visiting Card / Bill Book / Shop Board
                  </div>
                </button>
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-px bg-amber-300" />
                  <button
                    type="button"
                    onClick={() => galRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-3 active:scale-[0.98]"
                  >
                    <div className="h-14 w-14 rounded-full bg-white grid place-items-center shadow-sm">
                      <ImageIcon className="h-7 w-7 text-amber-700" />
                    </div>
                    <div className="text-sm font-extrabold text-neutral-900">Choose from Gallery</div>
                    <div className="text-[10px] leading-tight text-neutral-600 text-center px-2">
                      Select image from gallery to scan
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-extrabold text-neutral-900 mb-2">What are you scanning?</div>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map(({ id, label, Icon }) => {
                  const active = kind === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setKind(id)}
                      className={`rounded-xl border px-2 py-2.5 flex flex-col items-center gap-1 transition ${
                        active
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-neutral-200 bg-white text-neutral-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="space-y-1.5 text-[12px] text-neutral-600 mb-2">
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />Business name, mobile, address auto-extract</li>
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />Manual typing time bachta hai</li>
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />Scan ke baad edit kar sakte hain</li>
            </ul>
          </>
        )}

        {phase === "scanning" && (
          <div className="py-10 flex flex-col items-center gap-3">
            {preview ? (
              <img src={preview} alt="Scanning" className="max-h-40 rounded-xl border border-neutral-200" />
            ) : null}
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <div className="text-sm font-bold text-neutral-800">Scanning… details nikaal rahe hain</div>
            <div className="text-[11px] text-neutral-500">Thoda sabar karein — 5-10 sec</div>
          </div>
        )}

        {phase === "review" && result && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              {preview ? (
                <img src={preview} alt="Scan" className="h-16 w-16 rounded-xl object-cover border border-neutral-200" />
              ) : null}
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-neutral-900">Ye details mili hain</div>
                <div className="text-[11px] text-neutral-500">Jo apply karna ho tick rakhein</div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {APPLIABLE.map((k) => {
                const val = (result as Record<string, unknown>)[k] as string | null | undefined;
                if (!val) return null;
                const checked = selected.has(k);
                return (
                  <label
                    key={k}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${
                      checked ? "border-amber-400 bg-amber-50" : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-md grid place-items-center border ${
                        checked ? "bg-amber-500 border-amber-500 text-white" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selected);
                        if (checked) next.delete(k);
                        else next.add(k);
                        setSelected(next);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                        {FIELD_LABELS[k]}
                      </div>
                      <div className="text-sm text-neutral-900 break-words">{val}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 py-3 rounded-2xl border border-neutral-200 bg-white text-neutral-800 font-bold text-sm"
              >
                Re-scan
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={selected.size === 0}
                className="flex-[2] py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold text-sm shadow"
              >
                Apply to Form
              </button>
            </div>
          </div>
        )}

        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            void handleFile(f);
          }}
        />
        <input
          ref={galRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            void handleFile(f);
          }}
        />
      </div>
    </div>
  );
}
