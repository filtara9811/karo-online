import { useEffect } from "react";
import { X, MessageCircle, Printer, Mail, Download } from "lucide-react";

type Props = {
  onPick: (mode: "whatsapp" | "thermal" | "email" | "pdf") => void;
  onClose: () => void;
};

export function PrintOptionsSheet({ onPick, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const opts = [
    { id: "whatsapp" as const, label: "WhatsApp PDF", icon: MessageCircle, bg: "#25D366" },
    { id: "thermal" as const, label: "Thermal Printer", icon: Printer, bg: "oklch(0.30 0.05 85)" },
    { id: "email" as const, label: "Email PDF", icon: Mail, bg: "oklch(0.45 0.18 240)" },
    { id: "pdf" as const, label: "Download PDF", icon: Download, bg: "oklch(0.45 0.15 320)" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 50%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Send / Print ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">Choose delivery</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-2">
          {opts.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => {
                  onPick(o.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] px-3 py-3 active:scale-[0.99] shadow-sm"
              >
                <span
                  className="h-10 w-10 rounded-xl grid place-items-center text-white"
                  style={{ background: o.bg }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-left font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)]">
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
