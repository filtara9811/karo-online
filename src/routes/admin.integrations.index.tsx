import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plug, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { CATEGORY_META, type IntegrationProvider } from "@/lib/integrations";

export const Route = createFileRoute("/admin/integrations/")({
  head: () => ({
    meta: [
      { title: "Integrations Hub — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntegrationsHub,
});

type Row = {
  category: string;
  active: IntegrationProvider | null;
  total: number;
  to: string;
  available: boolean;
};

const CARDS: { category: string; to: string; available: boolean }[] = [
  { category: "maps", to: "/admin/integrations/maps", available: true },
  { category: "firebase", to: "/admin/integrations/maps", available: false },
  { category: "kyc", to: "/admin/integrations/maps", available: false },
  { category: "whatsapp", to: "/admin/integrations/maps", available: false },
  { category: "analytics", to: "/admin/integrations/maps", available: false },
];

function IntegrationsHub() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("integration_providers")
        .select("*");
      const list = (data ?? []) as IntegrationProvider[];
      const built = CARDS.map((c) => {
        const inCat = list.filter((p) => p.category === c.category);
        return {
          category: c.category,
          to: c.to,
          available: c.available,
          total: inCat.length,
          active: inCat.find((p) => p.is_active) ?? null,
        };
      });
      if (!cancelled) setRows(built);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Integrations Hub"
        subtitle="Saari third-party services ek jagah — providers add karein, switch karein, test/live toggle karein"
      />

      <GoldCard className="p-4 mb-6 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-[#d4af37]" />
        <p className="text-xs text-[#f5d97a]/80 leading-relaxed">
          Yeh hub aapke <b>existing API Management</b>, Wallet aur Feature
          switches ko <u>change nahi karta</u>. Sirf naye providers add karta
          hai jo phase-wise yahan available honge.
        </p>
      </GoldCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((row) => {
          const meta = CATEGORY_META[row.category];
          if (!meta) return null;
          const Wrap: typeof Link | "div" = row.available ? Link : "div";
          return (
            <Wrap
              key={row.category}
              {...(row.available ? { to: row.to } : {})}
            >
              <GoldCard
                className={`p-5 h-full transition ${
                  row.available
                    ? "hover:scale-[1.02] cursor-pointer"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{meta.emoji}</div>
                  {row.available ? (
                    <ChevronRight className="h-4 w-4 text-[#d4af37]" />
                  ) : (
                    <span className="text-[9px] uppercase tracking-[0.25em] text-[#d4af37]/60 px-2 py-1 rounded-full border border-[#d4af37]/30">
                      Soon
                    </span>
                  )}
                </div>
                <h3
                  className="font-display text-lg font-bold mb-1"
                  style={{
                    background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {meta.label}
                </h3>
                <p className="text-[11px] text-[#f5d97a]/60 leading-relaxed mb-3">
                  {meta.description}
                </p>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                  <span className="text-[#d4af37]/70">{row.total} providers</span>
                  {row.active && (
                    <>
                      <span className="text-[#d4af37]/40">·</span>
                      <span className="text-emerald-400 font-bold">
                        ● {row.active.display_name}
                      </span>
                    </>
                  )}
                </div>
              </GoldCard>
            </Wrap>
          );
        })}
      </div>

      <GoldCard className="mt-8 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Plug className="h-4 w-4 text-[#d4af37]" />
          <h4 className="font-display text-sm font-bold text-[#fff8dc]">
            Roadmap (extension only)
          </h4>
        </div>
        <ul className="text-xs text-[#f5d97a]/70 space-y-1 leading-relaxed list-disc pl-5">
          <li>Phase 1 ✅ — Maps & Hyperlocal (Google / Mappls / OSM)</li>
          <li>Phase 2 — Firebase OTP, Push (FCM), Analytics</li>
          <li>Phase 3 — KYC: Aadhaar / PAN / GST / Bank verification</li>
          <li>Phase 4 — WhatsApp Cloud, advanced analytics, AI extensions</li>
        </ul>
      </GoldCard>
    </AdminLayout>
  );
}
