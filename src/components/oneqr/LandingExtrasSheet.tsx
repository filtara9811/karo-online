import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { ExtraLink } from "@/components/landing/landing-shared";
import { SheetShell } from "./SheetShell";
import { EXTRAS_DEFAULTS, readExtras, writeExtras, type LandingExtras } from "./landing-extras";

/** Settings for the landing page visitor form, welcome popup and details block. */
export function LandingExtrasSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [links, setLinks] = useState<ExtraLink[]>([]);
  const [cfg, setCfg] = useState<LandingExtras>(EXTRAS_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("extra_links")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { extra_links?: ExtraLink[] } | null;
      const list = Array.isArray(d?.extra_links) ? d!.extra_links! : [];
      setLinks(list);
      setCfg(readExtras(list));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: { extra_links: writeExtras(links, cfg) },
    } as never);
    setSaving(false);
    if (error) { toast.error("Save nahi hua: " + error.message); return; }
    toast.success("Settings save ho gayi");
    onSaved?.();
    onClose();
  };

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      title="Landing settings"
      subtitle="Visitor form, welcome popup aur details block"
      footer={
        <button
          onClick={save}
          disabled={saving || loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save settings"}
        </button>
      }
    >
      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      ) : (
        <div className="space-y-5">
          <Section title="Visitor form (QR scan par)">
            <Toggle
              label="Naam / mobile poochhein"
              value={cfg.gate_enabled}
              onChange={(v) => setCfg({ ...cfg, gate_enabled: v })}
            />
            <Field label="Form heading">
              <input
                value={cfg.gate_title}
                onChange={(e) => setCfg({ ...cfg, gate_title: e.target.value.slice(0, 60) })}
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
              />
            </Field>
            <Field label="Form message">
              <textarea
                rows={2}
                value={cfg.gate_message}
                onChange={(e) => setCfg({ ...cfg, gate_message: e.target.value.slice(0, 160) })}
                className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none"
              />
            </Field>
            <Toggle label="City bhi poochhein" value={cfg.ask_city} onChange={(v) => setCfg({ ...cfg, ask_city: v })} />
            <Toggle label="Message box dikhayein" value={cfg.ask_message} onChange={(v) => setCfg({ ...cfg, ask_message: v })} />
          </Section>

          <Section title="Welcome popup">
            <Toggle label="Popup on karein" value={cfg.popup_enabled} onChange={(v) => setCfg({ ...cfg, popup_enabled: v })} />
            <Field label="Popup title">
              <input
                value={cfg.popup_title}
                onChange={(e) => setCfg({ ...cfg, popup_title: e.target.value.slice(0, 60) })}
                placeholder="Aaj ka offer"
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
              />
            </Field>
            <Field label="Popup message">
              <textarea
                rows={2}
                value={cfg.popup_message}
                onChange={(e) => setCfg({ ...cfg, popup_message: e.target.value.slice(0, 160) })}
                placeholder="20% off on all orders"
                className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none"
              />
            </Field>
          </Section>

          <Section title="Business details block">
            <Toggle label="Address / details dikhayein" value={cfg.show_details} onChange={(v) => setCfg({ ...cfg, show_details: v })} />
          </Section>
        </div>
      )}
    </SheetShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
        {children}
      </div>
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 text-left active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-amber-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
