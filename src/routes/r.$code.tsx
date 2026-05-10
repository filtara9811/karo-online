import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { REFERRAL_PENDING_KEY } from "@/hooks/use-referral";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  head: () => ({
    meta: [
      { title: "You're invited — Karo Online" },
      { name: "description", content: "Join Karo Online with a referral code and unlock rewards." },
    ],
  }),
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
    const t = setTimeout(() => navigate({ to: "/register" }), 1200);
    return () => clearTimeout(t);
  }, [code, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-amber-50 to-white px-6">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 mx-auto rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 to-amber-700 text-white shadow-xl">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent">
          Welcome to Karo Online
        </h1>
        <p className="mt-2 text-sm text-slate-600">Your referral code <span className="font-mono font-bold text-amber-700">{code}</span> has been applied. Redirecting to sign up…</p>
      </div>
    </div>
  );
}
