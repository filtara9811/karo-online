import { useCallback, useEffect, useRef, useState } from "react";

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const isIOSDevice = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

const seenKey = (code: string) => `ko-pwa-seen-${code}`;

/**
 * Makes the merchant landing page installable as its own mini-app:
 * injects a per-merchant web app manifest and captures the install prompt so
 * the "⋮" menu can offer a real Download / Install action.
 */
export function useLandingInstall({
  code,
  name,
  icon,
  accent,
}: {
  code: string;
  name: string;
  icon?: string | null;
  accent: string;
}) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [seen, setSeen] = useState(true);
  const [appName, setAppName] = useState<string | null>(null);
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const promptRef = useRef<BipEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    setInstalled(isStandalone);
    try {
      setSeen(window.localStorage.getItem(seenKey(code)) === "1");
    } catch {
      setSeen(false);
    }
    void name;
    void icon;

    // Same-origin manifest — Chrome ignores blob/data manifests, so the install
    // prompt only appears when the merchant manifest is served from a real URL.
    const params = new URLSearchParams(window.location.search);
    const project = params.get("p");
    const href =
      `/api/public/manifest/${encodeURIComponent(code)}` +
      `?accent=${encodeURIComponent(accent)}${project ? `&p=${encodeURIComponent(project)}` : ""}`;

    const prev = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prevHref = prev?.getAttribute("href") ?? null;
    const link = prev ?? document.createElement("link");
    link.rel = "manifest";
    link.setAttribute("href", href);
    if (!prev) document.head.appendChild(link);

    const onBip = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BipEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    // Mirror the manifest identity (One QR project name/icon) in the UI so the
    // popup promises exactly what lands on the home screen.
    fetch(href)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { name?: string; icons?: { src: string }[] } | null) => {
        if (!m) return;
        if (m.name) setAppName(m.name);
        const src = m.icons?.[0]?.src;
        if (src && !src.startsWith("/icon-")) setAppIcon(src);
      })
      .catch(() => { /* keep fallbacks */ });

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (prevHref) link.setAttribute("href", prevHref);
      else link.remove();
    };
  }, [code, name, icon, accent]);

  const markSeen = useCallback(() => {
    setSeen(true);
    try { window.localStorage.setItem(seenKey(code), "1"); } catch { /* ignore */ }
  }, [code]);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const p = promptRef.current;
    if (!p) return "unavailable";
    await p.prompt();
    const choice = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
    promptRef.current = null;
    setCanInstall(false);
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  }, []);

  return { canInstall, installed, standalone, seen, markSeen, install, appName, appIcon, isIOS: isIOSDevice() };
}
