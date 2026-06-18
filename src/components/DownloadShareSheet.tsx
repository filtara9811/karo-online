import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { X, Download, Share2, Check, Loader2 } from "lucide-react";

/**
 * Bottom sheet shown when the user taps the left "Download / Share" pill
 * on the QR poster. Two large action tiles with animated success state.
 */
export function DownloadShareSheet({
  open,
  onOpenChange,
  onDownload,
  onShare,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDownload: () => Promise<void>;
  onShare: () => Promise<void>;
}) {
  const [dl, setDl] = useState<"idle" | "busy" | "done">("idle");
  const [sh, setSh] = useState<"idle" | "busy" | "done">("idle");

  const handle = async (kind: "dl" | "sh") => {
    const setter = kind === "dl" ? setDl : setSh;
    const fn = kind === "dl" ? onDownload : onShare;
    setter("busy");
    try {
      await fn();
      setter("done");
      setTimeout(() => setter("idle"), 1800);
    } catch {
      setter("idle");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gradient-to-b from-[#fdf6e3] to-[#f4e9c8] border-t-2 border-[#d4af37]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-[#1a1208] font-display text-lg">Save or share your poster</DrawerTitle>
            <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/70 text-[#1a1208]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-8 grid grid-cols-2 gap-3">
          <Tile
            color="bg-emerald-600"
            label="Download QR"
            sub="Save to gallery"
            state={dl}
            icon={<Download className="h-6 w-6" />}
            onClick={() => handle("dl")}
          />
          <Tile
            color="bg-[#1a1208]"
            label="Share | QR"
            sub="WhatsApp · Direct"
            state={sh}
            icon={<Share2 className="h-6 w-6" />}
            onClick={() => handle("sh")}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Tile({
  color, label, sub, state, icon, onClick,
}: {
  color: string; label: string; sub: string;
  state: "idle" | "busy" | "done"; icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "busy"}
      className={`relative rounded-3xl ${color} text-white px-4 py-6 flex flex-col items-center gap-2 shadow-xl active:scale-95 disabled:opacity-80 overflow-hidden`}
    >
      <div className="h-14 w-14 grid place-items-center rounded-full bg-white/15">
        {state === "busy" ? <Loader2 className="h-7 w-7 animate-spin" />
          : state === "done" ? <Check className="h-7 w-7 text-emerald-300" />
          : icon}
      </div>
      <div className="font-bold">{label}</div>
      <div className="text-[11px] opacity-80">{sub}</div>
      {state === "busy" && (
        <div className="absolute inset-x-4 bottom-3 h-1 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-1/3 bg-white/80 animate-[shimmer_1.2s_linear_infinite]"
               style={{ animation: "shimmer 1.2s linear infinite" }} />
        </div>
      )}
    </button>
  );
}
