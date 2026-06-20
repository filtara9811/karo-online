import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$code")({
  head: ({ params }) => {
    const code = params.code;
    const url = `https://karoonline.in/c/${encodeURIComponent(code)}`;
    const image = `https://karoonline.in/api/public/share-image/card/${encodeURIComponent(code)}`;
    return {
      meta: [
        { title: "Digital Business Card — Karo Online" },
        { name: "description", content: "Open this trusted Karo Online digital business card and save the contact." },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "Digital Business Card — Karo Online" },
        { property: "og:description", content: "Tap to open this verified business card on Karo Online." },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:type", content: "image/svg+xml" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CardRedirectPage,
});

function CardRedirectPage() {
  const { code } = Route.useParams();
  const [msg, setMsg] = useState("Opening link…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Bump view count (fire & forget)
        supabase.rpc("bump_card_view", { _code: code });
        const { data } = await supabase.rpc("get_card_link", { _code: code });
        if (cancelled) return;
        const targetUrl = `${window.location.origin}/home`;
        if (targetUrl) {
          // Business-card links always open the app's digital dukaan.
          const target = targetUrl.startsWith("/")
            ? `${window.location.origin}${targetUrl}`
            : /^https?:\/\//i.test(targetUrl)
            ? targetUrl
            : `https://${targetUrl}`;
          window.location.replace(target);
        } else {
          setMsg("Opening digital dukaan…");
        }
      } catch {
        setMsg("Couldn't open this card.");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div className="glass-wine rounded-2xl p-8 max-w-sm">
        <p className="font-display text-lg text-gold-gradient">{msg}</p>
        <p className="mt-2 text-xs text-muted-foreground">Code: {code}</p>
      </div>
    </div>
  );
}
