import { useEffect, useRef, useState, useCallback } from "react";

export type Transform = { x: number; y: number; scale: number };

const CLAMP_MIN_SCALE = 1;
const CLAMP_MAX_SCALE = 4;

/**
 * Pan/zoom container for a single image. 1-finger drag pans, 2-finger pinch
 * scales. Mouse-wheel + drag fallback for desktop. Returns transforms via
 * onChange so the parent can persist.
 */
export function PanZoomFrame({
  src,
  alt = "",
  className = "",
  transform,
  onChange,
  disabled = false,
  children,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  transform?: Transform;
  onChange?: (t: Transform) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState<Transform>(transform ?? { x: 0, y: 0, scale: 1 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDist = useRef<number>(0);
  const startScale = useRef<number>(1);
  const startMid = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTrans = useRef<Transform>(t);

  useEffect(() => {
    if (transform) setT(transform);
  }, [transform]);

  const emit = useCallback((next: Transform) => {
    setT(next);
    onChange?.(next);
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      startDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      startScale.current = t.scale;
      startMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    startTrans.current = t;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled) return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = Math.min(CLAMP_MAX_SCALE, Math.max(CLAMP_MIN_SCALE, startScale.current * (dist / (startDist.current || 1))));
      emit({ ...t, scale });
    } else if (pointers.current.size === 1) {
      const p = Array.from(pointers.current.values())[0];
      const dx = p.x - (startMid.current.x || p.x);
      const dy = p.y - (startMid.current.y || p.y);
      if (!startMid.current.x) { startMid.current = { x: p.x, y: p.y }; return; }
      emit({ ...t, x: startTrans.current.x + dx, y: startTrans.current.y + dy });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) startDist.current = 0;
    if (pointers.current.size === 0) startMid.current = { x: 0, y: 0 };
  };

  const onWheel = (e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    const next = Math.min(CLAMP_MAX_SCALE, Math.max(CLAMP_MIN_SCALE, t.scale - e.deltaY * 0.002));
    emit({ ...t, scale: next });
  };

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden touch-none select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          style={{ transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`, transformOrigin: "center" }}
        />
      ) : null}
      {children}
    </div>
  );
}
