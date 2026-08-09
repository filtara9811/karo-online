import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Bottom sheet shell for the One QR live-preview editor tools.
 * Sits above the live preview sheet (z-[160]) so it is always visible.
 */
export function SheetShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-end bg-black/55 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-[30px] bg-white pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-start gap-3 border-b border-black/5 px-4 py-3.5">
              <div className="min-w-0">
                <h3 className="font-display text-[16px] font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
            {footer && <div className="border-t border-black/5 px-4 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
