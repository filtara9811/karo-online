// Quick Orders Bottom Sheet
// Premium 95%-height overlay sheet shown on the /quick screen.
// - Two source buckets: Quick Services vs Digital Shops
// - Status filter tabs with counts
// - Banner carousel on top
// - Expandable lead cards showing item/invoice details on tap
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronDown, Bell, Star, HandHelping,
  Hourglass, AlertCircle, CheckCircle2, MessageSquare, Wrench,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerPortal, DrawerOverlay } from "@/components/ui/drawer";
import { BannerCarousel } from "@/components/BannerCarousel";
import { useMyOrders } from "@/hooks/use-my-orders";
import { supabase } from "@/integrations/supabase/client";
import type { OrderItem, VendorGroup, OrderStatus } from "@/lib/orders-store";

type StatusKind = "all" | "pending" | "active" | "completed" | "enquiry";
type SourceBucket = "quick" | "shop";

const STATUS_TABS: { key: StatusKind; label: string; border: string; ring: string; Icon: typeof HandHelping }[] = [
  { key: "all",        label: "All Leads",                border: "border-slate-400",  ring: "ring-slate-200",  Icon: HandHelping },
  { key: "pending",    label: "Pending",                  border: "border-amber-400",  ring: "ring-amber-200",  Icon: Hourglass },
  { key: "active",     label: "Under Review",             border: "border-rose-400",   ring: "ring-rose-200",   Icon: AlertCircle },
  { key: "completed",  label: "Completed",                border: "border-emerald-500",ring: "ring-emerald-200",Icon: CheckCircle2 },
  { key: "enquiry",    label: "Enquiry",                  border: "border-emerald-300",ring: "ring-emerald-100",Icon: MessageSquare },
];

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  active:  { label: "Active",  cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  done:    { label: "Done",    cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  cancel:  { label: "Cancel",  cls: "bg-rose-100 text-rose-700 border-rose-300" },
};

function bucketOfStatus(s: OrderStatus): StatusKind {
  if (s === "cancelled") return "all";
  if (s === "delivered") return "completed";
  if (s === "placed") return "pending";
  return "active";
}

function pillOfStatus(s: OrderStatus): { label: string; cls: string } {
  if (s === "cancelled") return STATUS_PILL.cancel;
  if (s === "delivered") return STATUS_PILL.done;
  if (s === "placed") return STATUS_PILL.pending;
  return STATUS_PILL.active;
}

function sourceBucket(o: OrderItem): SourceBucket {
  return o.source === "shop" ? "shop" : "quick";
}

type InvoiceLine = { id: string; name: string; image_url: string | null; price: number | null; qty: number };

function useLeadInvoice(leadId: string, enabled: boolean) {
  const [lines, setLines] = useState<InvoiceLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || lines !== null) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: lead } = await supabase
        .from("leads")
        .select("item_ids, accepted_vendor_id")
        .eq("id", leadId)
        .maybeSingle();
      const itemIds = ((lead?.item_ids ?? []) as string[]).filter(Boolean);
      if (!itemIds.length) { if (alive) { setLines([]); setLoading(false); } return; }
      const [{ data: items }, { data: maps }] = await Promise.all([
        supabase.from("catalog_items").select("id, name, image_url, price_min").in("id", itemIds),
        lead?.accepted_vendor_id
          ? supabase.from("vendor_item_mappings").select("item_id, price").eq("vendor_id", lead.accepted_vendor_id).in("item_id", itemIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const priceMap = new Map<string, number>();
      (maps ?? []).forEach((m: any) => { if (m.price != null) priceMap.set(m.item_id as string, Number(m.price)); });
      const out: InvoiceLine[] = (items ?? []).map((it: any) => ({
        id: it.id as string,
        name: it.name as string,
        image_url: it.image_url as string | null,
        price: priceMap.get(it.id as string) ?? (it.price_min != null ? Number(it.price_min) : null),
        qty: 1,
      }));
      if (alive) { setLines(out); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [leadId, enabled, lines]);
  return { lines, loading };
}

function LeadCard({ order, vendor, onOpen }: { order: OrderItem; vendor: VendorGroup; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const { lines, loading } = useLeadInvoice(order.id, open);
  const pill = pillOfStatus(order.status);
  const total = (lines ?? []).reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-amber-200/70 bg-white shadow-[0_2px_10px_-6px_rgba(212,175,55,0.35)]"
    >
      {/* Top strip — vendor / lead id / status */}
      <div className="flex items-center gap-3 p-3 bg-amber-50/80">
        <span className="h-11 w-11 rounded-full overflow-hidden border-2 border-white shadow shrink-0">
          <img src={vendor.avatar} alt={vendor.vendorName} className="h-full w-full object-cover" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 truncate">{vendor.vendorName}</p>
          <p className="text-[10px] text-slate-500 underline">Customer details</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{order.lastAt}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-slate-500">Lead id <span className="font-mono font-bold text-slate-700">#{order.shortCode ?? order.id.slice(-6).toUpperCase()}</span></span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${pill.cls}`}>
            <Bell className="h-3 w-3" /> {pill.label}
            {order.unread > 0 && (
              <span className="ml-1 min-w-[16px] h-4 px-1 grid place-items-center bg-rose-500 text-white rounded-full text-[9px]">{order.unread}</span>
            )}
          </span>
        </div>
      </div>

      {/* Bottom strip — service summary */}
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-stretch gap-3 p-3 bg-slate-50 text-left active:bg-slate-100/70 transition">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-display font-bold text-slate-800 truncate">{order.service}</p>
          <p className="text-[11px] text-slate-500">Good and best service</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> 4.9
            </span>
            {total > 0 && (
              <span className="text-[12px] font-bold text-emerald-700">₹ {total.toLocaleString("en-IN")}</span>
            )}
          </div>
        </div>
        <div className="h-16 w-16 rounded-xl overflow-hidden border border-amber-200/60 bg-white grid place-items-center shrink-0">
          {order.productImage ? (
            <img src={order.productImage} alt={order.service} className="h-full w-full object-cover" />
          ) : (
            <Wrench className="h-6 w-6 text-amber-500" />
          )}
        </div>
        <ChevronDown className={`absolute right-3 bottom-3 h-4 w-4 text-amber-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded invoice */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-amber-100 bg-white"
          >
            <div className="p-3 space-y-2">
              {loading && <p className="text-xs text-slate-400">Loading invoice…</p>}
              {!loading && lines && lines.length === 0 && (
                <p className="text-xs text-slate-400">No item variations on this lead yet.</p>
              )}
              {(lines ?? []).map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-xl border border-amber-100 bg-amber-50/30">
                  <span className="h-10 w-10 rounded-lg overflow-hidden bg-white border border-amber-100 grid place-items-center shrink-0">
                    {l.image_url ? <img src={l.image_url} alt="" className="h-full w-full object-cover" /> : <Wrench className="h-4 w-4 text-amber-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-700 truncate">{l.name}</p>
                    <p className="text-[10px] text-slate-400">Qty {l.qty}</p>
                  </div>
                  <p className="text-[12px] font-bold text-emerald-700 shrink-0">
                    {l.price != null ? `₹ ${(l.price * l.qty).toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
              ))}
              <button onClick={onOpen} className="w-full text-center text-[12px] font-bold text-amber-700 underline py-2">
                Open chat & full invoice →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function QuickOrdersSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { groups, loading, markOrderRead } = useMyOrders();
  const [source, setSource] = useState<SourceBucket>(() => {
    if (typeof window === "undefined") return "quick";
    return (window.localStorage.getItem("ko-quick-orders-source") as SourceBucket) || "quick";
  });
  const [statusKind, setStatusKind] = useState<StatusKind>("all");

  useEffect(() => { try { window.localStorage.setItem("ko-quick-orders-source", source); } catch {} }, [source]);

  // Flatten + filter by source bucket
  const filteredVendorOrders = useMemo(() => {
    const out: { vendor: VendorGroup; order: OrderItem }[] = [];
    groups.forEach((v) => {
      v.orders.forEach((o) => {
        if (sourceBucket(o) !== source) return;
        out.push({ vendor: v, order: o });
      });
    });
    return out;
  }, [groups, source]);

  const counts = useMemo(() => {
    const c: Record<StatusKind, number> = { all: 0, pending: 0, active: 0, completed: 0, enquiry: 0 };
    filteredVendorOrders.forEach(({ order }) => {
      c.all += 1;
      const b = bucketOfStatus(order.status);
      if (b in c) c[b] += 1;
      if (order.status === "placed") c.enquiry += 1;
    });
    return c;
  }, [filteredVendorOrders]);

  const visible = useMemo(() => {
    if (statusKind === "all") return filteredVendorOrders;
    if (statusKind === "enquiry") return filteredVendorOrders.filter(({ order }) => order.status === "placed");
    return filteredVendorOrders.filter(({ order }) => bucketOfStatus(order.status) === statusKind);
  }, [filteredVendorOrders, statusKind]);

  const openOrder = async (vendorId: string, orderId: string) => {
    await markOrderRead(orderId);
    onOpenChange(false);
    navigate({ to: "/chat", search: { vendorId, orderId } as never });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/40" />
        <DrawerContent
          className="!h-[95vh] !max-h-[95vh] bg-gradient-to-b from-[#fffaf0] to-white border-t-2 border-amber-200 rounded-t-3xl p-0 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-amber-100 shrink-0">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-amber-600 font-bold">✦ Ledger ✦</p>
              <h2 className="font-display text-lg text-gold-gradient font-bold leading-tight">Quick My Order Leads</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="h-9 w-9 rounded-full grid place-items-center bg-white border border-amber-300 shadow-sm active:scale-90"
            >
              <X className="h-4 w-4 text-amber-700" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3 space-y-3">
            {/* Banner */}
            <div className="rounded-2xl overflow-hidden">
              <BannerCarousel />
            </div>

            {/* Source toggle: Quick Services / Digital Shops */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-amber-50 border border-amber-200 rounded-full">
              {([
                { key: "quick" as const, label: "Quick Services" },
                { key: "shop" as const, label: "Digital Shops" },
              ]).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSource(s.key)}
                  className={`text-[12px] font-bold py-2 rounded-full transition ${
                    source === s.key
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow"
                      : "text-amber-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {STATUS_TABS.map((t) => {
                const active = statusKind === t.key;
                const c = counts[t.key];
                const Icon = t.Icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setStatusKind(t.key)}
                    className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl bg-white border-2 ${t.border} ${active ? `ring-2 ${t.ring} shadow` : "opacity-80"} transition`}
                  >
                    <Icon className="h-4 w-4 text-slate-700" />
                    <span className="text-[12px] font-bold text-slate-800 leading-none">{c}</span>
                    <span className="text-[9px] text-slate-500 leading-tight whitespace-nowrap">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* List header */}
            <p className="text-[12px] font-bold text-slate-700 underline pl-1">
              {statusKind === "all" ? "All Leads Customer" : `${STATUS_TABS.find((t) => t.key === statusKind)?.label} Customer`}
            </p>

            {/* Cards */}
            <div className="space-y-3 relative">
              {loading && visible.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">Loading orders…</p>
              )}
              {!loading && visible.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-amber-200/50">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-amber-300" />
                  <p className="text-sm text-slate-500 mt-2">
                    Abhi koi {source === "shop" ? "digital dukan" : "quick service"} order nahi hai.
                  </p>
                </div>
              )}
              {visible.map(({ vendor, order }) => (
                <div key={order.id} className="relative">
                  <LeadCard order={order} vendor={vendor} onOpen={() => openOrder(vendor.vendorId, order.id)} />
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
