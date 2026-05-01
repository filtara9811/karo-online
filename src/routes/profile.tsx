import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Phone, Mail, MapPin, QrCode, Pencil, Check,
  Facebook, Instagram, Youtube, Linkedin, Send, Twitter,
  IdCard, Wallet, PackageCheck, FileCheck2, Building2,
  Store, LogOut, ShieldCheck, FileText, Headphones, Upload,
  Users, Truck, ChevronRight, X,
  Sun, Moon, Languages, LifeBuoy, Ticket, PhoneCall, AtSign,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import { useAppPrefs, LANGS, type Lang } from "@/hooks/use-app-prefs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Karo Online" },
      { name: "description", content: "Manage your business cards, KYC, bank & order details." },
    ],
  }),
  component: ProfilePage,
});

type CardType = "personal" | "wallet" | "reselling" | "orders";

type DashCard = {
  id: string;
  type: CardType;
  title: string;
  subtitle: string;
  code: string;
  badge: string;
  accent: string;
};

const CARDS: DashCard[] = [
  {
    id: "personal",
    type: "personal",
    title: "Filipra Private Limited",
    subtitle: "Personal | Card",
    code: "Ashu 9811",
    badge: "8766",
    accent: "from-[#f59e0b] to-[#b45309]",
  },
  {
    id: "wallet",
    type: "wallet",
    title: "My E-Wallet",
    subtitle: "Wallet | Card",
    code: "₹ 6,666",
    badge: "102",
    accent: "from-emerald-500 to-emerald-700",
  },
  {
    id: "reselling",
    type: "reselling",
    title: "Reselling | Affiliate",
    subtitle: "Referral | Card",
    code: "REF-AS9811",
    badge: "245",
    accent: "from-rose-500 to-rose-700",
  },
  {
    id: "orders",
    type: "orders",
    title: "My Orders",
    subtitle: "Orders | Card",
    code: "12 Active",
    badge: "84",
    accent: "from-sky-500 to-sky-700",
  },
];

