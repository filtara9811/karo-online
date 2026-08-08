import { useCallback, useEffect, useRef, useState } from "react";

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const isIOSDevice = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

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
  const promptRef = useRef<BipEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const manifest = {
      name: `${name} · Karo Online`,
      short_name: name.slice(0, 12) || "Karo",
      start_url: `/s/${encodeURIComponent(code)}`,
      scope: `/s/${encodeURIComponent(code)}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: accent,
      icons: [
        {
          src: icon || "/manifest-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
      ],
    };

    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
    const prev = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prevHref = prev?.getAttribute("href") ?? null;
    const link = prev ?? document.createElement("link");
    link.rel = "manifest";
    link.setAttribute("href", url);
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
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (prevHref) link.setAttribute("href", prevHref);
      else link.remove();
      URL.revokeObjectURL(url);
    };
  }, [code, name, icon, accent]);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const p = promptRef.current;
    if (!p) return "unavailable";
    await p.prompt();
    const choice = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
    promptRef.current = null;
    setCanInstall(false);
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  }, []);

  return { canInstall, installed, install, isIOS: isIOSDevice() };
}
