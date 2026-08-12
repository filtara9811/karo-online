import { Download, Link2, Share2, Store } from "lucide-react";

export function LandingReelsDock({ onShare, onShop, onLinks, onDownload, canDownload }: {
  onShare: () => void;
  onShop: () => void;
  onLinks: () => void;
  onDownload: () => void;
  canDownload: boolean;
}) {
  const items = [
    { label: "Share", icon: Share2, action: onShare },
    { label: "Shop", icon: Store, action: onShop },
    { label: "Links", icon: Link2, action: onLinks },
    ...(canDownload ? [{ label: "Download", icon: Download, action: onDownload }] : []),
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-[28px] border border-white/20 bg-black/65 px-2 py-2 shadow-2xl backdrop-blur-xl" aria-label="Shop actions">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ label, icon: Icon, action }) => (
          <button key={label} onClick={action} className="flex h-12 min-w-0 flex-col items-center justify-center gap-1 border-r border-white/10 text-white last:border-r-0 active:scale-90">
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-bold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}