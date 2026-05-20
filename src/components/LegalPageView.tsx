import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  hero_image_url: string | null;
  video_url: string | null;
};

function sanitize(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, style").forEach((n) => n.remove());
  doc.body.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) node.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

export function LegalPageView({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("legal_pages")
      .select("id, slug, title, body, hero_image_url, video_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        setPage((data as Page) ?? null);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf0] to-white flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-amber-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="h-9 w-9 grid place-items-center rounded-full bg-white border border-amber-200 shadow-sm active:scale-90" aria-label="Back">
            <ArrowLeft className="h-4 w-4 text-amber-700" />
          </Link>
          <h1 className="font-display text-lg font-bold text-amber-900 truncate">
            {page?.title ?? fallbackTitle}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-6">
        {loading ? (
          <div className="grid place-items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>
        ) : page ? (
          <>
            {page.hero_image_url && (
              <img src={page.hero_image_url} alt={page.title} className="w-full aspect-[16/9] object-cover rounded-2xl border border-amber-200 mb-5" />
            )}
            <article
              className="prose prose-sm sm:prose max-w-none prose-headings:text-amber-900 prose-a:text-amber-700 prose-strong:text-amber-900"
              dangerouslySetInnerHTML={{ __html: sanitize(page.body) }}
            />
          </>
        ) : (
          <p className="text-center text-slate-500 mt-10">This page is not available yet.</p>
        )}

        <div className="mt-10 pt-6 border-t border-amber-200 text-center">
          <p className="text-sm font-semibold text-amber-900">
            Powered by Filipra Private Limited
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
