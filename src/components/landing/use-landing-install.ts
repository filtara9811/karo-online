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
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (prevHref) link.setAttribute("href", prevHref);
      else link.remove();
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
