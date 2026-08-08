import { AnimatePresence, motion } from "framer-motion";
import { X, Phone, MessageCircle, QrCode, MousePointerClick, Link2, MapPin, Smartphone } from "lucide-react";

export type VisitorRow = {
  id: string;
  created_at: string;
  user_agent?: string | null;
  visitor_name?: string | null;
  visitor_phone?: string | null;
  project_slug?: string | null;
  source?: string | null;
};

function device(ua?: string | null) {
  const s = ua ?? "";
  if (/Android/i.test(s)) return "Android";
  if (/iPhone|iPad/i.test(s)) return "iOS";
  return "Web";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** WhatsApp-style visitor activity thread: what the visitor tapped on the landing page. */
export function VisitorChatSheet({
  visitor, onClose,
}: { visitor: VisitorRow | null; onClose: () => void }) {
  const name = (visitor?.visitor_name || "").trim();
  const events = visitor
    ? [
        { icon: QrCode, text: `QR scan hua (${visitor.source ?? "qr"})`, at: visitor.created_at },
        { icon: Smartphone, text: `Device: ${device(visitor.user_agent)}`, at: visitor.created_at },
        ...(visitor.project_slug ? [{ icon: Link2, text: `Landing page khola: /${visitor.project_slug}`, at: visitor.created_at }] : []),
        ...(visitor.visitor_phone
          ? [{ icon: MousePointerClick, text: "Contact form bhara — naam & mobile diya", at: visitor.created_at }]
          : [{ icon: MousePointerClick, text: "Contact details nahi di", at: visitor.created_at }]),
      ]
    : [];

  return (
    <AnimatePresence>
      {visitor && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[145] bg-black/45"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[146] max-h-[82vh] rounded-t-[30px] bg-[#efe7dd] overflow-hidden flex flex-col"
          >
            <header className="bg-emerald-600 px-4 py-3 flex items-center gap-3">
              <span className="h-11 w-11 rounded-full bg-white/25 grid place-items-center text-white font-bold text-base">
                {name ? name.charAt(0).toUpperCase() : <QrCode className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px] truncate">{name || "Anonymous visitor"}</p>
                <p className="text-white/80 text-[11px] truncate">
                  {visitor.visitor_phone ? `+91 ${visitor.visitor_phone}` : "Number nahi diya"} · {fmt(visitor.created_at)}
                </p>
              </div>
              {visitor.visitor_phone && (
                <>
                  <a href={`tel:+91${visitor.visitor_phone}`} aria-label="Call visitor" className="h-9 w-9 grid place-items-center rounded-full bg-white/20 text-white active:scale-90">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={`https://wa.me/91${visitor.visitor_phone}`} target="_blank" rel="noreferrer" aria-label="WhatsApp visitor" className="h-9 w-9 grid place-items-center rounded-full bg-white/20 text-white active:scale-90">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </>
              )}
              <button onClick={onClose} aria-label="Close visitor chat" className="h-9 w-9 grid place-items-center rounded-full bg-white/20 text-white active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
              <p className="mx-auto w-fit rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold text-slate-500">
                Activity timeline
              </p>
              {events.map((e, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="max-w-[82%] rounded-2xl rounded-tl-md bg-white px-3 py-2 shadow-sm"
                >
                  <p className="text-[13px] text-slate-800 inline-flex items-start gap-2">
                    <e.icon className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" /> {e.text}
                  </p>
                  <p className="text-[9px] text-slate-400 text-right mt-0.5">{fmt(e.at)}</p>
                </motion.div>
              ))}
              {visitor.visitor_phone && (
                <a
                  href={`https://wa.me/91${visitor.visitor_phone}?text=${encodeURIComponent("Namaste! Aapne humara QR scan kiya tha — kaise help kar sakte hain?")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto block w-fit max-w-[82%] rounded-2xl rounded-tr-md bg-emerald-500 px-3.5 py-2.5 text-[13px] font-bold text-white shadow-sm active:scale-95"
                >
                  WhatsApp par reply karein →
                </a>
              )}
              <p className="mx-auto w-fit rounded-full bg-white/70 px-3 py-1 text-[10px] text-slate-500 inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-amber-600" /> Landing page se aaya visitor
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
