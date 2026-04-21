import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, RefreshCw, Receipt, UserLock, MessageCircle } from "lucide-react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Order Status — Karo Online" },
      { name: "description", content: "Track your service order live: placement, processing, packaging, shipping, delivery." },
    ],
  }),
  component: StatusPage,
});

const VENDORS = [
  { id: "v1", name: "Aryan", avatar: avatarAryan, active: true },
  { id: "v2", name: "Raj", avatar: avatarRaj },
  { id: "v3", name: "Rani", avatar: avatarRani },
  { id: "v4", name: "Ashu", avatar: avatarUser },
];

type Step = {
  key: string;
  title: string;
  sub: string;
  ts: string;
  Icon: typeof Package;
  side: "invoice" | "delivery" | "payments" | null;
  emphasis?: boolean;
};

const STEPS: Step[] = [
  { key: "place", title: "Order Placement", sub: "The seller ……", ts: "21 March 26 · 10:55", Icon: Package, side: "invoice" },
  { key: "process", title: "Order Processing", sub: "The seller begins ….", ts: "", Icon: RefreshCw, side: null },
  { key: "pack", title: "Packaging", sub: "The ordered items……", ts: "23 March 26 · 11:25 Am", Icon: Package, side: "delivery" },
  { key: "ship", title: "Shipping", sub: "The packaged items are handed to the courier.", ts: "", Icon: Receipt, side: null, emphasis: true },
  { key: "deliver", title: "Delivery", sub: "The provider delivers……", ts: "25 March 26 · 11:55 Am", Icon: UserLock, side: "payments" },
];

function StatusPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(2);

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => (p < STEPS.length - 1 ? p + 1 : p)), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden">
      {/* Top vendor strip */}
      <div className="flex-shrink-0 px-3 pb-2 flex items-center justify-end gap-2.5 relative">
        {VENDORS.map((v) => (
          <button
            key={v.id}
            onClick={() => navigate({ to: "/chat" })}
            className="relative active:scale-90"
            aria-label={v.name}
          >
            <span
              className={`relative block h-12 w-12 rounded-full overflow-hidden border-2 ${
                v.active ? "border-[#d97706] shadow-md scale-105" : "border-white shadow-sm"
              }`}
            >
              <img src={v.avatar} alt="" className="h-full w-full object-cover" />
            </span>
            {v.active && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <svg viewBox="0 0 12 16" className="h-3 w-2.5 text-[#d97706]">
                  <path d="M6 0 L0 0 L6 8 L12 0 Z" fill="currentColor" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Map block */}
        <div className="relative mx-0 h-44 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(160deg, #e8eef0 0%, #d8e4d8 50%, #cfe1cf 100%)" }}
          />
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 60">
            <path d="M 0 20 Q 30 18 50 28 T 100 25" stroke="white" strokeWidth="2" fill="none" />
            <path d="M 0 45 Q 35 50 55 40 T 100 47" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M 25 0 Q 30 28 45 38 T 50 60" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M -5 32 Q 30 38 55 30 Q 75 25 105 33" stroke="#7dd3fc" strokeWidth="3" fill="none" opacity="0.7" />
            <circle cx="50" cy="32" r="2.5" fill="#dc2626" />
          </svg>
          {/* Side accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-amber-400 to-red-400" />
        </div>

        {/* Product card */}
        <div className="mx-4 mt-4 rounded-2xl bg-[#f3f4f6] border border-[color:oklch(0.78_0.14_82/0.25)] p-3 flex items-center gap-3 shadow-sm">
          <div className="h-16 w-20 rounded-xl bg-gradient-to-br from-sky-200 via-white to-emerald-200 grid place-items-center flex-shrink-0">
            <span className="text-2xl">☁️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold text-[color:oklch(0.20_0.02_90)] leading-tight">Ac | sarvic</h2>
            <p className="text-xs text-[color:oklch(0.45_0.08_85)]">The seller ……</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-5 px-4 relative">
          {/* Vertical line */}
          <div className="absolute left-[34px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#fbbf24] opacity-70" />

          <div className="space-y-4">
            {STEPS.map((s, i) => {
              const done = i <= progress;
              const current = i === progress;
              const Icon = s.Icon;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative flex items-start gap-3"
                >
                  {/* Avatar+timestamp pill on the line */}
                  <div className="relative flex-shrink-0 w-[68px]">
                    <div
                      className={`relative h-12 w-12 rounded-2xl overflow-hidden border-2 ${
                        done ? "border-[#d97706] shadow-md" : "border-white shadow-sm opacity-70"
                      }`}
                    >
                      <img src={avatarUser} alt="" className="h-full w-full object-cover" />
                      {current && (
                        <motion.span
                          className="absolute inset-0 ring-2 ring-amber-400 rounded-2xl"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        />
                      )}
                    </div>
                    {s.ts && (
                      <p className="mt-0.5 text-[8px] leading-tight font-semibold text-[color:oklch(0.40_0.05_85)]">
                        Ashu | Qureshi<br />
                        <span className="text-[7px] text-[color:oklch(0.50_0.08_85)]">{s.ts}</span>
                      </p>
                    )}
                  </div>

                  {/* Body */}
                  {s.side ? (
                    <div className="flex-1 rounded-xl border border-[#fb923c]/50 bg-white px-3 py-2 flex items-center gap-2 shadow-sm">
                      <Icon className="h-5 w-5 text-[color:oklch(0.30_0.05_85)] flex-shrink-0" strokeWidth={2.2} />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm font-bold text-[color:oklch(0.20_0.02_90)] leading-tight">
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[color:oklch(0.45_0.08_85)] underline underline-offset-2 truncate">
                          {s.sub}
                        </p>
                      </div>
                      <div className="h-9 w-px bg-[#fb923c]/40 mx-1" />
                      <button className="font-display text-xs font-bold text-[color:oklch(0.20_0.02_90)] underline underline-offset-2 active:scale-95 capitalize">
                        {s.side}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 pt-1">
                      <p
                        className={`font-display text-base font-bold leading-tight ${
                          s.emphasis ? "text-[#f59e0b]" : "text-[color:oklch(0.20_0.02_90)]"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[11px] text-[color:oklch(0.45_0.08_85)] flex items-center gap-1.5">
                        {s.emphasis && <Receipt className="h-3.5 w-3.5 text-[#f59e0b]" />}
                        {s.sub}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-between px-1">
            <button className="font-display text-sm font-bold text-[color:oklch(0.45_0.08_85)] underline underline-offset-2 active:scale-95">
              Review and rating
            </button>
            <button className="font-display text-sm font-bold text-[color:oklch(0.20_0.02_90)] underline underline-offset-2 active:scale-95">
              Payments
            </button>
          </div>
        </div>
      </div>

      {/* Bottom live chat bar */}
      <button
        onClick={() => navigate({ to: "/chat" })}
        className="flex-shrink-0 w-full bg-gradient-to-b from-[#fb923c] to-[#ea580c] py-3 grid place-items-center active:scale-[0.99] pb-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-white" fill="white" />
          <span className="px-3 py-0.5 rounded-md bg-white/95 font-display text-sm font-bold text-[color:oklch(0.45_0.18_28)] underline underline-offset-2">
            Live | chat
          </span>
        </span>
      </button>
    </div>
  );
}
