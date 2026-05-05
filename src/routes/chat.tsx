import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Camera, Mic, Paperclip, Send, Plus, X, Volume2, Pin, Trash2,
  Image as ImageIcon, MapPin, MessageSquare, Pencil, Check, Ban, ChevronDown,
} from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  LocationSheet,
  LocationBubble, QrPayBubble, ShopBubble, InvoiceBubble,
  type LocationPayload, type QrPayPayload, type ShopCardPayload, type InvoicePayload,
} from "@/components/ChatSheets";
import { MyOrdersList } from "@/components/MyOrdersList";
import {
  useOrdersStore, getOrder, cancelOrder, clearUnread,
  STATUS_STEPS, STATUS_BADGE,
  type OrderStatus,
} from "@/lib/orders-store";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

const chatSearchSchema = z.object({
  productId: fallback(z.string(), "").default(""),
  productName: fallback(z.string(), "").default(""),
  productImage: fallback(z.string(), "").default(""),
  productPrice: fallback(z.number(), 0).default(0),
  mode: fallback(z.enum(["chat", "inquiry"]), "chat").default("chat"),
  vendorId: fallback(z.string(), "").default(""),
  orderId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/chat")({
  validateSearch: zodValidator(chatSearchSchema),
  head: () => ({
    meta: [
      { title: "Live Chat — Karo Online" },
      { name: "description", content: "Chat live with your approved vendors. Switch between vendors at the top." },
    ],
  }),
  component: ChatPage,
});

type TagColor = "red" | "blue" | "green" | "amber";
type Vendor = {
  id: string;
  name: string;
  status: "Online" | "Typing…" | "Last seen now";
  avatar: string;
  pinned?: boolean;
  tag?: { color: TagColor; label: string } | null;
};

type Msg = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  read?: boolean;
  product?: { name: string; image: string; price: number };
  image?: string;
  location?: LocationPayload;
  qrPay?: QrPayPayload;
  shop?: ShopCardPayload;
  invoice?: InvoicePayload;
  kind?: "inquiry" | "chat";
  edited?: { at: string; original: string } | null;
  deleted?: { at: string; original: string } | null;
};

type QuickChip = { label: string; emoji: string };
const DEFAULT_CHIPS: QuickChip[] = [
  { label: "When can you come?", emoji: "⏰" },
  { label: "Send price", emoji: "💰" },
  { label: "Share location", emoji: "📍" },
  { label: "Send photo", emoji: "📷" },
  { label: "Confirm booking", emoji: "✅" },
];

