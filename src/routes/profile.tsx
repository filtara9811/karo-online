import { createFileRoute, useRouter, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Phone, Mail, MapPin, QrCode, Pencil, Check,
  Facebook, Instagram, Youtube, Linkedin, Send, Twitter,
  IdCard, Wallet, PackageCheck, FileCheck2, Building2,
  Store, LogOut, ShieldCheck, FileText, Headphones, Upload,
  Users, Truck, ChevronRight, X, LayoutGrid,
  Sun, Moon, Languages, LifeBuoy, Ticket, PhoneCall, AtSign,
  Download, Share2, Camera, PackageOpen, Gift, Bell, Headset,
  Plus, Trash2, Image as ImageIcon, Palette,
} from "lucide-react";
import { MyOrdersList } from "@/components/MyOrdersList";
import { useMyOrders } from "@/hooks/use-my-orders";
import { Star } from "lucide-react";
import { ImageCropper } from "@/components/ImageCropper";
import { ShareCardSheet } from "@/components/ShareCardSheet";
import avatarUser from "@/assets/avatar-user.png";
import karoLogo from "@/assets/karo-logo.png";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import goldUser from "@/assets/gold-user.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import goldServices from "@/assets/gold-services.png";
import goldProfile from "@/assets/gold-profile.png";
import { useAppPrefs, LANGS, type Lang } from "@/hooks/use-app-prefs";
import { useAuth, type CustomerProfile, type CardFieldVisibility, type CardCustomField } from "@/hooks/use-auth";
import { ActionPicker, type ActionOption } from "@/components/ActionPicker";
import { LegalSheet } from "@/components/LegalSheet";
import { useSocialLinks } from "@/hooks/use-social-links";
import { supabase } from "@/integrations/supabase/client";
import { ReferralPage } from "@/routes/referral";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/use-notifications";
import { OtpModal } from "@/components/OtpModal";
import { Lock } from "lucide-react";
import { KycStepFlow } from "@/components/KycStepFlow";

/**
 * Strip auto-generated synthetic auth emails (e.g. `phone-9876543210@auth.karoonline.local`)
 * so customers don't see internal placeholders. Returns "" for synthetic, original otherwise.
 */
function realEmail(value?: string | null): string {
  if (!value) return "";
  const v = value.trim();
  if (/^phone-\d+@auth\.karoonline\.local$/i.test(v)) return "";
  return v;
}

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Karo Online" },
      { name: "description", content: "Manage your Karo Online profile: personal details, KYC, wallet, business cards, and order history — all in one place." },
      { property: "og:title", content: "My Profile — Karo Online" },
      { property: "og:description", content: "Manage your Karo Online profile, KYC, wallet and order history." },
      { property: "og:url", content: "https://karoonline.in/profile" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/profile" }],
  }),
  component: () => <ProfilePage />,
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
  { id: "referral", labelKey: "Refer", subKey: "Earn", Icon: Star },
  { id: "logout", labelKey: "account", subKey: "logout", Icon: LogOut },
] as const;

const SOCIAL_META: Array<{ key: "facebook" | "instagram" | "twitter" | "telegram" | "youtube" | "linkedin" | "whatsapp"; Icon: typeof Facebook; color: string }> = [
  { key: "facebook", Icon: Facebook, color: "#1877F2" },
  { key: "instagram", Icon: Instagram, color: "#E4405F" },
  { key: "twitter", Icon: Twitter, color: "#000" },
  { key: "telegram", Icon: Send, color: "#0088cc" },
  { key: "youtube", Icon: Youtube, color: "#FF0000" },
  { key: "linkedin", Icon: Linkedin, color: "#0A66C2" },
];

