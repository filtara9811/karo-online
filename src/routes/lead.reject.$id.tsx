import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rejectLeadAction } from "@/lib/lead-actions.functions";

export const Route = createFileRoute("/lead/reject/$id")({
  component: RejectLeadPage,
});

const REASONS = [
  { value: "busy", label: "अभी busy हूँ" },
  { value: "not_relevant", label: "Lead relevant नहीं है" },
  { value: "fake_lead", label: "Fake lead लगता है" },
  { value: "budget_too_low", label: "Budget बहुत कम है" },
];

type Phase = "checking" | "no_auth" | "form" | "submitting" | "done" | "error";

function RejectLeadPage() {
  const { id } = useParams({ from: "/lead/reject/$id" });
  const navigate = useNavigate();
  const reject = useServerFn(rejectLeadAction);

  const [phase, setPhase] = useState<Phase>("checking");
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setPhase(session ? "form" : "no_auth");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("submitting");
    try {
      const res: any = await reject({ data: { leadId: id, reason } });
      if (res?.ok) {
        setPhase("done");
        setTimeout(() => navigate({ to: "/vendor/dashboard" }), 1500);
      } else {
        setPhase("error");
        setErrorMsg(res?.error || "reject_failed");
      }
    } catch (e: any) {
      setPhase("error");
      setErrorMsg(e?.message || "network_error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white shadow-lg p-6 space-y-4">
        {phase === "checking" && <p className="text-center text-sm">Checking…</p>}

        {phase === "no_auth" && (
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold">Login ज़रूरी है</h1>
            <p className="text-sm text-muted-foreground">
              Lead reject करने के लिए पहले login करें।
            </p>
            <Link
              to="/vendor/register"
              className="inline-block w-full rounded-xl bg-rose-500 text-white font-semibold py-3"
            >
              Login / Register
            </Link>
          </div>
        )}

        {(phase === "form" || phase === "submitting") && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold">Lead reject क्यों कर रहे हैं?</h1>
              <p className="text-xs text-muted-foreground mt-1">एक कारण चुनें</p>
            </div>

            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    reason === r.value
                      ? "border-rose-500 bg-rose-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm font-medium">{r.label}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={phase === "submitting"}
              className="w-full rounded-xl bg-rose-500 text-white font-semibold py-3 disabled:opacity-60"
            >
              {phase === "submitting" ? "भेजा जा रहा है…" : "Submit Rejection"}
            </button>

            <Link
              to="/vendor/dashboard"
              className="block text-center text-sm text-muted-foreground underline"
            >
              Cancel
            </Link>
          </form>
        )}

        {phase === "done" && (
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500 text-white grid place-items-center text-2xl">✓</div>
            <h1 className="text-xl font-bold">Rejection दर्ज हो गया</h1>
            <p className="text-sm text-muted-foreground">Dashboard पर भेज रहे हैं…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold text-red-600">Reject नहीं हो सका</h1>
            <p className="text-sm text-muted-foreground break-words">{errorMsg}</p>
            <button
              onClick={() => setPhase("form")}
              className="w-full rounded-xl border border-rose-400 text-rose-700 font-semibold py-3"
            >
              फिर से कोशिश करें
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
