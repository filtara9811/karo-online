import { useEffect, useRef, useState } from "react";
import { Upload, Link as LinkIcon, Smile, Sparkles, Loader2, X, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SmartMedia, detectMediaKind } from "./SmartMedia";

type Tab = "library" | "upload" | "url" | "lottie" | "emoji";

const QUICK_EMOJI = ["🛠️", "📦", "✨", "⚡", "🔧", "🎨", "🚚", "🧹", "🍳", "💡", "🔌", "🪑"];

// Curated built-in vendor/service icons (Iconify CDN, free, no key)
const BUILTIN_LIBRARY = [
  "🛠️","🔧","🔨","🪚","🪛","⚙️","🧰","🪜","🧱","🏗️",
  "🔌","💡","🔋","🪫","📡","🖥️","💻","📱","⌨️","🖨️",
  "🚿","🚰","🚽","🛁","🧼","🧽","🧹","🧺","🪣","🧴",
  "❄️","🌬️","🔥","🌡️","💨","🪟","🚪","🛏️","🛋️","🪑",
  "✂️","💇","💅","💄","🧖","💆","🪒","🧴","🧼","🧻",
  "🍳","🍕","🍔","☕","🥤","🧁","🍰","🥗","🍱","🥡",
  "🚗","🚕","🚙","🚌","🛻","🚛","🛵","🏍️","🚲","🛴",
  "📦","📮","🚚","🛒","🏪","🏬","💳","💵","💰","🧾",
];

/**
 * Universal media picker — single-string output.
 * Writes any chosen value (uploaded URL, external URL, lottie URL, emoji)
 * into one field via `onChange(value)`.
 */
export function SmartMediaPicker({
  value,
  onChange,
  label = "Media",
  folder = "items",
  accept = "image/*",
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  label?: string;
  folder?: string;
  accept?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("library");
  const [draft, setDraft] = useState(value ?? "");
  const [library, setLibrary] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    supabase.from("app_settings").select("value").eq("key", "media_library").maybeSingle().then(({ data }) => {
      if (cancel) return;
      const arr = (data?.value as any)?.items;
      setLibrary(Array.isArray(arr) ? arr : []);
    });
    return () => { cancel = true; };
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("catalog")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("catalog").getPublicUrl(path);
      onChange(data.publicUrl);
      setDraft(data.publicUrl);
    } catch (e: any) {
      alert("Upload failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "library", label: "Library", icon: Library },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "url", label: "URL", icon: LinkIcon },
    { id: "lottie", label: "Lottie", icon: Sparkles },
    { id: "emoji", label: "Emoji", icon: Smile },
  ];

  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
        {label}
      </label>

      <div className="flex items-start gap-3">
        <div className="relative">
          <SmartMedia src={value} size={64} />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setDraft("");
              }}
              className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-black/80 text-red-300 hover:bg-red-500/40 border border-[#d4af37]/30"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex gap-1 mb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition ${
                  tab === t.id
                    ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#f5d97a]"
                    : "border-[#d4af37]/20 text-[#f5d97a]/60 hover:bg-[#d4af37]/5"
                }`}
              >
                <t.icon className="h-3 w-3" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "library" && (
            <div className="max-h-44 overflow-y-auto pr-1">
              {library.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-wider text-[#f5d97a]/60 mb-1">Saved</p>
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {library.map((v) => (
                      <button
                        key={"L:" + v}
                        type="button"
                        onClick={() => { onChange(v); setDraft(v); }}
                        className="aspect-square rounded-md border border-[#d4af37]/30 bg-black/40 grid place-items-center overflow-hidden hover:border-[#d4af37] text-base"
                        title={v}
                      >
                        {/^https?:\/\//.test(v)
                          ? (/\.json($|\?)/i.test(v)
                              ? <span className="text-[7px] text-[#d4af37]">LOT</span>
                              : <img src={v} alt="" loading="lazy" className="w-full h-full object-cover" />)
                          : <span>{v}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-[9px] uppercase tracking-wider text-[#f5d97a]/60 mb-1">Built-in</p>
              <div className="grid grid-cols-10 gap-1">
                {BUILTIN_LIBRARY.map((e) => (
                  <button
                    key={"B:" + e}
                    type="button"
                    onClick={() => { onChange(e); setDraft(e); }}
                    className="aspect-square rounded-md border border-[#d4af37]/15 bg-black/30 grid place-items-center hover:bg-[#d4af37]/10 text-base"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[#d4af37]/40 text-[#f5d97a] hover:bg-[#d4af37]/5 text-xs disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {busy ? "Uploading..." : "Choose file from device"}
              </button>
            </>
          )}

          {(tab === "url" || tab === "lottie") && (
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  tab === "lottie"
                    ? "https://…/animation.json"
                    : "https://…/image.jpg"
                }
                className="flex-1 px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#f5d97a] text-xs placeholder:text-[#f5d97a]/30 focus:outline-none focus:border-[#d4af37]/60"
              />
              <button
                type="button"
                onClick={() => onChange(draft.trim() || null)}
                className="px-3 py-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#f5d97a] text-[10px] font-bold uppercase tracking-wider hover:bg-[#d4af37]/30"
              >
                Set
              </button>
            </div>
          )}

          {tab === "emoji" && (
            <div>
              <div className="flex gap-1.5 mb-1.5 flex-wrap">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onChange(e);
                      setDraft(e);
                    }}
                    className="h-8 w-8 grid place-items-center rounded-lg border border-[#d4af37]/20 bg-black/40 hover:bg-[#d4af37]/10 text-base"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Paste any emoji 🎉"
                  maxLength={6}
                  className="flex-1 px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#f5d97a] text-xs placeholder:text-[#f5d97a]/30 focus:outline-none focus:border-[#d4af37]/60"
                />
                <button
                  type="button"
                  onClick={() => onChange(draft.trim() || null)}
                  className="px-3 py-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#f5d97a] text-[10px] font-bold uppercase tracking-wider hover:bg-[#d4af37]/30"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          <p className="text-[9px] text-[#f5d97a]/40 mt-1.5 leading-snug">
            One field — auto-detects images, Lottie .json, or emoji. Lazy-loaded for speed.
          </p>
        </div>
      </div>
    </div>
  );
}
