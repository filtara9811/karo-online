import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Check, Clock, MessageCircle, Phone, Trash2, RefreshCw,
  Store, Sparkles, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartScannerSheet } from "@/components/vendor-join/SmartScannerSheet";
import type { OcrExtraction } from "@/lib/ocr.functions";

export type ScanLead = {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  category_hint: string | null;
  thumbnail: string | null;
  confidence: number | null;
  scanned_at: string;
  shared_at: string | null;
  joined_at: string | null;
  join_mode: string | null;
  reward_points: number;
};

const only10 = (v?: string | null) => {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};

/**
 * Business-card lead collector for referral partners.
 * AI OCR scan → auto-filled lead card → 3-step journey
 * (Scanned · WhatsApp shared · Joined as vendor) with reward points.
 */
export function ReferralCardCollector({ shareUrl, shareText }: { shareUrl: string; shareText: string }) {
  const [rows, setRows] = useState<ScanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("referral_scan_leads" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(((data as unknown as ScanLead[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onApply = async (d: OcrExtraction & { _pin?: unknown }) => {
    setScanOpen(false);
    const phone = only10(d.mobile) ?? only10(d.whatsapp);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Pehle login karein"); return; }
    const conf = d._confidence
      ? Object.values(d._confidence).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(d._confidence).length)
      : null;
    const { error } = await supabase.from("referral_scan_leads" as never).insert({
      user_id: user.id,
      business_name: d.business_name ?? null,
      owner_name: d.owner_name ?? null,
      phone,
      whatsapp: only10(d.whatsapp) ?? phone,
      address: d.address ?? null,
      city: d.city ?? null,
      category_hint: d.shop_type_hint ?? null,
      extracted: d as unknown as Record<string, unknown>,
      confidence: conf,
      reward_points: 2,
    } as never);
    if (error) { toast.error("Card save nahi hua: " + error.message); return; }
    toast.success("Business card add ho gaya · +2 points");
    void load();
  };

  const shareWhatsApp = async (r: ScanLead) => {
    const num = only10(r.whatsapp) ?? only10(r.phone);
    const text = `${shareText}\n${shareUrl}`;
    const url = num
      ? `https://wa.me/91${num}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    if (!r.shared_at) {
      await supabase
        .from("referral_scan_leads" as never)
        .update({ shared_at: new Date().toISOString(), reward_points: r.reward_points + 3 } as never)
        .eq("id", r.id);
      void load();
    }
  };

  const checkJoin = async (r: ScanLead) => {
    setBusy(r.id);
    const { data, error } = await supabase.rpc("sync_scan_lead_join", { _lead_id: r.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const res = data as { joined?: boolean; reason?: string; reward_points?: number; join_mode?: string } | null;
    if (res?.joined) {
      toast.success(`Joined as vendor 🎉 (+${res.join_mode === "whatsapp" ? 20 : 10} points)`);
    } else if (res?.reason === "no_phone") {
      toast.error("Is card me valid mobile number nahi hai");
    } else {
      toast.info("Abhi tak vendor join nahi hua");
    }
    void load();
  };

  const remove = async (r: ScanLead) => {
    await supabase.from("referral_scan_leads" as never).delete().eq("id", r.id);
    setRows((p) => p.filter((x) => x.id !== r.id));
  };

  const totalPoints = rows.reduce((a, r) => a + (r.reward_points ?? 0), 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="font-display text-lg font-bold text-slate-800">Collected cards</h3>
        <span className="text-[11px] text-slate-500">{rows.length} cards · {totalPoints} pts</span>
      </div>

      <button
        onClick={() => setScanOpen(true)}
        className="w-full mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/30 active:scale-[0.98] transition"
      >
        <span className="relative h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
          <ScanLine className="h-5 w-5" />
          <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-neutral-900 text-[9px] font-extrabold text-amber-300">AI</span>
        </span>
        <span className="text-left flex-1 min-w-0">
          <span className="block text-sm">Scan visiting card / bill book / shop board</span>
          <span className="block text-[11px] font-medium text-white/80">AI OCR se data auto-fill · card ban jayega</span>
        </span>
        <Sparkles className="h-5 w-5 shrink-0" />
      </button>

      {loading && <p className="text-center text-xs text-slate-400 py-8">Loading…</p>}
      {!loading && rows.length === 0 && (
        <div className="rounded-2xl bg-white border border-amber-200 p-6 text-center">
          <ScanLine className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-semibold">Koi business card collect nahi hua</p>
          <p className="text-xs text-slate-400 mt-1">Scan karke data collect karna shuru karein</p>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-2xl bg-white border border-amber-200 p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {r.thumbnail ? (
                  <img src={r.thumbnail} alt={r.business_name ?? "Business card"} className="h-12 w-12 rounded-xl object-cover border border-amber-100" />
                ) : (
                  <span className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 grid place-items-center text-amber-600">
                    <Store className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-slate-800 truncate">{r.business_name || r.owner_name || "Unknown business"}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {[r.owner_name, only10(r.phone) ? `+91 ${only10(r.phone)}` : null, r.city].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  {r.address && (
                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" /> {r.address}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Points</p>
                  <p className="font-display font-bold text-amber-600 leading-none">{r.reward_points}</p>
                </div>
              </div>

              <Milestones scanned shared={!!r.shared_at} joined={!!r.joined_at} />

              <div className="grid grid-cols-3 gap-2 mt-2">
                <a
                  href={only10(r.phone) ? `tel:+91${only10(r.phone)}` : undefined}
                  className={`rounded-xl border px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 ${only10(r.phone) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-300 pointer-events-none"}`}
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <button
                  onClick={() => shareWhatsApp(r)}
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </button>
                <button
                  onClick={() => checkJoin(r)}
                  disabled={busy === r.id || !!r.joined_at}
                  className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy === r.id ? "animate-spin" : ""}`} />
                  {r.joined_at ? "Joined" : "Check"}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-400">
                  {r.joined_at ? `Joined via ${r.join_mode === "whatsapp" ? "WhatsApp invite" : "manual onboarding"}` : "Tap Check to verify vendor join"}
                </span>
                <button onClick={() => remove(r)} className="text-slate-300 active:scale-90" aria-label="Delete card">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SmartScannerSheet open={scanOpen} onClose={() => setScanOpen(false)} onApply={onApply} />
    </section>
  );
}

function Milestones({ scanned, shared, joined }: { scanned: boolean; shared: boolean; joined: boolean }) {
  const steps = [
    { label: "Data scanned", done: scanned },
    { label: "WhatsApp shared", done: shared },
    { label: "Joined as vendor", done: joined },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-600">{doneCount}/3 milestones</span>
        <span className="text-[11px] font-bold text-amber-600">{Math.round((doneCount / 3) * 100)}%</span>
      </div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-3 h-1 rounded-full bg-amber-100" />
        <div
          className="absolute left-4 top-3 h-1 rounded-full bg-gradient-to-r from-emerald-400 to-amber-500 transition-all"
          style={{ width: `calc((100% - 2rem) * ${(doneCount - 1) / 2 > 0 ? (doneCount - 1) / 2 : 0})` }}
        />
        {steps.map((s) => (
          <div key={s.label} className="relative z-10 flex flex-col items-center gap-1 w-1/3">
            <span className={`h-7 w-7 rounded-full grid place-items-center border-2 ${s.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-amber-200 text-amber-400"}`}>
              {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clock className="h-3.5 w-3.5" />}
            </span>
            <span className="text-[9px] text-center text-slate-500 leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
