import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { useWorkspaces, WORKSPACE_ICONS } from "./workspaces";

export function WorkspaceTabs() {
  const { workspaces, activeKey, setActive, closeWorkspace, addWorkspace, resetWorkspaces } =
    useWorkspaces();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <div
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{ background: "rgba(12,10,4,0.9)", borderColor: "rgba(212,175,55,0.28)" }}
    >
      <div className="flex items-end gap-1 px-2 pt-2 overflow-x-auto no-scrollbar">
        {workspaces.map((w, i) => {
          const Icon = WORKSPACE_ICONS[w.icon] ?? WORKSPACE_ICONS.custom;
          const isActive = w.key === activeKey;
          return (
            <button
              key={w.key}
              onClick={() => setActive(w.key)}
              className={`group relative flex items-center gap-2 shrink-0 rounded-t-xl px-3 py-2.5 text-xs font-semibold transition-all duration-300 ${
                isActive
                  ? "text-[#fff8dc] translate-y-0"
                  : "text-[#f5d97a]/60 hover:text-[#fff8dc] translate-y-[2px] hover:translate-y-0"
              }`}
              style={{
                minWidth: 132,
                background: isActive
                  ? "linear-gradient(180deg, rgba(212,175,55,0.22), rgba(212,175,55,0.06))"
                  : "rgba(255,255,255,0.03)",
                border: "1px solid",
                borderColor: isActive ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.18)",
                borderBottomColor: isActive ? "transparent" : "rgba(212,175,55,0.18)",
                boxShadow: isActive ? "0 -6px 20px -12px rgba(212,175,55,0.8)" : undefined,
              }}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#f5d97a]" : ""}`} />
              <span className="truncate max-w-[130px]">
                {i + 1}. {w.title}
              </span>
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Close ${w.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeWorkspace(w.key);
                }}
                className="ml-auto rounded-md p-0.5 opacity-60 hover:opacity-100 hover:bg-[#d4af37]/20 transition"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}

        {adding ? (
          <div
            className="flex items-center gap-1 shrink-0 rounded-t-xl px-2 py-2 border border-[#d4af37]/40"
            style={{ background: "rgba(212,175,55,0.1)" }}
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addWorkspace(title);
                  setTitle("");
                  setAdding(false);
                }
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Workspace name"
              className="bg-transparent outline-none text-xs text-[#fff8dc] placeholder:text-[#f5d97a]/40 w-36"
            />
            <button
              onClick={() => {
                addWorkspace(title);
                setTitle("");
                setAdding(false);
              }}
              className="p-1 rounded-md text-[#1a1208]"
              style={{ background: "linear-gradient(180deg,#f5d97a,#d4af37)" }}
              aria-label="Create workspace"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            aria-label="Add workspace"
            className="shrink-0 mb-[2px] grid place-items-center h-9 w-9 rounded-xl border border-[#d4af37]/30 text-[#f5d97a] hover:bg-[#d4af37]/15 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {workspaces.length === 0 && (
          <button
            onClick={resetWorkspaces}
            className="ml-2 mb-[2px] text-[10px] uppercase tracking-widest text-[#d4af37]/70 hover:text-[#fff8dc]"
          >
            Restore default tabs
          </button>
        )}
      </div>
    </div>
  );
}