const ROWS = [
  { id: "profile", labelKey: "profile", subKey: "details", Icon: User },
  { id: "kyc", labelKey: "kyc", subKey: "details", Icon: FileCheck2 },
  { id: "bank", labelKey: "bank", subKey: "details", Icon: Building2 },
  { id: "business", labelKey: "business", subKey: "details", Icon: Store },
  { id: "logout", labelKey: "account", subKey: "logout", Icon: LogOut },
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
  const { t, theme, toggleTheme } = useAppPrefs();
  const { signOut } = useAuth();
  const [activeIdx, setActiveIdx] = useState(0);
  const [editing, setEditing] = useState<DashCard | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [topSheet, setTopSheet] = useState<null | "support" | "language">(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  const activeCard = CARDS[activeIdx] ?? CARDS[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.99_0.01_85)] via-white to-[oklch(0.97_0.02_85)] pb-32">
      {/* Premium Top bar with 3 icons */}
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur-xl bg-white/85 border-b border-[color:oklch(0.78_0.14_82/0.3)]">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.history.back()}
            className="h-10 w-10 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-[#b45309]" />
          </button>

          <h1 className="font-display text-lg bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent font-bold tracking-wide">
            {t("my_account")}
          </h1>

          <div className="flex items-center gap-1.5">
            <TopIconButton
              onClick={() => setTopSheet("support")}
              aria-label={t("customer_support")}
            >
              <LifeBuoy className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
            </TopIconButton>
            <TopIconButton onClick={toggleTheme} aria-label={t("theme")}>
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
              ) : (
                <Sun className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
              )}
            </TopIconButton>
            <TopIconButton
              onClick={() => setTopSheet("language")}
              aria-label={t("language")}
            >
              <Languages className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
            </TopIconButton>
          </div>
        </div>
      </header>

      {/* Swipeable dashboard cards — wider, credit-card-ish */}
      <section className="pt-5">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-3 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {CARDS.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditing(card)}
              className="relative snap-center flex-shrink-0 w-[92%] max-w-[400px] text-left"
              style={{ aspectRatio: "1.7 / 1" }}
            >
              <DashboardCardVisual card={card} />
              <span className="absolute top-2.5 right-2.5 h-7 w-7 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.6)] shadow">
                <Pencil className="h-3.5 w-3.5 text-[#b45309]" />
              </span>
            </motion.button>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-1">
          {CARDS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? "w-6 bg-[#d4af37]" : "w-1.5 bg-[color:oklch(0.78_0.14_82/0.4)]"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Personal details only — shown when personal card is active */}
      <AnimatePresence mode="wait">
        {activeCard.type === "personal" && (
          <motion.section
            key="personal-details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="px-4 mt-5"
          >
            <CardDetails type={activeCard.type} t={t} />
          </motion.section>
        )}
      </AnimatePresence>

      {/* List rows */}
      <section className="px-4 mt-5 space-y-3">
        {ROWS.map((r, i) => (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (r.id === "logout") {
                await signOut();
                router.navigate({ to: "/" });
                return;
              }
              setActiveRow(r.id);
            }}
            className="w-full rounded-2xl bg-white border border-amber-200/70 px-4 py-4 flex items-center gap-4 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.35)] active:shadow-md"
          >
            <div className="h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <r.Icon className="h-6 w-6 text-amber-700" strokeWidth={1.8} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg text-slate-500 font-light">
                {t(r.labelKey)} <span className="text-amber-600">|</span> {t(r.subKey)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-400" />
          </motion.button>
        ))}
      </section>

      {/* Bottom: T&C + Socials + Help FAB */}
      <section className="mt-8 px-4">
        <div className="rounded-3xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-200 px-3 py-3 flex items-center gap-2 shadow-inner">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-amber-300 active:scale-95 transition">
            <FileText className="h-4 w-4 text-amber-700" />
            <ShieldCheck className="h-4 w-4 text-amber-700" />
          </button>

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
            onClick={() => setTopSheet("support")}
            className="h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg border-2 border-white"
            aria-label="Help"
          >
            <Headphones className="h-6 w-6" />
          </motion.button>
        </div>

        <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-500">
          <button className="hover:text-amber-700">{t("terms")}</button>
          <span>·</span>
          <button className="hover:text-amber-700">{t("privacy")}</button>
          <span>·</span>
          <button className="hover:text-amber-700">{t("refund")}</button>
        </div>
      </section>

      {/* Edit card sheet */}
      <AnimatePresence>
        {editing && <EditCardSheet card={editing} onClose={() => setEditing(null)} />}
      </AnimatePresence>

      {/* Row detail sheet */}
      <AnimatePresence>
        {activeRow && (
          <RowDetailSheet rowId={activeRow} onClose={() => setActiveRow(null)} />
        )}
      </AnimatePresence>

      {/* Top bar sheets */}
      <AnimatePresence>
        {topSheet === "support" && <SupportSheet onClose={() => setTopSheet(null)} />}
        {topSheet === "language" && <LanguageSheet onClose={() => setTopSheet(null)} />}
      </AnimatePresence>
    </div>
  );
}

function TopIconButton({
  children, onClick, ...rest
}: { children: React.ReactNode; onClick?: () => void; "aria-label"?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label={rest["aria-label"]}
      className="relative h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_2px_8px_-2px_rgba(212,175,55,0.5)] active:shadow-sm"
    >
      {children}
    </motion.button>
  );
}