const INITIAL_VENDORS: Vendor[] = [
  { id: "v1", name: "Aryan | Bansal", status: "Online", avatar: avatarAryan, pinned: true },
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

const TAG_STYLES: Record<TagColor, string> = {
  red: "bg-red-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
};

function ChatPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [activeId, setActiveId] = useState<string>("v1");
  const [threads, setThreads] = useState<Record<string, Msg[]>>(SEED);
  const [draft, setDraft] = useState("");
  const [pendingProduct, setPendingProduct] = useState<{ name: string; image: string; price: number } | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [activeSheet, setActiveSheet] = useState<null | "location" | "qrpay" | "shop" | "invoice">(null);
  const [showVendorsSheet, setShowVendorsSheet] = useState(false);
  const [editing, setEditing] = useState<{ msgId: string; text: string } | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [vendorActionFor, setVendorActionFor] = useState<string | null>(null);
  const [editedInfoFor, setEditedInfoFor] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [chips, setChips] = useState<QuickChip[]>(DEFAULT_CHIPS);
  const [editingChip, setEditingChip] = useState<{ index: number | null; label: string; emoji: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<number | null>(null);
  const chipPressTimer = useRef<number | null>(null);

  const active = vendors.find((v) => v.id === activeId)!;
  const msgs = threads[activeId] ?? [];
  const sortedVendors = [...vendors].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  // Handle incoming product
  useEffect(() => {
    if (!search.productId || !search.productImage) return;
    const product = { name: search.productName, image: search.productImage, price: search.productPrice };
    if (search.mode === "inquiry") {
      const inquiryMsg: Msg = {
        id: `${Date.now()}-inq`, from: "me",
        text: `Hi, I'm interested in this item and would like more details.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: true, product, kind: "inquiry",
      };
      setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), inquiryMsg] }));
      setTimeout(() => {
        const reply: Msg = {
          id: `${Date.now()}-r`, from: "them",
          text: "Thank you for your inquiry! I'll share full details shortly. 🙏",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), reply] }));
      }, 1400);
    } else {
      setPendingProduct(product);
    }
    navigate({ to: "/chat", search: {} as never, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.productId, search.mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeId, msgs.length]);

  const send = () => {
    if (!draft.trim() && !pendingProduct && !pendingImage) return;
    const newMsg: Msg = {
      id: `${Date.now()}`, from: "me",
      text: draft.trim() || (pendingImage ? "📷 Photo" : "Interested in this product"),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
      product: pendingProduct ?? undefined,
      image: pendingImage ?? undefined,
    };
    setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), newMsg] }));
    setDraft(""); setPendingProduct(null); setPendingImage(null);
    setTimeout(() => {
      const reply: Msg = {
        id: `${Date.now()}-r`, from: "them",
        text: "Theek hai 👍",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), reply] }));
    }, 1400);
  };

  const pushMyMessage = (partial: Partial<Msg>, fallbackText: string) => {
    const newMsg: Msg = {
      id: `${Date.now()}`, from: "me",
      text: partial.text || fallbackText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
      ...partial,
    };
    setThreads((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), newMsg] }));
  };

  // ===== Voice: hold-to-talk speech-to-text =====
  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setDraft((finalText + interim).trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
  };
  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setRecording(false);
    setTimeout(() => { if (draft.trim()) send(); }, 250);
  };

  // ===== TTS: speak a message =====
  const speakMessage = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    window.speechSynthesis.speak(u);
  };

  // ===== File handlers =====
  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPendingImage(url);
    e.target.value = "";
  };

  // ===== Long-press to edit =====
  const startLongPress = (msgId: string) => {
    longPressTimer.current = window.setTimeout(() => setLongPressMsg(msgId), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const beginEdit = (m: Msg) => {
    setEditing({ msgId: m.id, text: m.text });
    setLongPressMsg(null);
  };
  const saveEdit = () => {
    if (!editing) return;
    setThreads((p) => ({
      ...p,
      [activeId]: (p[activeId] ?? []).map((m) =>
        m.id === editing.msgId
          ? { ...m, text: editing.text, edited: { at: new Date().toLocaleString(), original: m.text } }
          : m
      ),
    }));
    setEditing(null);
  };
  const deleteMessage = (msgId: string) => {
    setThreads((p) => ({
      ...p,
      [activeId]: (p[activeId] ?? []).map((m) =>
        m.id === msgId ? { ...m, deleted: { at: new Date().toLocaleString(), original: m.text }, text: "🗑 Message deleted" } : m
      ),
    }));
    setLongPressMsg(null);
  };
  const togglePin = (id: string) => {
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, pinned: !v.pinned } : v)));
  };
  const setVendorTag = (id: string, color: TagColor, label: string) => {
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, tag: { color, label } } : v)));
  };
  const clearVendorTag = (id: string) => {
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, tag: null } : v)));
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#f4f4f6] to-[#e9eaee] flex flex-col overflow-hidden">
      {/* Top vendor strip — back/help removed */}
      <div className="flex-shrink-0 bg-white border-b border-[color:oklch(0.78_0.14_82/0.25)] px-3 py-2.5">
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
          {sortedVendors.map((v) => {
            const isActive = v.id === activeId;
            return (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                onContextMenu={(e) => { e.preventDefault(); setVendorActionFor(v.id); }}
                onTouchStart={() => { longPressTimer.current = window.setTimeout(() => setVendorActionFor(v.id), 500); }}
                onTouchEnd={cancelLongPress}
                className="relative flex-shrink-0 active:scale-90 transition"
                aria-label={v.name}
              >
                <span
                  className={`relative block h-12 w-12 rounded-full overflow-hidden border-2 transition-all ${
                    isActive ? "border-[#d97706] shadow-[0_4px_14px_-2px_rgba(217,119,6,0.55)] scale-110" : "border-white shadow-sm"
                  }`}
                >
                  <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                </span>
                {v.pinned && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#d97706] grid place-items-center border border-white">
                    <Pin className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
                {v.tag && (
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px text-[8px] font-bold rounded-full ${TAG_STYLES[v.tag.color]} border border-white whitespace-nowrap max-w-[60px] truncate`}>
                    {v.tag.label}
                  </span>
                )}
                {isActive && !v.tag && (
                  <motion.span layoutId="vendor-pin" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#d97706] border-2 border-white" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowVendorsSheet(true)}
            className="ml-auto flex-shrink-0 h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border-2 border-white shadow-sm active:scale-90"
            aria-label="My Orders"
          >
            <span className="text-xs font-bold text-[color:oklch(0.45_0.08_85)]">{vendors.length}+</span>
          </button>
        </div>
      </div>

      {/* Active vendor header — close (X) on right closes the chat sheet back to previous page */}
      <div className="flex-shrink-0 bg-white px-3 py-2.5 flex items-center justify-between border-b-2 border-[#fbbf24] gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="h-9 w-9 rounded-full overflow-hidden border border-[color:oklch(0.78_0.14_82/0.4)] flex-shrink-0">
            <img src={active.avatar} alt={active.name} className="h-full w-full object-cover" />
          </span>
          <div className="leading-tight min-w-0">
            <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
              Vander | {active.name.split(" | ")[0]}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">{active.status}</p>
          </div>
        </div>
        <button aria-label="Call" className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 flex-shrink-0">
          <Phone className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
        </button>
        <button
          onClick={() => { try { window.history.length > 1 ? window.history.back() : navigate({ to: "/home" }); } catch { navigate({ to: "/home" }); } }}
          aria-label="Close chat"
          className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 flex-shrink-0"
        >
          <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {msgs.map((m) => (
            <motion.div
              key={m.id} layout
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                onTouchStart={() => m.from === "me" && !m.deleted && startLongPress(m.id)}
                onTouchEnd={cancelLongPress}
                onContextMenu={(e) => { if (m.from === "me" && !m.deleted) { e.preventDefault(); setLongPressMsg(m.id); } }}
                className={`relative max-w-[78%] px-3.5 py-2 rounded-2xl shadow-sm ${
                  m.from === "me"
                    ? "bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[color:oklch(0.22_0.05_240)] rounded-br-sm"
                    : "bg-white border border-[color:oklch(0.78_0.14_82/0.25)] text-[color:oklch(0.22_0.05_30)] rounded-bl-sm"
                } ${m.edited ? "opacity-90" : ""} ${m.deleted ? "opacity-60" : ""}`}
              >
                {m.image && !m.deleted && (
                  <img src={m.image} alt="attachment" className="mb-1.5 -mx-1 rounded-xl max-h-48 object-cover" />
                )}
                {m.location && !m.deleted && <LocationBubble loc={m.location} />}
                {m.qrPay && !m.deleted && <QrPayBubble q={m.qrPay} />}
                {m.shop && !m.deleted && <ShopBubble s={m.shop} />}
                {m.invoice && !m.deleted && <InvoiceBubble inv={m.invoice} />}
                {m.product && !m.deleted && (
                  <div className="mb-2 -mx-1 rounded-xl bg-white/90 border border-black/5 overflow-hidden">
                    <div className="flex items-center gap-2 p-2">
                      <img src={m.product.image} alt={m.product.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {m.kind === "inquiry" && (
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#ea580c] mb-0.5">Inquiry</p>
                        )}
                        <p className="text-xs font-semibold text-[#1f2937] truncate">{m.product.name}</p>
                        <p className="text-sm font-bold text-[#1f2937] mt-0.5">₹{m.product.price.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
                <p className={`text-sm leading-snug whitespace-pre-wrap ${m.edited ? "italic" : ""} ${m.deleted ? "italic blur-[1.2px] text-gray-500" : ""}`}>{m.text}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1.5">
                  {!m.deleted && (
                    <button
                      onClick={() => speakMessage(m.text)}
                      aria-label="Read aloud"
                      className="h-5 w-5 grid place-items-center rounded-full bg-white/60 active:scale-90"
                    >
                      <Volume2 className="h-3 w-3 text-[color:oklch(0.40_0.05_30)]" />
                    </button>
                  )}
                  {m.edited && !m.deleted && (
                    <button
                      onClick={() => setEditedInfoFor(m.id)}
                      className="text-[9px] italic text-[color:oklch(0.45_0.05_30/0.8)] underline"
                    >
                      edited
                    </button>
                  )}
                  {m.deleted && (
                    <span className="text-[9px] italic text-red-500">deleted</span>
                  )}
                  <span className="text-[9px] text-[color:oklch(0.45_0.05_30/0.7)]">{m.time}</span>
                  {m.from === "me" && !m.deleted && (
                    <span className={`text-[10px] font-bold ${m.read ? "text-sky-600" : "text-[color:oklch(0.55_0.05_30)]"}`}>✓✓</span>
                  )}
                </div>

                {/* Long-press action menu for own message */}
                {longPressMsg === m.id && m.from === "me" && !m.deleted && (
                  <div className="absolute -top-9 right-0 bg-white shadow-lg rounded-full px-2 py-1 flex items-center gap-1 border border-black/10 z-10">
                    <button onClick={() => beginEdit(m)} className="h-7 w-7 grid place-items-center rounded-full hover:bg-[#fef3c7] active:scale-90" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5 text-[#d97706]" />
                    </button>
                    <button onClick={() => deleteMessage(m.id)} className="h-7 w-7 grid place-items-center rounded-full hover:bg-red-50 active:scale-90" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                    <button onClick={() => setLongPressMsg(null)} className="h-7 w-7 grid place-items-center rounded-full hover:bg-gray-100 active:scale-90" aria-label="Close">
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {active.status === "Typing…" && (
          <div className="flex justify-start pl-2">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-[color:oklch(0.45_0.05_30)]" />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Quick reply chips — long-press to edit, + to add */}
      <div className="flex-shrink-0 px-3 pt-1.5 pb-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 w-max">
          {chips.map((chip, i) => (
            <motion.button
              key={`${chip.label}-${i}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setDraft(chip.label)}
              onContextMenu={(e) => { e.preventDefault(); setEditingChip({ index: i, label: chip.label, emoji: chip.emoji }); }}
              onTouchStart={() => { chipPressTimer.current = window.setTimeout(() => setEditingChip({ index: i, label: chip.label, emoji: chip.emoji }), 500); }}
              onTouchEnd={() => { if (chipPressTimer.current) { clearTimeout(chipPressTimer.current); chipPressTimer.current = null; } }}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-95 transition"
            >
              <span className="text-xs">{chip.emoji}</span>
              <span className="text-[11px] font-display font-semibold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap">{chip.label}</span>
            </motion.button>
          ))}
          <button
            onClick={() => setEditingChip({ index: null, label: "", emoji: "✨" })}
            aria-label="Add quick reply"
            className="flex-shrink-0 h-7 w-7 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[#d4af37]/40 shadow-sm active:scale-90"
          >
            <Plus className="h-3.5 w-3.5 text-[#92400e]" strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* Pending attachments */}
      {(pendingProduct || pendingImage) && (
        <div className="flex-shrink-0 px-3 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#fb923c]/40 shadow-sm">
            {pendingImage ? (
              <img src={pendingImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <img src={pendingProduct!.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#ea580c]">{pendingImage ? "Photo attached" : "Inquire about:"}</p>
              <p className="text-xs font-semibold text-[#1f2937] truncate">
                {pendingImage ? "Tap send to share" : `${pendingProduct!.name} — ₹${pendingProduct!.price.toLocaleString()}`}
              </p>
            </div>
            <button onClick={() => { setPendingProduct(null); setPendingImage(null); }} aria-label="Remove" className="h-7 w-7 grid place-items-center text-[#6b7280] active:scale-90">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="flex-shrink-0 px-3 pt-2 pb-2 bg-transparent">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.35)] px-3 py-2 shadow-sm">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={recording ? "🎙️ Listening…" : "| Quick message……"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:italic placeholder:text-[#9ca3af]"
            />
            {/* Camera ↔ Send swap based on draft */}
            {draft.trim() ? (
              <button
                onClick={send}
                aria-label="Send"
                className="h-8 w-8 grid place-items-center rounded-full bg-gradient-to-br from-[#1f2937] to-black active:scale-90 shadow"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            ) : (
              <button aria-label="Camera" onClick={() => cameraInputRef.current?.click()} className="h-8 w-8 grid place-items-center active:scale-90">
                <Camera className="h-4 w-4 text-[color:oklch(0.50_0.05_30)]" />
              </button>
            )}
            <button
              aria-label="Hold to record"
              onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={() => recording && stopRecording()}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }} onTouchEnd={stopRecording}
              className={`h-8 w-8 grid place-items-center rounded-full active:scale-90 transition ${recording ? "bg-red-500 animate-pulse" : "bg-[#f3f4f6]"}`}
            >
              <Mic className={`h-4 w-4 ${recording ? "text-white" : "text-[color:oklch(0.30_0.05_85)]"}`} />
            </button>
          </div>
          {/* Paperclip moved OUTSIDE composer, right side */}
          <button
            aria-label="Attach"
            onClick={() => setShowAttach(true)}
            className="h-11 w-11 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[#d4af37]/50 shadow-md grid place-items-center active:scale-90"
          >
            <Paperclip className="h-4 w-4 text-[#92400e]" />
          </button>
        </div>

        {/* hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFilePicked} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={onFilePicked} className="hidden" />

        {/* Status bar trigger — softer, less aggressive */}
        <button
          onClick={() => navigate({ to: "/status" })}
          className="mt-2 w-full py-2 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.35)] text-[color:oklch(0.30_0.05_85)] font-display font-semibold text-xs tracking-wide shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span className="text-[#d97706]">📊</span> Status — Tap to view orders
        </button>
      </div>

      {/* ===== Bottom-sheet: Camera/Gallery picker ===== */}
      <AnimatePresence>
        {/* triggered via cameraInputRef click — but we also offer a choice when clicking camera icon. We use a small inline sheet only on long-press; here we show via a separate state if needed. Simplification: camera icon directly opens camera; we offer Gallery via attach menu. */}
      </AnimatePresence>

      {/* ===== Attach grid sheet (WhatsApp-like, UI only) ===== */}
      <AnimatePresence>
        {showAttach && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAttach(false)} className="fixed inset-0 bg-black/40 z-50" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-4" />
              <h3 className="font-display font-bold text-base text-[color:oklch(0.25_0.05_85)] mb-4">Share with vendor</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: Camera, label: "Camera", color: "bg-pink-500", action: () => { cameraInputRef.current?.click(); setShowAttach(false); } },
                  { icon: ImageIcon, label: "Gallery", color: "bg-violet-500", action: () => { galleryInputRef.current?.click(); setShowAttach(false); } },
                  { icon: MapPin, label: "Location", color: "bg-emerald-500", action: () => { setShowAttach(false); setActiveSheet("location"); } },
                  { icon: MessageSquare, label: "Quick Reply", color: "bg-amber-500", action: () => { setShowAttach(false); setEditingChip({ index: null, label: "", emoji: "✨" }); } },
                ].map((it) => (
                  <button key={it.label} onClick={it.action} className="flex flex-col items-center gap-1.5 active:scale-90">
                    <span className={`h-14 w-14 rounded-2xl grid place-items-center ${it.color} shadow-md`}>
                      <it.icon className="h-6 w-6 text-white" />
                    </span>
                    <span className="text-[10px] font-semibold text-[color:oklch(0.30_0.05_85)]">{it.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== All Vendors sheet (95% height) ===== */}
      <AnimatePresence>
        {showVendorsSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowVendorsSheet(false)} className="fixed inset-0 bg-black/50 z-50" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col"
              style={{ height: "95vh" }}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 my-3" />
              <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-[color:oklch(0.25_0.05_85)]">My Orders</h3>
                <button onClick={() => setShowVendorsSheet(false)} className="h-8 w-8 grid place-items-center rounded-full bg-gray-100 active:scale-90" aria-label="Close">
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <MyOrdersList onItemClick={() => setShowVendorsSheet(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Vendor action mini-sheet (pin + tag) ===== */}
      <AnimatePresence>
        {vendorActionFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setVendorActionFor(null)} className="fixed inset-0 bg-black/50 z-[60]" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-4" />
              {(() => {
                const v = vendors.find((x) => x.id === vendorActionFor);
                if (!v) return null;
                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <img src={v.avatar} alt="" className="h-12 w-12 rounded-full" />
                      <div>
                        <p className="font-bold text-sm">{v.name}</p>
                        <p className="text-[10px] text-gray-500">{v.status}</p>
                      </div>
                    </div>
                    <button onClick={() => { togglePin(v.id); setVendorActionFor(null); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 mb-2">
                      <Pin className="h-5 w-5 text-[#d97706]" />
                      <span className="font-semibold text-sm">{v.pinned ? "Unpin from top" : "Pin to top"}</span>
                    </button>
                    <p className="text-xs font-bold text-gray-500 mt-3 mb-2">Tag this vendor</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {(["red", "blue", "green", "amber"] as TagColor[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const label = prompt("Tag label (e.g. VIP, Bulk):", v.tag?.label ?? "VIP");
                            if (label) setVendorTag(v.id, c, label);
                            setVendorActionFor(null);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border border-gray-200 active:scale-95`}
                        >
                          <span className={`h-5 w-5 rounded-full ${TAG_STYLES[c]}`} />
                          <span className="text-xs font-semibold capitalize">{c}</span>
                        </button>
                      ))}
                    </div>
                    {v.tag && (
                      <button onClick={() => { clearVendorTag(v.id); setVendorActionFor(null); }} className="w-full p-2 text-xs font-semibold text-red-500">Remove tag</button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Edit message modal ===== */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-[70]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/3 z-[70] bg-white rounded-2xl p-5 shadow-2xl">
              <h3 className="font-bold text-base mb-3">Edit message</h3>
              <textarea
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                className="w-full h-24 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#d97706]"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 rounded-full bg-[#d97706] text-white text-sm font-bold">Save</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Edited info popover ===== */}
      <AnimatePresence>
        {editedInfoFor && (() => {
          const m = msgs.find((x) => x.id === editedInfoFor);
          if (!m?.edited) return null;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditedInfoFor(null)} className="fixed inset-0 bg-black/50 z-[80]" />
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="fixed left-6 right-6 top-1/3 z-[80] bg-white rounded-2xl p-5 shadow-2xl">
                <h3 className="font-bold text-sm mb-2">Message edited</h3>
                <p className="text-[11px] text-gray-500 mb-2">Edited on {m.edited.at}</p>
                <p className="text-xs text-gray-400 italic line-through mb-1">{m.edited.original}</p>
                <p className="text-sm">{m.text}</p>
                <button onClick={() => setEditedInfoFor(null)} className="mt-3 w-full py-2 rounded-full bg-gray-100 text-sm font-semibold">Close</button>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ===== Quick reply chip editor ===== */}
      <AnimatePresence>
        {editingChip && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingChip(null)} className="fixed inset-0 bg-black/50 z-[75]" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-4 right-4 top-1/3 z-[75] bg-white rounded-2xl p-5 shadow-2xl">
              <h3 className="font-bold text-base mb-3">{editingChip.index === null ? "Add quick reply" : "Edit quick reply"}</h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={editingChip.emoji}
                  onChange={(e) => setEditingChip({ ...editingChip, emoji: e.target.value })}
                  className="w-14 p-3 text-center rounded-xl border border-gray-200 text-lg outline-none focus:border-[#d97706]"
                  maxLength={2}
                />
                <input
                  value={editingChip.label}
                  onChange={(e) => setEditingChip({ ...editingChip, label: e.target.value })}
                  placeholder="Quick reply text…"
                  className="flex-1 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#d97706]"
                  autoFocus
                />
              </div>
              <div className="flex justify-between gap-2">
                {editingChip.index !== null && (
                  <button
                    onClick={() => {
                      const idx = editingChip.index;
                      setChips((cs) => cs.filter((_, i) => i !== idx));
                      setEditingChip(null);
                    }}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-red-500"
                  >
                    Delete
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setEditingChip(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600">Cancel</button>
                  <button
                    onClick={() => {
                      if (!editingChip.label.trim()) return;
                      const next: QuickChip = { label: editingChip.label.trim(), emoji: editingChip.emoji || "✨" };
                      const idx = editingChip.index;
                      setChips((cs) => idx === null ? [...cs, next] : cs.map((c, i) => (i === idx ? next : c)));
                      setEditingChip(null);
                    }}
                    className="px-4 py-2 rounded-full bg-[#d97706] text-white text-sm font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Feature sheets: Location / QR Pay / Shop / Invoice ===== */}
      <AnimatePresence>
        {activeSheet === "location" && (
          <LocationSheet
            onClose={() => setActiveSheet(null)}
            onSend={(loc) => pushMyMessage({ location: loc, text: loc.live ? "📍 Live location shared" : "📍 Location" }, "📍 Location")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
