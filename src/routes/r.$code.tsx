import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { REFERRAL_PENDING_KEY } from "@/hooks/use-referral";
import { Sparkles, Gift, Wallet, Users, ShieldCheck, Download } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  head: ({ params }) => {
    const code = params.code;
    const title = `Join Karo Online with code ${code} — Earn ₹200`;
    const desc = `Use my code ${code} to sign up on Karo Online. Get instant rewards in your wallet.`;
    const image = "https://karoonline.in/referral-share-banner.jpg";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: RefAttribution,
});

function RefAttribution() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      window.localStorage.setItem(REFERRAL_PENDING_KEY, code);
      document.cookie = `ko_ref=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    } catch { /* ignore */ }
  }, [code]);

  const handleJoin = () => navigate({ to: "/register" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 px-4 pb-10">
      <div className="max-w-md mx-auto pt-6">
        {/* Banner */}
        <div className="rounded-3xl overflow-hidden shadow-xl border border-amber-200">
          <img src="/referral-share-banner.jpg" alt="Refer & Earn ₹200 with Karo Online" className="w-full h-auto block" width={1200} height={630} />
        </div>

        {/* Body */}
        <div className="mt-5 rounded-3xl bg-white border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <Sparkles className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold">You're invited</p>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 leading-tight">
            Join Karo Online & unlock rewards
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your friend invited you with code{" "}
            <span className="font-mono font-bold text-amber-700">{code}</span>. Sign up now and both of you earn rewards in your wallet.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Perk icon={Wallet} label="₹200 reward" />
            <Perk icon={ShieldCheck} label="100% Secure" />
            <Perk icon={Users} label="Refer & earn more" />
          </div>

          <button
            onClick={handleJoin}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#b45309] via-[#d4af37] to-[#f59e0b] text-white font-bold py-3.5 shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" /> Join Karo Online
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">By joining you agree to our terms & privacy.</p>
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="font-display text-base font-bold text-slate-800 flex items-center gap-2"><Gift className="h-4 w-4 text-amber-700" /> How it works</p>
          <ol className="mt-2 text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Sign up with mobile + OTP.</li>
            <li>Complete your profile / KYC.</li>
            <li>Place your first order or become a seller.</li>
            <li>You and your inviter both get rewarded.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Perk({ icon: Icon, label }: { icon: typeof Gift; label: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-center">
      <div className="h-8 w-8 mx-auto rounded-xl bg-white border border-amber-200 grid place-items-center text-amber-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-1.5 text-[10px] font-semibold text-slate-700 leading-tight">{label}</p>
    </div>
  );
}
