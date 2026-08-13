import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Admin-managed tutorial video shown at the top of a config sheet. */
export type TutorialVideo = {
  id: string;
  section: string;
  title: string;
  caption: string;
  youtube_url: string | null;
  video_url: string | null;
  is_active: boolean;
};

/** Sections that can carry their own tutorial video. */
export const TUTORIAL_SECTIONS: Array<{ key: string; label: string }> = [
  { key: "links", label: "Links / Scan actions" },
  { key: "theme", label: "Theme & preview" },
  { key: "products", label: "Products" },
  { key: "videos", label: "Videos / Reels studio" },
  { key: "settings", label: "Landing settings" },
  { key: "services", label: "Services & plugins" },
  { key: "profile", label: "Business profile" },
];

/** Turn any YouTube / Shorts link into an embeddable URL. */
export function youtubeEmbed(url: string): string | null {
  const v =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i.exec(url)?.[1] ?? null;
  return v ? `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1&playsinline=1` : null;
}

const cache = new Map<string, TutorialVideo | null>();

export async function fetchTutorialVideo(section: string): Promise<TutorialVideo | null> {
  if (cache.has(section)) return cache.get(section) ?? null;
  const { data } = await supabase
    .from("oneqr_tutorial_videos" as never)
    .select("id, section, title, caption, youtube_url, video_url, is_active")
    .eq("section", section)
    .eq("is_active", true)
    .maybeSingle();
  const row = (data as unknown as TutorialVideo | null) ?? null;
  cache.set(section, row);
  return row;
}

export function clearTutorialCache() {
  cache.clear();
}

/** Read the tutorial video configured for one sheet section. */
export function useTutorialVideo(section?: string) {
  const [video, setVideo] = useState<TutorialVideo | null>(null);

  useEffect(() => {
    if (!section) return;
    let cancelled = false;
    void fetchTutorialVideo(section).then((v) => { if (!cancelled) setVideo(v); });
    return () => { cancelled = true; };
  }, [section]);

  return video;
}
