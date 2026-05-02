import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SocialLinks = {
  facebook: string;
  instagram: string;
  twitter: string;
  telegram: string;
  youtube: string;
  linkedin: string;
  whatsapp: string;
};

const EMPTY: SocialLinks = {
  facebook: "",
  instagram: "",
  twitter: "",
  telegram: "",
  youtube: "",
  linkedin: "",
  whatsapp: "",
};

export function useSocialLinks() {
  const [links, setLinks] = useState<SocialLinks>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "social_links")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLinks({ ...EMPTY, ...(data.value as Partial<SocialLinks>) });
        setLoading(false);
      });
  }, []);

  return { links, loading };
}
