import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acceptLeadAction, rejectLeadAction } from "@/lib/lead-actions.functions";

/**
 * Static landing page for Fast2SMS / WhatsApp template buttons.
 * URL: https://karoonline.in/leads/inbox
 *
 * No dynamic params — the page lists all pending leads for the logged-in
 * vendor and lets them Accept or Reject (with reason) inline.
 */
export const Route = createFileRoute("/leads/inbox")({
  component: LeadsInboxPage,
});

const REJECT_REASONS = [
  "Busy right now",
  "Lead not relevant",
  "Fake / spam lead",
  "Budget too low",
];

type Brief = {
  id: string;
  sub_category_name: string | null;
  note: string | null;
  lead_price_inr: number | null;
  area_hint: string | null;
  customer_name_initial: string | null;
  created_at: string;
  notification_status: string | null;
};

function LeadsInboxPage() {
  const navigate = useNavigate();
  const accept = useServerFn(acceptLeadAction);
  const reject = useServerFn(rejectLeadAction);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Brief[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reasonSel, setReasonSel] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string>("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_pending_lead_briefs");
    if (!error && data) {
      setLeads(
        (data as any[]).filter((l) => (l.notification_status ?? "pending") === "pending"),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      await loadLeads();
    })();
  }, [loadLeads]);

  const onAccept = async (leadId: string) => {
    setBusyId(leadId);
    try {
      const res: any = await accept({ data: { leadId } });
      if (res?.ok) {
        setToast("✅ Lead accept ho gaya! Dashboard pe redirect kar rahe hain…");
        setTimeout(() => navigate({ to: "/vendor/dashboard" }), 1100);
      } else {
        setToast(`❌ ${res?.error || "Accept fail"}. Wallet me coins check karein.`);
        setBusyId(null);
      }
    } catch (e: any) {
      setToast(`❌ ${e?.message || "Network error"}`);
      setBusyId(null);
    }
  };

  const onReject = async (leadId: string) => {
    const reason = reasonSel[leadId];
    if (!reason) {
      setToast("Pehle ek reason select karein.");
      return;
    }
    setBusyId(leadId);
    try {
      const res: any = await reject({ data: { leadId, reason } });
      if (res?.ok) {
        setToast("Lead reject ho gaya.");
        setRejectingId(null);
        await loadLeads();
      } else {
        setToast(`❌ ${res?.error || "Reject fail"}`);
      }
    } catch (e: any) {
      setToast(`❌ ${e?.message || "Network error"}`);
    } finally {
      setBusyId(null);
    }
  };

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-lg p-6 text-center space-y-4">
          <h1 className="text-xl font-bold">Login ज़रूरी है</h1>
          <p className="text-sm text-muted-foreground">
            Apne pending leads dekhne ke liye vendor account me login karein.
          </p>
          <Link
            to="/vendor/register"
            className="inline-block w-full rounded-xl bg-amber-500 text-white font-semibold py-3"
          >
            Login / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold">📥 Pending Leads</h1>
          <button
            onClick={loadLeads}
            className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 bg-white"
          >
            Refresh
          </button>
        </header>

        {toast && (
          <div className="rounded-xl bg-amber-100 border border-amber-300 px-4 py-2 text-sm">
            {toast}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading…</div>
        )}

        {!loading && leads.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h2 className="font-semibold">No pending leads</h2>
            <p className="text-sm text-muted-foreground">
              Naya lead aate hi yahan dikhega. WhatsApp / SMS notification bhi aayega.
            </p>
            <Link
              to="/vendor/dashboard"
              className="inline-block mt-3 text-sm font-semibold text-amber-700 underline"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {!loading &&
          leads.map((l) => {
            const isBusy = busyId === l.id;
            const isRejecting = rejectingId === l.id;
            return (
              <article
                key={l.id}
                className="rounded-2xl border border-amber-200 bg-white shadow-sm p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {l.sub_category_name || "New Lead"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {l.customer_name_initial && `${l.customer_name_initial} • `}
                      {l.area_hint || "Location hidden"}
                    </p>
                  </div>
                  {l.lead_price_inr != null && (
                    <span className="shrink-0 rounded-full bg-amber-500 text-white text-xs font-semibold px-2 py-1">
                      ₹{Number(l.lead_price_inr).toFixed(0)} coins
                    </span>
                  )}
                </div>

                {l.note && (
                  <p className="text-sm text-gray-700 line-clamp-3">{l.note}</p>
                )}

                {!isRejecting ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isBusy}
                      onClick={() => onAccept(l.id)}
                      className="rounded-xl bg-emerald-600 text-white font-semibold py-2.5 disabled:opacity-60"
                    >
                      {isBusy ? "…" : "✅ Accept"}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => setRejectingId(l.id)}
                      className="rounded-xl border border-red-300 text-red-700 font-semibold py-2.5 disabled:opacity-60"
                    >
                      ❌ Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-semibold text-red-700">
                      Reject karne ka reason chunein:
                    </p>
                    <div className="space-y-1">
                      {REJECT_REASONS.map((r) => (
                        <label
                          key={r}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`reason-${l.id}`}
                            value={r}
                            checked={reasonSel[l.id] === r}
                            onChange={() =>
                              setReasonSel((s) => ({ ...s, [l.id]: r }))
                            }
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        disabled={isBusy}
                        onClick={() => onReject(l.id)}
                        className="rounded-lg bg-red-600 text-white font-semibold py-2 text-sm disabled:opacity-60"
                      >
                        {isBusy ? "…" : "Submit Reject"}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg border border-gray-300 text-gray-700 font-semibold py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
      </div>
    </div>
  );
}
