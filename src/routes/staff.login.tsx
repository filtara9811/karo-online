import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Mail, Lock, Loader2, ArrowLeft, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitStaffSignup } from "@/lib/staff.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/staff/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — Field Operations" },
      { name: "description", content: "Login for field staff to onboard vendors, manage tasks and payouts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffLoginPage,
});

type Mode = "signin" | "signup";

function StaffLoginPage() {
  const navigate = useNavigate();
  const submitSignup = useServerFn(submitStaffSignup);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (cancelled) return;
      if (roles?.some((r) => r.role === "staff")) navigate({ to: "/staff" });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!email.trim() || !password) {
      setError("Email aur password daaliye.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const uid = data.user?.id;
        if (!uid) throw new Error("Login failed");
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        if (!roles?.some((r) => r.role === "staff")) {
          await supabase.auth.signOut();
          throw new Error("Aapke account ko staff access nahi hai. Admin se contact kariye ya signup form use kariye.");
        }
        navigate({ to: "/staff" });
      } else {
        if (!name.trim()) throw new Error("Naam daaliye.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}/staff/login`, data: { name: name.trim() } },
        });
        if (error) throw error;
        if (data.user) {
          try {
            await submitSignup({ data: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, note: note.trim() || undefined } });
          } catch { /* signup row insert may be pending confirmation — ignore */ }
        }
        setInfo("Signup submitted! Admin approve karega, uske baad login kar sakte ho.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.98_0.02_88)] via-white to-[oklch(0.94_0.06_85)] px-4 py-8 flex flex-col">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white/95 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.45)] shadow-[0_10px_40px_-10px_rgba(212,175,55,0.4)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center">
            <Users className="h-6 w-6 text-[color:oklch(0.55_0.16_82)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Staff Panel</h1>
            <p className="text-xs text-muted-foreground">Team operations & tasks</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5 rounded-xl bg-muted p-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setError(null); setInfo(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === m ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
              {m === "signin" ? "Sign In" : "Request Access"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm" />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          {mode === "signup" && (
            <textarea placeholder="Note for admin (optional)" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[70px] p-3 rounded-xl border border-input bg-background text-sm" />
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          {info && <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">{info}</p>}

          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[oklch(0.72_0.16_82)] to-[oklch(0.66_0.18_75)] text-white font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
