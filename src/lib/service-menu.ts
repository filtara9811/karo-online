import { Zap, Store, LayoutDashboard, QrCode } from "lucide-react";

export type ServiceId = "quick" | "digital_shop" | "vendor_panel" | "digital_qr";

export type ServiceDef = {
  id: ServiceId;
  label: string;
  sub: string;
  icon: typeof Zap;
  accent: string;
  /** Default route. Vendor Panel is resolved at tap time (dashboard vs join). */
  route: string;
};

/** Catalogue of switchable services. Labels/icons/routes live in code. */
export const SERVICE_CATALOGUE: ServiceDef[] = [
  {
    id: "quick",
    label: "Quick Service",
    sub: "Nearby experts se turant kaam karwayein",
    icon: Zap,
    accent: "from-amber-400 to-orange-500",
    route: "/quick",
  },
  {
    id: "digital_shop",
    label: "Digital Shop",
    sub: "Aas-paas ki saari digital dukan browse karein",
    icon: Store,
    accent: "from-emerald-400 to-teal-600",
    route: "/vendors",
  },
  {
    id: "vendor_panel",
    label: "Vendor Panel",
    sub: "Apna business dashboard kholein",
    icon: LayoutDashboard,
    accent: "from-orange-400 to-rose-500",
    route: "/vendor/dashboard",
  },
  {
    id: "digital_qr",
    label: "Digital QR Code",
    sub: "QR dashboard · themes · shop link",
    icon: QrCode,
    accent: "from-sky-400 to-indigo-600",
    route: "/one-qr",
  },
];

export type ServiceMenuRow = { id: string; enabled: boolean; order?: number };

export const DEFAULT_SERVICE_ROWS: ServiceMenuRow[] = SERVICE_CATALOGUE.map((s, i) => ({
  id: s.id,
  enabled: true,
  order: i + 1,
}));

export const SERVICE_MENU_KEY = "service_menu";

/** Merge admin config with the code catalogue → ordered, enabled-only list. */
export function resolveServices(rows: ServiceMenuRow[] | null | undefined): ServiceDef[] {
  const cfg = new Map((rows ?? DEFAULT_SERVICE_ROWS).map((r) => [r.id, r]));
  return SERVICE_CATALOGUE.filter((s) => cfg.get(s.id)?.enabled !== false)
    .sort((a, b) => (cfg.get(a.id)?.order ?? 99) - (cfg.get(b.id)?.order ?? 99));
}
