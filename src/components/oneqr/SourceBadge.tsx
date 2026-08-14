import { Instagram, Youtube, Facebook, MessageCircle, Send, QrCode, Link2, Globe } from "lucide-react";
import { MEDIUM_LABEL, type TrafficMedium } from "@/lib/traffic-source";

const ICONS: Record<TrafficMedium, typeof QrCode> = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  whatsapp: MessageCircle,
  telegram: Send,
  x: Globe,
  google: Globe,
  link: Link2,
  qr: QrCode,
  card: QrCode,
};

const TINT: Record<TrafficMedium, string> = {
  instagram: "#d6249f",
  youtube: "#ff0000",
  facebook: "#1877f2",
  whatsapp: "#25d366",
  telegram: "#229ed9",
  x: "#0f172a",
  google: "#ea4335",
  link: "#64748b",
  qr: "#b45309",
  card: "#b45309",
};

/** Small platform badge shown on a visitor's avatar (real deep-link source). */
export function SourceBadge({ medium, className }: { medium: TrafficMedium; className?: string }) {
  const Icon = ICONS[medium];
  return (
    <span
      title={MEDIUM_LABEL[medium]}
      aria-label={MEDIUM_LABEL[medium]}
      className={`grid place-items-center rounded-full bg-white shadow ring-1 ring-black/5 ${className ?? "h-4 w-4"}`}
    >
      <Icon className="h-2.5 w-2.5" style={{ color: TINT[medium] }} strokeWidth={2.6} />
    </span>
  );
}

export function SourceInlineIcon({ medium }: { medium: TrafficMedium }) {
  const Icon = ICONS[medium];
  return <Icon className="h-3 w-3 shrink-0" style={{ color: TINT[medium] }} strokeWidth={2.6} />;
}
