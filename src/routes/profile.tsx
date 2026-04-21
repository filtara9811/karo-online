import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Phone, Mail, MapPin, QrCode, Pencil, Check,
  Facebook, Instagram, Youtube, Linkedin, Send, Twitter,
  IdCard, Users, Wallet, PackageCheck, FileCheck2, Building2,
  Store, LogOut, ShieldCheck, FileText, Headphones,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Karo Online" },
      { name: "description", content: "Manage your business cards, KYC, bank & order details." },
    ],
  }),
  component: ProfilePage,
});

type BizCard = {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  code: string;
  shre: string;
  accent: string;
};

const INITIAL_CARDS: BizCard[] = [
  {
    id: "c1",
    name: "Filipra Private Limited",
    contact: "+91 98xxx xxxxx",
    email: "filipra@karo.online",
    address: "Delhi 6, India",
    code: "Ashu 9811",
    shre: "8766",
    accent: "from-[#f59e0b] to-[#b45309]",
  },
  {
    id: "c2",
    name: "Karo Online Services",
    contact: "+91 88xxx xxxxx",
    email: "hello@karo.online",
    address: "Bandra W, Mumbai",
    code: "Karo 4521",
    shre: "5421",
    accent: "from-[#d4af37] to-[#7a5a0d]",
  },
  {
    id: "c3",
    name: "+ Add new business",
    contact: "Tap to create",
    email: "—",
    address: "—",
    code: "New",
    shre: "0",
    accent: "from-[#e2e8f0] to-[#94a3b8]",
  },
];

const TILES = [
  { id: "personal", label: "Personal", sub: "Details", Icon: IdCard, tone: "emerald" },
  { id: "refferal", label: "Refferal | program", sub: "Resaling. | Affiliate", Icon: Users, tone: "amber" },
  { id: "wallet", label: "MY", sub: "E-walit", Icon: Wallet, tone: "amber" },
  { id: "order", label: "My", sub: "order", Icon: PackageCheck, tone: "amber" },
] as const;

const ROWS = [
  { id: "profile", label: "Profile", sub: "Details", Icon: User },
  { id: "kyc", label: "KYC", sub: "image upload GST", Icon: FileCheck2 },
  { id: "bank", label: "Bank", sub: "Details", Icon: Building2 },
  { id: "business", label: "Business", sub: "Details", Icon: Store },
  { id: "logout", label: "Account", sub: "Logout", Icon: LogOut },
] as const;

const SOCIALS = [
  { Icon: Facebook, color: "#1877F2" },
  { Icon: Instagram, color: "#E4405F" },
  { Icon: Twitter, color: "#000" },
  { Icon: Send, color: "#0088cc" },
  { Icon: Youtube, color: "#FF0000" },
  { Icon: Linkedin, color: "#0A66C2" },
];

