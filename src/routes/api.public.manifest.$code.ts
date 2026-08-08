import { createFileRoute } from "@tanstack/react-router";

/**
 * Per-merchant web app manifest.
 * Served same-origin (blob/data manifests are ignored by Chrome), so installing
 * from a shop landing page installs THAT shop only — never the Karo Online app.
 */
export const Route = createFileRoute("/api/public/manifest/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const code = String(params.code || "").slice(0, 64);
        if (!code) return new Response("not found", { status: 404 });

        const url = new URL(request.url);
        const project = url.searchParams.get("p");

        let name = "Karo Shop";
        let icon: string | null = null;
        const accentParam = url.searchParams.get("accent") ?? "";
        const accent = /^#[0-9a-fA-F]{6}$/.test(accentParam) ? accentParam : "#f59e0b";

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("customers")
            .select("name, shop_name, avatar_url")
            .eq("referral_code", code)
            .maybeSingle();
          if (data) {
            name = data.shop_name || data.name || name;
            icon = data.avatar_url ?? null;
          }
        } catch {
          /* fall back to defaults */
        }

        const start = `/s/${encodeURIComponent(code)}${project ? `?p=${encodeURIComponent(project)}` : ""}`;
        const manifest = {
          name,
          short_name: name.slice(0, 12) || "Shop",
          id: `/s/${encodeURIComponent(code)}/`,
          start_url: start,
          scope: `/s/${encodeURIComponent(code)}`,
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: accent,
          description: `${name} — digital shop on Karo Online`,
          icons: [
            { src: icon || "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          prefer_related_applications: false,
        };

        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
