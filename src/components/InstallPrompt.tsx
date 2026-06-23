import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ko-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore — iOS
    window.navigator.standalone === true
  );
}

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInLovablePreview() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  if (h.includes("lovableproject.com")) return true;
  if (h.includes("lovable.app") && h.includes("id-preview--")) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return false;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInLovablePreview()) return;
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari doesn't fire beforeinstallprompt — show manual instructions
    // after a short delay so it doesn't interrupt first paint.
    if (isIOS()) {
      const t = setTimeout(() => {
        setShowIOS(true);
        setVisible(true);
      }, 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Karo Online"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-amber-200/40 bg-[#1a0f0a]/95 backdrop-blur-xl shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#1a0f0a]">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-100">
              Install Karo Online
            </p>
            {showIOS ? (
              <p className="mt-1 text-xs text-amber-100/70 leading-relaxed">
                Tap <Share className="inline h-3.5 w-3.5 mx-0.5 -mt-0.5" /> Share →{" "}
                <span className="font-medium">Add to Home Screen</span> — Chrome
                bar हटेगा, offline भी चलेगा।
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-100/70 leading-relaxed">
                Home screen पर add करें — Chrome bar हटेगा, app तेज़ खुलेगी,
                offline भी काम करेगी।
              </p>
            )}
            {!showIOS && (
              <button
                onClick={install}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1.5 text-xs font-semibold text-[#1a0f0a] shadow-sm active:scale-95 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Install Now
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-100/60 hover:text-amber-100 hover:bg-white/5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
