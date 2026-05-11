import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$code")({
  head: () => ({
    meta: [
      { title: "Business Card — Karo Online" },
      { name: "description", content: "Visit business card link." },
    ],
  }),
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
        const savedUrl = (data as string | null)?.trim();
        const digitalShopUrl = `${window.location.origin}/home`;
        const targetUrl = savedUrl || digitalShopUrl;
        if (targetUrl) {
          // ensure scheme for custom URLs; internal digital dukaan stays on the app domain.
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
