import { useEffect, useRef, useState } from "react";
import { Camera, X, Send, Image as ImageIcon } from "lucide-react";

type Props = {
  open: boolean;
  category?: string | null;
  onClose: () => void;
  onSubmit: (data: { text: string; images: string[]; category?: string | null }) => void;
};

export function NeedsSheet({ open, category, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setText("");
      setImages([]);
      setSending(false);
    }
  }, [open]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr: string[] = [];
    Array.from(files).slice(0, 4).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        arr.push(reader.result as string);
        if (arr.length) setImages((prev) => [...prev, ...arr].slice(0, 4));
      };
      reader.readAsDataURL(f);
    });
  };

  const submit = () => {
    if (!text.trim()) return;
    setSending(true);
    setTimeout(() => {
      onSubmit({ text, images, category });
      setSending(false);
    }, 900);
  };

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
        className="relative w-full max-w-md bg-gradient-to-b from-white via-[#fffdf5] to-[#fdf8e8] border-t-2 border-[color:oklch(0.78_0.14_82/0.6)] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(212,175,55,0.4)] pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center gap-3 border-b border-[color:oklch(0.78_0.14_82/0.25)]">
          <span className="h-11 w-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#ff6b6b] to-[#c92a2a] shadow-[0_4px_14px_-4px_rgba(201,42,42,0.5)]">
            <Send className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-gold-gradient font-bold leading-tight">
              Apni need likhiye
            </h3>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)] mt-0.5">
              {category ? `Vendor: ${category}` : "Sabhi vendors tak jayegi"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-3d h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Mujhe ${category?.toLowerCase() ?? "service"} chahiye... e.g. "Bathroom tap leak, urgent"`}
            rows={4}
            className="w-full rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white px-3 py-2.5 text-sm text-[color:oklch(0.20_0.02_90)] placeholder:text-[color:oklch(0.55_0.05_85/0.6)] outline-none focus:border-[color:oklch(0.78_0.14_82)] resize-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {images.map((src, i) => (
              <div
                key={i}
                className="relative h-16 w-16 rounded-xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm"
                style={{ animation: "ticket-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 grid place-items-center"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-3d h-16 w-16 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] text-[color:oklch(0.42_0.10_82)] active:scale-95"
                aria-label="Add image"
              >
                <Camera className="h-6 w-6" strokeWidth={2} />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Up to 4 photos · helps vendor estimate
          </p>

          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            className="btn-3d w-full relative overflow-hidden rounded-2xl py-3.5 bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-bold text-base shadow-gold-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 3s linear infinite",
              }}
            />
            <Send className="relative h-5 w-5" />
            <span className="relative">{sending ? "Sending to vendors..." : "Send to vendors"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
