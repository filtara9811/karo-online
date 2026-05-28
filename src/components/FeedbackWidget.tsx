import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageSquareWarning, X, Camera, Loader2, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { captureInvoicePng } from "@/lib/invoice-image";

/**
 * Global floating Feedback widget.
 * - Mounts a small bubble in the top-right of every screen.
 * - On click, auto-captures a screenshot of the current page,
 *   collects a short message, and ships it to public.feedback_reports.
 */
export function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [shot, setShot] = useState<string>("");
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [role, setRole] = useState<"user" | "vendor" | "technical">("user");

  // Hide on admin (admins have their own console) and on auth/registration screens
  const hidden =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/r/") ||
    location.pathname.startsWith("/f/");

  useEffect(() => {
    if (location.pathname.startsWith("/vendor")) setRole("vendor");
    else setRole("user");
  }, [location.pathname]);

  const openSheet = async () => {
    setOpen(true);
    setSent(false);
    setMessage("");
    setShot("");
    setCapturing(true);
    // small delay so the widget itself isn't included in the shot
    setTimeout(async () => {
      try {
        const el = document.body;
        const dataUrl = await captureInvoicePng(el);
        setShot(dataUrl);
      } catch (e) {
        console.warn("feedback screenshot failed", e);
      } finally {
        setCapturing(false);
      }
    }, 80);
  };

  const submit = async () => {
    if (!message.trim()) {
      toast.error("Kripya issue describe karein");
      return;
    }
    setSending(true);
    try {
      let screenshot_url: string | null = null;
      if (shot) {
        try {
          const blob = await (await fetch(shot)).blob();
          const ts = Date.now();
          const path = `${ts}-${Math.random().toString(36).slice(2, 8)}.png`;
          const { error: upErr } = await supabase.storage
            .from("feedback-screenshots")
            .upload(path, blob, { contentType: "image/png", upsert: false });
          if (!upErr) {
            const { data } = supabase.storage.from("feedback-screenshots").getPublicUrl(path);
            screenshot_url = data.publicUrl;
          }
        } catch (e) {
          console.warn("upload feedback shot failed", e);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("feedback_reports").insert({
        user_id: user?.id ?? null,
        reporter_role: role,
        page_path: location.pathname,
        page_title: typeof document !== "undefined" ? document.title : null,
        message: message.trim().slice(0, 2000),
        screenshot_url,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        viewport:
          typeof window !== "undefined"
            ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`
            : null,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Dhanyavaad! Aapka feedback admin tak pahunch gaya.");
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) {
      console.error("feedback submit failed", e);
      toast.error(e?.message || "Feedback bhejne mein dikkat aayi");
    } finally {
      setSending(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating bubble — top right, just below the safe area */}
      <button
        onClick={openSheet}
        aria-label="Send feedback"
        className="fixed z-40 right-3 grid place-items-center h-10 w-10 rounded-full shadow-[0_6px_20px_-6px_rgba(212,175,55,0.6)] active:scale-90 transition-transform"
        style={{
          top: "calc(env(safe-area-inset-top) + 220px)",
          background: "linear-gradient(180deg,#fff8dc,#f5d97a 45%,#d4af37)",
          border: "1.5px solid rgba(255,255,255,0.7)",
        }}
      >
        <MessageSquareWarning className="h-4 w-4 text-[#1a1208]" strokeWidth={2.4} />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !sending && setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[color:oklch(0.78_0.14_82/0.5)] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-white to-[#fffaeb] border-b border-[color:oklch(0.78_0.14_82/0.3)]">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-[#8b6508]" />
                <h2 className="font-display text-base text-gold-gradient font-bold">Report an issue</h2>
              </div>
              <button onClick={() => !sending && setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* role chips */}
              <div className="flex gap-2 text-xs">
                {(["user", "vendor", "technical"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-full border ${
                      role === r
                        ? "bg-[color:oklch(0.84_0.15_85/0.25)] border-[#d4af37] font-semibold text-[#5a4408]"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {r === "user" ? "👤 As user" : r === "vendor" ? "🛍 As vendor" : "⚙️ Technical"}
                  </button>
                ))}
              </div>

              {/* page label */}
              <div className="text-[11px] text-gray-500">
                Page: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{location.pathname}</code>
              </div>

              {/* screenshot preview */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 aspect-[9/16] max-h-[260px] overflow-hidden grid place-items-center">
                {capturing ? (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs">Capturing screen…</span>
                  </div>
                ) : shot ? (
                  <img src={shot} alt="screen capture" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <Camera className="h-5 w-5" />
                    <span className="text-xs">No screenshot</span>
                  </div>
                )}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue, what you expected, or any suggestion…"
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:border-[#d4af37]"
              />

              <button
                onClick={submit}
                disabled={sending || sent || !message.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display font-semibold text-[#1a1208] disabled:opacity-50 active:scale-[0.98]"
                style={{ background: "linear-gradient(180deg,#fff8dc,#f5d97a 45%,#d4af37)" }}
              >
                {sent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Sent
                  </>
                ) : sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send to admin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
