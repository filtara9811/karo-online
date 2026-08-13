import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Play, ShieldCheck, Volume2, Loader2, CheckCircle2, RefreshCw, ExternalLink, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { SheetShell } from "./SheetShell";
import { speakHindi } from "@/lib/tts";
import {
  voicePreview, DEFAULT_VOICE,
  type ServiceDef, type ServiceKey, type ServiceState, type VoiceSettings,
} from "./services-catalog";

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-black/5 bg-white px-3 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-800">{label}</span>
        {hint && <span className="block text-[10.5px] text-slate-500">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: checked ? 22 : 2 }}
        />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

/**
 * One service popup with the standard layout:
 * video tutorial → settings/configuration → pricing + Activate & Connect.
 */
export function ServiceDetailSheet({
  service, onClose, accent, state, onActivate, onDeactivate, onVoiceChange, onGmbUrl,
}: {
  service: ServiceDef | null;
  onClose: () => void;
  accent: string;
  state: ServiceState;
  onActivate: (key: ServiceKey, plan: "monthly" | "yearly") => void;
  onDeactivate: (key: ServiceKey) => void;
  onVoiceChange: (voice: VoiceSettings) => void;
  onGmbUrl: (url: string) => void;
}) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [gmb, setGmb] = useState("");
  const [syncing, setSyncing] = useState(false);

  const active = service ? state.active[service.key] : undefined;
  const voice = state.voice ?? DEFAULT_VOICE;

  useEffect(() => {
    if (!service) return;
    setPlan(active?.plan ?? "yearly");
    setPlaying(false);
    setGmb(state.gmbUrl ?? "");
  }, [service?.key]);

  if (!service) return null;

  const save = 100 - Math.round((service.yearly / Math.max(1, service.monthly * 12)) * 100);

  const handleActivate = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    if (service.key === "gmb" && gmb.trim()) onGmbUrl(gmb.trim());
    onActivate(service.key, plan);
    setBusy(false);
    toast.success(`${service.name} activated`);
  };

  return (
    <SheetShell
      section="services"
      open
      onClose={onClose}
      title={`${service.emoji}  ${service.name}`}
      subtitle={service.tagline}
      footer={
        <div className="space-y-2">
          {active ? (
            <div className="flex gap-2">
              <span className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 text-[13px] font-extrabold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Active · {active.plan === "yearly" ? "Yearly" : "Monthly"}
              </span>
              <button
                onClick={() => { onDeactivate(service.key); toast.success(`${service.name} turned off`); }}
                className="h-12 rounded-2xl border border-black/10 px-4 text-[13px] font-bold text-slate-600 active:scale-95"
              >
                Turn off
              </button>
            </div>
          ) : (
            <button
              onClick={handleActivate}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${accent}, #f97316)` }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {service.free ? "Activate & Connect" : `Activate & Connect · ₹${plan === "yearly" ? service.yearly : service.monthly}`}
            </button>
          )}
          <p className="text-center text-[10px] text-slate-400">
            <ShieldCheck className="mr-1 inline h-3 w-3 text-emerald-500" /> Secure activation · kabhi bhi band karein
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 1 — Video tutorial */}
        <Section title="How it works">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "16 / 9" }}>
            {playing ? (
              <iframe
                src={`${service.tutorial}?autoplay=1&rel=0`}
                title={`${service.name} tutorial`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button onClick={() => setPlaying(true)} className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-xl active:scale-90">
                  <Play className="h-6 w-6 translate-x-0.5 text-slate-900" />
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-bold text-white">
                  Video tutorial · {service.name}
                </span>
              </button>
            )}
          </div>
          <ul className="grid gap-1.5 pt-1">
            {service.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {b}
              </li>
            ))}
          </ul>
        </Section>

        {/* 2 — Settings / configuration */}
        {service.key === "sound_alert" && (
          <Section title="Voice settings">
            <Toggle
              label="Sound Alert"
              hint="Master on/off"
              checked={voice.enabled}
              onChange={(enabled) => onVoiceChange({ ...voice, enabled })}
            />
            <Toggle label="Announce customer name" checked={voice.announceName} onChange={(v) => onVoiceChange({ ...voice, announceName: v })} />
            <Toggle label="Announce city" checked={voice.announceCity} onChange={(v) => onVoiceChange({ ...voice, announceCity: v })} />
            <Toggle label="Announce platform (FB / Insta / QR)" checked={voice.announcePlatform} onChange={(v) => onVoiceChange({ ...voice, announcePlatform: v })} />

            <label className="block pt-1 text-[11px] font-bold text-slate-600">Announcement format</label>
            <textarea
              value={voice.template}
              onChange={(e) => onVoiceChange({ ...voice, template: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-[12.5px] outline-none focus:border-amber-400"
            />
            <p className="text-[10.5px] text-slate-500">
              Tags: [Platform] · [Name] · [City] · [Event]
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
              <p className="min-w-0 flex-1 text-[12px] italic text-slate-700">“{voicePreview(voice)}”</p>
              <button
                onClick={() => speakHindi(voicePreview(voice), { force: true })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-amber-600 shadow active:scale-90"
                aria-label="Play sample"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </Section>
        )}

        {service.key === "gmb" && (
          <Section title="API connect">
            <label className="block text-[11px] font-bold text-slate-600">Google Business Profile link</label>
            <input
              value={gmb}
              onChange={(e) => setGmb(e.target.value)}
              placeholder="https://g.page/your-shop"
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-[12.5px] outline-none focus:border-amber-400"
            />
            <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
              <span className="min-w-0 flex-1 text-[12px] font-bold text-slate-800">
                Sync status
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  active && (state.gmbUrl || gmb) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {active && (state.gmbUrl || gmb) ? "Live on Google" : "Not connected"}
                </span>
              </span>
              <button
                onClick={async () => {
                  if (!gmb.trim()) { toast.error("Pehle Google Business link daalein"); return; }
                  setSyncing(true);
                  await new Promise((r) => setTimeout(r, 900));
                  onGmbUrl(gmb.trim());
                  setSyncing(false);
                  toast.success("Business details Google par sync ho gayi");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-500 px-3 text-[11.5px] font-bold text-white active:scale-95"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
              </button>
            </div>
            {(state.gmbUrl || gmb) && (
              <a
                href={state.gmbUrl || gmb}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-700"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Profile kholein
              </a>
            )}
          </Section>
        )}

        {/* 3 — Pricing */}
        {!service.free && (
          <Section title="Choose a plan">
            <div className="grid grid-cols-2 gap-2.5">
              {(["monthly", "yearly"] as const).map((p) => {
                const on = plan === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`relative rounded-2xl border p-3 text-left ${on ? "border-transparent text-white shadow-md" : "border-amber-200 bg-white"}`}
                    style={on ? { background: `linear-gradient(135deg, ${accent}, #f97316)` } : undefined}
                  >
                    <p className={`text-[11px] font-bold ${on ? "text-white/85" : "text-slate-500"}`}>
                      {p === "monthly" ? "Monthly" : "Yearly"}
                    </p>
                    <p className={`font-display text-[20px] font-extrabold ${on ? "text-white" : "text-slate-900"}`}>
                      ₹{p === "monthly" ? service.monthly : service.yearly}
                    </p>
                    <p className={`text-[10.5px] ${on ? "text-white/80" : "text-slate-500"}`}>
                      {p === "monthly" ? "/month" : "/year"}
                    </p>
                    {p === "yearly" && save > 0 && (
                      <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9.5px] font-extrabold text-white">
                        SAVE {save}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </SheetShell>
  );
}
