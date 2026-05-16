import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MessageCircle, Package, Gift, Headset, CheckCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications, type NotifBucket, type NotifItem } from "@/hooks/use-notifications";

const BUCKET_META: Record<NotifBucket, { Icon: typeof Bell; tint: string; label: string }> = {
  messages: { Icon: MessageCircle, tint: "bg-blue-100 text-blue-700", label: "Chat" },
  orders:   { Icon: Package,       tint: "bg-emerald-100 text-emerald-700", label: "Order" },
  referral: { Icon: Gift,          tint: "bg-rose-100 text-rose-700", label: "Referral" },
  support:  { Icon: Headset,       tint: "bg-amber-100 text-amber-700", label: "Support" },
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { items, counts, markAllRead, markRead } = useNotifications();

  const onItemClick = async (it: NotifItem) => {
    await markRead(it);
    onClose();
    if (it.href) navigate({ to: it.href });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[91] bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-amber-200 my-3" />
            <div className="px-5 pb-3 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                <h3 className="font-display font-bold text-lg text-slate-800">
                  Notifications {counts.total > 0 && <span className="text-amber-600">({counts.total})</span>}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {counts.total > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 active:scale-95">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full bg-gray-100 active:scale-90">
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Bucket summary chips */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-amber-50">
              {(Object.keys(BUCKET_META) as NotifBucket[]).map((b) => {
                const M = BUCKET_META[b];
                const n = counts[b];
                return (
                  <div key={b} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${M.tint}`}>
                    <M.Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">{M.label}</span>
                    <span className="text-[10px] font-bold bg-white/70 px-1.5 rounded-full">{n}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {items.length === 0 && (
                <div className="py-16 text-center">
                  <Bell className="h-10 w-10 mx-auto text-amber-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">Koi notification nahi</p>
                  <p className="text-[11px] text-slate-400 mt-1">Yahan messages, orders aur support updates aayenge.</p>
                </div>
              )}
              {items.map((it) => {
                const M = BUCKET_META[it.bucket];
                return (
                  <button key={it.id} onClick={() => onItemClick(it)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition active:scale-[0.99] ${
                      it.read ? "bg-white hover:bg-gray-50" : "bg-amber-50/70 border border-amber-200"
                    }`}>
                    <span className={`h-10 w-10 rounded-xl grid place-items-center flex-shrink-0 ${M.tint}`}>
                      <M.Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-slate-800 truncate">{it.title}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(it.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{it.body}</p>
                    </div>
                    {!it.read && <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Small bell button with a red unread badge — drop into any header. */
export function NotificationBell({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  const { counts } = useNotifications();
  return (
    <button onClick={onClick} aria-label="Notifications"
      className={`relative h-10 w-10 grid place-items-center rounded-full bg-white border border-amber-300 shadow-sm active:scale-90 ${className}`}>
      <Bell className="h-5 w-5 text-amber-700" />
      {counts.total > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white">
          {counts.total > 99 ? "99+" : counts.total}
        </span>
      )}
    </button>
  );
}
