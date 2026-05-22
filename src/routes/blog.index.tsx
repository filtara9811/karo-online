import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader } from "@/components/marketing/sections";
import { Calendar, Clock } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[] | null;
  author_name: string | null;
  published_at: string | null;
  reading_minutes: number | null;
};

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog · KaroOnline — Local Business Insights" },
      { name: "description", content: "Tips, vendor stories, and product updates from KaroOnline — India's premium hyperlocal marketplace." },
      { property: "og:title", content: "KaroOnline Blog" },
      { property: "og:description", content: "Insights for local businesses & customers across India." },
      { property: "og:url", content: "https://karoonline.in/blog" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("web_blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, cover_image_alt, tags, author_name, published_at, reading_minutes")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <MarketingLayout>
      <Section>
        <SectionHeader
          eyebrow="KaroOnline Journal"
          title={<>Insights for <span className="ko-gold-text">local commerce.</span></>}
          subtitle="Vendor stories, product updates, and guides for buying & selling across India."
        />
        {loading ? (
          <div className="text-center text-white/50 py-16">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-white/50 py-16">No posts yet. Check back soon.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="ko-glass rounded-2xl overflow-hidden group hover:border-[#d4af37]/50 transition">
                {p.cover_image_url ? (
                  <img
                    src={p.cover_image_url}
                    alt={p.cover_image_alt ?? p.title}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover group-hover:scale-[1.02] transition"
                  />
                ) : (
                  <div className="aspect-[16/9] w-full ko-aurora bg-[#0a0a0a]" />
                )}
                <div className="p-5">
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider text-[#f5d97a]/70 border border-[#d4af37]/30 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <h3 className="font-display text-xl text-white mb-2 line-clamp-2">{p.title}</h3>
                  {p.excerpt && (
                    <p className="text-sm text-white/60 line-clamp-3">{p.excerpt}</p>
                  )}
                  <div className="mt-4 flex items-center gap-3 text-[11px] text-white/40">
                    {p.published_at && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(p.published_at).toLocaleDateString()}</span>
                    )}
                    {p.reading_minutes && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.reading_minutes} min</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </MarketingLayout>
  );
}