export function ProfilePage({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const navigate = useNavigate();
  const { t, theme, toggleTheme } = useAppPrefs();
  const { signOut, user, profile, refreshProfile } = useAuth();
  const [activeIdx, setActiveIdx] = useState(0);
  const [editing, setEditing] = useState<DashCard | null>(null);
  const [cardSheet, setCardSheet] = useState<null | "edit" | "flip">(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [topSheet, setTopSheet] = useState<null | "support" | "language">(null);
  const [panelPicker, setPanelPicker] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [quickSheet, setQuickSheet] = useState<null | "orders" | "referral" | "leads" | "support">(null);
  const [kycPct, setKycPct] = useState<number>(0);
  const { links: socialLinks } = useSocialLinks();
  const { counts: notifCounts } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [shareBump, setShareBump] = useState(0);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ko-open-profile-edit") !== "1") return;
    sessionStorage.removeItem("ko-open-profile-edit");
    setActiveRow("profile");
  }, []);

  const activeCard = CARDS[activeIdx] ?? CARDS[0];
  const isDark = theme === "dark";

  // ---- Profile completion % (live) ----
  const profilePct = useMemo(() => {
    const fields = [
      profile?.name, profile?.phone, profile?.email,
      profile?.address, profile?.avatar_url, profile?.gender,
    ];
    const filled = fields.filter((v) => v && String(v).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  // ---- KYC completion % from kyc_verifications (aadhaar/pan/gst) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setKycPct(0); return; }
      const { data } = await supabase
        .from("kyc_verifications")
        .select("check_type, status")
        .eq("subject_user_id", user.id);
      if (cancelled) return;
      const types = ["selfie", "aadhaar", "pan", "bank"];
      const completed = new Set(
        ((data ?? []) as Array<{ check_type: string; status: string }>)
          .filter((r) => ["verified", "approved", "passed", "submitted"].includes((r.status ?? "").toLowerCase()))
          .map((r) => r.check_type),
      );
      const filled = types.filter((t) => completed.has(t)).length;
      setKycPct(Math.round((filled / types.length) * 100));
    })();
    return () => { cancelled = true; };
  }, [user?.id, activeRow]);

  // ---- Real order stats from shared store ----
  const { groups: vendors } = useMyOrders();
  const orderStats = useMemo(() => {
    const all = vendors.flatMap((v) => v.orders);
    const total = all.length;
    const pending = all.filter((o) => o.status === "placed").length;
    const active = all.filter((o) =>
      ["accepted", "processing", "packed", "shipped"].includes(o.status)
    ).length;
    const done = all.filter((o) => o.status === "delivered").length;
    const cancelled = all.filter((o) => o.status === "cancelled").length;
    const ratingAvg = 4.8; // placeholder until reviews wired
    const reviewCount = done; // 1 review per completed order placeholder
    return { total, pending, active, done, cancelled, ratingAvg, reviewCount };
  }, [vendors]);
  const orderUnread = useMemo(
    () => vendors.reduce((sum, v) => sum + v.orders.reduce((inner, o) => inner + (o.unread ?? 0), 0), 0),
    [vendors],
  );

  // ---- Direct WhatsApp share for the personal business card ----
  const shareCardDirect = async () => {
    const refCode = profile?.referral_code ?? "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const cardUrl = profile?.card_link_url?.trim() || (refCode ? `${origin}/c/${refCode}` : origin);
    const vcardUrl = refCode ? `${origin}/api/public/vcard/${refCode}` : "";
    const installUrl = `${origin}/download`;
    const name = profile?.name || "";
    const shopName = profile?.shop_name || "";
    const phone = profile?.phone || "";
    const email = realEmail(profile?.email);

    const lines: string[] = [];
    if (shopName) lines.push(`*${shopName}*`);
    if (name) lines.push(`👤 ${name}`);
    if (phone) lines.push(`📞 ${phone}`);
    if (email) lines.push(`✉️ ${email}`);
    lines.push("");
    if (vcardUrl) lines.push(`📇 Save my contact: ${vcardUrl}`);
    lines.push(`🔗 View card: ${cardUrl}`);
    lines.push(`📲 Get KaroOnline: ${installUrl}`);
    lines.push("");
    lines.push("— My Digital Business Card · KaroOnline");
    const caption = lines.join("\n");

    // Optimistic local bump so the count animates immediately
    setShareBump((n) => n + 1);
    if (user?.id) {
      const next = (profile?.card_share_count ?? 0) + shareBump + 1;
      supabase
        .from("customers")
        .update({ card_share_count: next })
        .eq("user_id", user.id)
        .then(() => { refreshProfile?.(); });
    }

    // Try to capture the card image and share via Web Share API
    let sharedAsFile = false;
    try {
      const el = document.querySelector('[data-card-capture="personal"]') as HTMLElement | null;
      if (el) {
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
        const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
        if (blob) {
          const imgFile = new File([blob], `karo-card-${refCode || "card"}.png`, { type: "image/png" });
          const navAny = navigator as Navigator & {
            canShare?: (d: { files?: File[] }) => boolean;
            share?: (d: { files?: File[]; text?: string; title?: string; url?: string }) => Promise<void>;
          };
          if (navAny.canShare?.({ files: [imgFile] }) && navAny.share) {
            await navAny.share({ files: [imgFile], text: caption, title: shopName || "My Business Card" });
            sharedAsFile = true;
          }
        }
      }
    } catch (err) {
      console.warn("Card image share failed, falling back to WhatsApp link", err);
    }

    if (!sharedAsFile) {
      const url = `https://wa.me/?text=${encodeURIComponent(caption)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
    toast.success("Card shared ✨");
  };


  // Inject live values into the visible cards
  const liveCards: DashCard[] = useMemo(() => {
    return CARDS.map((c) =>
      c.type === "orders"
        ? { ...c, code: `${orderStats.active} Active`, badge: String(orderUnread || orderStats.total) }
        : c.type === "reselling"
          ? { ...c, badge: String(notifCounts.referral) }
        : c
    );
  }, [orderStats, orderUnread, notifCounts.referral]);

  const rowUnreadBadge = (rowId: string) => {
    if (rowId === "referral") return notifCounts.referral;
    if (rowId === "profile") return notifCounts.total;
    return 0;
  };

  const TAB_META: Array<{ type: CardType; label: string; Icon: typeof User }> = [
    { type: "personal", label: "Profile", Icon: User },
    { type: "wallet", label: "My wallet", Icon: Wallet },
    { type: "reselling", label: "Earning", Icon: Users },
  ];

  const goToCard = (idx: number) => setActiveIdx(idx);

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-300 ${isDark ? "bg-[oklch(0.16_0.02_85)] text-white" : "bg-gradient-to-b from-[oklch(0.99_0.01_85)] via-white to-[oklch(0.97_0.02_85)]"}`}>
      {/* Dashboard card — slides up from bottom on tab switch */}
      <section className="pt-4 px-4 overflow-hidden">
        <div className="relative w-full max-w-[400px] mx-auto" style={{ aspectRatio: "1.7 / 1" }}>
          <AnimatePresence mode="wait" initial={false}>
            {(() => {
              const card = liveCards[activeIdx] ?? liveCards[0];
              const isPersonal = card.type === "personal";
              const startPress = () => {
                if (!isPersonal) return;
                longPressedRef.current = false;
                pressTimer.current = setTimeout(() => {
                  longPressedRef.current = true;
                  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
                  setCardSheet("flip");
                }, 480);
              };
              const cancelPress = () => {
                if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
              };
              const endPress = () => {
                cancelPress();
                if (longPressedRef.current) { longPressedRef.current = false; return; }
              };
              return (
                <motion.div
                  key={card.id}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-12%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.7 }}
                  whileTap={{ scale: 0.985 }}
                  onPointerDown={startPress}
                  onPointerUp={endPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0"
                >
                  <button
                    type="button"
                     onClick={() => {
                       if (longPressedRef.current) { longPressedRef.current = false; return; }
                       if (isPersonal) setCardSheet("edit");
                       else if (card.type === "reselling") router.navigate({ to: "/referral" });
                       else setEditing(card);
                     }}
                    className="absolute inset-0 text-left"
                    aria-label={`${card.title} card`}
                  >
                    <DashboardCardVisual
                      card={card}
                      profile={profile}
                      onCodeTap={isPersonal ? () => setCardSheet("edit") : undefined}
                      onShareTap={isPersonal ? shareCardDirect : undefined}
                      orderStats={card.type === "orders" ? orderStats : undefined}
                      shareBump={isPersonal ? shareBump : 0}
                    />
                  </button>
                  <span className="absolute top-2.5 right-2.5 h-7 w-7 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.6)] shadow pointer-events-none">
                    <Pencil className="h-3.5 w-3.5 text-[#b45309]" />
                  </span>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </section>

      {/* Quick action tiles — labels hidden until tap (then color shifts + opens sheet) */}
      <QuickTiles onPick={(s) => setQuickSheet(s)} onOpenNotifications={() => setNotifOpen(true)} orderBadge={orderUnread} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />


      {/* My Account sub-bar (title + theme/lang/support + close on right) */}
      <section className="px-4 mt-4">
        <div className={`rounded-2xl px-3 py-2.5 flex items-center gap-2 border ${isDark ? "bg-[oklch(0.20_0.03_85)] border-amber-200/20" : "bg-white border-[color:oklch(0.78_0.14_82/0.35)] shadow-[0_4px_14px_-8px_rgba(212,175,55,0.45)]"}`}>
          <h1 className="flex-1 font-display text-base bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent font-bold tracking-wide pl-1">
            {t("my_account")}
          </h1>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <TopIconButton onClick={() => setTopSheet("support")} aria-label={t("customer_support")}>
              <LifeBuoy className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
            </TopIconButton>
            <TopIconButton onClick={toggleTheme} aria-label={t("theme")}>
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
              ) : (
                <Sun className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
              )}
            </TopIconButton>
            <TopIconButton onClick={() => setTopSheet("language")} aria-label={t("language")}>
              <Languages className="h-4 w-4 text-[#b45309]" strokeWidth={2.2} />
            </TopIconButton>
            <button
              onClick={() => (onClose ? onClose() : router.history.back())}
              className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90 transition flex-shrink-0 ml-1"
              aria-label={onClose ? "Close" : "Back"}
            >
              {onClose ? <X className="h-4 w-4 text-[#b45309]" /> : <ArrowLeft className="h-4 w-4 text-[#b45309]" />}
            </button>
          </div>
        </div>
      </section>


      {/* Inline content per active card */}
      <AnimatePresence mode="wait">
        {activeCard.type === "orders" && (
          <motion.section
            key="orders-list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="px-4 mt-5"
          >
            <MyOrdersList />
          </motion.section>
        )}
      </AnimatePresence>

      {/* List rows — hidden when Orders card is active */}
      {activeCard.type !== "orders" && (
      <section className="px-4 mt-5 space-y-3">
        {ROWS.map((r, i) => {
          const rowBadge = rowUnreadBadge(r.id);
          return (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (r.id === "logout") {
                const ok = window.confirm("Kya aap sach me logout karna chahte hain?");
                if (!ok) return;
                await signOut();
                router.navigate({ to: "/" });
                return;
              }
              if (r.id === "referral") {
                router.navigate({ to: "/referral" });
                return;
              }
              setActiveRow(r.id);
            }}
            className="w-full rounded-2xl bg-white border border-amber-200/70 px-4 py-4 flex items-center gap-4 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.35)] active:shadow-md"
          >
            <div className="relative h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <r.Icon className="h-6 w-6 text-amber-700" strokeWidth={1.8} />
              {rowBadge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white shadow">
                  {rowBadge > 99 ? "99+" : rowBadge}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg text-slate-500 font-light">
                {t(r.labelKey)} <span className="text-amber-600">|</span> {t(r.subKey)}
              </p>
            </div>
            {r.id === "profile" ? (
              <ProgressRing pct={profilePct} />
            ) : r.id === "kyc" ? (
              <ProgressRing pct={kycPct} />
            ) : (
              <ChevronRight className="h-5 w-5 text-amber-400" />
            )}
          </motion.button>
        );})}
      </section>
      )}

      {/* Bottom: T&C + Socials + Help FAB */}
      <section className="mt-8 px-4">
        <div className="rounded-3xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-200 pl-3 pr-2 py-3 flex items-center gap-2 shadow-inner">
          <button
            onClick={() => setLegalSlug("terms")}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full bg-white border border-amber-300 active:scale-95 transition"
            aria-label="Legal"
          >
            <FileText className="h-4 w-4 text-amber-700" />
            <ShieldCheck className="h-4 w-4 text-amber-700" />
          </button>

          <div
            className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-hide px-1"
            style={{ scrollbarWidth: "none" }}
          >
            {SOCIAL_META.filter(({ key }) => socialLinks[key]).map(({ key, Icon, color }) => (
              <motion.a
                key={key}
                href={socialLinks[key]}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.85 }}
                whileHover={{ y: -2 }}
                className="flex-shrink-0 h-9 w-9 grid place-items-center rounded-full bg-white shadow-sm"
                aria-label={key}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </motion.a>
            ))}
            {SOCIAL_META.every(({ key }) => !socialLinks[key]) && (
              <span className="text-[10px] text-slate-400 italic px-2">No social links yet</span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setTopSheet("support")}
            className="flex-shrink-0 h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg border-2 border-white"
            aria-label="Help"
          >
            <Headphones className="h-6 w-6" />
          </motion.button>
        </div>

        <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-500">
          <button onClick={() => setLegalSlug("terms")} className="hover:text-amber-700">{t("terms")}</button>
          <span>·</span>
          <button onClick={() => setLegalSlug("privacy")} className="hover:text-amber-700">{t("privacy")}</button>
          <span>·</span>
          <button onClick={() => setLegalSlug("refund")} className="hover:text-amber-700">{t("refund")}</button>
        </div>
        <p className="text-center mt-2 text-[10px] font-display tracking-wider text-amber-700/80">
          Powered by <span className="font-semibold">Filipra Private Limited</span>
        </p>
      </section>

      <LegalSheet
        open={legalSlug !== null}
        initialSlug={legalSlug ?? undefined}
        onClose={() => setLegalSlug(null)}
      />

      {/* Edit card sheet */}
      <AnimatePresence>
        {editing && <EditCardSheet card={editing} onClose={() => setEditing(null)} />}
      </AnimatePresence>

      {/* Personal business card editor (single-press = details, long-press = flip) */}
      <AnimatePresence>
        {cardSheet && (
          <BusinessCardSheet
            mode={cardSheet}
            userId={user?.id}
            profile={profile}
            refreshProfile={refreshProfile}
            onClose={() => setCardSheet(null)}
          />
        )}
      </AnimatePresence>

      {/* Row detail sheet */}
      <AnimatePresence>
        {activeRow && (
          <RowDetailSheet rowId={activeRow} userId={user?.id} profile={profile} refreshProfile={refreshProfile} onClose={() => setActiveRow(null)} />
        )}
      </AnimatePresence>

      {/* Top bar sheets */}
      <AnimatePresence>
        {topSheet === "support" && <SupportSheet onClose={() => setTopSheet(null)} />}
        {topSheet === "language" && <LanguageSheet onClose={() => setTopSheet(null)} />}
      </AnimatePresence>

      {/* Quick action sheets (tiles below the card) */}
      <AnimatePresence>
        {quickSheet === "orders" && (
          <SheetWrap onClose={() => setQuickSheet(null)}>
            <div className="flex items-center gap-3 mb-4">
              <PackageOpen className="h-7 w-7 text-amber-700" />
              <h3 className="font-display text-xl text-amber-700 font-bold">My | Order</h3>
            </div>
            <MyOrdersList />
          </SheetWrap>
        )}
        {quickSheet === "referral" && (
          <ReferralSheetWrap onClose={() => setQuickSheet(null)} />
        )}
        {quickSheet === "leads" && (
          <SheetWrap onClose={() => setQuickSheet(null)}>
            <div className="flex items-center gap-3 mb-3">
              <Bell className="h-7 w-7 text-amber-700" />
              <h3 className="font-display text-xl text-amber-700 font-bold">My | Neds</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">Track all the service requests you've placed and their status.</p>
            <button
              onClick={() => { setQuickSheet(null); setTimeout(() => router.navigate({ to: "/orders" }), 200); }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 text-white font-semibold shadow active:scale-95 transition"
            >
              View My Requests
            </button>
          </SheetWrap>
        )}
        {quickSheet === "support" && (
          <SupportSheet onClose={() => setQuickSheet(null)} />
        )}
      </AnimatePresence>

      {/* Card share sheet (WhatsApp / copy / download) */}
      <AnimatePresence>
        {shareOpen && (() => {
          const refCode = profile?.referral_code ?? "";
          const shareUrl = typeof window !== "undefined" && refCode
            ? (profile?.card_link_url?.trim() || `${window.location.origin}/c/${refCode}`)
            : "";
          const qrSrc = shareUrl
            ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(shareUrl)}`
            : undefined;
          return (
            <ShareCardSheet
              shareUrl={shareUrl || (typeof window !== "undefined" ? window.location.origin : "")}
              title={`${profile?.name || "My"} — ${profile?.shop_name || "Karo Online Card"}`}
              imageUrl={qrSrc}
              downloadFilename={`karo-card-${refCode || "qr"}.png`}
              onClose={() => setShareOpen(false)}
            />
          );
        })()}
      </AnimatePresence>

      {/* Floating "Switch Panel" pill — sticks to bottom like home screen action bar */}
      <div
        className="fixed inset-x-0 z-30 pb-[env(safe-area-inset-bottom)] pointer-events-none"
        style={{ bottom: 0 }}
      >
        <div className="max-w-md mx-auto px-4 pb-3">
          <button
            onClick={() => setPanelPicker(true)}
            className="pointer-events-auto btn-3d w-full relative overflow-hidden rounded-full border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.45)] backdrop-blur-md flex items-center justify-center gap-2 px-5 py-3 active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,248,220,0.78) 100%)",
            }}
            aria-label="Switch panel"
          >
            <span className="h-7 w-7 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-sm">
              <LayoutGrid className="h-4 w-4 text-[#92400e]" strokeWidth={2.4} />
            </span>
            <span className="font-display text-[13px] text-gold-gradient font-bold italic tracking-tight">
              Switch Panel
            </span>
            <span className="text-[color:oklch(0.78_0.14_82)] text-[11px]">▾</span>
          </button>
        </div>
      </div>

      <ActionPicker
        open={panelPicker}
        title="Switch Panel"
        subtitle="Choose your workspace"
        options={PANEL_OPTIONS}
        shareMode
        longPressHint="Long-press to copy or share panel link"
        onSelect={(value) => {
          setPanelPicker(false);
          setTimeout(() => {
            if (value === "vendor") navigate({ to: "/vendor/dashboard" });
            else if (value === "admin") navigate({ to: "/admin" });
            else if (value === "customer") navigate({ to: "/" });
          }, 220);
        }}
        onClose={() => setPanelPicker(false)}
      />
    </div>
  );
}

const PANEL_OPTIONS: ActionOption[] = [
  { value: "customer", label: "Customer Panel", sub: "Shop · book services · orders", icon: goldProfile, shareTo: "/" },
  { value: "vendor", label: "Vendor Panel", sub: "Manage shop · leads · orders", icon: goldBriefcase, shareTo: "/vendor/dashboard" },
  { value: "admin", label: "Super Admin Panel", sub: "Platform-wide control", icon: goldServices, badge: "PRO", shareTo: "/admin" },
  { value: "staff", label: "Staff Panel", sub: "Team operations & tasks", icon: goldUser, badge: "SOON", disabled: true },
];

function ProgressRing({ pct, size = 40 }: { pct: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color = pct >= 80 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#fef3c7" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-bold" style={{ color }}>
        {pct}%
      </span>
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
type OrderStats = {
  total: number; pending: number; active: number; done: number;
  cancelled: number; ratingAvg: number; reviewCount: number;
};
function DashboardCardVisual({
  card, profile, onCodeTap, onShareTap, avatarUrl, orderStats, shareBump = 0,
}: {
  card: DashCard;
  profile?: CustomerProfile | null;
  onCodeTap?: () => void;
  onShareTap?: () => void;
  avatarUrl?: string | null;
  orderStats?: OrderStats;
  shareBump?: number;
}) {
  if (card.type === "personal") {
    const vis = (profile?.card_field_visibility ?? {}) as CardFieldVisibility;
    const showName = vis.name !== false;
    const showPhone = vis.phone !== false;
    const showEmail = vis.email !== false;
    const showAddress = vis.address !== false && !!profile?.address;
    const customs = Array.isArray(profile?.card_custom_fields) ? profile!.card_custom_fields! : [];
    const visibleCustoms = customs.filter((c) => c?.on !== false && c?.value);
    const accentColor = profile?.card_accent_color || null;
    return (
      <div data-card-capture="personal" className="relative h-full w-full rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-br from-[oklch(0.99_0.02_88)] via-white to-[oklch(0.96_0.04_85)] shadow-[0_8px_24px_-8px_rgba(212,175,55,0.55)]">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[oklch(0.84_0.15_85/0.35)] to-transparent" />
        <div className="absolute bottom-0 left-0 w-24 h-14 bg-gradient-to-tr from-[oklch(0.88_0.12_88/0.4)] to-transparent" />
        <div className="relative px-4 pt-3">
          <span className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.12_82)] italic font-semibold">
            {card.subtitle}
          </span>
          <h3 className={`font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r ${card.accent} bg-clip-text text-transparent leading-tight truncate`}>
            {profile?.shop_name || card.title}
          </h3>
        </div>
        <div className="relative px-4 mt-2 flex items-start gap-3">
          <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.7)] flex-shrink-0 shadow-sm">
            <img src={profile?.avatar_url || avatarUser} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 space-y-1 text-[10px] text-slate-700">
            {showName && <MiniRow Icon={User} text={profile?.name || "Name"} />}
            {showPhone && <MiniRow Icon={Phone} text={profile?.phone || "Contact"} />}
            {showEmail && <MiniRow Icon={Mail} text={realEmail(profile?.email) || "Email"} wrap />}
            {showAddress && <MiniRow Icon={MapPin} text={profile?.address || ""} wrap />}
            {visibleCustoms.slice(0, 3).map((c) =>
              c.type === "image" ? (
                <div key={c.id} className="flex items-center gap-1.5">
                  <img src={c.value} alt={c.label || ""} className="h-4 w-4 rounded object-cover border border-amber-200" />
                  <span className="truncate">{c.label || "Custom"}</span>
                </div>
              ) : (
                <MiniRow key={c.id} Icon={IdCard} text={c.label ? `${c.label}: ${c.value}` : c.value} />
              )
            )}
          </div>
          <div className="h-12 w-12 grid place-items-center rounded-md bg-white border border-[color:oklch(0.78_0.14_82/0.5)] flex-shrink-0">
            <QrCode className="h-10 w-10 text-slate-800" strokeWidth={1.5} />
          </div>
        </div>
        <FooterBand
          card={{ ...card, code: profile?.referral_code || card.code, badge: String((profile?.card_share_count ?? 0) + shareBump) }}
          avatarUrl={avatarUrl ?? profile?.avatar_url ?? null}
          onCodeTap={onCodeTap}
          onShareTap={onShareTap}
          accentColor={accentColor}
        />
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

  // orders — premium stats card with real values
  const s = orderStats ?? { total: 0, pending: 0, active: 0, done: 0, cancelled: 0, ratingAvg: 0, reviewCount: 0 };
  const successRate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
  const code = profile?.referral_code || "—";
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-sky-300 bg-gradient-to-br from-sky-50 via-white to-sky-100 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.55)]">
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-sky-300/40 to-transparent" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-sky-200/30 blur-2xl" />
      <div className="relative px-4 pt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[9px] uppercase tracking-[0.22em] text-sky-700 italic font-semibold">
            {card.subtitle}
          </span>
          <h3 className="font-display text-[15px] font-bold mt-0.5 bg-gradient-to-r from-sky-600 to-sky-800 bg-clip-text text-transparent leading-tight truncate">
            {card.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-bold text-amber-800">{s.ratingAvg.toFixed(1)}</span>
          <span className="text-[8px] text-amber-700/70">({s.reviewCount})</span>
        </div>
      </div>
      <div className="relative px-4 mt-1.5 flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Total Orders</p>
          <p className="font-display text-[28px] leading-none font-bold text-sky-700">{s.total}</p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <StatPill color="amber" label="Pending" value={s.pending} />
            <StatPill color="sky" label="Active" value={s.active} />
            <StatPill color="emerald" label="Done" value={s.done} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 grid place-items-center text-white shadow-lg">
            <PackageCheck className="h-6 w-6" />
          </div>
          <span className="text-[9px] font-bold text-sky-700">{successRate}% success</span>
        </div>
      </div>
      <FooterBand card={{ ...card, code, badge: String(s.total) }} avatarUrl={avatarUrl ?? profile?.avatar_url ?? null} />
    </div>
  );
}

function StatPill({ color, label, value }: { color: "amber" | "sky" | "emerald"; label: string; value: number }) {
  const cls = color === "amber"
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : color === "emerald"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : "bg-sky-100 text-sky-800 border-sky-300";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${cls}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function FooterBand({
  card, avatarUrl: _avatarUrl, onCodeTap, onShareTap, accentColor,
}: { card: DashCard; avatarUrl?: string | null; onCodeTap?: () => void; onShareTap?: () => void; accentColor?: string | null }) {
  const stop = (e: React.MouseEvent | React.PointerEvent) => { e.stopPropagation(); };
  const accentStyle = accentColor
    ? { backgroundImage: `linear-gradient(to right, ${accentColor}, ${accentColor})` }
    : undefined;
  return (
    <div
      className={`absolute bottom-0 inset-x-0 ${accentColor ? "" : `bg-gradient-to-r ${card.accent}`} px-2 py-1.5 flex items-center justify-between text-white`}
      style={accentStyle}
    >
      <button
        type="button"
        onClick={(e) => { stop(e); onCodeTap?.(); }}
        onPointerDown={stop}
        className={`flex items-center gap-2 min-w-0 rounded-full pr-2.5 pl-1 py-0.5 transition ${onCodeTap ? "hover:bg-white/15 active:bg-white/25 active:scale-[0.97]" : "pointer-events-none"}`}
        aria-label={onCodeTap ? "Open profile details" : undefined}
      >
        <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white/90 bg-white flex-shrink-0 ring-1 ring-black/10 grid place-items-center p-0.5">
          <img src={karoLogo} alt="KaroOnline" className="h-full w-full object-contain" crossOrigin="anonymous" />
        </div>
        <div className="leading-tight min-w-0 text-left">
          <p className="text-[10px] font-extrabold tracking-wide truncate">KaroOnline</p>
          <p className="text-[8px] opacity-90 truncate uppercase tracking-[0.15em]">Digital Card · {card.code}</p>
        </div>
      </button>

      {onShareTap ? (
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={(e) => { stop(e); onShareTap(); }}
          onPointerDown={stop}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#b45309] font-bold text-[11px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] border border-white/80"
          aria-label="Share card on WhatsApp"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.6} />
          <span>Share</span>
          <span className="inline-flex items-center text-[9px] font-bold opacity-80">
            ·&nbsp;
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={card.badge}
                initial={{ y: -8, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="inline-block tabular-nums"
              >
                {card.badge}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      ) : (
        <div className="text-right leading-tight flex-shrink-0 pr-1">
          <Check className="h-3.5 w-3.5 ml-auto" strokeWidth={3} />
          <p className="text-[8px] mt-0.5">Shares · {card.badge}</p>
        </div>
      )}
    </div>
  );
}

function MiniRow({ Icon, text, wrap }: { Icon: typeof User; text: string; wrap?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
      <span className={wrap ? "break-all leading-tight" : "truncate"}>{text}</span>
    </div>
  );
}




function CardDetails({ type, t, profile }: { type: CardType; t: (k: string) => string; profile?: CustomerProfile | null }) {
  if (type !== "personal") return null;
  const dash = "—";
  return (
    <div className="space-y-2.5">
      <SectionTitle>{t("personal_details")}</SectionTitle>
      <DetailRow Icon={User} label={t("full_name")} value={profile?.name || dash} />
      <DetailRow Icon={Phone} label={t("contact")} value={profile?.phone || dash} />
      <DetailRow Icon={Mail} label={t("email")} value={realEmail(profile?.email) || dash} wrap />
      <DetailRow Icon={MapPin} label={t("address")} value={profile?.address || dash} wrap />
      <DetailRow Icon={IdCard} label={t("member_code")} value={profile?.referral_code || dash} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base text-amber-800 font-bold px-1">{children}</h2>
  );
}

function DetailRow({ Icon, label, value, wrap }: { Icon: typeof User; label: string; value: string; wrap?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-amber-200/70 px-4 py-3 flex items-start gap-3 shadow-[0_2px_8px_-4px_rgba(212,175,55,0.3)]">
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-amber-50 border border-amber-200 flex-shrink-0">
        <Icon className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-sm text-slate-800 font-medium ${wrap ? "break-all" : "truncate"}`}>{value}</p>
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
function RowDetailSheet({
  rowId, userId, profile, refreshProfile, onClose,
}: { rowId: string; userId?: string; profile: CustomerProfile | null; refreshProfile: () => Promise<void>; onClose: () => void }) {
  const { t } = useAppPrefs();
  if (rowId === "profile") return <ProfileDetailsSheet userId={userId} profile={profile} refreshProfile={refreshProfile} onClose={onClose} />;
  if (rowId === "kyc" || rowId === "bank") return <KycStepFlow onClose={onClose} />;

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

function ProfileDetailsSheet({
  userId, profile, refreshProfile, onClose,
}: { userId?: string; profile: CustomerProfile | null; refreshProfile: () => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(realEmail(profile?.email));
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [subSheet, setSubSheet] = useState<null | "kyc" | "bank">(null);
  const [unlocked, setUnlocked] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const before = {
      name: profile?.name ?? "",
      email: realEmail(profile?.email),
      phone: profile?.phone ?? "",
      address: profile?.address ?? "",
    };
    const after = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };
    const phoneChanged = before.phone.replace(/\D/g, "").slice(-10) !== after.phone.replace(/\D/g, "").slice(-10);
    if (phoneChanged && before.phone) {
      const ok = confirm(
        `Aap apna mobile number "${before.phone}" se "${after.phone}" me badal rahe hain. Confirm karein?`,
      );
      if (!ok) { setSaving(false); return; }
    }
    const payload = {
      name: after.name || null,
      email: after.email || null,
      phone: after.phone || null,
      address: after.address || null,
    };
    if (profile?.id) {
      await supabase.from("customers").update(payload).eq("user_id", userId);
    } else {
      await supabase.from("customers").insert({ ...payload, user_id: userId });
    }
    try {
      const { logProfileChanges } = await import("@/lib/profile-audit");
      await logProfileChanges(userId, before, after, { verifiedViaOtp: true });
    } catch {}
    await refreshProfile();
    setSaving(false);
    setUnlocked(false);
    onClose();
  };


  const uploadCroppedAvatar = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("business-cards").upload(path, file, { upsert: true, contentType: "image/jpeg" });
      if (!error) {
        const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
        await supabase.from("customers").update({ avatar_url: data.publicUrl }).eq("user_id", userId);
        await refreshProfile();
      }
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <User className="h-7 w-7 text-amber-700" />
          <h3 className="font-display text-xl text-amber-700 font-bold">Profile | Details</h3>
        </div>
      </div>



      {/* Avatar uploader with crop */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 p-3 flex items-center gap-3 mb-4">
        <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-amber-300 flex-shrink-0 bg-white">
          <img src={profile?.avatar_url || avatarUser} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">Profile picture</p>
          <p className="text-[10px] text-slate-500">Pick from gallery, then crop to fit</p>
        </div>
        <label className="flex-shrink-0 cursor-pointer">
          <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-semibold shadow active:scale-95 transition">
            {uploading ? "…" : "Change"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.currentTarget.value = ""; }}
          />
        </label>
      </div>

      <div className="space-y-3">
        <EditableField Icon={User} label="Full name" value={name} onChange={setName} locked={!unlocked} />
        <EditableField Icon={Mail} label="Email" value={email} onChange={setEmail} inputMode="email" locked={!unlocked} />
        <EditableField Icon={Phone} label="Contact" value={phone} onChange={setPhone} inputMode="tel" locked={!unlocked} />
        <EditableField Icon={MapPin} label="Address" value={address} onChange={setAddress} locked={!unlocked} />
      </div>


      {/* KYC + Bank quick links */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => setSubSheet("kyc")}
          className="rounded-2xl bg-white border border-amber-200 px-3 py-3 flex items-center gap-2 active:scale-95 transition shadow-sm"
        >
          <div className="h-9 w-9 rounded-xl grid place-items-center bg-amber-50 border border-amber-200">
            <FileCheck2 className="h-4 w-4 text-amber-700" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">KYC</p>
            <p className="text-xs font-semibold text-slate-800">Aadhaar · PAN · GST</p>
          </div>
        </button>
        <button
          onClick={() => setSubSheet("bank")}
          className="rounded-2xl bg-white border border-amber-200 px-3 py-3 flex items-center gap-2 active:scale-95 transition shadow-sm"
        >
          <div className="h-9 w-9 rounded-xl grid place-items-center bg-amber-50 border border-amber-200">
            <Building2 className="h-4 w-4 text-amber-700" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Bank KYC</p>
            <p className="text-xs font-semibold text-slate-800">Account · IFSC · UPI</p>
          </div>
        </button>
      </div>

      <SheetActions
        onClose={onClose}
        onSave={save}
        saveLabel={saving ? "Saving…" : unlocked ? "Update" : "Unlock to Edit"}
      />

      <OtpModal
        open={otpOpen}
        phone={profile?.phone ?? ""}
        onClose={() => setOtpOpen(false)}
        onVerified={() => {
          setOtpOpen(false);
          setUnlocked(true);
        }}
      />


      <AnimatePresence>
        {pendingFile && (
          <ImageCropper
            file={pendingFile}
            shape="circle"
            onCancel={() => setPendingFile(null)}
            onCropped={uploadCroppedAvatar}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {subSheet && (
          <KycSheet
            onClose={() => setSubSheet(null)}
            initialTab={subSheet === "bank" ? "bank" : "aadhaar"}
          />
        )}
      </AnimatePresence>
    </SheetWrap>
  );
}

function EditableField({
  Icon, label, value, onChange, inputMode, locked,
}: { Icon: typeof User; label: string; value: string; onChange: (v: string) => void; inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none"; locked?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 ml-1">{label}</span>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          readOnly={locked}
          className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none transition ${
            locked
              ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
              : "bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white"
          }`}
        />
      </div>
    </label>
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
type KycTab = "aadhaar" | "pan" | "gst" | "bank";
function KycSheet({ onClose, initialTab = "aadhaar" }: { onClose: () => void; initialTab?: KycTab }) {
  const [tab, setTab] = useState<KycTab>(initialTab);
  return (
    <SheetWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-1">
        <FileCheck2 className="h-7 w-7 text-amber-700" />
        <h3 className="font-display text-xl text-amber-700 font-bold">
          {tab === "bank" ? "Bank KYC" : "KYC Verification"}
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {tab === "bank"
          ? "Add your bank account details for payouts."
          : "Upload documents to verify your business identity."}
      </p>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
        {(["aadhaar", "pan", "gst", "bank"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`py-2 rounded-xl text-[11px] font-semibold capitalize transition ${
              tab === k
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow"
                : "text-amber-700"
            }`}
          >
            {k === "gst" ? "GST" : k === "bank" ? "Bank" : k}
          </button>
        ))}
      </div>

      {tab === "aadhaar" && (
        <KycForm numberLabel="Aadhaar Number" placeholder="XXXX XXXX XXXX" maxLength={14} uploadLabel="Upload Aadhaar (front & back)" />
      )}
      {tab === "pan" && (
        <KycForm numberLabel="PAN Number" placeholder="ABCDE1234F" maxLength={10} uploadLabel="Upload PAN Card" />
      )}
      {tab === "gst" && (
        <KycForm numberLabel="GSTIN" placeholder="22AAAAA0000A1Z5" maxLength={15} uploadLabel="Upload GST Certificate" />
      )}
      {tab === "bank" && <BankForm />}

      <SheetActions onClose={onClose} onSave={onClose} saveLabel="Submit for Review" />
    </SheetWrap>
  );
}

function BankForm() {
  const [acc, setAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holder, setHolder] = useState("");
  const [upi, setUpi] = useState("");
  return (
    <div className="space-y-3">
      <EditableField Icon={User} label="Account holder name" value={holder} onChange={setHolder} />
      <EditableField Icon={Building2} label="Account number" value={acc} onChange={setAcc} inputMode="numeric" />
      <EditableField Icon={IdCard} label="IFSC code" value={ifsc} onChange={(v) => setIfsc(v.toUpperCase())} />
      <EditableField Icon={AtSign} label="UPI ID (optional)" value={upi} onChange={setUpi} />
    </div>
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

type QuickSheetKey = "orders" | "referral" | "leads" | "support";

function QuickTiles({ onPick, onOpenNotifications, orderBadge = 0 }: { onPick: (s: QuickSheetKey) => void; onOpenNotifications?: () => void; orderBadge?: number }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const { counts } = useNotifications();
  const TILES: Array<{ id: string; label: string; Icon: typeof PackageOpen; sheet: QuickSheetKey; badge: number }> = [
    { id: "referral", label: "Refferal | Ernig", Icon: Gift, sheet: "referral", badge: counts.referral },
    { id: "leads", label: "My | Neds", Icon: Bell, sheet: "leads", badge: counts.messages },
    { id: "support", label: "Manager | support", Icon: Headset, sheet: "support", badge: counts.support },
  ];
  return (
    <section className="px-4 mt-4">
      {onOpenNotifications && counts.total > 0 && (
        <button
          onClick={onOpenNotifications}
          className="mb-2 w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 active:scale-[0.98] transition"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-700 animate-pulse" />
            <span className="text-[12px] font-bold text-amber-900">{counts.total} new notifications</span>
          </span>
          <span className="text-[11px] text-amber-700 font-bold">View all →</span>
        </button>
      )}
      <div className="grid grid-cols-4 gap-2">
        {TILES.map((t2) => {
          const active = revealed === t2.id;
          return (
            <motion.button
              key={t2.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setRevealed(t2.id);
                window.setTimeout(() => onPick(t2.sheet), 260);
                window.setTimeout(() => setRevealed(null), 900);
              }}
              className={`relative rounded-2xl border py-3 px-1.5 flex flex-col items-center gap-1 transition-colors ${
                active
                  ? "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-500 shadow-md"
                  : "bg-white border-amber-200 shadow-[0_4px_12px_-6px_rgba(212,175,55,0.4)]"
              }`}
            >
              {t2.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white shadow animate-pulse z-10">
                  {t2.badge > 99 ? "99+" : t2.badge}
                </span>
              )}
              <div className={`h-8 w-8 grid place-items-center rounded-xl border transition-colors ${
                active
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-700"
                  : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
              }`}>
                <t2.Icon className={`h-5 w-5 ${active ? "text-white" : "text-amber-800"}`} strokeWidth={2} />
              </div>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    initial={{ opacity: 0, y: -2, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -2, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-[9px] font-bold leading-tight text-center truncate max-w-full text-amber-900"
                  >
                    {t2.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

function ReferralSheetWrap({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden"
        style={{ height: "95vh" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 h-10 w-10 grid place-items-center rounded-full bg-white border border-amber-300 shadow-lg active:scale-90 transition"
          aria-label="Close referral"
        >
          <X className="h-5 w-5 text-[#b45309]" strokeWidth={2.4} />
        </button>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-amber-200 z-50" />
        <div className="h-full overflow-y-auto pt-4">
          <ReferralPage />
        </div>
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

/* ===========================================================
   BUSINESS / VISITING CARD SHEET
   - mode "edit": edit fields + on/off visibility + link + share
   - mode "flip": back side image upload + share + counters
   =========================================================== */
function BusinessCardSheet({
  mode, userId, profile, refreshProfile, onClose,
}: {
  mode: "edit" | "flip";
  userId?: string;
  profile: CustomerProfile | null;
  refreshProfile: () => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"edit" | "flip">(mode);
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(realEmail(profile?.email));
  const [address, setAddress] = useState(profile?.address ?? "");
  const [company, setCompany] = useState(profile?.shop_name ?? "");
  const [link, setLink] = useState(profile?.card_link_url ?? "");
  const initialVis: Required<CardFieldVisibility> = {
    name: profile?.card_field_visibility?.name !== false,
    phone: profile?.card_field_visibility?.phone !== false,
    email: profile?.card_field_visibility?.email !== false,
    address: profile?.card_field_visibility?.address !== false,
    member_code: profile?.card_field_visibility?.member_code !== false,
    company: profile?.card_field_visibility?.company !== false,
  };
  const [vis, setVis] = useState<Required<CardFieldVisibility>>(initialVis);
  const [backImage, setBackImage] = useState(profile?.card_back_image_url ?? "");
  const [accentColor, setAccentColor] = useState<string>(profile?.card_accent_color ?? "");
  const [customFields, setCustomFields] = useState<CardCustomField[]>(
    Array.isArray(profile?.card_custom_fields) ? (profile!.card_custom_fields as CardCustomField[]) : []
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);

  const refCode = profile?.referral_code ?? "";
  const shareUrl = typeof window !== "undefined" && refCode
    ? `${window.location.origin}/c/${refCode}`
    : "";

  const previewProfile: CustomerProfile = {
    ...(profile ?? {}),
    name, phone, email, address,
    shop_name: company,
    card_link_url: link,
    card_field_visibility: vis,
    card_accent_color: accentColor || null,
    card_custom_fields: customFields,
  };

  const addCustomField = (type: "text" | "image") => {
    setCustomFields((arr) => [
      ...arr,
      { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, label: "", value: "", on: true },
    ]);
  };
  const updateCustomField = (id: string, patch: Partial<CardCustomField>) =>
    setCustomFields((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCustomField = (id: string) =>
    setCustomFields((arr) => arr.filter((c) => c.id !== id));

  const uploadCustomImage = async (id: string, file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/custom-${id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-cards").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
        updateCustomField(id, { value: data.publicUrl });
      }
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const payload = {
      name: name.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      shop_name: company.trim() || null,
      card_link_url: link.trim() || null,
      card_field_visibility: vis,
      card_back_image_url: backImage || null,
      card_accent_color: accentColor || null,
      card_custom_fields: customFields,
    };
    if (profile?.id) {
      await supabase.from("customers").update(payload).eq("user_id", userId);
    } else {
      await supabase.from("customers").insert({ ...payload, user_id: userId });
    }
    await refreshProfile();
    setSaving(false);
    onClose();
  };

  const handleBackUpload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/back-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-cards").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
        setBackImage(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("business-cards").upload(path, file, { upsert: true, contentType: "image/jpeg" });
      if (!error) {
        const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
        await supabase.from("customers").update({ avatar_url: data.publicUrl }).eq("user_id", userId);
        await refreshProfile();
      }
    } finally {
      setUploading(false);
      setPendingAvatar(null);
    }
  };

  const qrSrc = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(link.trim() || shareUrl)}`
    : "";

  const downloadQR = async () => {
    if (!qrSrc) return;
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `karo-card-${refCode || "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const shareQR = async () => {
    if (!shareUrl) return;
    const text = `Scan my Karo Online card\n${link.trim() || shareUrl}`;
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: "My Card QR", text, url: link.trim() || shareUrl });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch { /* cancelled */ }
  };

  const doShare = async () => {
    if (!userId || !shareUrl) return;
    const text = `${name || "My"} — ${company || "Business Card"}\n${shareUrl}`;
    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: "My Business Card", text, url: shareUrl });
      } else {
        const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(wa, "_blank", "noopener,noreferrer");
      }
      await supabase.from("customers")
        .update({ card_share_count: (profile?.card_share_count ?? 0) + 1 })
        .eq("user_id", userId);
      await refreshProfile();
    } catch { /* user cancelled */ }
  };

  return (
    <SheetWrap onClose={onClose}>
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
        {(["edit", "flip"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`py-2 rounded-xl text-xs font-semibold capitalize transition ${
              tab === k ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow" : "text-amber-700"
            }`}
          >
            {k === "edit" ? "Front · Details" : "Back · Image & Share"}
          </button>
        ))}
      </div>

      {tab === "edit" && (
        <div className="space-y-3">
          {/* Live preview at top */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-2">
            <div className="aspect-[1.7/1] w-full">
              <DashboardCardVisual
                card={{ id: "p", type: "personal", title: "Personal", subtitle: "Personal | Card",
                  code: refCode || "—", badge: String(profile?.card_share_count ?? 0),
                  accent: "from-[#b45309] via-[#d4af37] to-[#f59e0b]" }}
                profile={previewProfile}
              />
            </div>
            <p className="text-[10px] text-center text-amber-700/80 mt-1">Live preview — updates as you edit</p>
          </div>

          <h3 className="font-display text-lg text-amber-700 font-bold">Business Card</h3>
          <p className="text-xs text-slate-500 -mt-2">
            Edit any field. Toggle <strong>on/off</strong> to choose what shows on the card.
          </p>


          {/* Profile picture uploader */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 p-3 flex items-center gap-3">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-amber-300 flex-shrink-0 bg-white">
              <img
                src={profile?.avatar_url || avatarUser}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
                Profile picture
              </p>
              <p className="text-[10px] text-slate-500">JPG / PNG · square works best</p>
            </div>
            <label className="flex-shrink-0 cursor-pointer">
              <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-semibold shadow active:scale-95 transition">
                <Camera className="h-4 w-4" />
                {uploading ? "…" : "Change"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingAvatar(f); e.currentTarget.value = ""; }}
              />
            </label>
          </div>

          <CardFieldEditor Icon={Building2} label="Company" value={company} onChange={setCompany} on={vis.company} onToggle={(v) => setVis({ ...vis, company: v })} />
          <CardFieldEditor Icon={User} label="Full Name" value={name} onChange={setName} on={vis.name} onToggle={(v) => setVis({ ...vis, name: v })} />
          <CardFieldEditor Icon={Phone} label="Contact" value={phone} onChange={setPhone} on={vis.phone} onToggle={(v) => setVis({ ...vis, phone: v })} inputMode="tel" />
          <CardFieldEditor Icon={Mail} label="Email" value={email} onChange={setEmail} on={vis.email} onToggle={(v) => setVis({ ...vis, email: v })} inputMode="email" />
          <CardFieldEditor Icon={MapPin} label="Address" value={address} onChange={setAddress} on={vis.address} onToggle={(v) => setVis({ ...vis, address: v })} />
          <CardFieldEditor Icon={IdCard} label="Member Code" value={refCode} readOnly on={vis.member_code} onToggle={(v) => setVis({ ...vis, member_code: v })} />

          <div className="rounded-2xl bg-amber-50/60 border border-amber-200 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
              Redirect link (when someone taps your card)
            </p>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://karoonline.in/your-page"
              inputMode="url"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-amber-200 focus:border-amber-500 outline-none text-sm"
            />
            {shareUrl && (
              <p className="mt-2 text-[10px] text-slate-500 break-all">
                Share URL: <span className="text-amber-700">{shareUrl}</span>
              </p>
            )}
          </div>

          {/* Accent color picker for the orange strip */}
          <div className="rounded-2xl bg-white border border-amber-200 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Card strip color
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                "", "#d4af37", "#b45309", "#0ea5e9", "#10b981",
                "#ef4444", "#8b5cf6", "#ec4899", "#0f172a",
              ].map((c, i) => {
                const active = (accentColor || "") === c;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition ${active ? "border-slate-900 scale-110" : "border-white shadow"}`}
                    style={{ background: c || "linear-gradient(135deg,#b45309,#d4af37,#f59e0b)" }}
                    aria-label={c ? `Color ${c}` : "Default gold"}
                  />
                );
              })}
              <label className="h-8 w-8 rounded-full border-2 border-amber-200 grid place-items-center cursor-pointer overflow-hidden relative">
                <Palette className="h-4 w-4 text-amber-600" />
                <input
                  type="color"
                  value={accentColor || "#d4af37"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Custom fields */}
          <div className="rounded-2xl bg-white border border-amber-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Extra fields</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => addCustomField("text")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => addCustomField("image")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Image
                </button>
              </div>
            </div>
            {customFields.length === 0 && (
              <p className="text-[10px] text-slate-500 italic">Add your own rows — pricing, social handle, banner image, etc.</p>
            )}
            {customFields.map((c) => (
              <div key={c.id} className={`rounded-xl border p-2.5 ${c.on === false ? "bg-slate-50 border-slate-200 opacity-70" : "bg-amber-50/40 border-amber-200"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {c.type === "image" ? <ImageIcon className="h-4 w-4 text-amber-700" /> : <IdCard className="h-4 w-4 text-amber-700" />}
                  <input
                    value={c.label ?? ""}
                    onChange={(e) => updateCustomField(c.id, { label: e.target.value })}
                    placeholder="Label (e.g. Website, Offer)"
                    className="flex-1 px-2 py-1 rounded-md bg-white border border-amber-200 outline-none text-xs"
                  />
                  <button
                    onClick={() => updateCustomField(c.id, { on: c.on === false })}
                    aria-label="Toggle"
                    className={`relative h-5 w-9 rounded-full transition ${c.on === false ? "bg-slate-300" : "bg-emerald-500"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${c.on === false ? "left-0.5" : "left-4"}`} />
                  </button>
                  <button onClick={() => removeCustomField(c.id)} aria-label="Remove" className="h-7 w-7 grid place-items-center rounded-md bg-white border border-rose-200 text-rose-600 active:scale-90">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {c.type === "text" ? (
                  <input
                    value={c.value}
                    onChange={(e) => updateCustomField(c.id, { value: e.target.value })}
                    placeholder="Value"
                    className="w-full px-2 py-1.5 rounded-md bg-white border border-amber-200 outline-none text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {c.value ? (
                      <img src={c.value} alt="" className="h-12 w-12 rounded-md object-cover border border-amber-200" />
                    ) : (
                      <div className="h-12 w-12 rounded-md border border-dashed border-amber-300 grid place-items-center text-amber-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[11px] font-semibold shadow active:scale-95">
                        <Upload className="h-3.5 w-3.5" /> {c.value ? "Replace" : "Upload"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCustomImage(c.id, f); e.currentTarget.value = ""; }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>



          {/* QR code · download · share */}
          {shareUrl && (
            <div className="rounded-2xl bg-white border border-amber-200 p-3 flex gap-3 items-center">
              <div className="h-24 w-24 rounded-xl overflow-hidden border border-amber-200 bg-white flex-shrink-0 grid place-items-center">
                <img src={qrSrc} alt="QR" className="h-full w-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
                  Scan QR
                </p>
                <p className="text-[10px] text-slate-500 leading-snug mb-2">
                  Opens your redirect link (or card page if blank).
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={downloadQR}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold active:scale-95 transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    onClick={shareQR}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[11px] font-semibold active:scale-95 transition"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "flip" && (
        <div className="space-y-4">
          <h3 className="font-display text-lg text-amber-700 font-bold">Card Back · Share</h3>

          {/* Employee-card style preview */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-4 shadow-[0_10px_30px_-12px_rgba(212,175,55,0.5)]">
            <div className="aspect-[1.6/1] rounded-2xl overflow-hidden border border-amber-200 bg-white grid place-items-center">
              {backImage ? (
                <img src={backImage} alt="Card back" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 text-xs px-6">
                  Upload an image for the back side<br/>(QR, banner, photo — anything)
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-amber-700">
                <Upload className="h-4 w-4" />
                <span>Shares <strong>{profile?.card_share_count ?? 0}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Users className="h-4 w-4" />
                <span>Visits <strong>{profile?.card_view_count ?? 0}</strong></span>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 ml-1">Upload back image</span>
            <div className="mt-1 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 px-4 py-5 flex flex-col items-center justify-center gap-2 cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-amber-100 grid place-items-center">
                <Upload className="h-5 w-5 text-amber-700" />
              </div>
              <p className="text-xs text-slate-600">{uploading ? "Uploading…" : "Tap to choose JPG / PNG"}</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBackUpload(f); }}
              />
            </div>
          </label>

          <button
            onClick={doShare}
            disabled={!shareUrl}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg active:scale-95 transition disabled:opacity-50"
          >
            Share Card on WhatsApp
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            We send your card image + a short link. Tapping the link opens your redirect URL.
          </p>
        </div>
      )}

      <SheetActions onClose={onClose} onSave={save} saveLabel={saving ? "Saving…" : "Save Card"} />

      <AnimatePresence>
        {pendingAvatar && (
          <ImageCropper
            file={pendingAvatar}
            shape="circle"
            onCancel={() => setPendingAvatar(null)}
            onCropped={handleAvatarUpload}
          />
        )}
      </AnimatePresence>
    </SheetWrap>
  );
}

function CardFieldEditor({
  Icon, label, value, onChange, on, onToggle, inputMode, readOnly,
}: {
  Icon: typeof User;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  on: boolean;
  onToggle: (v: boolean) => void;
  inputMode?: "text" | "email" | "tel" | "url";
  readOnly?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 transition ${on ? "bg-white border-amber-300" : "bg-slate-50 border-slate-200 opacity-70"}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-700" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 flex-1">{label}</span>
        <button
          onClick={() => onToggle(!on)}
          aria-label={`Toggle ${label}`}
          className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`} />
        </button>
      </div>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        inputMode={inputMode}
        placeholder={label}
        className={`w-full mt-1.5 px-2 py-1.5 rounded-lg outline-none text-sm bg-transparent ${readOnly ? "text-slate-500" : "text-slate-800"}`}
      />
    </div>
  );
}


function ReferralInline({ code }: { code: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/r/${code}`;
  }, [code]);
  const shareText = `Join me on Karo Online! Use my code ${code} to sign up: ${shareUrl}`;
  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const openWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  const nativeShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) try { await nav.share({ title: "Karo Online", text: shareText, url: shareUrl }); } catch { /* ignore */ }
    else openWhatsApp();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 p-4 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-rose-600">Your Referral Code</p>
        <div className="flex items-center gap-3 mt-2">
          <p className="font-mono text-xl font-bold text-rose-700 flex-1">{code || "—"}</p>
          <button onClick={copyCode} className="h-9 w-9 grid place-items-center rounded-xl bg-white border border-rose-200 shadow-sm active:scale-95">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <QrCode className="h-4 w-4 text-rose-600" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={openWhatsApp} className="rounded-xl bg-emerald-500 text-white px-3 py-2 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
            WhatsApp
          </button>
          <button onClick={nativeShare} className="rounded-xl bg-rose-500 text-white px-3 py-2 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <button
        onClick={() => router.navigate({ to: "/referral" })}
        className="w-full rounded-2xl bg-white border border-amber-200/70 px-4 py-4 flex items-center gap-4 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.35)] active:shadow-md"
      >
        <div className="h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-rose-50 to-amber-100 border border-amber-200">
          <Users className="h-6 w-6 text-rose-600" strokeWidth={1.8} />
        </div>
        <div className="flex-1 text-left">
          <p className="font-display text-lg text-slate-700 font-semibold">Open Referral Dashboard</p>
          <p className="text-xs text-slate-500 mt-0.5">Track invites, progress &amp; rewards</p>
        </div>
        <ChevronRight className="h-5 w-5 text-amber-400" />
      </button>

      <div className="rounded-2xl bg-white border border-amber-200/70 p-4">
        <p className="font-display text-base font-bold text-slate-800 mb-2">How to refer</p>
        <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
          <li>Tap WhatsApp or Share to send your code.</li>
          <li>Friend installs and signs up with your code.</li>
          <li>Once they complete the milestone, your reward lands in your wallet.</li>
        </ol>
      </div>
    </div>
  );
}
