import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin icon proxy for merchant PWAs.
 * Chrome often rejects cross-origin storage URLs as the installed home-screen
 * icon, so we stream the vendor's profile picture from our own origin.
 */
export const Route = createFileRoute("/api/public/shop-icon/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const code = String(params.code || "").slice(0, 64);
        const url = new URL(request.url);
        const project = url.searchParams.get("p");
        const fallback = () => Response.redirect(new URL("/icon-512.png", url.origin).toString(), 302);
        if (!code) return fallback();

        let src: string | null = null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (project) {
            const bySlug = await supabaseAdmin
              .from("qr_projects")
              .select("avatar_url")
              .eq("slug", project)
              .maybeSingle();
            src = (bySlug.data as { avatar_url: string | null } | null)?.avatar_url ?? null;
          }

          if (!src) {
            const { data: customer } = await supabaseAdmin
              .from("customers")
              .select("avatar_url, shop_logo_url, user_id")
              .eq("referral_code", code)
              .maybeSingle();
            const c = customer as
              | { avatar_url: string | null; shop_logo_url: string | null; user_id: string }
              | null;
            if (c?.user_id && !project) {
              const first = await supabaseAdmin
                .from("qr_projects")
                .select("avatar_url")
                .eq("user_id", c.user_id)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
              src = (first.data as { avatar_url: string | null } | null)?.avatar_url ?? null;
            }
            src = src || c?.shop_logo_url || c?.avatar_url || null;
          }
        } catch {
          return fallback();
        }

        if (!src || !/^https?:\/\//i.test(src)) return fallback();

        try {
          const upstream = await fetch(src);
          if (!upstream.ok || !upstream.body) return fallback();
          const type = upstream.headers.get("content-type") ?? "";
          const contentType = /^image\//i.test(type) ? type : "image/png";
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch {
          return fallback();
        }
      },
    },
  },
});