/* -------------------- Card Visual -------------------- */
function DashboardCardVisual({ card }: { card: DashCard }) {
  if (card.type === "personal") {
    return (
      <div className="relative h-full w-full rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-br from-[oklch(0.99_0.02_88)] via-white to-[oklch(0.96_0.04_85)] shadow-[0_8px_24px_-8px_rgba(212,175,55,0.55)]">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[oklch(0.84_0.15_85/0.35)] to-transparent" />
        <div className="absolute bottom-0 left-0 w-24 h-14 bg-gradient-to-tr from-[oklch(0.88_0.12_88/0.4)] to-transparent" />
        <div className="relative px-4 pt-3">
          <span className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.12_82)] italic font-semibold">
            {card.subtitle}
          </span>
          <h3 className={`font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight truncate`}>
            {card.title}
          </h3>
        </div>
        <div className="relative px-4 mt-2 flex items-start gap-3">
          <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.7)] flex-shrink-0 shadow-sm">
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 space-y-1 text-[10px] text-slate-700">
            <MiniRow Icon={User} text="Name" />
            <MiniRow Icon={Phone} text="Contact" />
            <MiniRow Icon={Mail} text="Gmail" />
          </div>
          <div className="h-12 w-12 grid place-items-center rounded-md bg-white border border-[color:oklch(0.78_0.14_82/0.5)] flex-shrink-0">
            <QrCode className="h-10 w-10 text-slate-800" strokeWidth={1.5} />
          </div>
        </div>
        <FooterBand card={card} />
      </div>
    );
  }

  if (card.type === "wallet") {
    return (
      <div className="relative h-full w-full rounded-2xl overflow-hidden border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.55)]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-300/40 to-transparent" />
        <div className="relative px-4 pt-3">
          <span className="text-[9px] uppercase tracking-[0.22em] text-emerald-700 italic font-semibold">
            {card.subtitle}
          </span>
          <h3 className={`font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight`}>
            {card.title}
          </h3>
        </div>
        <div className="relative px-4 mt-2 flex items-end justify-between">
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Balance</p>
            <p className="font-display text-2xl font-bold text-emerald-700">{card.code}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Available · Leds {card.badge}</p>
          </div>
          <div className="h-14 w-14 rounded-full bg-emerald-500 grid place-items-center text-white shadow-lg">
            <Wallet className="h-7 w-7" />
          </div>
        </div>
        <FooterBand card={card} />
      </div>
    );
  }

  if (card.type === "reselling") {
    return (
      <div className="relative h-full w-full rounded-2xl overflow-hidden border border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-100 shadow-[0_8px_24px_-8px_rgba(244,63,94,0.55)]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-300/40 to-transparent" />
        <div className="relative px-4 pt-3">
          <span className="text-[9px] uppercase tracking-[0.22em] text-rose-700 italic font-semibold">
            {card.subtitle}
          </span>
          <h3 className={`font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight`}>
            {card.title}
          </h3>
        </div>
        <div className="relative px-4 mt-2 flex items-end justify-between">
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Referrals</p>
            <p className="font-display text-2xl font-bold text-rose-700">{card.badge}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Code · {card.code}</p>
          </div>
          <div className="h-14 w-14 rounded-full bg-rose-500 grid place-items-center text-white shadow-lg">
            <Users className="h-7 w-7" />
          </div>
        </div>
        <FooterBand card={card} />
      </div>
    );
  }

  // orders
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-sky-300 bg-gradient-to-br from-sky-50 via-white to-sky-100 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.55)]">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-300/40 to-transparent" />
      <div className="relative px-4 pt-3">
        <span className="text-[9px] uppercase tracking-[0.22em] text-sky-700 italic font-semibold">
          {card.subtitle}
        </span>
        <h3 className={`font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight`}>
          {card.title}
        </h3>
      </div>
      <div className="relative px-4 mt-2 flex items-end justify-between">
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Total Orders</p>
          <p className="font-display text-2xl font-bold text-sky-700">{card.badge}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{card.code}</p>
        </div>
        <div className="h-14 w-14 rounded-full bg-sky-500 grid place-items-center text-white shadow-lg">
          <PackageCheck className="h-7 w-7" />
        </div>
      </div>
      <FooterBand card={card} />
    </div>
  );
}

