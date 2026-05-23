import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Radar, X, MessageCircle, Phone, CheckCircle2, Maximize2, GripVertical, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useActiveInquiries, openInquiry, clearActiveInquiry, type ActiveInquiry } from "@/hooks/use-active-inquiry";
import { supabase } from "@/integrations/supabase/client";

const POS_KEY = "ko-floating-widget-pos-v1";

type Pos = { x: number; y: number };

function loadPos(): Pos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    return raw ? (JSON.parse(raw) as Pos) : null;
  } catch { return null; }
}
function savePos(p: Pos) {
  try { window.localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {}
}

/**
 * Draggable picture-in-picture widget for active customer inquiries.
 * - 0 inquiries → nothing
 * - 1 inquiry, none open → single pill (tap restores)
 * - 2+ inquiries, none open → single pill with badge (tap → picker sheet)
 * - any inquiry open → hidden (sheet is showing)
 */
export function FloatingInquiryWidget() {
  const { inquiries, open, openOne } = useActiveInquiries();
  const navigate = useNavigate();
  const location = useLocation();
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [pos, setPos] = useState<Pos>(() => loadPos() ?? { x: 0, y: 0 });
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 360 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 640 : window.innerHeight));

  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!inquiries.length || open) return null;
  if (location.pathname.startsWith("/chat") || location.pathname.startsWith("/admin")) return null;

  const count = inquiries.length;
  const primary = inquiries[inquiries.length - 1];
  const approved = primary.approved;
  const isApproved = !!approved;

  const restore = (inq: ActiveInquiry) => {
    openInquiry(inq.leadId);
    setPickerOpen(false);
    if (!location.pathname.startsWith("/quick")) navigate({ to: "/quick" });
  };

  const handleTap = () => {
    if (count > 1) setPickerOpen(true);
    else restore(primary);
  };

  const cancelInquiry = async (leadId: string) => {
    try { await supabase.from("leads").update({ status: "cancelled" }).eq("id", leadId); } catch {}
    clearActiveInquiry(leadId);
    setConfirmCancel(null);
  };

  // On /quick (home) the widget is PINNED to peek from BEHIND the white
  // sheet container. The sheet starts at (34vh - 24px) from top (map=34vh
  // with -mt-6 overlap). We want widget vertical center on that edge so
  // half tucks behind (z-15 < sheet z-20) and half pokes above.
  const isHome = location.pathname.startsWith("/quick");
  const widgetH = 56;
  const widgetW = 260;
  const animX = isHome ? 0 : pos.x;
  const animY = isHome ? 0 : pos.y;

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 z-[9] pointer-events-none" />

      <AnimatePresence>
        <motion.div
          key="floating-inquiry"
          drag={!isHome}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{
            left: -(vw - widgetW - 16),
            right: 0,
            top: -(vh - widgetH - 112 - 32),
            bottom: 112 - 16,
          }}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: animX,
            y: isHome ? [animY, animY - 4, animY, animY - 2, animY] : animY,
            rotate: isHome ? [0, -1.4, 1.4, -0.8, 0.8, 0] : 0,
          }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={isHome
            ? {
                type: "spring", damping: 22, stiffness: 260,
                y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 2.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" },
              }
            : { type: "spring", damping: 24, stiffness: 280 }
          }
          onDragEnd={(_, info) => {
            if (isHome) return;
            const next = { x: pos.x + info.offset.x, y: pos.y + info.offset.y };
            setPos(next);
            savePos(next);
          }}
          className={`fixed ${isHome ? "z-[15]" : "z-[70]"} ${isHome ? "left-1/2 -translate-x-1/2 w-[88vw] max-w-sm" : "right-3 max-w-[88vw]"}`}
          style={{ bottom: isHome ? `calc(66vh - 4px)` : `calc(112px + env(safe-area-inset-bottom))`, touchAction: isHome ? "auto" : "none" }}
        >
          {/* Pulse halo (only on home) */}
          {isHome && (
            <>
              <motion.span
                aria-hidden
                className={`absolute inset-0 rounded-2xl ${isApproved ? "bg-emerald-400/25" : "bg-amber-400/25"}`}
                animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                aria-hidden
                className={`absolute -inset-1 rounded-2xl border-2 ${isApproved ? "border-emerald-300" : "border-amber-300"}`}
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
          <div className={`relative rounded-2xl shadow-[0_10px_30px_-8px_rgba(15,23,42,0.4)] border overflow-hidden backdrop-blur ${
            isApproved
              ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-300"
              : "bg-gradient-to-br from-[#fff8dc] to-white border-[color:oklch(0.78_0.14_82/0.55)]"
          }`}>
            <div className="flex items-stretch">
              {/* Drag handle — always available so user can pick widget up */}
              <button
                onPointerDown={(e) => dragControls.start(e)}
                aria-label="Drag"
                className="px-1 grid place-items-center text-slate-400 active:text-slate-700 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <GripVertical className="h-4 w-4" />
              </button>


              {/* Tap target */}
              <button
                onClick={handleTap}
                className="flex-1 flex items-center gap-2.5 py-2 pr-9 text-left active:scale-[0.98] transition"
                aria-label="Open active inquiries"
              >
                <div className="relative flex-shrink-0">
                  {isApproved && approved!.avatar_url ? (
                    <img src={approved!.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
                  ) : primary.productImage ? (
                    <img src={primary.productImage} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] grid place-items-center shadow">
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-amber-400"
                        animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                      <Radar className="h-5 w-5 text-white" strokeWidth={2.4} />
                    </div>
                  )}
                  {count > 1 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white">
                      {count}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`font-display text-[13px] font-bold leading-tight truncate ${isApproved ? "text-emerald-800" : "text-amber-900"}`}>
                    {count > 1 ? `${count} active requests` : isApproved ? approved!.name : `Finding · ${primary.category}`}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {count > 1
                      ? "Tap to choose which to view"
                      : isApproved
                        ? <>Approved {approved!.quoted_price ? `· ₹${approved!.quoted_price}` : ""}</>
                        : `${primary.vendorCount} vendor${primary.vendorCount === 1 ? "" : "s"} — tap to view`}
                  </p>
                </div>
                <Maximize2 className="h-3.5 w-3.5 text-slate-400 ml-auto flex-shrink-0" />
              </button>
            </div>

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmCancel(primary.leadId); }}
              aria-label="Cancel"
              className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-white/90 border border-slate-200 active:scale-90"
            >
              <X className="h-3 w-3 text-slate-600" />
            </button>

            {isApproved && count === 1 && (
              <div className="px-2 pb-2 pt-0 flex gap-1.5">
                <button onClick={() => navigate({ to: "/orders" })} className="flex-1 h-8 rounded-lg bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 active:scale-95">
                  <CheckCircle2 className="h-3.5 w-3.5" /> My Order
                </button>
                <button onClick={() => navigate({ to: "/orders" })} className="h-8 w-8 rounded-lg bg-white border border-sky-400 text-sky-700 grid place-items-center active:scale-95" aria-label="Chat">
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
                {approved!.phone && (
                  <a href={`tel:${approved!.phone}`} className="h-8 w-8 rounded-lg bg-white border border-emerald-400 text-emerald-700 grid place-items-center active:scale-95" aria-label="Call">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Cancel confirm */}
          <AnimatePresence>
            {confirmCancel && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-white border border-slate-200 shadow-2xl p-3">
                <p className="text-[12px] font-semibold text-slate-800">Cancel this inquiry?</p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => setConfirmCancel(null)} className="flex-1 h-7 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold active:scale-95">Keep</button>
                  <button onClick={() => cancelInquiry(confirmCancel)} className="flex-1 h-7 rounded-md bg-red-500 text-white text-[11px] font-bold active:scale-95">Yes, cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Picker sheet — multi-inquiry */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[88] flex items-end justify-center bg-black/40"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center pt-2 pb-1"><span className="h-1.5 w-14 rounded-full bg-slate-200" /></div>
              <div className="px-5 pt-1 pb-3">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-700">✦ Your Requests</p>
                <h3 className="font-display text-lg font-bold text-slate-800">Which inquiry do you want to view?</h3>
              </div>
              <div className="px-3 pb-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {inquiries.map((inq) => (
                  <button
                    key={inq.leadId}
                    onClick={() => restore(inq)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-amber-50/40 active:scale-[0.98] text-left transition"
                  >
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-amber-50 border border-amber-200 flex-shrink-0">
                      {inq.productImage
                        ? <img src={inq.productImage} alt="" className="h-full w-full object-cover" />
                        : <div className="h-full w-full grid place-items-center text-amber-700 font-bold">{inq.category[0]}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold text-slate-800 truncate">{inq.category}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {inq.approved
                          ? <>✓ Approved · {inq.approved.name}</>
                          : <>{inq.vendorCount} vendor{inq.vendorCount === 1 ? "" : "s"} accepted</>}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
