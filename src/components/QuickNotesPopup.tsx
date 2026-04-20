import { useEffect, useRef, useState } from "react";
import { X, Mic, Camera, Image as ImageIcon, Send, Volume2 } from "lucide-react";

type Props = {
  open: boolean;
  initialNote?: string;
  onClose: () => void;
  onSubmit: (data: { note: string; images: string[] }) => void;
};

/**
 * Premium speech-bubble notes popup.
 * Matches the cartoon-style mockup: pink card, character peeking, big bubble for typing,
 * camera + gallery + mic at the bottom. Voice button uses Web Speech API for speech-to-text.
 */
export function QuickNotesPopup({ open, initialNote = "", onClose, onSubmit }: Props) {
  const [note, setNote] = useState(initialNote);
  const [images, setImages] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    setNote(initialNote);
    setImages([]);
    setRecording(false);
    setSpeaking(false);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      try {
        recognitionRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 4).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string].slice(0, 4));
      reader.readAsDataURL(f);
    });
  };

  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice typing is not supported on this browser");
      return;
    }
    if (recording) {
      try { recognitionRef.current?.stop(); } catch {}
      setRecording(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setNote((prev) => (final ? (prev ? prev + " " : "") + final : prev) + (interim ? "" : ""));
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const speakNote = () => {
    if (!note.trim() || typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(note);
    u.lang = "en-IN";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.6)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm"
        style={{ animation: "ticket-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Pink rounded card */}
        <div
          className="relative rounded-[28px] p-5 pt-16 pb-5 border-[3px] border-[#1f1f1f] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)]"
          style={{
            background: "linear-gradient(160deg, #fde4e4 0%, #f9c9cd 55%, #f5b6c0 100%)",
          }}
        >
          {/* Cartoon character — pure CSS/SVG version (no external asset) */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <svg viewBox="0 0 120 120" className="h-32 w-32 drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]">
              {/* Hair */}
              <path d="M30 50 Q30 18 60 18 Q90 18 90 50 L88 60 Q70 38 60 40 Q42 42 32 60 Z" fill="#7a4a2d" />
              {/* Face */}
              <ellipse cx="60" cy="62" rx="28" ry="32" fill="#fbd9c0" />
              {/* Ears */}
              <ellipse cx="33" cy="65" rx="5" ry="7" fill="#fbd9c0" />
              <ellipse cx="87" cy="65" rx="5" ry="7" fill="#fbd9c0" />
              {/* Eyes */}
              <ellipse cx="50" cy="65" rx="2.5" ry="3.5" fill="#1f1f1f" />
              <ellipse cx="70" cy="65" rx="2.5" ry="3.5" fill="#1f1f1f" />
              {/* Smile */}
              <path d="M48 78 Q60 90 72 78" stroke="#1f1f1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              {/* Cheeks */}
              <circle cx="42" cy="76" r="3" fill="#f59ca8" opacity="0.6" />
              <circle cx="78" cy="76" r="3" fill="#f59ca8" opacity="0.6" />
              {/* Shirt collar */}
              <path d="M30 100 Q40 92 60 92 Q80 92 90 100 L90 120 L30 120 Z" fill="#f3f4f6" />
            </svg>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-20 h-9 w-9 grid place-items-center rounded-full bg-white border-2 border-[#1f1f1f] active:scale-90 shadow"
          >
            <X className="h-4 w-4 text-[#1f1f1f]" strokeWidth={2.6} />
          </button>

          {/* Speech bubble */}
          <div className="relative">
            <div
              className="relative rounded-[26px] bg-white border-[3px] border-[#1f1f1f] px-4 py-5 min-h-[140px] shadow-[0_6px_0_#1f1f1f]"
            >
              {/* Speaker icon top-right */}
              <button
                onClick={speakNote}
                aria-label="Read note aloud"
                disabled={!note.trim()}
                className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full border-2 border-[#1f1f1f] active:scale-90 transition-all ${
                  speaking
                    ? "bg-[#1f1f1f] text-white animate-pulse"
                    : "bg-[#fde4e4] text-[#1f1f1f] disabled:opacity-40"
                }`}
              >
                <Volume2 className="h-3.5 w-3.5" strokeWidth={2.6} />
              </button>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick | Notes..."
                rows={4}
                autoFocus
                className="w-full bg-transparent outline-none resize-none text-center text-[#3a3a3a] text-base font-display placeholder:text-[#9aa0a6] placeholder:italic"
              />

              {/* Image previews */}
              {images.length > 0 && (
                <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  {images.map((src, i) => (
                    <div
                      key={i}
                      className="relative h-12 w-12 rounded-lg overflow-hidden border-2 border-[#1f1f1f]"
                      style={{ animation: "ticket-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 h-4 w-4 grid place-items-center bg-black/70"
                        aria-label="Remove"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Tail */}
            <svg viewBox="0 0 40 30" className="absolute -bottom-5 left-10 h-7 w-10">
              <path d="M2 2 L38 2 L20 28 Z" fill="white" stroke="#1f1f1f" strokeWidth="3" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Action pill: camera | gallery | mic */}
          <div className="mt-7 mx-auto w-fit flex items-center gap-2 bg-white rounded-full border-[3px] border-[#1f1f1f] px-2 py-2 shadow-[0_4px_0_#1f1f1f]">
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Camera"
              className="h-12 w-14 rounded-2xl bg-[#fde4e4] border-2 border-[#1f1f1f] grid place-items-center active:scale-95"
            >
              <Camera className="h-5 w-5 text-[#1f1f1f]" strokeWidth={2.4} />
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              aria-label="Gallery"
              className="h-12 w-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] border-2 border-[#1f1f1f] grid place-items-center active:scale-95"
            >
              <ImageIcon className="h-5 w-5 text-white" strokeWidth={2.4} />
            </button>
            <button
              onClick={toggleVoice}
              aria-label="Voice typing"
              className={`h-12 w-14 rounded-2xl border-2 border-[#1f1f1f] grid place-items-center active:scale-95 transition-all ${
                recording ? "bg-red-500 animate-pulse" : "bg-[#fde4e4]"
              }`}
            >
              <Mic className={`h-5 w-5 ${recording ? "text-white" : "text-[#1f1f1f]"}`} strokeWidth={2.4} />
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Recording indicator */}
          {recording && (
            <p className="mt-3 text-center text-[11px] font-display font-bold text-red-700 animate-pulse">
              🎙️ Listening… speak now
            </p>
          )}

          {/* Send button */}
          <button
            onClick={() => onSubmit({ note, images })}
            disabled={!note.trim() && images.length === 0}
            className="btn-3d mt-5 w-full rounded-2xl py-3 bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-[3px] border-[#1f1f1f] text-white font-display font-bold text-sm shadow-[0_4px_0_#1f1f1f] active:translate-y-[2px] active:shadow-[0_2px_0_#1f1f1f] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" strokeWidth={2.6} />
            Save | Request
          </button>
        </div>
      </div>
    </div>
  );
}
