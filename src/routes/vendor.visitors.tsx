import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Users,
  Phone,
  MessageCircle,
  Loader2,
  Filter,
  Award,
  Clock,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/visitors")({
  head: () => ({
    meta: [
      { title: "My Visitors — Karo Online" },
      { name: "description", content: "See who scanned your shop QR — name, mobile, visits, last seen." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisitorsPage,
});

type Visitor = {
  identity_id: string;
  name: string | null;
  mobile: string;
  visit_count: number;
  first_visit_at: string;
  last_visit_at: string;
  source_kind: string;
  source_qr_code: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function VisitorsPage() {
  return (
    <VendorAuthGate>
      <Inner />
    </VendorAuthGate>
  );
}

function Inner() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "loyal">("recent");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [vendorId, setVendorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("vendor_get_visitors", {
      p_sort: sort,
      p_source: sourceFilter || null,
      p_limit: 200,
    });
    if (error) toast.error(error.message);
    setVisitors((data as Visitor[]) ?? []);
    setLoading(false);
  }, [sort, sourceFilter]);

  useEffect(() => {
    (async () => {
      const { data: ses } = await supabase.auth.getSession();
      const uid = ses.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (data?.id) setVendorId(data.id);
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: live new-visitor toast
  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel(`vendor-visits-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vendor_customer_visits",
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          toast.success("New visitor at your shop!");
          load();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vendor_customer_visits",
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, load]);

  const totals = useMemo(() => {
    const total = visitors.reduce((s, v) => s + v.visit_count, 0);
    return { unique: visitors.length, total };
  }, [visitors]);

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 px-4 py-3 flex items-center gap-3">
        <Link to="/vendor/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-amber-100">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900 leading-tight">My Visitors</h1>
          <p className="text-[10px] text-slate-500">
            {totals.unique} unique · {totals.total} total visits
          </p>
        </div>
        <Users className="h-5 w-5 text-amber-700" />
      </header>

      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setSort("recent")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
            sort === "recent"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-slate-700 border-amber-200"
          }`}
        >
          <Clock className="inline h-3 w-3 mr-1" /> Recent
        </button>
        <button
          onClick={() => setSort("loyal")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
            sort === "loyal"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-slate-700 border-amber-200"
          }`}
        >
          <Award className="inline h-3 w-3 mr-1" /> Most Loyal
        </button>
        <div className="w-px h-6 bg-amber-200" />
        {[
          { v: "", label: "All" },
          { v: "stand", label: "Stand QR" },
          { v: "card", label: "Card" },
          { v: "poster", label: "Poster" },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() => setSourceFilter(s.v)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
              sourceFilter === s.v
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <main className="px-4 pb-24 space-y-2">
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-amber-300 mb-2" />
            <p className="text-sm text-slate-600">No visitors yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Print your shop QR from the admin team and place it on your counter.
            </p>
          </div>
        ) : (
          visitors.map((v) => <VisitorRow key={v.identity_id} v={v} />)
        )}
      </main>
    </div>
  );
}

function VisitorRow({ v }: { v: Visitor }) {
  const d = new Date(v.last_visit_at);
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const day = DAY_NAMES[d.getDay()];

  return (
    <div className="rounded-2xl bg-white border border-amber-200 p-3 flex items-center gap-3">
      <div className="h-11 w-11 rounded-full grid place-items-center bg-amber-100 border border-amber-300 text-amber-900 font-bold text-sm">
        {(v.name || v.mobile || "?").slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900 text-sm truncate">
            {v.name || "Unnamed"}
          </p>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
            ×{v.visit_count}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate">+91 {v.mobile}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {dateStr}, {timeStr} · {day}
          {v.source_qr_code && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-0.5">
                <QrCode className="h-2.5 w-2.5" /> {v.source_qr_code}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <a
          href={`tel:${v.mobile}`}
          className="h-8 w-8 grid place-items-center rounded-full bg-amber-100 border border-amber-300 active:scale-95"
        >
          <Phone className="h-3.5 w-3.5 text-amber-800" />
        </a>
        <a
          href={`https://wa.me/91${v.mobile}`}
          target="_blank"
          rel="noreferrer"
          className="h-8 w-8 grid place-items-center rounded-full bg-emerald-500 active:scale-95"
        >
          <MessageCircle className="h-3.5 w-3.5 text-white" />
        </a>
      </div>
    </div>
  );
}
