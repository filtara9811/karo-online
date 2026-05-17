import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "isomorphic-dompurify";

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  hero_image_url: string | null;
  video_url: string | null;
  sort_order: number;
};

interface Props {
  open: boolean;
  initialSlug?: string;
  onClose: () => void;
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function LegalSheet({ open, initialSlug, onClose }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug ?? "privacy");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPlaying(false);
    supabase
      .from("legal_pages")
      .select("id, slug, title, body, hero_image_url, video_url, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPages((data as Page[]) ?? []);
        setLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (initialSlug) setActiveSlug(initialSlug);
  }, [initialSlug, open]);

  const active = useMemo(
    () => pages.find((p) => p.slug === activeSlug) ?? pages[0],
    [pages, activeSlug],
  );

  if (!open) return null;

  const ytEmbed = active?.video_url ? youtubeEmbed(active.video_url) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="relative w-full max-w-md bg-gradient-to-b from-[#fffaf0] to-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Handle + close */}
        <div className="relative pt-2 pb-1 flex justify-center">
          <span className="h-1.5 w-12 rounded-full bg-amber-300/60" />
          <button
            onClick={onClose}
            className="absolute top-2 right-3 h-8 w-8 grid place-items-center rounded-full bg-white border border-amber-200 shadow-sm active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-amber-700" />
          </button>
        </div>

        {/* Hero media */}
        {active && (active.hero_image_url || active.video_url) && (
          <div className="px-3 pt-1">
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-amber-50 border border-amber-200">
              {playing && ytEmbed ? (
                <iframe
                  src={`${ytEmbed}?autoplay=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : playing && active.video_url ? (
                <video
                  src={active.video_url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  {active.hero_image_url && (
                    <img
                      src={active.hero_image_url}
                      alt={active.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {active.video_url && (
                    <button
                      onClick={() => setPlaying(true)}
                      className="absolute inset-0 grid place-items-center bg-black/20"
                      aria-label="Play"
                    >
                      <span className="h-14 w-14 rounded-full bg-white/90 grid place-items-center shadow-lg">
                        <Play className="h-6 w-6 text-amber-700 ml-1" fill="currentColor" />
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-3 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {pages.map((p) => {
              const isActive = p.slug === active?.slug;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveSlug(p.slug);
                    setPlaying(false);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-md"
                      : "bg-white border border-amber-200 text-amber-700"
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="grid place-items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : active ? (
            <div
              className="prose prose-sm max-w-none prose-headings:text-amber-900 prose-a:text-amber-700 prose-strong:text-amber-900"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(active.body) }}
            />
          ) : (
            <p className="text-sm text-slate-500 text-center mt-10">No pages available</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
