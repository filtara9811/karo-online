import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LivePreviewFace } from "./LivePreviewFace";
import { LandingProductsSheet } from "./LandingProductsSheet";
import { LandingMediaSheet } from "./LandingMediaSheet";
import { LandingExtrasSheet } from "./LandingExtrasSheet";
import type { LandingTheme } from "./QrProjectCard";

/**
 * Full-height bottom sheet with the live customer landing preview plus the
 * inline editor toolbar (brand colour, theme, links, products, videos, settings).
 */
export function LandingEditorSheet({
  open,
  onClose,
  title,
  landingUrl,
  themes,
  currentKey,
  accent,
  premium,
  saving,
  onApply,
  onAccent,
  onLinks,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  landingUrl: string;
  themes: LandingTheme[];
  currentKey: string;
  accent: string;
  premium: boolean;
  saving: boolean;
  onApply: (t: LandingTheme) => void;
  onAccent: (color: string) => void;
  onLinks: () => void;
}) {
  const [tool, setTool] = useState<"products" | "videos" | "settings" | null>(null);
  const [refresh, setRefresh] = useState(0);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/55 flex items-end"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 290, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto h-[92vh] overflow-hidden rounded-t-[30px] bg-white pb-[env(safe-area-inset-bottom)]"
            >
              <LivePreviewFace
                key={refresh}
                title={title}
                landingUrl={landingUrl}
                themes={themes}
                currentKey={currentKey}
                accent={accent}
                premium={premium}
                saving={saving}
                onFlipBack={onClose}
                onApply={onApply}
                onAccent={onAccent}
                onLinks={onLinks}
                onProducts={() => setTool("products")}
                onVideos={() => setTool("videos")}
                onSettings={() => setTool("settings")}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LandingProductsSheet
        open={tool === "products"}
        onClose={() => setTool(null)}
        onSaved={() => setRefresh((n) => n + 1)}
      />
      <LandingMediaSheet
        open={tool === "videos"}
        onClose={() => setTool(null)}
        onSaved={() => setRefresh((n) => n + 1)}
      />
      <LandingExtrasSheet
        open={tool === "settings"}
        onClose={() => setTool(null)}
        onSaved={() => setRefresh((n) => n + 1)}
      />
    </>
  );
}
