import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Store, ShoppingBag, UserRound, MessageCircle, Phone, Mail, Download, Share2,
  Link2, Check, ChevronRight, Package, Apple,
} from "lucide-react";
import { toast } from "sonner";
import { needsLightText, withAlpha } from "./landing-shared";
import { optimizedImage, IMG } from "@/lib/img";
import { getVisitorProfile, setVisitorProfile } from "@/lib/landing-visitor";
import { listShopThreads, syncVisitorDetails, type ShopThread } from "@/lib/shop-chat";

type Tab = "menu" | "orders" | "profile";

/** Left side drawer opened from the shop icon: orders, profile and support. */
export function LandingShopDrawer({
  open,
  onClose,
  accent,
  code,
  shopName,
  avatarUrl,
  phone,
  email,
  pageUrl,
  canInstall,
  installed,
  isIOS,
  onInstall,
  onOpenThread,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  code: string;
  shopName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  pageUrl: string;
  canInstall: boolean;
  installed: boolean;
  isIOS: boolean;
  onInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  onOpenThread: (thread: ShopThread) => void;
}) {
  const [tab, setTab] = useState<Tab>("menu");
  const [threads, setThreads] = useState<ShopThread[]>([]);
  const [profile, setProfile] = useState(() => getVisitorProfile());
  const fg = needsLightText(accent) ? "#ffffff" : "#12100a";
  const digits = (phone ?? "").replace(/\D/g, "").slice(-10);

  useEffect(() => {
    if (!open) return;
    setTab("menu");
    setProfile(getVisitorProfile());
    void listShopThreads(code).then(setThreads);
  }, [open, code]);

  const saveProfile = async () => {
    setVisitorProfile(profile);
    await syncVisitorDetails(profile.name, profile.phone);
    toast.success("Details saved");
    setTab("menu");
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: shopName, url: pageUrl });
      else {
        await navigator.clipboard.writeText(pageUrl);
        toast.success("Link copied");
      }
    } catch { /* cancelled */ }
  };

  const install = async () => {
    const r = await onInstall();
    if (r === "accepted") toast.success("Installing…");
    else if (r === "unavailable") toast.info(isIOS ? "Share ▸ Add to Home Screen" : "Browser menu ▸ Install app");
  };

  const supportItems = [
    digits.length === 10
      ? { key: "wa", label: "WhatsApp", icon: MessageCircle, color: "#25D366", href: `https://wa.me/91${digits}?text=${encodeURIComponent(`Hi ${shopName}, I need help.`)}`, external: true }
      : null,
    digits.length >= 10 ? { key: "call", label: "Call", icon: Phone, color: "#0f766e", href: `tel:+91${digits}`, external: false } : null,
    email ? { key: "mail", label: "Email", icon: Mail, color: "#ea580c", href: `mailto:${email}?subject=${encodeURIComponent(`Query — ${shopName}`)}`, external: false } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; icon: typeof Phone; color: string; href: string; external: boolean }>;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[130] bg-black/50"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 left-0 z-[131] flex w-[86%] max-w-[340px] flex-col overflow-hidden bg-white text-slate-900"
          >
            <header
              className="flex items-center gap-3 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]"
              style={{ background: accent, color: fg }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ background: withAlpha("#ffffff", 0.25) }}>
                {avatarUrl ? <img src={avatarUrl} alt={shopName} className="h-full w-full object-cover" /> : <Store className="h-6 w-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[17px] font-bold leading-tight">{shopName}</p>
                <p className="truncate text-[11px] opacity-80">{profile.name ? `Hi ${profile.name}` : "Welcome to our shop"}</p>
              </div>
              <button onClick={onClose} aria-label="Close menu" className="grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-90" style={{ background: withAlpha("#ffffff", 0.22) }}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {tab === "menu" && (
                <div className="space-y-2">
                  <DrawerRow icon={ShoppingBag} accent={accent} label="My Orders" hint={threads.length ? `${threads.length} active` : "No orders yet"} onClick={() => setTab("orders")} />
                  <DrawerRow icon={UserRound} accent={accent} label="My Profile" hint={profile.phone ? `+91 ${profile.phone}` : "Add your details"} onClick={() => setTab("profile")} />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Support</p>
                    {supportItems.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {supportItems.map((s) => (
                          <a
                            key={s.key}
                            href={s.href}
                            target={s.external ? "_blank" : undefined}
                            rel="noreferrer"
                            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 active:scale-95"
                          >
                            <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: withAlpha(s.color, 0.14), color: s.color }}>
                              <s.icon className="h-5 w-5" />
                            </span>
                            <span className="text-[10.5px] font-bold text-slate-700">{s.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-500">Shop ne contact details add nahi ki.</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    {installed ? (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <p className="text-[12.5px] font-bold text-emerald-800">App installed on this device</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={install}
                        className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left font-bold shadow active:scale-[0.98]"
                        style={{ background: accent, color: fg }}
                      >
                        {isIOS ? <Apple className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> : <Download className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
                        <span className="min-w-0">
                          <span className="block text-[13px]">Download {shopName} app</span>
                          <span className="block text-[10.5px] font-medium opacity-80">
                            {canInstall ? "Install on home screen" : isIOS ? "Share ▸ Add to Home Screen" : "Browser menu ▸ Install app"}
                          </span>
                        </span>
                      </button>
                    )}
                    <button type="button" onClick={share} className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left active:scale-[0.99]">
                      <Share2 className="h-4 w-4 text-slate-500" />
                      <span className="text-[12.5px] font-semibold">Share shop page</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(pageUrl); toast.success("Link copied"); }}
                      className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left active:scale-[0.99]"
                    >
                      <Link2 className="h-4 w-4 text-slate-500" />
                      <span className="text-[12.5px] font-semibold">Copy link</span>
                    </button>
                  </div>
                </div>
              )}

              {tab === "orders" && (
                <div className="space-y-2">
                  <BackRow label="My Orders" onBack={() => setTab("menu")} />
                  {threads.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 px-3.5 py-6 text-center text-[12.5px] text-slate-500">
                      Aapne abhi koi inquiry ya order nahi kiya.
                    </p>
                  )}
                  {threads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { onOpenThread(t); onClose(); }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left active:scale-[0.99]"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                        {t.product_image ? (
                          <img src={optimizedImage(t.product_image, IMG.tile) ?? t.product_image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-slate-900">{t.product_name || "Shop enquiry"}</span>
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase"
                            style={{ background: withAlpha(t.kind === "order" ? "#16a34a" : accent, 0.16), color: t.kind === "order" ? "#15803d" : accent }}
                          >
                            {t.kind}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{t.last_body || "Tap to open chat"}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}

              {tab === "profile" && (
                <div className="space-y-3">
                  <BackRow label="My Profile" onBack={() => setTab("menu")} />
                  <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[14px] outline-none focus:border-slate-400"
                  />
                  <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Mobile number</label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    inputMode="numeric"
                    placeholder="10-digit mobile"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[14px] outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={saveProfile}
                    className="w-full rounded-2xl py-3.5 text-[14px] font-extrabold shadow active:scale-[0.98]"
                    style={{ background: accent, color: fg }}
                  >
                    Save details
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerRow({
  icon: Icon, label, hint, onClick, accent,
}: { icon: typeof Store; label: string; hint: string; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left active:scale-[0.99]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: withAlpha(accent, 0.14), color: accent }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-slate-900">{label}</span>
        <span className="block truncate text-[11px] text-slate-500">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

function BackRow({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <button onClick={onBack} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 active:scale-95">
        <ChevronRight className="h-4 w-4 rotate-180 text-slate-600" />
      </button>
      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
