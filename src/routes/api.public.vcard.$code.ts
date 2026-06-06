import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vcard/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const code = String(params.code || "").slice(0, 64);
        if (!code) return new Response("not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("customers")
          .select("name, phone, email, address, shop_name, card_link_url, avatar_url")
          .eq("referral_code", code)
          .maybeSingle();

        if (!data) return new Response("not found", { status: 404 });

        const esc = (s: string | null | undefined) =>
          String(s ?? "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
        const realEmail = (v?: string | null) =>
          v && !/^phone-\d+@auth\.karoonline\.local$/i.test(v) ? v : "";

        const fullName = data.name || data.shop_name || "Karo Online Contact";
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${esc(fullName)}`,
          `N:${esc(fullName)};;;;`,
          data.shop_name ? `ORG:${esc(data.shop_name)}` : "",
          data.phone ? `TEL;TYPE=CELL,VOICE:${esc(data.phone)}` : "",
          realEmail(data.email) ? `EMAIL;TYPE=INTERNET:${esc(realEmail(data.email))}` : "",
          data.address ? `ADR;TYPE=WORK:;;${esc(data.address)};;;;` : "",
          data.card_link_url ? `URL:${esc(data.card_link_url)}` : "",
          `NOTE:${esc("Saved from KaroOnline · Digital Business Card")}`,
          "END:VCARD",
        ].filter(Boolean);
        const vcf = lines.join("\r\n");

        return new Response(vcf, {
          status: 200,
          headers: {
            "Content-Type": "text/vcard; charset=utf-8",
            "Content-Disposition": `attachment; filename="${code}.vcf"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
