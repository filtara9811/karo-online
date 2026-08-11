import { AnimatePresence, motion } from "framer-motion";
import { Download, Copy, Check, Link2, Share2, X, RefreshCw, AlertTriangle, Smartphone, QrCode } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCodeSheet } from "@/components/oneqr/QrCodeSheet";

export type ApkTarget = {
  title: string;
  to: string;
  audience: "vendor" | "customer" | "oneqr";
  /** Dedicated manifest so the installed app opens ONLY this section. */
  manifest: string;
  accent: string;
};

type Phase = "idle" | "downloading" | "done" | "error";

const linkFor = (to: string) =>
  typeof window === "undefined" ? to : `${window.location.origin}${to}`;

/**
 * Long-press action sheet for a Quick Menu item.
 * - "Download App" streams the APK with a live progress ring + retry on failure.
 * - When no APK is published, it installs a *separate* PWA for that section only
 *   (its own manifest → own icon + start_url), instead of opening the website.
 */
export function ApkDownloadSheet({ target, onClose }: { target: ApkTarget; onClose: () => void }) {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bipRef = useRef<(Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null>(null);

  // Look up the published APK for this audience, falling back to the generic
  // customer release when this section has no dedicated build yet.
  useEffect(() => {
    let alive = true;
    (async () => {
      const wanted = target.audience === "oneqr" ? ["oneqr", "customer"] : [target.audience];
      try {
        const { data } = await supabase
          .from("web_apk_releases")
          .select("audience, file_url, external_url, play_store_url, released_at")
          .eq("is_active", true)
          .in("audience", wanted)
          .order("released_at", { ascending: false });
        if (!alive) return;
        const rows = data ?? [];
        const pick = (a: string) =>
          rows.find((r) => r.audience === a && (r.file_url || r.external_url || r.play_store_url));
        const row = wanted.map(pick).find(Boolean) ?? null;
        setApkUrl(row ? row.file_url || row.external_url || row.play_store_url || null : null);
      } catch {
        if (alive) setApkUrl(null);
      } finally {
        if (alive) setLookupDone(true);
      }
    })();
    return () => { alive = false; abortRef.current?.abort(); };
  }, [target.audience]);


  // Swap in this section's manifest so an install creates a separate app.
  useEffect(() => {
    const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]'));
    const previous = existing[0]?.href ?? "/manifest.json";
    existing.forEach((l) => l.remove());
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = target.manifest;
    link.id = "hub-target-manifest";
    document.head.appendChild(link);

    const onBip = (e: Event) => {
      e.preventDefault();
      bipRef.current = e as never;
    };
    const onInstalled = () => { setInstalled(true); setPhase("done"); setProgress(100); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      document.getElementById("hub-target-manifest")?.remove();
      const restore = document.createElement("link");
      restore.rel = "manifest";
      restore.href = previous;
      document.head.appendChild(restore);
    };
  }, [target.manifest]);

  const installPwa = useCallback(async () => {
    setErrorMsg(null);
    setPhase("downloading");
    setProgress(8);
    const tick = setInterval(() => setProgress((p) => (p < 92 ? p + Math.random() * 9 + 2 : p)), 180);
    try {
      const bip = bipRef.current;
      if (!bip) throw new Error("Browser install prompt available nahi hai — Chrome menu (⋮) → \"Install app\" use karein.");
      await bip.prompt();
      const choice = await bip.userChoice;
      bipRef.current = null;
      if (choice.outcome !== "accepted") throw new Error("Install cancel ho gaya. Dobara try karein.");
      setProgress(100);
      setInstalled(true);
      setPhase("done");
    } catch (e) {
      setErrorMsg((e as Error).message || "Install fail ho gaya.");
      setPhase("error");
    } finally {
      clearInterval(tick);
    }
  }, []);

  const downloadApk = useCallback(async () => {
    if (!apkUrl) return installPwa();
    // External store / drive links can't be streamed — open them directly.
    if (!/\.apk(\?|$)/i.test(apkUrl)) {
      window.open(apkUrl, "_blank", "noopener,noreferrer");
      setPhase("done");
      setProgress(100);
      return;
    }
    setErrorMsg(null);
    setPhase("downloading");
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(apkUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`Server ne ${res.status} diya`);
      const total = Number(res.headers.get("content-length") || 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming supported nahi hai");
      const chunks: BlobPart[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as unknown as BlobPart);
          received += value.byteLength;
          setProgress(total ? Math.min(99, (received / total) * 100) : Math.min(95, received / 1_500_000 * 100));
        }
      }
      const blob = new Blob(chunks, { type: "application/vnd.android.package-archive" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${target.title.replace(/\s+/g, "-").toLowerCase()}.apk`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setProgress(100);
      setPhase("done");
      try { navigator.vibrate?.(30); } catch { /* noop */ }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErrorMsg((e as Error).message || "Download fail ho gaya.");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }, [apkUrl, installPwa, target.title]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkFor(target.to));
      setCopied(true);
      try { navigator.vibrate?.(20); } catch { /* noop */ }
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  const shareLink = async () => {
    const url = linkFor(target.to);
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: target.title, text: target.title, url }); return; } catch { /* noop */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${target.title}\n${url}`)}`, "_blank", "noopener,noreferrer");
  };

  const pct = Math.round(progress);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-black/15" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        <h4 className="font-display text-base font-bold text-[color:oklch(0.22_0.05_85)]">{target.title}</h4>
        <p className="text-[11px] text-[color:oklch(0.5_0.05_85)]">
          Separate app — install hone ke baad sirf {target.title} khulega.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-[color:oklch(0.5_0.05_85)]" />
          <span className="flex-1 truncate font-mono text-[11px] text-slate-700">{linkFor(target.to)}</span>
        </div>

        {/* Progress / status card */}
        <AnimatePresence initial={false}>
          {phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={phase === "downloading" ? { y: [0, -5, 0] } : { y: 0 }}
                    transition={{ duration: 1.1, repeat: phase === "downloading" ? Infinity : 0 }}
                    className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white shadow-md bg-gradient-to-br ${
                      phase === "error" ? "from-rose-400 to-red-600" : target.accent
                    }`}
                  >
                    {phase === "error" ? <AlertTriangle className="h-5 w-5" />
                      : phase === "done" ? <Check className="h-5 w-5" />
                      : apkUrl ? <Download className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[color:oklch(0.22_0.05_85)]">
                      {phase === "downloading" && (apkUrl ? `Downloading… ${pct}%` : `Installing… ${pct}%`)}
                      {phase === "done" && (installed ? "Installed! Home screen check karein" : "Ready — file downloaded")}
                      {phase === "error" && "Fail ho gaya"}
                    </p>
                    <p className="text-[11px] text-[color:oklch(0.5_0.05_85)] line-clamp-2">
                      {phase === "error" ? errorMsg : `${target.title} · separate icon`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${phase === "error" ? "from-rose-400 to-red-600" : target.accent}`}
                    animate={{ width: `${phase === "error" ? Math.max(pct, 12) : pct}%` }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                  />
                </div>

                {phase === "error" && (
                  <button
                    onClick={apkUrl ? downloadApk : installPwa}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:oklch(0.22_0.05_85)] px-4 py-2.5 text-white active:scale-[0.98] transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Retry</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 space-y-2.5">
          <button
            disabled={!lookupDone || phase === "downloading"}
            onClick={downloadApk}
            className={`flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r ${target.accent} px-4 py-3.5 text-white shadow-md active:scale-[0.98] transition disabled:opacity-60`}
          >
            <Download className="h-5 w-5" />
            <span className="flex-1 text-left">
              <span className="block text-sm font-bold">
                {apkUrl ? "Download APK" : "Install App"}
              </span>
              <span className="block text-[11px] opacity-90">
                {!lookupDone ? "Checking latest release…"
                  : apkUrl ? "Direct download — progress dikhega"
                  : `${target.title} ka alag icon banega`}
              </span>
            </span>
          </button>

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
  );
}
