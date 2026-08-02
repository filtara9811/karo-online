import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Store, Gift, LayoutDashboard, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApkDownloadSheet, type ApkTarget } from "@/components/ApkDownloadSheet";

/**
 * ProfileHubSheet — opens from the center FAB of FloatingDockNav.
 * Single tap  → navigate to the page.
 * Long press  → APK/app download sheet (progress + retry) for that same page only.
 */
export function ProfileHubSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [hasVendor, setHasVendor] = useState<boolean | null>(null);
  const [pressed, setPressed] = useState<ApkTarget | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHasVendor(false); return; }
        const { data } = await supabase.from("vendors").select("user_id").eq("user_id", user.id).maybeSingle();
        setHasVendor(!!data);
      } catch { setHasVendor(false); }
    })();
  }, [open]);

  const go = (to: string) => { onClose(); setTimeout(() => navigate({ to }), 180); };


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.6 }}
            onDragEnd={(_e, info) => { if (info.offset.y > 110 || info.velocity.y > 700) onClose(); }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)] max-h-[85vh] flex flex-col"
          >
            <div className="pt-2 pb-1 grid place-items-center shrink-0">
              <span className="h-1.5 w-11 rounded-full bg-black/15" />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-2 shrink-0">
              <div>
                <h3 className="font-display text-lg text-[color:oklch(0.22_0.05_85)] font-bold">Quick Menu</h3>
                <p className="text-xs text-[color:oklch(0.5_0.05_85)]">Tap to open · long-press for APK &amp; link</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3 overflow-y-auto overscroll-contain">
              <HubButton
                accent="from-amber-400 to-orange-500"
                icon={hasVendor ? LayoutDashboard : Briefcase}
                title={hasVendor ? "Vendor Panel" : "Join as Vendor"}
                sub={hasVendor ? "Open your business dashboard" : "Grow your business · get leads"}
                onClick={() => go(hasVendor ? "/vendor/dashboard" : "/vendor/register")}
                onLongPress={() => setPressed({
                  title: hasVendor ? "Vendor Panel" : "Join as Vendor",
                  to: hasVendor ? "/vendor/dashboard" : "/vendor/register",
                  audience: "vendor",
                })}
              />
              <HubButton
                accent="from-emerald-400 to-teal-600"
                icon={Store}
                title="Digital Shop"
                sub="Browse all digital dukans near you"
                onClick={() => go("/vendors")}
                onLongPress={() => setPressed({ title: "Digital Shop", to: "/vendors", audience: "customer" })}
              />
              <HubButton
                accent="from-fuchsia-500 to-purple-700"
                icon={Gift}
                title="All Programs"
                sub="Referral program · downloads · rewards"
                onClick={() => go("/referral")}
                onLongPress={() => setPressed({ title: "All Programs", to: "/referral", audience: "customer" })}
              />
            </div>
          </motion.div>

          {/* Long-press action popup */}
          <AnimatePresence>
            {pressed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end"
                onClick={(e) => { e.stopPropagation(); setPressed(null); }}
              >
                <motion.div
                  initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 340 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-3 pb-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
                >
                  <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-black/15" />
                  <button
                    onClick={() => setPressed(null)}
                    aria-label="Close"
                    className="absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <h4 className="font-display text-base font-bold text-[color:oklch(0.22_0.05_85)]">{pressed.title}</h4>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5">
                    <Link2 className="h-4 w-4 shrink-0 text-[color:oklch(0.5_0.05_85)]" />
                    <span className="flex-1 truncate font-mono text-[11px] text-slate-700">{linkFor(pressed.to)}</span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <a
                      href={apkUrl ?? "/download"}
                      target={apkUrl ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={() => setPressed(null)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3.5 text-white shadow-md active:scale-[0.98] transition"
                    >
                      <Download className="h-5 w-5" />
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-bold">Download APK</span>
                        <span className="block text-[11px] opacity-90">
                          {apkUrl ? "Install the Android app" : "Open the download page"}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 opacity-80" />
                    </a>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={copyLink}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 active:scale-[0.97] transition"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[color:oklch(0.4_0.05_85)]" />}
                        <span className="text-xs font-semibold uppercase tracking-wide text-[color:oklch(0.3_0.05_85)]">
                          {copied ? "Copied" : "Copy link"}
                        </span>
                      </button>
                      <button
                        onClick={shareLink}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 active:scale-[0.97] transition"
                      >
                        <Share2 className="h-4 w-4 text-[color:oklch(0.4_0.05_85)]" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-[color:oklch(0.3_0.05_85)]">Share</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HubButton({
  icon: Icon, title, sub, onClick, accent, onLongPress,
}: {
  icon: typeof Briefcase; title: string; sub: string; onClick: () => void; accent: string;
  onLongPress?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const start = () => {
    if (!onLongPress) return;
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      try { navigator.vibrate?.(40); } catch { /* noop */ }
      onLongPress();
    }, 550);
  };
  const cancel = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => { if (fired.current) { fired.current = false; return; } onClick(); }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none" }}
      className="w-full flex items-center gap-4 rounded-2xl border border-black/5 bg-white shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)] p-4 text-left active:shadow-md"
    >
      <span className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center bg-gradient-to-br ${accent} text-white shadow-md`}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-display font-bold text-[15px] text-[color:oklch(0.22_0.05_85)] truncate">{title}</span>
        <span className="block text-[11px] text-[color:oklch(0.5_0.05_85)] truncate">{sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-[color:oklch(0.6_0.03_85)] shrink-0" />
    </motion.button>
  );
}