function ProfilePage() {
  const router = useRouter();
  const [cards, setCards] = useState<BizCard[]>(INITIAL_CARDS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [editing, setEditing] = useState<BizCard | null>(null);
  const [activeTile, setActiveTile] = useState<string>("personal");
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Track which card is centered
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      const idx = Math.round(el.scrollLeft / w);
      setActiveIdx(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.99_0.01_85)] via-white to-[oklch(0.97_0.02_85)] pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-xl bg-white/80 border-b border-[color:oklch(0.78_0.14_82/0.25)]">
        <button
          onClick={() => router.history.back()}
          className="h-10 w-10 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 transition"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-[#b45309]" />
        </button>
        <h1 className="font-display text-lg bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent font-bold">
          My Account
        </h1>
        <div className="h-10 w-10 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)]">
          <span className="text-[#b45309] text-xs font-bold">{cards[activeIdx]?.shre}</span>
        </div>
      </header>

      {/* Swipeable business cards (credit-card proportions ~1.586:1) */}
      <section className="pt-5">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-3 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {cards.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setEditing(card)}
              className="relative snap-center flex-shrink-0 w-[78%] max-w-[320px] text-left"
              style={{ aspectRatio: "1.586 / 1" }}
            >
              <div className="relative h-full w-full rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-br from-[oklch(0.99_0.02_88)] via-white to-[oklch(0.96_0.04_85)] shadow-[0_8px_24px_-8px_rgba(212,175,55,0.55)]">
                {/* Gold corner accents */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[oklch(0.84_0.15_85/0.35)] to-transparent" />
                <div className="absolute bottom-0 left-0 w-20 h-12 bg-gradient-to-tr from-[oklch(0.88_0.12_88/0.4)] to-transparent" />

                {/* Top label */}
                <div className="relative px-3 pt-2.5">
                  <span className="text-[8px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.12_82)] italic font-semibold">
                    Personal | card
                  </span>
                  <h3 className={`font-display text-[13px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight truncate`}>
                    {card.name}
                  </h3>
                </div>

                {/* Middle: avatar + details + QR */}
                <div className="relative px-3 mt-1.5 flex items-start gap-2">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.7)] bg-gradient-to-br from-sky-200 to-emerald-200 flex-shrink-0 shadow-sm">
                    <img src={avatarUser} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-[3px] text-[8.5px] text-slate-700">
                    <Row Icon={User} text="Name" />
                    <Row Icon={Phone} text="Contact" />
                    <Row Icon={Mail} text="Gmail" />
                    <Row Icon={MapPin} text="Address" />
                  </div>
                  <div className="h-11 w-11 grid place-items-center rounded-md bg-white border border-[color:oklch(0.78_0.14_82/0.5)] flex-shrink-0">
                    <QrCode className="h-9 w-9 text-slate-800" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Mini socials */}
                <div className="relative mt-1 flex items-center justify-center gap-2 px-3">
                  {SOCIALS.map(({ Icon, color }, i) => (
                    <Icon key={i} className="h-2.5 w-2.5" style={{ color }} />
                  ))}
                </div>

                {/* Footer band — gold theme */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] px-3 py-1.5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-6 w-6 rounded-full overflow-hidden border border-white/80 bg-white flex-shrink-0">
                      <img src={avatarUser} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="leading-tight min-w-0">
                      <p className="text-[9px] font-bold truncate">Personal | Details</p>
                      <p className="text-[7px] opacity-90 truncate">Code : {card.code}</p>
                    </div>
                  </div>
                  <div className="text-right leading-tight flex-shrink-0">
                    <Check className="h-3 w-3 ml-auto" strokeWidth={3} />
                    <p className="text-[7px] mt-0.5">Shre | {card.shre}</p>
                  </div>
                </div>
              </div>

              {/* Edit hint */}
              <span className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.6)] shadow">
                <Pencil className="h-3 w-3 text-[#b45309]" />
              </span>
            </motion.button>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-1">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? "w-6 bg-[#d4af37]" : "w-1.5 bg-[color:oklch(0.78_0.14_82/0.4)]"
              }`}
            />
          ))}
        </div>
      </section>

      {/* 4 Tile strip */}
      <section className="px-4 mt-4">
        <div className="rounded-3xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 p-3 flex items-center justify-between shadow-lg">
          {TILES.map((t) => {
            const active = activeTile === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveTile(t.id)}
                className="flex flex-col items-center gap-1 flex-1 min-w-0"
              >
                <div
                  className={`h-14 w-14 rounded-2xl grid place-items-center border-2 shadow-md transition-all ${
                    active
                      ? "bg-emerald-500 border-emerald-300 scale-105"
                      : "bg-white border-white/60"
                  }`}
                >
                  <t.Icon
                    className={`h-7 w-7 ${active ? "text-white" : "text-amber-700"}`}
                    strokeWidth={1.8}
                  />
                  {active && (
                    <span className="absolute mt-7 ml-7 h-4 w-4 rounded-full bg-emerald-600 border-2 border-white grid place-items-center">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-white text-center leading-tight font-medium">
                  {t.label}
                  <br />
                  <span className="opacity-90">{t.sub}</span>
                </p>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* List rows */}
      <section className="px-4 mt-5 space-y-3">
        {ROWS.map((r, i) => (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveRow(r.id)}
            className="w-full rounded-2xl bg-white border border-amber-200/70 px-4 py-4 flex items-center gap-4 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.35)] active:shadow-md"
          >
            <div className="h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <r.Icon className="h-6 w-6 text-amber-700" strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg text-slate-400 font-light">
                {r.label} <span className="text-amber-600">|</span> {r.sub}
              </p>
            </div>
            <span className="text-amber-400 text-xl">›</span>
          </motion.button>
        ))}
      </section>

      {/* Bottom: T&C + Socials + Help FAB */}
      <section className="mt-8 px-4">
        <div className="rounded-3xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-200 px-3 py-3 flex items-center gap-2 shadow-inner">
          <Link
            to="/profile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-amber-300 active:scale-95 transition"
          >
            <FileText className="h-4 w-4 text-amber-700" />
            <ShieldCheck className="h-4 w-4 text-amber-700" />
          </Link>

          <div className="flex-1 flex items-center justify-around">
            {SOCIALS.map(({ Icon, color }, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                whileHover={{ y: -2 }}
                className="h-9 w-9 grid place-items-center rounded-full bg-white shadow-sm"
                aria-label="social"
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </motion.button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            className="h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg border-2 border-white"
            aria-label="Help"
          >
            <Headphones className="h-6 w-6" />
          </motion.button>
        </div>

        <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-500">
          <button className="hover:text-amber-700">Terms & Conditions</button>
          <span>·</span>
          <button className="hover:text-amber-700">Privacy Policy</button>
          <span>·</span>
          <button className="hover:text-amber-700">Refund</button>
        </div>
      </section>

      {/* Edit card sheet */}
      <AnimatePresence>
        {editing && (
          <EditCardSheet
            card={editing}
            onClose={() => setEditing(null)}
            onSave={(updated) => {
              setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Row detail sheet */}
      <AnimatePresence>
        {activeRow && (
          <RowDetailSheet rowId={activeRow} onClose={() => setActiveRow(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ Icon, text }: { Icon: typeof User; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-700" strokeWidth={2} />
      <span>{text}</span>
    </div>
  );
}

function EditCardSheet({
  card,
  onClose,
  onSave,
}: {
  card: BizCard;
  onClose: () => void;
  onSave: (c: BizCard) => void;
}) {
  const [draft, setDraft] = useState(card);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
      >
        <div className="h-1.5 w-12 rounded-full bg-amber-200 mx-auto mb-4" />
        <h3 className="font-display text-xl text-amber-700 font-bold mb-4">Edit Business Card</h3>

        <div className="space-y-3">
          {[
            { key: "name", label: "Business Name", Icon: Store },
            { key: "contact", label: "Contact", Icon: Phone },
            { key: "email", label: "Email", Icon: Mail },
            { key: "address", label: "Address", Icon: MapPin },
            { key: "code", label: "Code", Icon: IdCard },
          ].map(({ key, label, Icon }) => (
            <div key={key} className="relative">
              <Icon className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
              <input
                value={draft[key as keyof BizCard]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                placeholder={label}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 focus:border-amber-500 focus:bg-white outline-none transition"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold shadow-lg active:scale-95 transition"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RowDetailSheet({ rowId, onClose }: { rowId: string; onClose: () => void }) {
  const row = ROWS.find((r) => r.id === rowId);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
      >
        <div className="h-1.5 w-12 rounded-full bg-amber-200 mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-4">
          {row && <row.Icon className="h-7 w-7 text-amber-700" />}
          <h3 className="font-display text-xl text-amber-700 font-bold">
            {row?.label} | {row?.sub}
          </h3>
        </div>
        <p className="text-sm text-slate-600">
          Detailed form for <strong>{row?.label}</strong> will appear here. Tap save once filled.
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold shadow-lg active:scale-95"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
