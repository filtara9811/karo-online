import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { X, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

/**
 * Lightweight camera viewfinder. Scans QR codes via the browser BarcodeDetector
 * (Android Chrome + iOS 17+). Extracts the `pa` (VPA) from a upi:// payload
 * and returns it via onResult. Falls back to a message when the API is missing.
 */
export function VpaScannerSheet({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResult: (vpa: string, payeeName?: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const win = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
    if (!win.BarcodeDetector) {
      setStatus("error");
      setErr("QR scanning needs Chrome on Android. Please type the VPA manually.");
      return;
    }

    setStatus("starting");
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");
        const detector = new win.BarcodeDetector!({ formats: ["qr_code"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const hit = codes.find((c) => c.rawValue);
            if (hit) { handleRaw(hit.rawValue); return; }
          } catch { /* ignore */ }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch (e) {
        setStatus("error");
        setErr((e as Error).message || "Camera access denied");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRaw = (raw: string) => {
    try {
      // upi://pay?pa=merchant@bank&pn=Name&...
      const m = raw.match(/^upi:\/\/[a-z]+\?(.+)$/i);
      const qs = new URLSearchParams(m ? m[1] : raw);
      const pa = qs.get("pa") || qs.get("PA");
      const pn = qs.get("pn") || qs.get("PN") || undefined;
      if (pa) {
        onResult(pa, pn || undefined);
        toast.success(`Linked ${pa}`);
        onOpenChange(false);
        return;
      }
      // Some posters encode just the VPA
      if (/^[\w.-]+@[\w.-]+$/.test(raw.trim())) {
        onResult(raw.trim());
        toast.success(`Linked ${raw.trim()}`);
        onOpenChange(false);
        return;
      }
      toast.error("That doesn't look like a UPI QR");
    } catch {
      toast.error("Could not read QR");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0a0700] text-amber-50 border-t-2 border-[#d4af37] max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-amber-100 font-display text-lg flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-[#d4af37]" /> Scan Shop QR
            </DrawerTitle>
            <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-amber-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#d4af37]/70 bg-black">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 rounded-2xl border-2 border-[#d4af37] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              {status === "scanning" && (
                <div className="absolute left-6 right-6 top-6 h-1 bg-[#d4af37] animate-[scan_2s_linear_infinite]"
                     style={{ animation: "scan 2s linear infinite" }} />
              )}
            </div>
            {status !== "scanning" && (
              <div className="absolute inset-0 grid place-items-center text-center px-6">
                {status === "error" ? (
                  <p className="text-rose-200 text-sm">{err}</p>
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
                )}
              </div>
            )}
          </div>
          <p className="text-center text-xs text-amber-200/80 mt-3">
            Point at your existing PhonePe / Paytm / GPay counter QR — we'll lift the VPA into your input.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
