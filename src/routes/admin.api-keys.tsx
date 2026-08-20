import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound, Instagram, Image as ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import { testSocialFeedConfig } from "@/lib/social-feed.functions";

export const Route = createFileRoute("/admin/api-keys")({
  head: () => ({
    meta: [
      { title: "API Management — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApiKeysPage,
});

type Config = {
  instagram_key: string;
  instagram_host: string;
  instagram_path: string;
  pinterest_key: string;
  pinterest_host: string;
  pinterest_path: string;
};

const EMPTY: Config = {
  instagram_key: "",
  instagram_host: "instagram-scraper-stable-api.p.rapidapi.com",
  instagram_path: "/get_ig_user_reels.php",
  pinterest_key: "",
  pinterest_host: "pinterest-scraper5.p.rapidapi.com",
  pinterest_path: "/pins",
};

function ApiKeysPage() {
  const [cfg, setCfg] = useState<Config>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"instagram" | "pinterest" | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "rapidapi_config")
        .maybeSingle();
      const v = (data?.value ?? {}) as Partial<Config>;
      setCfg({ ...EMPTY, ...v });
      setLoading(false);
    })();
  }, []);

  const set = (patch: Partial<Config>) => setCfg((p) => ({ ...p, ...patch }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert({ key: "rapidapi_config", value: cfg }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("API keys saved — feeds ab in keys se chalenge");
  };

  const test = async (provider: "instagram" | "pinterest") => {
    setTesting(provider);
    try {
      const res = await testSocialFeedConfig({
        data: { provider, source: provider === "instagram" ? "nike" : "hm" },
      });
      setResult((p) => ({
        ...p,
        [provider]: { ok: !!res.ok, msg: res.ok ? `${res.count} items mile` : (res.error ?? "fail") },
      }));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const field = (label: string, value: string, onChange: (v: string) => void, mono = false) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ${mono ? "font-mono text-xs" : ""}`}
      />
    </label>
  );

  const block = (
    provider: "instagram" | "pinterest",
    title: string,
    Icon: typeof Instagram,
    keyField: keyof Config,
    hostField: keyof Config,
    pathField: keyof Config,
  ) => {
    const r = result[provider];
    return (
      <GoldCard className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {field("RapidAPI Key", cfg[keyField], (v) => set({ [keyField]: v } as Partial<Config>), true)}
        {field("API Host", cfg[hostField], (v) => set({ [hostField]: v } as Partial<Config>), true)}
        {field("Endpoint Path", cfg[pathField], (v) => set({ [pathField]: v } as Partial<Config>), true)}
        <div className="flex items-center gap-3">
          <GoldButton onClick={() => test(provider)} disabled={testing === provider}>
            {testing === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Connection"}
          </GoldButton>
          {r ? (
            <span className={`flex items-center gap-1 text-xs ${r.ok ? "text-emerald-600" : "text-destructive"}`}>
              {r.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {r.msg}
            </span>
          ) : null}
        </div>
      </GoldCard>
    );
  };

  return (
    <AdminLayout>
      <PageHeader title="API Management" subtitle="RapidAPI keys for Instagram & Pinterest auto-feed" icon={KeyRound} />
      <div className="grid gap-4 md:grid-cols-2">
        {block("instagram", "Instagram Scraper", Instagram, "instagram_key", "instagram_host", "instagram_path")}
        {block("pinterest", "Pinterest Scraper", ImageIcon, "pinterest_key", "pinterest_host", "pinterest_path")}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <GoldButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
          Save Keys
        </GoldButton>
        <p className="text-xs text-muted-foreground">
          Keys sirf admin ko dikhte hain aur server par hi use hote hain. Khaali chhodne par server ke saved secrets chalte hain.
        </p>
      </div>
    </AdminLayout>
  );
}
