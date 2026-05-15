import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";

type Props = {
  open: boolean;
  leadId: string | null;
  peer: LeadChatPeer | null;
  onClose: () => void;
};

/**
 * Bottom-sheet wrapper around LeadChatThread (~80% viewport height).
 * Reuses the exact same chat UI used by My Orders.
 */
export function VendorChatSheet({ open, leadId, peer, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !leadId) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <button
        aria-label="Close chat"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
        style={{ height: "82vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0 bg-white">
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 h-8 w-8 grid place-items-center rounded-full bg-white shadow border border-slate-200 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 min-h-0 overflow-hidden">
          <LeadChatThread
            leadId={leadId}
            peer={peer}
            myRole="customer"
            onBack={onClose}
          />
        </div>
      </motion.div>
    </div>
  );
}
