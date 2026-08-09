import { createFileRoute } from "@tanstack/react-router";

type Proj = {
  business_name: string | null;
  title: string | null;
  avatar_url: string | null;
  accent_color: string | null;
};

/**
 * Per-merchant web app manifest.
 * Served same-origin (blob/data manifests are ignored by Chrome), so installing
 * from a shop landing page installs THAT shop only — never the Karo Online app.
 *
 * Name / icon / theme are resolved from the merchant's One QR project (?p=slug)
 * so the home-screen icon shows the vendor's business name + profile picture.
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
        let projectAccent: string | null = null;
        const accentParam = url.searchParams.get("accent") ?? "";

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1) Customer record behind the shop code (fallback identity + owner).
          const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("name, shop_name, avatar_url, shop_logo_url, user_id")
            .eq("referral_code", code)
            .maybeSingle();

          if (customer) {
            name = customer.shop_name || customer.name || name;
            icon = customer.shop_logo_url || customer.avatar_url || null;
          }

          // 2) The One QR project — this is the white-label identity we prefer.
          const cols = "business_name, title, avatar_url, accent_color";
          let proj: Proj | null = null;

          if (project) {
            const bySlug = await supabaseAdmin
              .from("qr_projects")
              .select(cols)
              .eq("slug", project)
              .maybeSingle();
            proj = (bySlug.data as Proj | null) ?? null;
            if (!proj && /^[0-9a-f-]{36}$/i.test(project)) {
              const byId = await supabaseAdmin
                .from("qr_projects")
                .select(cols)
                .eq("id", project)
                .maybeSingle();
              proj = (byId.data as Proj | null) ?? null;
            }
          }

          if (!proj && customer?.user_id) {
            const first = await supabaseAdmin
              .from("qr_projects")
              .select(cols)
              .eq("user_id", customer.user_id)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            proj = (first.data as Proj | null) ?? null;
          }

          if (proj) {
            name = proj.business_name || proj.title || name;
            icon = proj.avatar_url || icon;
            projectAccent = proj.accent_color ?? null;
          }
        } catch {
          /* fall back to defaults */
        }

        const accentCandidate = accentParam || projectAccent || "";
        const accent = /^#[0-9a-fA-F]{6}$/.test(accentCandidate) ? accentCandidate : "#f59e0b";

        const q = project ? `?p=${encodeURIComponent(project)}` : "";
        const start = `/s/${encodeURIComponent(code)}${q}`;

        // Same-origin icon proxy: cross-origin storage URLs with mismatched
        // declared sizes are frequently rejected as the home-screen icon.
        const iconUrl = (size: number) =>
          `/api/public/shop-icon/${encodeURIComponent(code)}?size=${size}` +
          (project ? `&p=${encodeURIComponent(project)}` : "");

        const shortName = (name || "Shop").trim().slice(0, 12) || "Shop";
        const manifest = {
          name,
          short_name: shortName,
          id: `/s/${encodeURIComponent(code)}/`,
          start_url: start,
          scope: `/s/${encodeURIComponent(code)}`,
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: accent,
          description: `${name} — digital shop on Karo Online`,
          icons: icon
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