function FooterBand({ card }: { card: DashCard }) {
  return (
    <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-r ${card.accent} px-3 py-2 flex items-center justify-between text-white`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-full overflow-hidden border border-white/80 bg-white flex-shrink-0">
          <img src={avatarUser} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-[10px] font-bold truncate">{card.subtitle}</p>
          <p className="text-[8px] opacity-90 truncate">Code : {card.code}</p>
        </div>
      </div>
      <div className="text-right leading-tight flex-shrink-0">
        <Check className="h-3.5 w-3.5 ml-auto" strokeWidth={3} />
        <p className="text-[8px] mt-0.5">Shre | {card.badge}</p>
      </div>
    </div>
  );
}

function MiniRow({ Icon, text }: { Icon: typeof User; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-700" strokeWidth={2} />
      <span>{text}</span>
    </div>
  );
}

/* -------------------- Dynamic Card Details -------------------- */
function CardDetails({ type, t }: { type: CardType; t: (k: string) => string }) {
  if (type !== "personal") return null;
  return (
    <div className="space-y-2.5">
      <SectionTitle>{t("personal_details")}</SectionTitle>
      <DetailRow Icon={User} label={t("full_name")} value="Ashutosh Sharma" />
      <DetailRow Icon={Phone} label={t("contact")} value="+91 98xxx xxxxx" />
      <DetailRow Icon={Mail} label={t("email")} value="filipra@karo.online" />
      <DetailRow Icon={MapPin} label={t("address")} value="Delhi 6, India" />
      <DetailRow Icon={IdCard} label={t("member_code")} value="Ashu 9811" />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base text-amber-800 font-bold px-1">{children}</h2>
  );
}

function DetailRow({ Icon, label, value }: { Icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-amber-200/70 px-4 py-3 flex items-center gap-3 shadow-[0_2px_8px_-4px_rgba(212,175,55,0.3)]">
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-amber-50 border border-amber-200">
        <Icon className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

/* -------------------- Edit Card Sheet -------------------- */
function EditCardSheet({ card, onClose }: { card: DashCard; onClose: () => void }) {
  return (
    <SheetWrap onClose={onClose}>
      <h3 className="font-display text-xl text-amber-700 font-bold mb-4">
        Edit {card.subtitle}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Update the details displayed on your <strong>{card.title}</strong> card.
      </p>
      <div className="space-y-3">
        <FormField Icon={Store} placeholder="Title" defaultValue={card.title} />
        <FormField Icon={IdCard} placeholder="Code" defaultValue={card.code} />
      </div>
      <SheetActions onClose={onClose} onSave={onClose} />
    </SheetWrap>
  );
}

/* -------------------- Row Detail Sheet -------------------- */
function RowDetailSheet({ rowId, onClose }: { rowId: string; onClose: () => void }) {
  const { t } = useAppPrefs();
  if (rowId === "kyc") return <KycSheet onClose={onClose} />;

  const row = ROWS.find((r) => r.id === rowId);
  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        {row && <row.Icon className="h-7 w-7 text-amber-700" />}
        <h3 className="font-display text-xl text-amber-700 font-bold">
          {row && t(row.labelKey)} | {row && t(row.subKey)}
        </h3>
      </div>
      <p className="text-sm text-slate-600">
        Detailed form for <strong>{row && t(row.labelKey)}</strong> will appear here.
      </p>
      <SheetActions onClose={onClose} onSave={onClose} />
    </SheetWrap>
  );
}

/* -------------------- Support Sheet -------------------- */
function SupportSheet({ onClose }: { onClose: () => void }) {
  const { t } = useAppPrefs();
  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-display text-xl text-amber-700 font-bold">{t("customer_support")}</h3>
          <p className="text-xs text-slate-500">We're here to help — 24×7</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <SupportRow Icon={PhoneCall} label={t("call_us")} value="+91 1800-123-456" tone="emerald" />
        <SupportRow Icon={AtSign} label={t("email_us")} value="support@karo.online" tone="amber" />
        <SupportRow Icon={Ticket} label={t("raise_ticket")} value="Open a new support ticket" tone="rose" />
      </div>
    </SheetWrap>
  );
}

function SupportRow({
  Icon, label, value, tone,
}: { Icon: typeof User; label: string; value: string; tone: "emerald" | "amber" | "rose" }) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700",
    amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-700",
    rose: "from-rose-50 to-rose-100 border-rose-200 text-rose-700",
  };
  return (
    <button className={`w-full rounded-2xl bg-gradient-to-br ${tones[tone]} border px-4 py-3 flex items-center gap-3 active:scale-98 transition`}>
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-white/80">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
      <ChevronRight className="h-4 w-4 opacity-60" />
    </button>
  );
}

/* -------------------- Language Sheet -------------------- */
function LanguageSheet({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useAppPrefs();
  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#d4af37] to-[#b45309] text-white shadow-lg">
          <Languages className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-display text-xl text-amber-700 font-bold">{t("select_language")}</h3>
          <p className="text-xs text-slate-500">App will switch instantly</p>
        </div>
      </div>

      <div className="space-y-2">
        {LANGS.map((L) => {
          const active = lang === L.code;
          return (
            <motion.button
              key={L.code}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setLang(L.code as Lang);
                setTimeout(onClose, 250);
              }}
              className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 border transition ${
                active
                  ? "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-400 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.55)]"
                  : "bg-white border-amber-200/70"
              }`}
            >
              <span className="text-2xl">{L.flag}</span>
              <div className="flex-1 text-left">
                <p className="font-display text-base text-slate-800 font-semibold leading-tight">
                  {L.native}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{L.label}</p>
              </div>
              {active && (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center text-white shadow">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </SheetWrap>
  );
}


/* -------------------- KYC Sheet -------------------- */
function KycSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"aadhaar" | "pan" | "gst">("aadhaar");
  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-1">
        <FileCheck2 className="h-7 w-7 text-amber-700" />
        <h3 className="font-display text-xl text-amber-700 font-bold">KYC Verification</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Upload documents to verify your business identity.
      </p>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
        {(["aadhaar", "pan", "gst"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 rounded-xl text-xs font-semibold capitalize transition ${
              tab === t
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow"
                : "text-amber-700"
            }`}
          >
            {t === "gst" ? "GST" : t}
          </button>
        ))}
      </div>

      {tab === "aadhaar" && (
        <KycForm
          numberLabel="Aadhaar Number"
          placeholder="XXXX XXXX XXXX"
          maxLength={14}
          uploadLabel="Upload Aadhaar (front & back)"
        />
      )}
      {tab === "pan" && (
        <KycForm
          numberLabel="PAN Number"
          placeholder="ABCDE1234F"
          maxLength={10}
          uploadLabel="Upload PAN Card"
        />
      )}
      {tab === "gst" && (
        <KycForm
          numberLabel="GSTIN"
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          uploadLabel="Upload GST Certificate"
        />
      )}

      <SheetActions onClose={onClose} onSave={onClose} saveLabel="Submit for Review" />
    </SheetWrap>
  );
}

function KycForm({
  numberLabel, placeholder, maxLength, uploadLabel,
}: { numberLabel: string; placeholder: string; maxLength: number; uploadLabel: string }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] uppercase tracking-wider text-slate-500 ml-1">
          {numberLabel}
        </label>
        <div className="relative mt-1">
          <IdCard className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
          <input
            value={val}
            maxLength={maxLength}
            onChange={(e) => setVal(e.target.value.toUpperCase())}
            placeholder={placeholder}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-amber-50/60 border border-amber-200 focus:border-amber-500 focus:bg-white outline-none transition tracking-wider font-mono text-sm"
          />
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 ml-1">
          {uploadLabel}
        </span>
        <div className="mt-1 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 px-4 py-6 flex flex-col items-center justify-center gap-2 active:bg-amber-100/60 transition cursor-pointer">
          <div className="h-12 w-12 rounded-full bg-amber-100 grid place-items-center">
            <Upload className="h-6 w-6 text-amber-700" />
          </div>
          <p className="text-xs text-slate-600">Tap to upload or drag image</p>
          <p className="text-[10px] text-slate-400">JPG, PNG up to 5MB</p>
          <input type="file" accept="image/*" className="hidden" />
        </div>
      </label>
    </div>
  );
}

/* -------------------- Sheet Primitives -------------------- */
function SheetWrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-1.5 w-12 rounded-full bg-amber-200 mx-auto" />
          <button
            onClick={onClose}
            className="absolute right-5 top-5 h-8 w-8 grid place-items-center rounded-full bg-slate-100 active:scale-90 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function FormField({
  Icon, placeholder, defaultValue,
}: { Icon: typeof User; placeholder: string; defaultValue?: string }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 focus:border-amber-500 focus:bg-white outline-none transition"
      />
    </div>
  );
}

function SheetActions({
  onClose, onSave, saveLabel = "Save",
}: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return (
    <div className="flex gap-2 mt-5">
      <button
        onClick={onClose}
        className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold active:scale-95 transition"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold shadow-lg active:scale-95 transition"
      >
        {saveLabel}
      </button>
    </div>
  );
}
