import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitWebForm } from "@/lib/web-cms.functions";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section } from "@/components/marketing/sections";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type FormField = {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "checkbox" | "radio" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type FormDef = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fields: FormField[];
  submit_label: string | null;
  success_message: string | null;
  redirect_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export const Route = createFileRoute("/f/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("web_forms")
      .select("id, slug, name, description, fields, submit_label, success_message, redirect_url, seo_title, seo_description")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data as unknown as FormDef;
  },
  head: ({ loaderData }) => {
    const f = loaderData as FormDef | undefined;
    if (!f) return {};
    const title = f.seo_title || `${f.name} · KaroOnline`;
    const desc = f.seo_description || f.description || `Submit the ${f.name} form.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  notFoundComponent: () => (
    <MarketingLayout>
      <Section>
        <div className="text-center py-20 text-white/70">Form not found or no longer active.</div>
      </Section>
    </MarketingLayout>
  ),
  errorComponent: ({ error }) => (
    <MarketingLayout>
      <Section>
        <p className="text-white/60">Error: {error.message}</p>
      </Section>
    </MarketingLayout>
  ),
  component: PublicFormPage,
});

function PublicFormPage() {
  const f = Route.useLoaderData();
  const submit = useServerFn(submitWebForm);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done && f.redirect_url) {
      const t = setTimeout(() => { window.location.href = f.redirect_url!; }, 1500);
      return () => clearTimeout(t);
    }
  }, [done, f.redirect_url]);

  const setVal = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // basic required check
    for (const fld of f.fields ?? []) {
      if (fld.required && (values[fld.key] == null || values[fld.key] === "")) {
        toast.error(`${fld.label} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await submit({ data: { slug: f.slug, data: values, source_page: window.location.pathname, honeypot } });
      setDone(true);
      toast.success("Submitted!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <Section className="!py-16">
        <div className="max-w-xl mx-auto ko-glass rounded-3xl p-6 md:p-10">
          <h1 className="font-display text-3xl md:text-4xl text-white mb-2">{f.name}</h1>
          {f.description && <p className="text-white/60 mb-6">{f.description}</p>}

          {done ? (
            <div className="text-center py-10">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white text-lg">{f.success_message ?? "Thank you! We'll be in touch."}</p>
              {f.redirect_url && <p className="text-white/50 text-xs mt-2">Redirecting…</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: "absolute", left: "-10000px", opacity: 0, height: 0, width: 0 }}
                aria-hidden
              />
              {(f.fields ?? []).map((fld) => (
                <FieldInput key={fld.key} field={fld} value={values[fld.key]} onChange={(v) => setVal(fld.key, v)} />
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold ko-gold-bar disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (f.submit_label ?? "Submit")}
              </button>
            </form>
          )}
        </div>
      </Section>
    </MarketingLayout>
  );
}

function FieldInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  const cls = "w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white outline-none focus:border-[#d4af37] text-sm";
  const label = (
    <label className="text-xs text-white/80 font-medium mb-1.5 block">
      {field.label} {field.required && <span className="text-red-400">*</span>}
    </label>
  );
  if (field.type === "textarea") {
    return (
      <div>{label}
        <textarea rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cls} />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div>{label}
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === "radio") {
    return (
      <div>{label}
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm text-white/80">
              <input type="radio" name={field.key} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }
  const inputType = field.type === "phone" ? "tel" : field.type;
  return (
    <div>{label}
      <input type={inputType} value={(value as string | number | null) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cls} />
    </div>
  );
}
