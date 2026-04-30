import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Crown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const r = (roleRows ?? []).map((x) => x.role as string);
      const isAdmin = r.some((role) =>
        ["super_admin", "admin", "moderator", "support"].includes(role),
      );
      if (!isAdmin) {
        await supabase.auth.signOut();
        navigate({ to: "/admin/login" });
        return;
      }
      if (cancelled) return;
      setEmail(user.email ?? null);
      setRoles(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[oklch(0.12_0.02_80)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-5 py-8"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, oklch(0.22 0.04 80) 0%, oklch(0.10 0.02 80) 70%)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl grid place-items-center"
              style={{
                background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                boxShadow: "0 8px 30px -6px rgba(212,175,55,0.5)",
              }}
            >
              <Crown className="h-6 w-6 text-[#1a1208]" />
            </div>
            <div>
              <h1
                className="font-display text-2xl font-bold"
                style={{
                  background:
                    "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Admin Panel
              </h1>
              <p className="text-xs text-[#f5d97a]/60 mt-0.5">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#d4af37]/30 text-[#f5d97a] text-xs font-bold uppercase tracking-wider hover:bg-[#d4af37]/10 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>

        <div
          className="rounded-3xl p-6 border backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,253,245,0.06) 0%, rgba(255,253,245,0.02) 100%)",
            borderColor: "rgba(212,175,55,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-[#d4af37]" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#f5d97a]/80 font-bold">
              Your Roles
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {roles.map((r) => (
              <span
                key={r}
                className="px-3 py-1 rounded-full text-xs font-bold text-[#1a1208]"
                style={{
                  background:
                    "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
                }}
              >
                {r.replace("_", " ").toUpperCase()}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-[#d4af37]/30 p-5 text-center">
            <p className="font-display text-lg text-[#fff8dc] mb-1">
              ✨ Welcome to your Admin Panel
            </p>
            <p className="text-xs text-[#f5d97a]/60 leading-relaxed">
              Auth foundation ready. Next turn: Dashboard stats, Users list,
              Vendors, Categories, Staff & Payment Gateway modules.
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="block text-center text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/60 mt-6 hover:text-[#d4af37]"
        >
          ← Back to Customer App
        </Link>
      </div>
    </div>
  );
}
