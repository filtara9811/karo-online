import { createFileRoute } from "@tanstack/react-router";

/**
 * Per-merchant web app manifest.
 * Served same-origin (blob/data manifests are ignored by Chrome), so installing
 * from a shop landing page installs THAT shop only — never the Karo Online app.
 *
 * Name / icon / theme come from the merchant's One QR project (?p=slug) so the
 * home-screen icon shows their business name + profile picture.
 */
export const Route = createFileRoute("/api/public/manifest/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const code = String(params.code || "").slice(0, 64);
        if (!code) return new Response("not found", { status: 404 });

        const url = new URL(request.url);
        const project = url.searchParams.get("p");
        const accentParam = url.searchParams.get("accent") ?? "";

        const { resolveShopIdentity } = await import("@/lib/shop-identity.server");
        const id = await resolveShopIdentity(code, project);

        const name = id.name || "Karo Shop";
        const accentCandidate = accentParam || id.accent || "";
        const accent = /^#[0-9a-fA-F]{6}$/.test(accentCandidate) ? accentCandidate : "#f59e0b";

        const q = project ? `?p=${encodeURIComponent(project)}` : "";
        const start = `/s/${encodeURIComponent(code)}${q}`;

        // Same-origin icon proxy: cross-origin storage URLs with mismatched
        // declared sizes are frequently rejected as the home-screen icon.
        const iconUrl = (size: number) =>
          `/api/public/shop-icon/${encodeURIComponent(code)}?size=${size}` +
          (project ? `&p=${encodeURIComponent(project)}` : "");

        const icons = id.icon
          ? [
              { src: iconUrl(192), sizes: "192x192", type: "image/png", purpose: "any" },
              { src: iconUrl(192), sizes: "192x192", type: "image/png", purpose: "maskable" },
              { src: iconUrl(512), sizes: "512x512", type: "image/png", purpose: "any" },
              { src: iconUrl(512), sizes: "512x512", type: "image/png", purpose: "maskable" },
            ]
          : [
              { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
              { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ];

        const manifest = {
          name,
          short_name: (name || "Shop").trim().slice(0, 12) || "Shop",
          id: `/s/${encodeURIComponent(code)}/`,
          start_url: start,
          scope: `/s/${encodeURIComponent(code)}`,
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: accent,
          description: `${name} — digital shop on Karo Online`,
          icons,
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
