import { useEffect, useRef, useState } from "react";
import {
  X, Camera, ImageIcon, Loader2, ScanLine, Sparkles,
  IdCard, ReceiptText, Store, Check, History, Trash2, Plus, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractBusinessCard, type OcrExtraction, type ScanKind } from "@/lib/ocr.functions";
import {
  listScanHistory, saveScanHistory, deleteScanHistory,
  type ScanHistoryEntry,
} from "@/lib/scan-history.functions";

const KINDS: { id: ScanKind; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "visiting_card", label: "Visiting Card", Icon: IdCard },
  { id: "bill_book", label: "Bill Book", Icon: ReceiptText },
  { id: "shop_board", label: "Shop Board", Icon: Store },
];

const FIELD_LABELS: Record<string, string> = {
  business_name: "Business Name",
  owner_name: "Owner Name",
  mobile: "Mobile",
  whatsapp: "WhatsApp",
  alt_phone: "Alternate Phone",
  email: "Email",
  address: "Full Address",
  landmark: "Landmark",
  city: "City",
  state: "State",
  pincode: "Pincode",
  gstin: "GSTIN",
  website: "Website / Social",
  established_year: "Established",
  business_hours: "Business Hours",
  shop_type_hint: "Shop Type",
  services: "Services",
  products: "Products",
};

const APPLIABLE: (keyof OcrExtraction)[] = [
  "business_name", "owner_name", "mobile", "whatsapp", "alt_phone", "email",
  "address", "landmark", "city", "state", "pincode", "gstin", "website",
  "established_year", "business_hours", "shop_type_hint", "services", "products",
];

const MAX_IMAGES = 5;

type Shot = { id: string; kind: ScanKind; dataUrl: string };

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
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.82);
}

async function makeThumbnail(dataUrl: string, side = 240): Promise<string> {
  try {
    const img = document.createElement("img");
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("thumb load"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, side / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.6);
  } catch {
    return dataUrl;
  }
}

