import { motion } from "framer-motion";
import { MapPin, QrCode, Users } from "lucide-react";
import { SourceBadge } from "./SourceBadge";
import { visitMedium } from "@/lib/traffic-source";
import { lastSeenAt, visitorKey } from "./visitor-groups";
import type { VisitorRow } from "./VisitorChatSheet";

export type VisitorThread = {
  kind?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  status?: string | null;
};

export type VisitorFeedRow = VisitorRow & {
  medium?: string | null;
  visits?: number | null;
  resolved_city?: string | null;
  threads?: VisitorThread[] | null;
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

/**
 * WhatsApp-style activity feed of landing page visitors: name, location,
 * real traffic-source badge and the products they asked about.
 */
export function VisitorFeed({
  rows, accent, onVisitor,
}: { rows: VisitorFeedRow[]; accent: string; onVisitor: (v: VisitorFeedRow) => void }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-amber-600" /> Landing page visitors
      </p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-3">
          Abhi koi visitor nahi — QR share karke shuru karein.
        </p>
      ) : (
        <ul className="rounded-2xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
          {rows.slice(0, 12).map((r) => {
            const key = visitorKey(r);
            const seen = lastSeenAt(key);
            const unread = !seen || +new Date(r.created_at) > +new Date(seen);
            const name = (r.visitor_name || "").trim();
            const medium = visitMedium(r);
            const threads = r.threads ?? [];
            const inquiries = threads.filter((t) => t.kind !== "order");
            const orders = threads.filter((t) => t.kind === "order");
            const thumb = threads.find((t) => t.product_image)?.product_image ?? null;
            const visits = r.visits ?? 1;

            return (
              <li key={r.id}>
                <button
                  onClick={() => onVisitor(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-amber-50"
                >
                  <span className="relative shrink-0">
                    <span
                      className="h-11 w-11 rounded-full grid place-items-center text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${accent}, #f59e0b)` }}
                    >
                      {name ? name.charAt(0).toUpperCase() : <QrCode className="h-4 w-4" />}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <SourceBadge medium={medium} className="h-[18px] w-[18px]" />
                    </span>
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[15px] font-bold text-slate-900 truncate">
                        {name || "Anonymous visitor"}
                      </p>
                      <span
                        className={`ml-auto text-[10px] shrink-0 ${unread ? "text-emerald-600 font-bold" : "text-slate-400"}`}
                      >
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 truncate inline-flex items-center gap-1 max-w-full">
                      {r.resolved_city && (
                        <>
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{r.resolved_city}</span>
                          <span className="text-slate-300">·</span>
                        </>
                      )}
                      <span className="truncate">
                        {r.visitor_phone ? `+91 ${r.visitor_phone}` : "Number nahi diya"}
                      </span>
                      {visits > 1 && <span className="shrink-0 text-slate-400">· {visits} visits</span>}
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {orders.length > 0 && (
                      <Badge label="Order" count={orders.length} tone="emerald" />
                    )}
                    {inquiries.length > 0 && (
                      <Badge label="Inquiry" count={inquiries.length} tone="amber" />
                    )}
                    {thumb && (
                      <motion.img
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="h-9 w-9 rounded-lg object-cover ring-1 ring-black/10"
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Badge({ label, count, tone }: { label: string; count: number; tone: "emerald" | "amber" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 h-6 text-[10px] font-extrabold ring-1 ${cls}`}>
      {label}
      {count > 1 && <span className="opacity-70">{count}</span>}
    </span>
  );
}
