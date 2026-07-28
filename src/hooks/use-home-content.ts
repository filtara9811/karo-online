import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HomeBanner = {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  link?: string;
  is_active?: boolean;
};

export type HomeVideo = {
  id: string;
  thumb_url: string;
  video_url?: string;
  title?: string;
  subtitle?: string;
  duration?: string;
  link?: string;
  is_active?: boolean;
};


async function readSetting<T>(key: string): Promise<T | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? null;
}

export function useHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    readSetting<{ items?: HomeBanner[] }>("home_banners").then((v) => {
      if (!alive) return;
      setBanners((v?.items ?? []).filter((b) => b.is_active !== false && b.image_url));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { banners, loading };
}

export function useHomeVideos() {
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    readSetting<{ items?: HomeVideo[] }>("home_videos").then((v) => {
      if (!alive) return;
      setVideos((v?.items ?? []).filter((x) => x.is_active !== false && x.thumb_url));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { videos, loading };
}
