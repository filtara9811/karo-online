import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Instagram, Facebook, Globe, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/social")({
  head: () => ({ meta: [{ title: "Social | Pages — Vendor" }] }),
  component: () => (
    <VendorAuthGate>
      <SocialPage />
    </VendorAuthGate>
  ),
});

function SocialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insta, setInsta] = useState("");
  const [fb, setFb] = useState("");
  const [website, setWebsite] = useState("");
  const [gmb, setGmb] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("vendors")
      .select("instagram, facebook, website, google_place_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInsta((data as any).instagram ?? "");
          setFb((data as any).facebook ?? "");
          setWebsite((data as any).website ?? "");
          setGmb((data as any).google_place_id ?? "");
        }
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        instagram: insta.trim() || null,
        facebook: fb.trim() || null,
        website: website.trim() || null,
        google_place_id: gmb.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Social pages saved");
      navigate({ to: "/vendor/dashboard" });
    }
  };

  return (
    <main
      className="min-h-dvh px-4 py-5"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #04231a 60%, #053024 100%)" }}
    >
      <div className="mx-auto max-w-md">
        <button
          onClick={() => navigate({ to: "/vendor/dashboard" })}
          className="inline-flex items-center gap-1 text-[#f5d97a] text-xs font-bold uppercase tracking-wider mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1
          className="font-display text-2xl font-bold mb-1"
          style={{
            background: "linear-gradient(180deg,#fff8dc,#d4af37)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Social | Pages
        </h1>
        <p className="text-xs text-[#f5d97a]/70 italic mb-5">
          Add or update your business handles
        </p>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          </div>
        ) : (
          <div className="space-y-3">
            <SocialField Icon={Instagram} label="Instagram" value={insta} onChange={setInsta} placeholder="@karo.mart" />
            <SocialField Icon={Facebook} label="Facebook" value={fb} onChange={setFb} placeholder="facebook.com/karomart" />
            <SocialField Icon={Globe} label="Website" value={website} onChange={setWebsite} placeholder="https://karomart.in" />
            <SocialField Icon={Globe} label="Google Place ID" value={gmb} onChange={setGmb} placeholder="ChIJ…" />
            <button
              onClick={save}
              disabled={saving}
              className="mt-4 w-full rounded-xl py-3 font-display font-bold text-sm uppercase tracking-wider text-[#1a1208] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" }}
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function SocialField({
  Icon, label, value, onChange, placeholder,
}: { Icon: any; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="rounded-xl bg-black/40 border border-[#d4af37]/30 p-3">
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#d4af37]" /> {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none"
      />
    </div>
  );
}
