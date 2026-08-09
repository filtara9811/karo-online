import { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { X, Plus, Store, CreditCard, PlayCircle, Lock, Trash2, Loader2, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createPremiumLinksOrder, verifyPremiumLinks } from "@/lib/premium-links.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-client";
import { VpaScannerSheet } from "@/components/VpaScannerSheet";
import { SOCIAL_PRESETS, brandOf, type ExtraLink } from "@/components/landing/landing-shared";

type Settings = {
  play_store_enabled: boolean;
  payment_enabled: boolean;
  payment_provider: string;
  payment_upi_id: string;
  payment_label: string;
  payment_amount_inr: string;
  digital_shop_enabled: boolean;
  digital_shop_url: string;
  extra_links: ExtraLink[];
  premium_unlocked: boolean;
};

const DEFAULTS: Settings = {
  play_store_enabled: true,
  payment_enabled: false,
  payment_provider: "upi",
  payment_upi_id: "",
  payment_label: "",
  payment_amount_inr: "",
  digital_shop_enabled: false,
  digital_shop_url: "",
  extra_links: [],
  premium_unlocked: false,
};

const PROVIDERS = [
  { v: "upi", label: "UPI" },
  { v: "phonepe", label: "PhonePe" },
  { v: "paytm", label: "Paytm" },
  { v: "gpay", label: "Google Pay" },
  { v: "other", label: "Other (custom)" },
];

type TabKey = "social" | "payment" | "shop" | "website" | "contact" | "other";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "social", label: "Social Media" },
  { key: "payment", label: "Payment" },
  { key: "shop", label: "Shop" },
  { key: "website", label: "Website" },
  { key: "contact", label: "Contact" },
  { key: "other", label: "More" },
];

