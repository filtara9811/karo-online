import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, CheckCircle2, Smartphone, ArrowLeft, Share2 } from "lucide-react";

export const Route = createFileRoute("/vendor/install")({
  head: () => ({
    meta: [
      { title: "Install Vendor App — Karo Online" },
      { name: "description", content: "Install the Karo Vendor app on your phone — separate icon, dedicated vendor dashboard." },
      { name: "theme-color", content: "#0EA5E9" },
    ],
    links: [
      // IMPORTANT: this page advertises the VENDOR manifest so the browser
      // installs a separate app (different icon + start_url=/vendor/dashboard).
      { rel: "manifest", href: "/manifest-vendor.json" },
    ],
  }),
  component: VendorInstallPage,
});

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function VendorInstallPage() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-ignore
        window.navigator.standalone === true,
    );

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <main
      className="min-h-dvh px-5 py-6"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)",
      }}
    >
      <div className="mx-auto max-w-md text-white">
        <Link
          to="/vendor/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/90 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div
          className="rounded-3xl p-6 mb-5 border border-white/30 shadow-2xl"
          style={{
            background:
              "linear-gradient(160deg, #FFD400 0%, #FBBF24 55%, #F59E0B 100%)",
            color: "#0c2a3a",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-14 w-14 rounded-2xl bg-white grid place-items-center shadow-lg">
              <Smartphone className="h-7 w-7 text-[#0EA5E9]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-80">
                Karo Vendor
              </p>
              <h1 className="text-2xl font-extrabold leading-tight">
                Install Vendor App
              </h1>
            </div>
          </div>
          <p className="text-sm leading-relaxed">
            Apne phone par <b>alag icon</b> install karein. Customer app se
            alag, sirf <b>vendor dashboard</b>, leads aur orders.
          </p>
        </div>

        <ul className="space-y-2 mb-6 text-sm">
          {[
            "Alag app icon — home screen par 'Vendor'",
            "Direct vendor dashboard pe khulta hai",
            "Push notifications for new leads",
            "Offline support — slow network bhi chalega",
          ].map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/20"
            >
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#FFD400] shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {installed || isStandalone ? (
          <div className="rounded-2xl bg-emerald-500/90 text-white p-4 text-center font-bold">
            ✅ Vendor App install ho gaya! Home screen par check karein.
          </div>
        ) : deferred ? (
          <button
            onClick={install}
            className="w-full py-4 rounded-2xl font-extrabold text-base text-[#0c2a3a] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition"
            style={{
              background:
                "linear-gradient(180deg,#FFE066 0%,#FFD400 50%,#F59E0B 100%)",
            }}
          >
            <Download className="h-5 w-5" /> Install Vendor App
          </button>
        ) : isIOS ? (
          <div className="rounded-2xl bg-white/15 border border-white/30 p-4 text-sm">
            <p className="font-bold mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4" /> iPhone steps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-white/90">
              <li>Safari me niche <b>Share</b> button dabaaye</li>
              <li><b>Add to Home Screen</b> par tap karein</li>
              <li>Naam "Vendor" rakh ke <b>Add</b> dabaaye</li>
            </ol>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/15 border border-white/30 p-4 text-sm">
            <p className="mb-2">
              Browser menu (⋮) khol ke <b>"Install app"</b> ya <b>"Add to Home
              screen"</b> par tap karein.
            </p>
            <p className="text-white/70 text-xs">
              Agar option nahi dikh raha to page refresh karke dobara try karein.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-white/70 mt-6">
          Customer app alag rahega — wapas jaane ke liye bookmark use karein.
        </p>
      </div>
    </main>
  );
}
