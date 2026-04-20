import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Camera, Mic, Paperclip, Eye, Send, Plus } from "lucide-react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Live Chat — Karo Online" },
      { name: "description", content: "Chat live with your approved vendors. Switch between vendors at the top." },
    ],
  }),
  component: ChatPage,
});

type Vendor = {
  id: string;
  name: string;
  status: "Online" | "Typing…" | "Last seen now";
  avatar: string;
};

type Msg = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  read?: boolean;
};

const VENDORS: Vendor[] = [
  { id: "v1", name: "Aryan | Bansal", status: "Online", avatar: avatarAryan },
  { id: "v2", name: "Raj | kumar", status: "Typing…", avatar: avatarRaj },
  { id: "v3", name: "Rani | kumari", status: "Online", avatar: avatarRani },
  { id: "v4", name: "Ashu | Qureshi", status: "Last seen now", avatar: avatarUser },
];

const SEED: Record<string, Msg[]> = {
  v1: [
    { id: "m1", from: "them", text: "Namaste 👋 main aap ka AC service karne aa raha hoon", time: "07:00 AM" },
    { id: "m2", from: "me", text: "Kab tak pahuch jaoge?", time: "07:01 AM", read: true },
    { id: "m3", from: "them", text: "20 minute mein. Address confirm kar dijiye please", time: "07:01 AM" },
  ],
  v2: [
    { id: "m1", from: "them", text: "Furniture repair ke liye photo bhej dijiye", time: "06:55 AM" },
    { id: "m2", from: "me", text: "Bhej raha hoon", time: "06:56 AM", read: true },
  ],
  v3: [{ id: "m1", from: "them", text: "Hi! Service ready hai", time: "07:02 AM" }],
  v4: [{ id: "m1", from: "them", text: "Quote bhej diya hai", time: "06:50 AM" }],
};

function ChatPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>("v1");
  const [threads, setThreads] = useState<Record<string, Msg[]>>(SEED);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = VENDORS.find((v) => v.id === activeId)!;
  const msgs = threads[activeId] ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeId, msgs.length]);

  const send = () => {
    if (!draft.trim()) return;
    const newMsg: Msg = {
      id: `${Date.now()}`,
      from: "me",
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
    };
    setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), newMsg] }));
    setDraft("");
    // Fake reply
    setTimeout(() => {
      const reply: Msg = {
        id: `${Date.now()}-r`,
        from: "them",
        text: "Theek hai 👍",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), reply] }));
    }, 1400);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#f4f4f6] to-[#e9eaee] flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-[color:oklch(0.20_0.02_90)]">
        <span>07:00 AM</span>
        <span className="flex items-center gap-1"><span>📶</span><span>🔋</span></span>
      </div>

      {/* Top vendor strip — approved vendors */}
      <div className="flex-shrink-0 bg-white border-b border-[color:oklch(0.78_0.14_82/0.25)] px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/quick" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.5} />
          </button>
          <div className="flex-1 flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
            {VENDORS.map((v) => {
              const isActive = v.id === activeId;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveId(v.id)}
                  className="relative flex-shrink-0 active:scale-90 transition"
                  aria-label={v.name}
                >
                  <span
                    className={`relative block h-12 w-12 rounded-full overflow-hidden border-2 transition-all ${
                      isActive
                        ? "border-[#d97706] shadow-[0_4px_14px_-2px_rgba(217,119,6,0.55)] scale-110"
                        : "border-white shadow-sm"
                    }`}
                  >
                    <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="vendor-pin"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#d97706] border-2 border-white"
                    />
                  )}
                </button>
              );
            })}
            <button
              className="flex-shrink-0 h-12 w-12 rounded-full grid place-items-center bg-[#f3f4f6] border-2 border-white shadow-sm active:scale-90"
              aria-label="More vendors"
            >
              <span className="text-xs font-bold text-[color:oklch(0.45_0.08_85)]">5+</span>
            </button>
          </div>
          <button
            className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] flex-shrink-0"
            aria-label="Help"
          >
            <span className="text-sm">❓</span>
          </button>
        </div>
      </div>

      {/* Active vendor header */}
      <div className="flex-shrink-0 bg-white px-4 py-2.5 flex items-center justify-between border-b-2 border-[#fbbf24]">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-full overflow-hidden border border-[color:oklch(0.78_0.14_82/0.4)]">
            <img src={active.avatar} alt={active.name} className="h-full w-full object-cover" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)]">
              Vander | {active.name.split(" | ")[0]}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">{active.status}</p>
          </div>
        </div>
        <button
          aria-label="Call"
          className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90"
        >
          <Phone className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[78%] px-3.5 py-2 rounded-2xl shadow-sm ${
                  m.from === "me"
                    ? "bg-gradient-to-br from-[#fde2d8] to-[#fbcdbe] text-[color:oklch(0.22_0.05_30)] rounded-br-sm"
                    : "bg-[#fde6dd] text-[color:oklch(0.22_0.05_30)] rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-snug whitespace-pre-wrap">{m.text}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <span className="text-[9px] text-[color:oklch(0.45_0.05_30/0.7)]">{m.time}</span>
                  {m.from === "me" && (
                    <span className={`text-[10px] font-bold ${m.read ? "text-sky-600" : "text-[color:oklch(0.55_0.05_30)]"}`}>
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {active.status === "Typing…" && (
          <div className="flex justify-start pl-2">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  className="h-1.5 w-1.5 rounded-full bg-[color:oklch(0.45_0.05_30)]"
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 px-3 pt-2 pb-2 bg-transparent">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.35)] px-3 py-2 shadow-sm">
            <Eye className="h-4 w-4 text-[color:oklch(0.50_0.05_30)]" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="| Quick message……"
              className="flex-1 bg-transparent text-sm outline-none placeholder:italic placeholder:text-[#9ca3af]"
            />
            <button aria-label="Camera" className="active:scale-90">
              <Camera className="h-4 w-4 text-[color:oklch(0.50_0.05_30)]" />
            </button>
            <button aria-label="Voice" className="h-7 w-7 grid place-items-center rounded-full bg-[#f3f4f6] active:scale-90">
              <Mic className="h-3.5 w-3.5 text-[color:oklch(0.30_0.05_85)]" />
            </button>
          </div>
          <button
            onClick={send}
            aria-label="Send / Attach"
            className="h-11 w-11 rounded-full bg-gradient-to-br from-[#1f2937] to-black grid place-items-center shadow-md active:scale-90"
          >
            {draft.trim() ? <Send className="h-4 w-4 text-white" /> : <Paperclip className="h-4 w-4 text-white" />}
          </button>
        </div>
        <p className="text-center text-[11px] mt-2 font-display italic text-[color:oklch(0.30_0.05_85)] underline underline-offset-2">
          Live | chat 💬
        </p>
      </div>

      {/* Quick nav back to status */}
      <button
        onClick={() => navigate({ to: "/status" })}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] grid place-items-center shadow-[0_6px_18px_-4px_rgba(217,119,6,0.6)] active:scale-90"
        aria-label="View order status"
      >
        <Plus className="h-5 w-5 text-white" strokeWidth={3} />
      </button>
    </div>
  );
}
