import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, QrCode, Bell, X, Search as SearchIcon, Clock, Image as ImageIcon, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "keyword" | "product" | "service";
type HistoryItem = { id: string; text: string; tab: Tab };

const RECOMMENDED: Record<Tab, string[]> = {
  keyword: ["Banana", "Cherry", "Orange", "Manggo", "Apple"],
  product: ["AC Filter", "LED Bulb", "Mobile Cable", "Water Pump", "Mixer"],
  service: ["AC Repair", "Carpenter", "Painter", "Electrician", "Plumber"],
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (q: string, tab: Tab) => void;
};

const HISTORY_KEY = "karo:search-history-v1";

export function SearchOverlay({ open, onClose, onSubmit }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("keyword");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [recording, setRecording] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load history
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist history
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12))); } catch {}
  }, [history]);

  // Body lock + ESC
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Cleanup camera on close
  useEffect(() => {
    if (!scanOpen) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Simulate scan after 2.8s for demo
        setTimeout(() => {
          setScanResult("Digital Dukan #DD-4821 · Sadar Bazar");
          pushHistory("Digital Dukan #DD-4821", "product");
        }, 2800);
      } catch {
        setScanResult("Camera permission denied");
      }
    })();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanOpen]);

  const pushHistory = (text: string, t: Tab) => {
    if (!text.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.text.toLowerCase() !== text.toLowerCase());
      return [{ id: `${Date.now()}`, text, tab: t }, ...filtered].slice(0, 12);
    });
  };

  const submit = (text?: string) => {
    const q = (text ?? query).trim();
    if (!q) return;
    pushHistory(q, tab);
    onSubmit?.(q, tab);
    setQuery("");
    onClose();
  };

  const removeHistory = (id: string) => setHistory((p) => p.filter((h) => h.id !== id));
  const clearHistory = () => setHistory([]);

  const startVoice = () => {
    setVoiceOpen(true);
    setVoiceText("");
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceText("(Voice not supported on this browser)");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setVoiceText(txt);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const closeVoice = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setRecording(false);
    setVoiceOpen(false);
  };

  const acceptVoice = () => {
    if (voiceText.trim()) {
      setQuery(voiceText.trim());
      pushHistory(voiceText.trim(), tab);
    }
    closeVoice();
  };

  const closeScan = () => {
    setScanOpen(false);
    setScanResult(null);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "keyword", label: "Keywords" },
    { key: "product", label: "Products" },
    { key: "service", label: "Services" },
  ];

  if (!open) return null;

  const filteredRecs = RECOMMENDED[tab].filter((r) =>
    !query || r.toLowerCase().includes(query.toLowerCase())
  );
  const filteredHistory = history.filter((h) => h.tab === tab || tab === "keyword");

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col" style={{ animation: "lux-fade 0.3s ease-out" }}>
      {/* Top status row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 text-[11px] font-semibold text-[#1f1f1f]">
        <span>07:00</span>
        <span className="flex items-center gap-1">📶 📊</span>
      </div>

      {/* Search bar row */}
      <div className="px-3 pt-1 pb-2 flex items-center gap-2">
        <button
          onClick={onClose}
          aria-label="Back"
          className="btn-3d h-10 w-10 grid place-items-center rounded-full active:scale-90"
        >
          <ArrowLeft className="h-5 w-5 text-[#1f1f1f]" strokeWidth={2.4} />
        </button>
        <div className="flex-1 flex items-center gap-2 rounded-full bg-[#faf8f1] border-2 border-[#e8e3d5] px-4 py-2.5 shadow-inner">
          <SearchIcon className="h-4 w-4 text-[#9ca3af]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm text-[#1f1f1f] placeholder:text-[#9ca3af]"
          />
          <button
            onClick={startVoice}
            aria-label="Voice search"
            className="h-7 w-7 grid place-items-center rounded-full active:scale-90"
          >
            <Mic className="h-4 w-4 text-[#1f1f1f]" strokeWidth={2.2} />
          </button>
        </div>
        <button
          onClick={() => setScanOpen(true)}
          aria-label="Scan QR"
          className="btn-3d h-10 w-10 grid place-items-center rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
        >
          <QrCode className="h-5 w-5 text-[#1f1f1f]" strokeWidth={2.2} />
        </button>
        <button
          aria-label="Notifications"
          className="relative btn-3d h-10 w-10 grid place-items-center rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
        >
          <Bell className="h-5 w-5 text-[#1f1f1f]" strokeWidth={2.2} />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-600 text-white text-[8px] font-bold grid place-items-center">1</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-1 flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
              tab === t.key
                ? "bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white shadow-[0_3px_8px_-2px_rgba(217,119,6,0.5)]"
                : "bg-[#f5f5f5] text-[#6b7280] border border-[#e5e7eb]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body — recommended (top) + history (bottom) */}
      <div className="flex-1 overflow-y-auto px-1">
        {/* Live suggestions */}
        <div className="px-3 pt-3">
          <p className="px-1 text-[10px] uppercase tracking-[0.22em] text-[#9ca3af] font-bold">
            Recommended
          </p>
          <ul className="mt-1.5 divide-y divide-[#f1f0eb]">
            {filteredRecs.map((r, i) => (
              <motion.li
                key={r}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => submit(r)}
                  className="w-full flex items-center gap-3 py-3 active:bg-[#faf8f1] rounded-lg px-2"
                >
                  <span className="h-9 w-9 rounded-md border border-[#d1d5db] grid place-items-center bg-white">
                    <ImageIcon className="h-4 w-4 text-[#9ca3af]" />
                  </span>
                  <span className="flex-1 text-left text-base text-[#1f1f1f] font-display">{r}</span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </button>
              </motion.li>
            ))}
            {filteredRecs.length === 0 && (
              <li className="py-6 text-center text-xs text-[#9ca3af]">No matches</li>
            )}
          </ul>
        </div>

        {/* History */}
        {filteredHistory.length > 0 && (
          <div className="px-3 pt-4">
            <div className="px-1 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#9ca3af] font-bold">
                History search
              </p>
              <button onClick={clearHistory} className="text-[10px] text-[#dc2626] font-bold underline">
                Clear all
              </button>
            </div>
            <ul className="mt-1.5 divide-y divide-[#f1f0eb]">
              {filteredHistory.map((h, i) => (
                <motion.li
                  key={h.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 py-3 px-2"
                >
                  <span className="h-9 w-9 rounded-md border border-[#d1d5db] grid place-items-center bg-white">
                    <Clock className="h-4 w-4 text-[#9ca3af]" />
                  </span>
                  <button onClick={() => submit(h.text)} className="flex-1 text-left text-base text-[#1f1f1f] font-display">
                    {h.text}
                  </button>
                  <button
                    onClick={() => removeHistory(h.id)}
                    aria-label="Remove"
                    className="h-7 w-7 grid place-items-center rounded-full active:scale-90"
                  >
                    <X className="h-4 w-4 text-[#9ca3af]" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* Voice bottom sheet */}
      <AnimatePresence>
        {voiceOpen && (
          <>
            <motion.button
              aria-label="Close voice"
              onClick={closeVoice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[101] rounded-t-3xl bg-white border-t-2 border-[#e8e3d5] pb-[env(safe-area-inset-bottom)] px-6 pt-6 shadow-2xl"
            >
              <div className="flex justify-center mb-3">
                <span className="h-1.5 w-14 rounded-full bg-[#d4af37]/60" />
              </div>
              <p className="text-center text-[11px] uppercase tracking-[0.25em] text-[#9ca3af] font-bold">
                Google Voice Search
              </p>
              <p className="mt-3 text-center text-lg font-display text-[#1f1f1f] min-h-[60px]">
                {voiceText || (recording ? "Listening…" : "Tap mic to start")}
              </p>

              {/* Mic with animated rings */}
              <div className="my-6 grid place-items-center">
                <div className="relative h-28 w-28 grid place-items-center">
                  {recording && (
                    <>
                      <span
                        className="absolute inset-0 rounded-full bg-[#4285f4]/30"
                        style={{ animation: "ping-slow 1.4s ease-out infinite" }}
                      />
                      <span
                        className="absolute inset-3 rounded-full bg-[#ea4335]/30"
                        style={{ animation: "ping-slow 1.4s ease-out infinite 0.3s" }}
                      />
                      <span
                        className="absolute inset-6 rounded-full bg-[#fbbc05]/30"
                        style={{ animation: "ping-slow 1.4s ease-out infinite 0.6s" }}
                      />
                    </>
                  )}
                  <button
                    onClick={recording ? closeVoice : startVoice}
                    className="relative h-20 w-20 rounded-full grid place-items-center bg-gradient-to-br from-[#4285f4] via-[#ea4335] to-[#fbbc05] shadow-2xl active:scale-95"
                    aria-label={recording ? "Stop" : "Start"}
                  >
                    <Mic className="h-8 w-8 text-white" strokeWidth={2.6} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeVoice}
                  className="flex-1 py-3 rounded-2xl border-2 border-[#e5e7eb] text-[#6b7280] font-display font-bold text-sm active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={acceptVoice}
                  disabled={!voiceText.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white font-display font-bold text-sm active:scale-95 disabled:opacity-50"
                >
                  Use this
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR scanner overlay */}
      <AnimatePresence>
        {scanOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 text-white">
              <button onClick={closeScan} aria-label="Close" className="h-10 w-10 grid place-items-center rounded-full bg-white/15 active:scale-90">
                <X className="h-5 w-5" />
              </button>
              <span className="font-display text-sm font-bold">Scan QR · Digital Dukan</span>
              <Camera className="h-5 w-5 opacity-70" />
            </div>

            <div className="relative flex-1">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* Scan frame */}
              <div className="absolute inset-0 grid place-items-center">
                <div className="relative h-64 w-64">
                  {/* Corners */}
                  {[
                    "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
                    "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
                    "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                    "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
                  ].map((c, i) => (
                    <span key={i} className={`absolute h-10 w-10 border-[#fbbf24] ${c}`} />
                  ))}
                  {/* Scan line */}
                  <span
                    className="absolute left-0 right-0 h-1 rounded-full bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent shadow-[0_0_12px_#fbbf24]"
                    style={{ animation: "scan-bar 2s ease-in-out infinite" }}
                  />
                </div>
              </div>

              {/* Overlay tint */}
              <div className="absolute inset-0 bg-black/40 [mask:radial-gradient(circle_at_center,transparent_140px,black_180px)]" />

              {/* Result */}
              {scanResult && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute inset-x-4 bottom-8 rounded-2xl bg-white p-4 shadow-2xl"
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-600 font-bold">✓ Scan complete</p>
                  <p className="mt-1 font-display text-base font-bold text-[#1f1f1f]">{scanResult}</p>
                  <button
                    onClick={() => {
                      submit(scanResult);
                      closeScan();
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white font-display font-bold text-sm"
                  >
                    Open Dukan
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
