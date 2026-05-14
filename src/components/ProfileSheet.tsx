import { motion, AnimatePresence } from "framer-motion";
import { ProfilePage } from "@/routes/profile";

/**
 * Bottom sheet wrapper that renders the full Profile page content
 * sliding up from the bottom (95vh) with an X close button.
 */
export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-gradient-to-b from-white via-amber-50/40 to-white rounded-t-3xl overflow-hidden"
            style={{ height: "95vh" }}
          >
            <div className="h-full overflow-y-auto">
              <ProfilePage onClose={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
