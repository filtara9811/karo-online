import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ZoomIn, RotateCw } from "lucide-react";

type Props = {
  file: File;
  aspect?: number; // width / height, default 1 (square)
  shape?: "circle" | "square";
  onCancel: () => void;
  onCropped: (file: File) => void;
};

/**
 * Lightweight in-app image cropper.
 * - Pinch / wheel zoom + drag pan
 * - Outputs a JPEG File at viewport resolution (max 1024px on the long side)
 */
export function ImageCropper({ file, aspect = 1, shape = "circle", onCancel, onCropped }: Props) {
  const [src, setSrc] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; pinchDist?: number; baseScale?: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // viewport size — responsive to screen width so mobile gets a comfortable crop area
  const VW = typeof window !== "undefined" ? Math.min(320, Math.max(240, window.innerWidth - 80)) : 300;
  const VH = Math.round(VW / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    // fit cover
    const s = Math.max(VW / img.naturalWidth, VH / img.naturalHeight);
    setScale(s);
    setPos({ x: 0, y: 0 });
  };

  const clampPos = (x: number, y: number, s: number) => {
    const w = natural.w * s;
    const h = natural.h * s;
    const maxX = Math.max(0, (w - VW) / 2);
    const maxY = Math.max(0, (h - VH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clampPos(dragRef.current.baseX + dx, dragRef.current.baseY + dy, scale));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.max(0.2, Math.min(5, scale * (e.deltaY < 0 ? 1.08 : 0.92)));
    setScale(next);
    setPos((p) => clampPos(p.x, p.y, next));
  };

  const finish = async () => {
    if (!natural.w || !natural.h) return;
    setBusy(true);
    try {
      // Render visible viewport area to canvas
      const out = Math.min(1024, Math.max(VW, VH) * 3);
      const canvas = document.createElement("canvas");
      canvas.width = shape === "circle" ? out : Math.round(out);
      canvas.height = shape === "circle" ? out : Math.round(out / aspect);
      const ctx = canvas.getContext("2d")!;

      // Map: container is VW x VH at center. Image drawn at scale, offset pos.
      const sx = -pos.x / scale + natural.w / 2 - (VW / 2) / scale;
      const sy = -pos.y / scale + natural.h / 2 - (VH / 2) / scale;
      const sw = VW / scale;
      const sh = VH / scale;

      const img = new Image();
      img.src = src;
      await new Promise((res) => { img.onload = res; });

      if (shape === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      if (shape === "circle") ctx.restore();

      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92)!);
      const cropped = new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCropped(cropped);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-white to-amber-50 border border-amber-200 p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-amber-700">Crop your photo</h3>
          <button onClick={onCancel} className="h-8 w-8 grid place-items-center rounded-full bg-slate-100 active:scale-90">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="relative mx-auto bg-black overflow-hidden touch-none select-none"
          style={{
            width: VW, height: VH,
            borderRadius: shape === "circle" ? "9999px" : "16px",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        >
          {src && (
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              style={{
                position: "absolute",
                left: "50%", top: "50%",
                width: natural.w * scale,
                height: natural.h * scale,
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 text-amber-700" />
          <input
            type="range"
            min={0.2}
            max={5}
            step={0.01}
            value={scale}
            onChange={(e) => {
              const s = Number(e.target.value);
              setScale(s);
              setPos((p) => clampPos(p.x, p.y, s));
            }}
            className="flex-1 accent-amber-500"
          />
          <button
            onClick={() => { setScale(Math.max(VW / natural.w, VH / natural.h)); setPos({ x: 0, y: 0 }); }}
            className="h-8 w-8 grid place-items-center rounded-full bg-amber-100 active:scale-90"
            aria-label="Reset"
          >
            <RotateCw className="h-4 w-4 text-amber-700" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={finish}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {busy ? "Saving…" : "Use Photo"}
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-slate-500">
          Drag to position · Pinch / scroll to zoom
        </p>
      </motion.div>
    </motion.div>
  );
}
