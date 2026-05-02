import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Facebook, Instagram, Twitter, Send, Youtube, Linkedin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";

type Links = {
  facebook: string;
  instagram: string;
  twitter: string;
  telegram: string;
  youtube: string;
  linkedin: string;
  whatsapp: string;
};

const EMPTY: Links = {
  facebook: "", instagram: "", twitter: "", telegram: "", youtube: "", linkedin: "", whatsapp: "",
};

const FIELDS: Array<{ key: keyof Links; label: string; Icon: typeof Facebook; color: string; placeholder: string }> = [
  { key: "facebook", label: "Facebook", Icon: Facebook, color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "#E4405F", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "X (Twitter)", Icon: Twitter, color: "#000", placeholder: "https://x.com/yourhandle" },
  { key: "telegram", label: "Telegram", Icon: Send, color: "#0088cc", placeholder: "https://t.me/yourchannel" },
  { key: "youtube", label: "YouTube", Icon: Youtube, color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, color: "#0A66C2", placeholder: "https://linkedin.com/company/..." },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle, color: "#25D366", placeholder: "https://wa.me/91XXXXXXXXXX" },
];

export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <AdminLayout>
      <SettingsPage />
    </AdminLayout>
  ),
});

function SettingsPage() {
  const [links, setLinks] = useState<Links>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "social_links")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLinks({ ...EMPTY, ...(data.value as Partial<Links>) });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "social_links", value: links, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Social links saved");
  };

  return (
    <div>
      <PageHeader
        title="App Settings"
        subtitle="Social media links — yeh customer app ke footer me dikhenge"
      />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <GoldCard className="p-5 space-y-4 max-w-2xl">
          <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Social Media Links</h3>

          {FIELDS.map(({ key, label, Icon, color, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg grid place-items-center bg-black/40 border border-[#d4af37]/30 flex-shrink-0">
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">{label}</label>
                <input
                  value={links[key]}
                  onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
            <GoldButton onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
              Save Settings
            </GoldButton>
          </div>

          <p className="text-[10px] text-[#f5d97a]/50">
            Tip: Empty fields are hidden from the customer footer. Use full URLs (https://...).
          </p>
        </GoldCard>
      )}
    </div>
  );
}