export function MerchantLinksSetupSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile, user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [tab, setTab] = useState<TabKey>("social");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const createOrder = useServerFn(createPremiumLinksOrder);
  const verifyOrder = useServerFn(verifyPremiumLinks);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const d = data as unknown as Settings & { extra_links: ExtraLink[] | null };
        setSettings({
          ...DEFAULTS,
          ...d,
          extra_links: Array.isArray(d.extra_links) ? d.extra_links : [],
        });
      } else {
        setSettings(DEFAULTS);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const save = useCallback(async (next: Settings, opts?: { silent?: boolean }) => {
    setSaving(true);
    const { error } = await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: {
        play_store_enabled: next.play_store_enabled,
        payment_enabled: next.payment_enabled,
        payment_provider: next.payment_provider,
        payment_upi_id: next.payment_upi_id,
        payment_label: next.payment_label,
        payment_amount_inr: next.payment_amount_inr,
        digital_shop_enabled: next.digital_shop_enabled,
        digital_shop_url: next.digital_shop_url,
        extra_links: next.extra_links,
      },
    } as never);
    setSaving(false);
    if (error) toast.error("Couldn't save: " + error.message);
    else if (!opts?.silent) toast.success("Saved");
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      void save(next, { silent: true });
      return next;
    });
  };

  const setLinks = (nextLinks: ExtraLink[]) => {
    const next = { ...settings, extra_links: nextLinks };
    setSettings(next);
    void save(next, { silent: true });
  };

  /** Upsert a preset social row by its stable id. */
  const setPreset = (id: string, label: string, url: string) => {
    const exists = settings.extra_links.some((l) => l.id === id);
    const nextLinks = exists
      ? settings.extra_links.map((l) => (l.id === id ? { ...l, url, label, category: "social", enabled: true } : l))
      : [...settings.extra_links, { id, label, url, enabled: true, category: "social" }];
    setLinks(nextLinks);
  };

  const addCustom = (category: TabKey) => {
    setLinks([
      ...settings.extra_links,
      { id: crypto.randomUUID(), label: "New Link", url: "", enabled: true, category },
    ]);
  };

  const removeLink = (id: string) => {
    if (!confirm("Delete this link?")) return;
    setLinks(settings.extra_links.filter((l) => l.id !== id));
  };

  const customLinks = useMemo(
    () => settings.extra_links.filter((l) => (l.category ?? "other") === tab && !l.id.startsWith("social-")),
    [settings.extra_links, tab],
  );

  const startPremium = async () => {
    setPaying(true);
    try {
      const order = await createOrder();
      if (!order.ok) throw new Error(order.error);
      const resp = await openRazorpayCheckout({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        name: "Karo Online",
        description: `Premium Links Unlock · ₹${order.amount_inr}`,
        prefill: { name: profile?.name ?? "", contact: profile?.phone ?? "" },
      });
      const v = await verifyOrder({
        data: {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
          amount_inr: order.amount_inr,
        },
      });
      if (!v.ok) throw new Error(v.error);
      setSettings((s) => ({ ...s, premium_unlocked: true }));
      toast.success("Premium unlocked! You can add unlimited links.");
    } catch (e) {
      toast.error((e as Error).message || "Payment failed");
    } finally { setPaying(false); }
  };

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="z-[210] bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] border-t-2 border-[#d4af37] max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-[#1a1208] font-display text-lg">Setup Scan Actions</DrawerTitle>
            <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/70 text-[#1a1208]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>

        {/* Category tabs */}
        <div className="px-4 pb-2">
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                  tab === t.key
                    ? "border-[#d4af37] bg-[#1a1208] text-[#f4e9c8]"
                    : "border-[#d4af37]/40 bg-white/70 text-[#8b6508]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-6 overflow-y-auto space-y-3">
          {loading ? (
            <div className="grid place-items-center py-12 text-[#8b6508]"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              {tab === "social" && (
                <>
                  <p className="text-[11px] text-[#8b6508]">
                    Paste your profile links — customers see them under the “social media” button.
                  </p>
                  {SOCIAL_PRESETS.map((p) => {
                    const existing = settings.extra_links.find((l) => l.id === p.id);
                    const brand = brandOf(p.hint, p.label);
                    const Icon = brand.icon;
                    return (
                      <div key={p.id} className="rounded-2xl border border-[#d4af37]/40 bg-white/70 p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 shrink-0 grid place-items-center rounded-full"
                            style={{ background: `${brand.color}1f`, color: brand.color }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 text-sm font-bold text-[#1a1208]">{p.label}</div>
                          {existing?.url && (
                            <button
                              onClick={() => removeLink(p.id)}
                              aria-label={`Remove ${p.label}`}
                              className="h-8 w-8 grid place-items-center rounded-full bg-rose-100 text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <input
                          value={existing?.url ?? ""}
                          onChange={(e) => setPreset(p.id, p.label, e.target.value)}
                          placeholder={p.hint}
                          inputMode="url"
                          className="w-full mt-2 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm text-[#1a1208] placeholder:text-[#8b6508]/50"
                        />
                      </div>
                    );
                  })}
                </>
              )}

              {tab === "payment" && (
                <Row
                  icon={<CreditCard className="h-5 w-5" />}
                  color="bg-amber-600"
                  title="Payment (UPI · PhonePe · Paytm)"
                  enabled={settings.payment_enabled}
                  onToggle={(v) => update({ payment_enabled: v })}
                >
                  <select
                    value={settings.payment_provider}
                    onChange={(e) => setSettings((s) => ({ ...s, payment_provider: e.target.value }))}
                    className="w-full mt-2 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm text-[#1a1208]"
                  >
                    {PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                  </select>
                  <div className="relative mt-2">
                    <input
                      value={settings.payment_upi_id}
                      onChange={(e) => setSettings((s) => ({ ...s, payment_upi_id: e.target.value }))}
                      placeholder={settings.payment_provider === "other" ? "Paste custom URL or payload" : "merchant@upi"}
                      inputMode={settings.payment_provider === "other" ? "text" : "email"}
                      className="w-full rounded-lg border border-[#d4af37]/40 bg-white/80 pl-2 pr-11 py-1.5 text-sm text-[#1a1208] placeholder:text-[#8b6508]/50"
                    />
                    {settings.payment_provider !== "other" && (
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        aria-label="Scan counter QR"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md bg-amber-600 text-white shadow active:scale-95"
                      >
                        <ScanLine className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={settings.payment_amount_inr}
                    onChange={(e) => setSettings((s) => ({ ...s, payment_amount_inr: e.target.value.replace(/[^0-9.]/g, "") }))}
                    placeholder="Default amount, e.g. 50"
                    inputMode="decimal"
                    className="w-full mt-2 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm text-[#1a1208] placeholder:text-[#8b6508]/50"
                  />
                  <button
                    onClick={() => save(settings)}
                    disabled={saving}
                    className="w-full mt-2 rounded-lg bg-amber-600 text-white font-bold text-sm py-2 active:scale-95 disabled:opacity-60"
                  >
                    {saving ? "Updating…" : "Update Payment Details"}
                  </button>
                  <p className="mt-1 text-[10px] text-[#8b6508]">
                    Customers tap → opens {settings.payment_provider.toUpperCase()} → your Sound Box rings.
                  </p>
                </Row>
              )}

              {tab === "shop" && (
                <Row
                  icon={<Store className="h-5 w-5" />}
                  color="bg-emerald-700"
                  title="Digital Shop"
                  enabled={settings.digital_shop_enabled}
                  onToggle={(v) => update({ digital_shop_enabled: v })}
                >
                  <input
                    value={settings.digital_shop_url}
                    onChange={(e) => setSettings((s) => ({ ...s, digital_shop_url: e.target.value }))}
                    placeholder="https://yourshop.com"
                    inputMode="url"
                    className="w-full mt-2 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm text-[#1a1208] placeholder:text-[#8b6508]/50"
                  />
                  <button
                    onClick={() => save(settings)}
                    disabled={saving}
                    className="w-full mt-2 rounded-lg bg-emerald-700 text-white font-bold text-sm py-2 active:scale-95 disabled:opacity-60"
                  >
                    {saving ? "Updating…" : "Update Shop Link"}
                  </button>
                </Row>
              )}

              {tab === "other" && (
                <Row
                  icon={<PlayCircle className="h-5 w-5" />}
                  color="bg-emerald-600"
                  title="Play Store"
                  enabled={settings.play_store_enabled}
                  onToggle={(v) => update({ play_store_enabled: v })}
                />
              )}

              {/* Custom links inside the selected category */}
              {customLinks.map((link) => (
                <div key={link.id} className="rounded-2xl border border-dashed border-[#d4af37]/60 bg-white/60 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={link.label}
                      onChange={(e) =>
                        setLinks(settings.extra_links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)))
                      }
                      placeholder="Label"
                      className="flex-1 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm font-bold text-[#1a1208]"
                    />
                    <button onClick={() => removeLink(link.id)} className="h-8 w-8 grid place-items-center rounded-full bg-rose-100 text-rose-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={link.url}
                    onChange={(e) =>
                      setLinks(settings.extra_links.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l)))
                    }
                    placeholder="https://..."
                    className="w-full mt-2 rounded-lg border border-[#d4af37]/40 bg-white/80 px-2 py-1.5 text-sm text-[#1a1208] placeholder:text-[#8b6508]/50"
                  />
                </div>
              ))}

              {tab !== "payment" && (
                settings.premium_unlocked ? (
                  <button
                    onClick={() => addCustom(tab)}
                    className="w-full rounded-2xl border-2 border-dashed border-[#d4af37] bg-white/60 py-5 grid place-items-center text-[#8b6508] font-bold active:scale-95"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs mt-1 uppercase tracking-widest">
                      Add link in {TABS.find((t) => t.key === tab)?.label}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={startPremium}
                    disabled={paying}
                    className="w-full rounded-2xl border-2 border-[#d4af37] bg-gradient-to-r from-[#fdf6e3] to-[#f4e9c8] py-5 grid place-items-center text-[#1a1208] font-bold active:scale-95 disabled:opacity-60"
                  >
                    {paying ? <Loader2 className="h-6 w-6 animate-spin" /> : <Lock className="h-6 w-6 text-[#b45309]" />}
                    <span className="text-xs mt-1 uppercase tracking-widest text-[#b45309]">Unlock Premium · Add more links</span>
                  </button>
                )
              )}

              {saving && <p className="text-center text-[10px] text-[#8b6508]">Saving…</p>}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
    <VpaScannerSheet
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      onResult={(vpa) => {
        const next = { ...settings, payment_upi_id: vpa };
        setSettings(next);
        void save(next, { silent: true });
      }}
    />
    </>
  );
}

function Row({
  icon, color, title, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#d4af37]/40 bg-white/70 p-3">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 grid place-items-center rounded-full text-white ${color}`}>{icon}</div>
        <div className="flex-1 font-bold text-[#1a1208]">{title}</div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-rose-500"}`}
          aria-label={`Toggle ${title}`}
        >
          <span className={`absolute top-0.5 ${enabled ? "left-[26px]" : "left-0.5"} h-6 w-6 rounded-full bg-white shadow transition-all flex items-center justify-center text-[9px] font-black ${enabled ? "text-emerald-700" : "text-rose-700"}`}>
            {enabled ? "ON" : "OFF"}
          </span>
        </button>
      </div>
      {enabled && children}
    </div>
  );
}
