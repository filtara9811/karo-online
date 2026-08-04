import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QrCode, Zap, ShoppingCart, ScanLine, LayoutGrid } from "lucide-react";

export type WorkspaceKey = "one_qr" | "quick_service" | "digital_shop" | "ai_ocr" | (string & {});

export type Workspace = {
  key: WorkspaceKey;
  title: string;
  icon: "qr" | "zap" | "shop" | "ocr" | "custom";
  custom?: boolean;
};

export const WORKSPACE_ICONS = {
  qr: QrCode,
  zap: Zap,
  shop: ShoppingCart,
  ocr: ScanLine,
  custom: LayoutGrid,
} as const;

export const DEFAULT_WORKSPACES: Workspace[] = [
  { key: "one_qr", title: "One QR Business", icon: "qr" },
  { key: "quick_service", title: "Quick Service", icon: "zap" },
  { key: "digital_shop", title: "Digital Shop", icon: "shop" },
  { key: "ai_ocr", title: "AI OCR", icon: "ocr" },
];

const LS_TABS = "karo.admin.workspaces.v1";
const LS_ACTIVE = "karo.admin.workspace.active.v1";

type Ctx = {
  workspaces: Workspace[];
  active: Workspace | null;
  activeKey: WorkspaceKey | null;
  setActive: (key: WorkspaceKey) => void;
  closeWorkspace: (key: WorkspaceKey) => void;
  addWorkspace: (title: string) => void;
  resetWorkspaces: () => void;
};

const WorkspaceCtx = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [activeKey, setActiveKey] = useState<WorkspaceKey | null>("one_qr");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_TABS);
      if (raw) {
        const parsed = JSON.parse(raw) as Workspace[];
        if (Array.isArray(parsed) && parsed.length) setWorkspaces(parsed);
      }
      const a = localStorage.getItem(LS_ACTIVE);
      if (a) setActiveKey(a);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (list: Workspace[], key: WorkspaceKey | null) => {
    setWorkspaces(list);
    setActiveKey(key);
    try {
      localStorage.setItem(LS_TABS, JSON.stringify(list));
      if (key) localStorage.setItem(LS_ACTIVE, key);
      else localStorage.removeItem(LS_ACTIVE);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      workspaces,
      activeKey,
      active: workspaces.find((w) => w.key === activeKey) ?? null,
      setActive: (key) => persist(workspaces, key),
      closeWorkspace: (key) => {
        const idx = workspaces.findIndex((w) => w.key === key);
        const next = workspaces.filter((w) => w.key !== key);
        const nextActive =
          activeKey === key
            ? (next[Math.max(0, idx - 1)]?.key ?? null)
            : activeKey;
        persist(next, nextActive);
      },
      addWorkspace: (title) => {
        const key = `ws_${Date.now().toString(36)}`;
        const ws: Workspace = { key, title: title.trim() || "New Workspace", icon: "custom", custom: true };
        persist([...workspaces, ws], key);
      },
      resetWorkspaces: () => persist(DEFAULT_WORKSPACES, DEFAULT_WORKSPACES[0].key),
    }),
    [workspaces, activeKey],
  );

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspaces() {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error("useWorkspaces must be used inside WorkspaceProvider");
  return ctx;
}
