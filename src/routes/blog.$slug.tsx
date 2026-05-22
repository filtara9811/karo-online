import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section } from "@/components/marketing/sections";
import { Calendar, Clock, ArrowLeft } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  body_md: string | null;
  author_name: string | null;
  author_avatar: string | null;
  tags: string[] | null;
  published_at: string | null;
  reading_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
};

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("web_blog_posts")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return data as Post;
  },
  head: ({ loaderData }) => {
    const p = loaderData as Post | undefined;
    if (!p) return {};
    const title = p.seo_title || `${p.title} · KaroOnline Blog`;
    const desc = p.seo_description || p.excerpt || "Read the latest from KaroOnline.";
    const img = p.og_image_url || p.cover_image_url;
    const url = `https://karoonline.in/blog/${p.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(img ? [
          { property: "og:image", content: img },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: img },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          image: img ? [img] : undefined,
          datePublished: p.published_at,
          author: p.author_name ? { "@type": "Person", name: p.author_name } : undefined,
          description: desc,
          mainEntityOfPage: url,
        }),
      }],
    };
  },
  notFoundComponent: () => (
    <MarketingLayout>
      <Section>
        <div className="text-center py-20">
          <h1 className="font-display text-4xl text-white mb-3">Post not found</h1>
          <Link to="/blog" className="text-[#f5d97a] underline">← Back to blog</Link>
        </div>
      </Section>
    </MarketingLayout>
  ),
  errorComponent: ({ error }) => (
    <MarketingLayout>
      <Section>
        <p className="text-white/60">Error loading post: {error.message}</p>
      </Section>
    </MarketingLayout>
  ),
  component: BlogPost,
});

function BlogPost() {
  const p = Route.useLoaderData();
  return (
    <MarketingLayout>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs text-[#f5d97a]/80 hover:text-[#fff8dc] mb-6">
          <ArrowLeft className="h-3 w-3" /> All posts
        </Link>

        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {p.tags.map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wider text-[#f5d97a]/70 border border-[#d4af37]/30 px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-4">{p.title}</h1>

        <div className="flex items-center gap-3 text-xs text-white/50 mb-8">
          {p.author_avatar && <img src={p.author_avatar} alt={p.author_name ?? ""} className="h-7 w-7 rounded-full" />}
          {p.author_name && <span className="text-white/80">{p.author_name}</span>}
          {p.published_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(p.published_at).toLocaleDateString()}</span>}
          {p.reading_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.reading_minutes} min read</span>}
        </div>

        {p.cover_image_url && (
          <img
            src={p.cover_image_url}
            alt={p.cover_image_alt ?? p.title}
            className="w-full rounded-2xl mb-10 aspect-[16/9] object-cover"
          />
        )}

        <div className="ko-prose prose prose-invert prose-lg max-w-none">
          <style>{`
            .ko-prose { color: rgba(255,255,255,0.78); line-height: 1.75; }
            .ko-prose h2, .ko-prose h3 { font-family: 'Cormorant Garamond','Playfair Display',serif; color:#fff; margin-top:2em; margin-bottom:0.5em; }
            .ko-prose h2 { font-size: 1.875rem; }
            .ko-prose h3 { font-size: 1.5rem; }
            .ko-prose a { color:#f5d97a; text-decoration:underline; }
            .ko-prose strong { color:#fff; }
            .ko-prose ul, .ko-prose ol { padding-left:1.5em; margin: 1em 0; }
            .ko-prose li { margin: 0.25em 0; }
            .ko-prose blockquote { border-left:3px solid #d4af37; padding-left:1em; margin: 1.5em 0; color: rgba(255,255,255,0.6); font-style: italic; }
            .ko-prose code { background: rgba(212,175,55,0.1); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
            .ko-prose pre { background: rgba(0,0,0,0.5); padding: 1em; border-radius: 8px; overflow-x: auto; }
            .ko-prose img { border-radius: 12px; margin: 1.5em 0; }
          `}</style>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.body_md ?? ""}</ReactMarkdown>
        </div>
      </article>
    </MarketingLayout>
  );
}
