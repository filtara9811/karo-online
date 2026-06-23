import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Store, MapPin, Loader2, Sparkles, Clock, Image as ImageIcon } from "lucide-react";

type MarketLead = {
  id: string;
  sub_category_name: string;
  item_names: string[];
  note: string | null;
  images: string[];
  address: string | null;
  group_name: string | null;
  accepted_count: number;
  max_slots: number;
  lead_price_inr: number;
  marketplace_reason: string | null;
  marketplace_at: string | null;
  created_at: string;
  distance_km: number | null;
};

export const Route = createFileRoute("/vendor/marketplace")({
  component: VendorMarketplacePage,
});

function VendorMarketplacePage() {
  const [leads, setLeads] = useState<MarketLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_marketplace_leads_for_vendor");
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLeads((data as MarketLead[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function claim(leadId: string) {
    setClaiming(leadId);
    const { data, error } = await supabase.rpc("claim_marketplace_lead", { _lead_id: leadId });
    setClaiming(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as { ok?: boolean; reason?: string } | null;
    if (res?.ok) {
      toast.success("Lead claim ho gayi!");
      load();
    } else {
      toast.error(`Claim fail: ${res?.reason || "unknown"}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 pb-20">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200 px-4 py-3 flex items-center gap-3">
        <Link
          to="/vendor/dashboard"
          className="h-9 w-9 grid place-items-center rounded-full bg-amber-100 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-amber-800" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-amber-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-700" /> लीड बाज़ार
          </h1>
          <p className="text-[11px] text-amber-700/70">
            Missed या under-capacity leads — पहले आओ पहले पाओ
          </p>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <p className="font-bold text-amber-900">Abhi marketplace mein koi lead nahi</p>
            <p className="text-xs text-amber-700/70 mt-1">Naye leads aate hi yahaan dikhaayi denge.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((l) => (
              <div
                key={l.id}
                className="bg-white border border-amber-200 rounded-2xl p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-amber-900 truncate">
                      {l.sub_category_name}
                    </p>
                    {l.item_names.length > 0 && (
                      <p className="text-[11px] text-amber-700/80 truncate">
                        {l.item_names.join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                    {l.marketplace_reason || "missed"}
                  </span>
                </div>

                {l.note && (
                  <p className="text-xs text-slate-700 italic bg-slate-50 px-2 py-1.5 rounded mb-2">
                    "{l.note}"
                  </p>
                )}

                {l.images.length > 0 && (
                  <div className="flex gap-1.5 mb-2 overflow-x-auto">
                    {l.images.slice(0, 4).map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                    {l.images.length > 4 && (
                      <div className="h-14 w-14 grid place-items-center rounded-lg bg-amber-50 text-amber-700 text-xs font-bold flex-shrink-0">
                        +{l.images.length - 4}
                        <ImageIcon className="h-3 w-3 ml-0.5" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] text-amber-700/80 mb-3">
                  {l.address && (
                    <span className="flex items-center gap-1 truncate flex-1">
                      <MapPin className="h-3 w-3" /> {l.address}
                      {l.distance_km !== null && (
                        <span className="font-bold ml-1">· {l.distance_km} km</span>
                      )}
                    </span>
                  )}
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(l.marketplace_at || l.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-700">
                    {l.accepted_count}/{l.max_slots} slots filled
                  </span>
                  <button
                    onClick={() => claim(l.id)}
                    disabled={claiming === l.id}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-display font-bold text-sm shadow active:scale-95 disabled:opacity-50"
                  >
                    {claiming === l.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Claim Lead"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
