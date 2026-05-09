import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Mail, Lock, Loader2, ArrowLeft, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Secure Access" },
      { name: "description", content: "Secure login for platform administrators and staff." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

type Mode = "signin" | "signup" | "forgot";

async function resolveRoleRedirect(userId: string): Promise<string> {
  // Check user_roles for highest privilege
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    // No admin role → kick back to admin login with message
    await supabase.auth.signOut();
    return "__no_role__";
  }

  const roles = data.map((r) => r.role);
  if (
    roles.includes("super_admin") ||
    roles.includes("admin") ||
    roles.includes("moderator") ||
    roles.includes("support")
  ) {
    return "/admin";
  }
  await supabase.auth.signOut();
  return "__no_role__";
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in AS an admin, redirect to /admin immediately.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      const target = await resolveRoleRedirect(uid);
      if (cancelled) return;
      if (target === "/admin") navigate({ to: "/admin" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Email daaliye.");
        return;
      }
    } else if (!email.trim() || !password) {
      setError("Email aur password dono daaliye.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { data, error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) throw signErr;
        const uid = data.user?.id;
        if (!uid) throw new Error("Login failed.");

        const target = await resolveRoleRedirect(uid);
        if (target === "__no_role__") {
          setError(
            "Aapke account ko admin access nahi hai. Super Admin se contact kariye.",
          );
          setLoading(false);
          return;
        }
        navigate({ to: target });
      } else if (mode === "signup") {
        const { error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/login`,
          },
        });
        if (signErr) throw signErr;
        setInfo(
          "Account ban gaya. Apna email Super Admin ko bhejiye taaki wo aapko role assign kar sakein.",
        );
        setMode("signin");
      } else {
        // forgot password — send reset email (resend = clicking again)
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/admin/reset-password`,
          },
        );
        if (resetErr) throw resetErr;
        setInfo(
          "Password reset link aapke email par bhej diya gaya. Inbox / Spam check kariye. Dobara bhejne ke liye 'Send Reset Link' phir se dabaiye.",
        );
      }
    } catch (err: any) {
      setError(err?.message ?? "Kuch galat ho gaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, oklch(0.22 0.04 80) 0%, oklch(0.12 0.02 80) 60%, oklch(0.08 0.01 80) 100%)",
      }}
    >
      {/* Decorative gold shimmer rings */}
      <div
        aria-hidden
        className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #d4af37 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #f5d97a 0%, transparent 70%)" }}
      />

      <Link
        to="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-[#f5d97a]/80 hover:text-[#f5d97a] transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to App
      </Link>

      <div className="relative w-full max-w-md">
        {/* Crown header */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="h-16 w-16 rounded-2xl grid place-items-center mb-3 border border-[#d4af37]/40"
            style={{
              background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
              boxShadow: "0 10px 40px -8px rgba(212,175,55,0.55)",
            }}
          >
            <Crown className="h-8 w-8 text-[#1a1208]" strokeWidth={2.2} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37]/80">
            ✦ Restricted Area ✦
          </p>
          <h1
            className="font-display text-3xl font-bold mt-1"
            style={{
              background:
                "linear-gradient(180deg, #fff8dc 0%, #f5d97a 50%, #d4af37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Super Admin Panel
          </h1>
          <p className="text-xs text-[#f5d97a]/60 mt-1 tracking-wide">
            Authorized personnel only
          </p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-3xl p-6 backdrop-blur-xl border"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,253,245,0.08) 0%, rgba(255,253,245,0.04) 100%)",
            borderColor: "rgba(212,175,55,0.35)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,217,122,0.15)",
          }}
        >
          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl mb-5 border border-[#d4af37]/20 bg-black/30">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                mode === "signin"
                  ? "text-[#1a1208]"
                  : "text-[#f5d97a]/60 hover:text-[#f5d97a]"
              }`}
              style={
                mode === "signin"
                  ? {
                      background:
                        "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
                    }
                  : undefined
              }
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                mode === "signup"
                  ? "text-[#1a1208]"
                  : "text-[#f5d97a]/60 hover:text-[#f5d97a]"
              }`}
              style={
                mode === "signup"
                  ? {
                      background:
                        "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
                    }
                  : undefined
              }
            >
              Request Access
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3 w-3" /> Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold flex items-center gap-1.5 mb-1.5">
                <Lock className="h-3 w-3" /> Password
              </label>
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 6 characters" : "••••••••"}
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition text-sm"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-display font-bold text-base text-[#1a1208] flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #fff8dc 0%, #f5d97a 35%, #d4af37 100%)",
                boxShadow:
                  "0 10px 30px -8px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  {mode === "signin" ? "Enter Admin Panel" : "Request Access"}
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#f5d97a]/50 mt-5 leading-relaxed">
            {mode === "signin"
              ? "Sirf authorized admin / staff hi access kar sakte hain."
              : "Account ban-ne ke baad Super Admin aapko role assign karenge."}
          </p>
        </div>

        <p className="text-center text-[10px] text-[#f5d97a]/40 mt-4 tracking-widest uppercase">
          Protected by Lovable Cloud · Encrypted Session
        </p>
      </div>
    </div>
  );
}
