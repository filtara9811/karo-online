import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, QrCode, Share2, Eye, Loader2 } from "lucide-react";

type Source = "qr" | "card" | "link";

export function TrafficVisitorsSheet({
  open, onOpenChange, source, shareText,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: Source;
  shareText: string;
}) {
  const [rows, setRows] = useState<Array<{ id: string; created_at: string; user_agent: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.rpc("get_referral_visits", { _source: source, _limit: 100 }).then(({ data }) => {
      setRows((data as any[]) ?? []);
      setLoading(false);
    });
  }, [open, source]);

  const titleMap: Record<Source, string> = {
    qr: "QR code scans", card: "Business card opens", link: "Referral link clicks",
  };
  const Icon = source === "qr" ? QrCode : source === "card" ? Eye : Share2;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-7">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
          <SheetHeader>
            <SheetTitle className="font-display text-lg text-slate-800 flex items-center gap-2">
              <Icon className="h-5 w-5 text-amber-700" /> {titleMap[source]}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white grid place-items-center text-amber-700 border border-amber-200">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Total visits</p>
              <p className="font-display text-xl font-bold text-amber-800">{rows.length}</p>
            </div>
            <button onClick={shareToWhatsApp} className="rounded-xl bg-emerald-500 text-white px-3 py-2 text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow">
              <MessageCircle className="h-3.5 w-3.5" /> Share again
            </button>
          </div>

          {loading && (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-10">No visits yet — share your link to start tracking.</p>
          )}

          <ul className="mt-3 space-y-2">
            {rows.map((r) => {
              const ua = r.user_agent ?? "";
              const device = /Android/i.test(ua) ? "📱 Android" : /iPhone|iPad/i.test(ua) ? "🍎 iOS" : "💻 Web";
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                  <div className="h-8 w-8 rounded-full bg-amber-50 grid place-items-center text-amber-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{device}</p>
                    <p className="text-[11px] text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={shareToWhatsApp}
                    className="h-8 w-8 grid place-items-center rounded-full bg-emerald-50 text-emerald-600 active:scale-90"
                    aria-label="Share on WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
