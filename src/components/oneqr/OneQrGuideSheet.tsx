import { AnimatePresence, motion } from "framer-motion";
import { X, HelpCircle } from "lucide-react";

const SECTIONS: Array<{ title: string; items: string[] }> = [
  {
    title: "Projects tab",
    items: [
      "Create New Project / QR — har QR ek project hai (Shop Gate QR, Counter QR, Table QR).",
      "Login zaroori hai — login ke bina project, theme aur PWA options nahi dikhte.",
      "Project card par stats: total scans, aaj ke scans, leads aur clicks.",
    ],
  },
  {
    title: "Theme (3 styles)",
    items: [
      "Card par 'Preview & change theme' button — phone frame me customer ka asli landing page.",
      "Shop style — story media + product catalog rail.",
      "Chat style — WhatsApp jaisa welcome + service tiles.",
      "Reels style — full-screen vertical video with sound.",
      "Theme tap karte hi customer ke page par apply ho jata hai.",
    ],
  },
  {
    title: "Card ⋮ menu",
    items: [
      "Preview landing page, Change theme, Manage links, Download poster, QR image, Delete.",
      "Poster me 10 media slots tak — print karke shop par laga sakte hain.",
    ],
  },
  {
    title: "Customer landing page",
    items: [
      "Top bar avatar — shop profile + 'My details' form (naam, mobile) fill kar sakta hai.",
      "Top bar 'App' button + ⋮ menu — sirf usi dukaan ka PWA install hota hai.",
      "Beech me media WhatsApp/TikTok jaisa upar-neeche swipe, sound auto.",
      "Neeche dock — Social, Payment (UPI), Shop, Links; tap par tile rail khulta hai.",
    ],
  },
  {
    title: "Free vs PRO",
    items: [
      "Free: unlimited scans, visitor capture + CRM list, base themes, QR poster, analytics chart.",
      "PRO: premium themes, ad campaigns aur extra projects.",
    ],
  },
];

export function OneQrGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[68] bg-slate-950/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[30px] bg-white p-4 pb-8"
          >
            <div className="mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-xl font-bold text-slate-900">One QR guide</h2>
              <button
                onClick={onClose}
                aria-label="Close guide"
                className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {SECTIONS.map((s) => (
                <section key={s.title} className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3">
                  <h3 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                    {s.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {s.items.map((i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
