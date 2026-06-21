import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useQueueCount } from "@/hooks/useQueueCount";
import { AnimatePresence, motion } from "framer-motion";

export function OfflineBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const online = useOnlineStatus();
  const pending = useQueueCount();
  const show = mounted && (!online || pending > 0);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[200] pointer-events-none flex justify-center pt-[env(safe-area-inset-top)]"
        >
          <div
            className={`mt-1 px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-lg flex items-center gap-1.5 pointer-events-auto ${
              online
                ? "bg-amber-500 text-white"
                : "bg-slate-800 text-white"
            }`}
            role="status"
            aria-live="polite"
          >
            {online ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing {pending} pending…
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                You are offline · cached data shown
                {pending > 0 && ` · ${pending} queued`}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
