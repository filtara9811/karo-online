import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Sparkles, Star, Store, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PublicShop = {
  slug: string;
  name: string;
  category: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  code: string | null;
  sponsored: boolean;
};

const PAGE = 20;

/**
 * Public discovery marketplace: every live shop in the system, searchable,
 * paged as you scroll. "Shop Visit" opens that shop's own landing feed.
 */
export function VendorsMarketplace() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<PublicShop[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Debounce the typed query so each keystroke doesn't hit the backend.
  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(async (search: string, offset: number) => {
    const { data } = await supabase.rpc("list_public_shops" as never, {
      _q: search || null,
      _limit: PAGE,
      _offset: offset,
    } as never);
    const list = (Array.isArray(data) ? data : []) as PublicShop[];
    return list;
  }, []);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setDone(false);
    (async () => {
      const list = await fetchPage(term, 0);
      if (!alive) return;
      setRows(list);
      setDone(list.length < PAGE);
    })();
    return () => { alive = false; };
  }, [term, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!rows || done || loadingMore) return;
    setLoadingMore(true);
    const list = await fetchPage(term, rows.length);
    setRows((r) => [...(r ?? []), ...list]);
    setDone(list.length < PAGE);
    setLoadingMore(false);
  }, [rows, done, loadingMore, term, fetchPage]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const shopHref = (s: PublicShop) =>
    s.code ? `/s/${encodeURIComponent(s.code)}?p=${encodeURIComponent(s.slug)}` : null;

  return (
    <section className="space-y-3">
      {/* Sticky search */}
      <div className="sticky top-16 z-20 -mx-4 px-4 py-2 bg-gradient-to-b from-white via-white/95 to-white/60 backdrop-blur">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 grid place-items-center pointer-events-none">
            <Search className="h-4 w-4 text-amber-600" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Shop ya category search karein…"
            className="h-11 w-full rounded-full border border-amber-200 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-2 my-auto grid h-7 w-7 place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {rows === null ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-3xl border border-dashed border-amber-300 bg-amber-50/50 py-12 text-center">
          <Sparkles className="h-6 w-6 text-amber-600" />
          <p className="text-[13px] font-bold text-slate-800">Koi shop nahi mili</p>
          <p className="px-8 text-[11px] text-slate-500">Dusra naam ya category try karein.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s, i) => {
            const href = shopHref(s);
            return (
              <motion.a
                key={`${s.slug}-${i}`}
                href={href ?? undefined}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(i * 0.02, 0.24) }}
                className="block overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-[0_14px_34px_-24px_rgba(180,120,20,0.55)] transition active:scale-[0.99]"
              >
                <div className="relative h-36 bg-gradient-to-br from-amber-100 to-amber-50">
                  {(s.cover_image_url || s.avatar_url) ? (
                    <img
                      src={(s.cover_image_url || s.avatar_url) as string}
                      alt={s.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-amber-600"><Store className="h-7 w-7" /></span>
                  )}
                  {s.sponsored && (
                    <span className="absolute top-2 left-2 h-6 rounded-full bg-amber-500 px-2 text-[10px] font-extrabold text-white inline-flex items-center">
                      Sponsored
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-amber-50 ring-2 ring-white grid place-items-center text-amber-600">
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                      : <Store className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14px] font-bold text-slate-900">{s.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{s.category || "Verified shop"}</p>
                  </div>
                  <span className="h-7 shrink-0 rounded-full bg-amber-50 px-2 text-[10px] font-bold text-amber-800 inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.8
                  </span>
                </div>
                <div className="px-3.5 pb-3.5">
                  <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-amber-500 text-[12px] font-extrabold text-white">
                    <Store className="h-3.5 w-3.5" /> Shop Visit
                  </span>
                </div>
              </motion.a>
            );
          })}
          <div ref={sentinel} className="h-4" />
          {loadingMore && (
            <div className="grid place-items-center py-3"><Loader2 className="h-4 w-4 animate-spin text-amber-600" /></div>
          )}
        </div>
      )}
    </section>
  );
}