function fmtValue(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v ?? "");
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
  const [kind, setKind] = useState<ScanKind>("visiting_card");
  const [phase, setPhase] = useState<"pick" | "scanning" | "review" | "history">("pick");
  const [shots, setShots] = useState<Shot[]>([]);
  const [result, setResult] = useState<OcrExtraction | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(APPLIABLE as string[]));
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const camRef = useRef<HTMLInputElement | null>(null);
  const galRef = useRef<HTMLInputElement | null>(null);

  const runExtract = useServerFn(extractBusinessCard);
  const runSave = useServerFn(saveScanHistory);
  const runList = useServerFn(listScanHistory);
  const runDelete = useServerFn(deleteScanHistory);

  useEffect(() => {
    if (!open) return;
    setHistoryLoading(true);
    runList()
      .then((rows) => setHistory((rows ?? []) as ScanHistoryEntry[]))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, runList]);

  if (!open) return null;

  const reset = () => {
    setPhase("pick");
    setShots([]);
    setResult(null);
    setSelected(new Set(APPLIABLE as string[]));
  };

  const closeAll = () => {
    if (phase === "scanning") return;
    reset();
    onClose();
  };

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    if (shots.length >= MAX_IMAGES) {
      toast.error(`Max ${MAX_IMAGES} images`);
      return;
    }
    try {
      const dataUrl = await compressImage(file, 1600);
      setShots((prev) => [...prev, { id: crypto.randomUUID(), kind, dataUrl }]);
    } catch (e) {
      toast.error((e as Error).message || "Could not read image");
    }
  };

  const removeShot = (id: string) =>
    setShots((prev) => prev.filter((s) => s.id !== id));

  const scanAll = async () => {
    if (!shots.length) {
      toast.error("Pehle photo add karein");
      return;
    }
    try {
      setPhase("scanning");
      const out = await runExtract({
        data: { images: shots.map((s) => ({ image_data_url: s.dataUrl, kind: s.kind })) },
      });
      const nonEmpty = APPLIABLE.some((k) => {
        const v = (out as Record<string, unknown>)[k];
        return Array.isArray(v) ? v.length > 0 : Boolean(v);
      });
      if (!nonEmpty) {
        toast.error("Kuch details nahi mili — clear photos add karein");
        setPhase("pick");
        return;
      }
      setResult(out);
      setSelected(
        new Set(
          APPLIABLE.filter((k) => {
            const v = (out as Record<string, unknown>)[k];
            return Array.isArray(v) ? v.length > 0 : Boolean(v);
          }) as string[],
        ),
      );
      setPhase("review");

      // Save to history in the background (best-effort)
      try {
        const thumb = shots[0] ? await makeThumbnail(shots[0].dataUrl) : null;
        const { id } = await runSave({
          data: {
            kinds: shots.map((s) => s.kind),
            thumbnail: thumb,
            extracted: out as Record<string, unknown>,
          },
        });
        if (id) {
          setHistory((prev) => [
            { id, kinds: shots.map((s) => s.kind), thumbnail: thumb, extracted: out as Record<string, unknown>, created_at: new Date().toISOString() },
            ...prev,
          ].slice(0, 50));
        }
      } catch {
        /* non-blocking */
      }
    } catch (e) {
      toast.error((e as Error).message || "Scan failed");
      setPhase("pick");
    }
  };

  const apply = () => {
    if (!result) return;
    const filtered: Record<string, unknown> = {};
    for (const k of APPLIABLE) {
      if (selected.has(k as string)) filtered[k] = (result as Record<string, unknown>)[k];
    }
    onApply(filtered as OcrExtraction);
    toast.success("Details bhar diye — please check karein");
    reset();
    onClose();
  };

  const reapplyFromHistory = (entry: ScanHistoryEntry) => {
    const ext = entry.extracted as OcrExtraction;
    setResult(ext);
    setSelected(
      new Set(
        APPLIABLE.filter((k) => {
          const v = (ext as Record<string, unknown>)[k];
          return Array.isArray(v) ? v.length > 0 : Boolean(v);
        }) as string[],
      ),
    );
    setShots([]);
    setPhase("review");
  };

  const removeHistory = async (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    try {
      await runDelete({ data: { id } });
    } catch (e) {
      toast.error((e as Error).message || "Delete failed");
    }
  };

  const showHeaderHistory = phase === "pick" && history.length > 0;

  return (
    <div className="fixed inset-0 z-[95] flex items-end bg-black/55" onClick={closeAll}>
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-16px_45px_-22px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-200" />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-100 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-neutral-950 truncate">
                {phase === "history" ? "Scan History" : "Smart Scanner"}
              </h3>
              <p className="text-[11px] font-medium text-neutral-500 truncate">
                {phase === "history"
                  ? "Purane scans se re-apply karein"
                  : "Multi-photo scan · Card + Board + Bill"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showHeaderHistory && (
              <button
                type="button"
                onClick={() => setPhase("history")}
                className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-amber-700 relative"
                aria-label="Scan history"
              >
                <History className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-600 text-white text-[9px] font-extrabold grid place-items-center">
                  {history.length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={phase === "history" ? () => setPhase("pick") : closeAll}
              disabled={phase === "scanning"}
              className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700 disabled:opacity-50"
              aria-label={phase === "history" ? "Back" : "Close scanner"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {phase === "pick" && (
          <>
            {/* Kind selector */}
            <div className="mb-3">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                Next photo type
              </div>
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

            {/* Capture buttons */}
            <div className="rounded-2xl bg-gradient-to-b from-amber-100 to-amber-50 border border-amber-200 p-4 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => camRef.current?.click()}
                  disabled={shots.length >= MAX_IMAGES}
                  className="flex flex-col items-center gap-1.5 py-2 active:scale-[0.98] disabled:opacity-40"
                >
                  <div className="h-12 w-12 rounded-full bg-white grid place-items-center shadow-sm">
                    <Camera className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="text-sm font-extrabold text-neutral-900">Camera</div>
                </button>
                <div className="relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-14 w-px bg-amber-300" />
                  <button
                    type="button"
                    onClick={() => galRef.current?.click()}
                    disabled={shots.length >= MAX_IMAGES}
                    className="w-full flex flex-col items-center gap-1.5 py-2 active:scale-[0.98] disabled:opacity-40"
                  >
                    <div className="h-12 w-12 rounded-full bg-white grid place-items-center shadow-sm">
                      <ImageIcon className="h-6 w-6 text-amber-700" />
                    </div>
                    <div className="text-sm font-extrabold text-neutral-900">Gallery</div>
                  </button>
                </div>
              </div>
              <div className="mt-2 text-center text-[11px] font-semibold text-amber-800">
                {shots.length}/{MAX_IMAGES} photos added
              </div>
            </div>

            {/* Shot thumbnails */}
            {shots.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                  Added photos
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {shots.map((s) => {
                    const K = KINDS.find((k) => k.id === s.kind);
                    return (
                      <div key={s.id} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                        <img src={s.dataUrl} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeShot(s.id)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white grid place-items-center"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold px-1 py-0.5 flex items-center gap-1">
                          {K ? <K.Icon className="h-3 w-3" /> : null}
                          <span className="truncate">{K?.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {shots.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => galRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 grid place-items-center text-neutral-400"
                      aria-label="Add another photo"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={scanAll}
              disabled={shots.length === 0}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold text-sm shadow flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Scan {shots.length > 0 ? `${shots.length} photo${shots.length > 1 ? "s" : ""}` : "photos"}
            </button>

            <ul className="mt-3 space-y-1 text-[11px] text-neutral-600">
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />Multi-photo merge — sabse best value auto pick</li>
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />GSTIN, category, services auto detect</li>
              <li className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-amber-600" />Purane scans History me save hote hain</li>
            </ul>
          </>
        )}

        {phase === "scanning" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {shots.slice(0, 3).map((s, i) => (
                <img
                  key={s.id}
                  src={s.dataUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl border-2 border-white object-cover shadow"
                  style={{ zIndex: 10 - i }}
                />
              ))}
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <div className="text-sm font-bold text-neutral-800">
              Scanning {shots.length} photo{shots.length > 1 ? "s" : ""}…
            </div>
            <div className="text-[11px] text-neutral-500">Merge kar rahe hain — 5-10 sec</div>
          </div>
        )}

        {phase === "review" && result && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                {shots.slice(0, 3).map((s, i) => (
                  <img
                    key={s.id}
                    src={s.dataUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow"
                    style={{ zIndex: 10 - i }}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-neutral-900">Ye details mili hain</div>
                <div className="text-[11px] text-neutral-500">Jo apply karna ho tick rakhein</div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {APPLIABLE.map((k) => {
                const val = (result as Record<string, unknown>)[k];
                const isEmpty = Array.isArray(val) ? val.length === 0 : !val;
                if (isEmpty) return null;
                const checked = selected.has(k as string);
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
                        if (checked) next.delete(k as string);
                        else next.add(k as string);
                        setSelected(next);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                        {FIELD_LABELS[k as string] ?? k}
                      </div>
                      <div className="text-sm text-neutral-900 break-words">{fmtValue(val)}</div>
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

        {phase === "history" && (
          <div>
            {historyLoading && (
              <div className="py-8 flex items-center justify-center text-neutral-500 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <div className="py-10 text-center text-neutral-500 text-sm">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Abhi tak koi scan save nahi hua
              </div>
            )}
            <div className="space-y-2">
              {history.map((h) => {
                const ext = (h.extracted ?? {}) as OcrExtraction;
                const title =
                  (ext.business_name as string) ||
                  (ext.owner_name as string) ||
                  (ext.mobile as string) ||
                  "Untitled scan";
                const subtitle = [ext.city, ext.pincode].filter(Boolean).join(" · ");
                const when = new Date(h.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "2-digit",
                });
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5"
                  >
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                      {h.thumbnail ? (
                        <img src={h.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-neutral-400">
                          <ScanLine className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-neutral-900 truncate">{title}</div>
                      <div className="text-[11px] text-neutral-500 truncate">
                        {subtitle || (h.kinds ?? []).join(", ")} · {when}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => reapplyFromHistory(h)}
                      className="h-9 px-3 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-apply
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHistory(h.id)}
                      className="h-9 w-9 grid place-items-center rounded-full bg-neutral-100 text-neutral-500"
                      aria-label="Delete scan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
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
            void addFile(f);
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
            void addFile(f);
          }}
        />
      </div>
    </div>
  );
}
