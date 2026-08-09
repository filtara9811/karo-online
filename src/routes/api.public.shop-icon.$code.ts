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
        const fallback = () =>
          Response.redirect(new URL("/icon-512.png", url.origin).toString(), 302);
        if (!code) return fallback();

        const { resolveShopIdentity } = await import("@/lib/shop-identity.server");
        const { icon } = await resolveShopIdentity(code, project);
        if (!icon || !/^https?:\/\//i.test(icon)) return fallback();

        try {
          const upstream = await fetch(icon);
          if (!upstream.ok || !upstream.body) return fallback();
          const type = upstream.headers.get("content-type") ?? "";
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": /^image\//i.test(type) ? type : "image/png",
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
