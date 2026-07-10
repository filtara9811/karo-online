import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  children: React.ReactNode;
  /** Where to go when user dismisses the sheet */
  onDismissTo?: string;
};

/**
 * Full-height bottom sheet wrapper.
 * Renders a dimmed backdrop with a rounded, slide-up panel above the current
 * home/dashboard screen. Used for /vendor/listing, /vendor/services, etc.
 */
export function SheetShell({ children, onDismissTo = "/vendor/dashboard" }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // trigger slide-up on mount
    const id = requestAnimationFrame(() => setOpen(true));
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    setTimeout(() => navigate({ to: onDismissTo }), 220);
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* backdrop - soft dashboard-tinted gradient + dim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.30 0.06 60 / 0.55) 0%, oklch(0.20 0.05 60 / 0.65) 100%)",
          backdropFilter: "blur(6px)",
        }}
        onClick={dismiss}
        aria-label="Close"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-x-0 bottom-0 top-3 rounded-t-[28px] overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(180deg, #fffdf6 0%, #fdf6e3 100%)" }}
          >
            {/* grabber */}
            <div className="pt-2 pb-1 grid place-items-center">
              <span className="h-1.5 w-10 rounded-full bg-[color:oklch(0.85_0.03_60)]" />
            </div>
            <div className="h-[calc(100%-16px)] overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
