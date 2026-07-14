import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateStaffInvite, acceptStaffInvite } from "@/lib/staff.functions";

export const Route = createFileRoute("/s/onboard/$token")({
  head: () => ({
    meta: [
      { title: "Staff Invite — Karo Online" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffOnboardLanding,
});

function StaffOnboardLanding() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const validate = useServerFn(validateStaffInvite);
  const accept = useServerFn(acceptStaffInvite);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "invalid" }
    | { kind: "need_login"; name: string }
    | { kind: "accepting" }
    | { kind: "done" }
    | { kind: "error"; msg: string }
  >({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const res = await validate({ data: { token } });
        if (!res.ok) return setState({ kind: "invalid" });
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          try { window.sessionStorage.setItem("ko-staff-invite-token", token); } catch { /* ignore */ }
          return setState({ kind: "need_login", name: res.invite.name });
        }
        setState({ kind: "accepting" });
        try {
          await accept({ data: { token } });
          setState({ kind: "done" });
          setTimeout(() => navigate({ to: "/staff" }), 800);
        } catch (e) {
          setState({ kind: "error", msg: e instanceof Error ? e.message : "Failed" });
        }
      } catch {
        setState({ kind: "invalid" });
      }
    })();
  }, [token, validate, accept, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#fff8dc] via-white to-[#f5e9b8] px-6">
      <div className="max-w-sm w-full rounded-3xl bg-white shadow-2xl border border-amber-200 p-8 text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-600" />
            <p className="mt-4 text-sm text-muted-foreground">Invite verify हो रहा है…</p>
          </>
        )}
        {state.kind === "invalid" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-lg font-bold">Invite invalid or expired</h1>
            <p className="mt-2 text-xs text-muted-foreground">कृपया admin से नया link मंगवाएँ।</p>
          </>
        )}
        {state.kind === "need_login" && (
          <>
            <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />
            <h1 className="mt-3 text-lg font-bold">Welcome, {state.name}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Staff panel access पाने के लिए पहले sign-in करें।
            </p>
            <button
              onClick={() => navigate({ to: "/staff/login" })}
              className="mt-6 w-full h-11 rounded-full font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-600 shadow-lg active:scale-[0.98]"
            >
              Sign in to accept
            </button>
          </>
        )}
        {state.kind === "accepting" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-600" />
            <p className="mt-4 text-sm text-muted-foreground">Activating your staff access…</p>
          </>
        )}
        {state.kind === "done" && (
          <>
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-3 text-lg font-bold">You're in!</h1>
            <p className="mt-2 text-xs text-muted-foreground">Staff dashboard खोल रहा हूँ…</p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-lg font-bold">Kuch galat ho gaya</h1>
            <p className="mt-2 text-xs text-red-600">{state.msg}</p>
          </>
        )}
      </div>
    </div>
  );
}
