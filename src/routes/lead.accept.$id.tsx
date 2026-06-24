import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acceptLeadAction } from "@/lib/lead-actions.functions";

export const Route = createFileRoute("/lead/accept/$id")({
  component: AcceptLeadPage,
});

type Status = "checking" | "accepting" | "success" | "no_auth" | "error";

function AcceptLeadPage() {
  const { id } = useParams({ from: "/lead/accept/$id" });
  const navigate = useNavigate();
  const accept = useServerFn(acceptLeadAction);

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setStatus("no_auth");
        return;
      }
      if (cancelled) return;
      setStatus("accepting");
      try {
        const res: any = await accept({ data: { leadId: id } });
        if (cancelled) return;
        if (res?.ok) {
          setStatus("success");
          setTimeout(() => {
            navigate({ to: "/vendor/dashboard" });
          }, 1200);
        } else {
          setStatus("error");
          setErrorMsg(res?.error || "accept_failed");
        }
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(e?.message || "network_error");
      }
    })();
    return () => { cancelled = true; };
  }, [id, accept, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-lg p-6 text-center space-y-4">
        {status === "checking" && (
          <>
            <h1 className="text-xl font-bold">Checking…</h1>
            <p className="text-sm text-muted-foreground">कृपया रुकें</p>
          </>
        )}
        {status === "no_auth" && (
          <>
            <h1 className="text-xl font-bold">Login ज़रूरी है</h1>
            <p className="text-sm text-muted-foreground">
              Lead accept करने के लिए पहले अपने vendor account में login करें।
            </p>
            <Link
              to="/vendor/register"
              className="inline-block w-full rounded-xl bg-amber-500 text-white font-semibold py-3"
            >
              Login / Register
            </Link>
          </>
        )}
        {status === "accepting" && (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <h1 className="text-xl font-bold">Lead accept हो रहा है…</h1>
            <p className="text-xs text-muted-foreground">Lead ID: {id.slice(0, 8)}…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500 text-white grid place-items-center text-2xl">✓</div>
            <h1 className="text-xl font-bold text-emerald-600">Lead claim हो गया!</h1>
            <p className="text-sm text-muted-foreground">Active Leads dashboard पर भेज रहे हैं…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-500 text-white grid place-items-center text-2xl">!</div>
            <h1 className="text-xl font-bold text-red-600">Accept नहीं हो सका</h1>
            <p className="text-sm text-muted-foreground break-words">{errorMsg}</p>
            <Link
              to="/vendor/dashboard"
              className="inline-block w-full rounded-xl border border-amber-400 text-amber-700 font-semibold py-3"
            >
              Dashboard पर जाएँ
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
