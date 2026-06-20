import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/share-image/$kind/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const kind = String(params.kind || "referral").slice(0, 24);
        const code = String(params.code || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40).toUpperCase();
        if (!code) return new Response("not found", { status: 404 });

        const title = kind === "card"
          ? "Digital Business Card"
          : kind === "qr"
          ? "Scan & Join Karo Online"
          : "Refer & Earn";
        const headline = kind === "card"
          ? "Save this trusted business card"
          : "Get ₹200 for you & ₹100 for your friend!";
        const caption = kind === "qr"
          ? `Scan or tap link · Use code ${code} · verified vendors, fast service, wallet rewards`
          : kind === "card"
          ? `Karo Online verified contact · Code ${code} · tap to open or download the app`
          : `Use my code: ${code} · signup reward tracked automatically in wallet`;

        const esc = (s: string) => s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[m] || m));
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8dc"/><stop offset="0.55" stop-color="#f8e7a8"/><stop offset="1" stop-color="#7a3b05"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b6508"/><stop offset="0.45" stop-color="#d4af37"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#4a2406" flood-opacity="0.28"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="534" rx="48" fill="#fffdf4" opacity="0.94" filter="url(#shadow)"/>
  <rect x="74" y="74" width="1052" height="482" rx="36" fill="none" stroke="#d4af37" stroke-width="6" stroke-dasharray="18 14"/>
  <circle cx="978" cy="164" r="92" fill="url(#gold)" opacity="0.98"/>
  <text x="978" y="151" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#fff8dc">KO</text>
  <text x="978" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#fff8dc">ONLINE</text>
  <text x="112" y="148" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#8b6508">${esc(title)}</text>
  <text x="112" y="250" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="#1a1208">${esc(headline)}</text>
  <rect x="112" y="315" width="590" height="118" rx="30" fill="#fff8dc" stroke="#d4af37" stroke-width="5"/>
  <text x="148" y="358" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="8" fill="#a16207">YOUR CODE</text>
  <text x="148" y="405" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="#7a2e0e">${esc(code)}</text>
  <text x="112" y="500" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#334155">${esc(caption)}</text>
  <text x="112" y="545" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f766e">karoonline.in · Trusted local services & vendor marketplace</text>
</svg>`;

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});