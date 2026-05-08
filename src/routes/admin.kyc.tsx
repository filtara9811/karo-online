import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Settings2, ListChecks, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";
import { runKycCheck, testKycProvider } from "@/lib/kyc.functions";

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({
    meta: [
      { title: "KYC — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminKycPage,
});

type Provider = {
  id: string;
  provider: string;
  display_name: string;
  client_id: string | null;
  client_secret: string | null;
  api_key: string | null;
  base_url: string | null;
  is_sandbox: boolean;
  is_active: boolean;
  supported_checks: string[];
};

type Verification = {
  id: string;
  subject_type: string;
  subject_user_id: string | null;
  check_type: string;
  provider: string | null;
  document_number: string | null;
  status: string;
  reviewer_notes: string | null;
  response_payload: Record<string, unknown>;
  created_at: string;
  verified_at: string | null;
};

const INPUT =
  "w-full rounded-lg bg-black/40 border border-[#d4af37]/30 px-3 py-2 text-sm text-[#fff8dc] placeholder-[#d4af37]/40 focus:outline-none focus:border-[#f5d97a]";
const LABEL = "text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/70 font-bold";

function AdminKycPage() {
  const [tab, setTab] = useState<"providers" | "run" | "history">("providers");

  return (
    <AdminLayout>
      <PageHeader
        title="KYC Center"
        subtitle="Provider credentials, verification runner, and audit log"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setTab("providers")}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold border ${tab === "providers" ? "bg-[#d4af37] text-[#1a1208] border-[#d4af37]" : "border-[#d4af37]/40 text-[#f5d97a]"}`}
            >
              <Settings2 className="inline h-3 w-3 mr-1" /> Providers
            </button>
            <button
              onClick={() => setTab("run")}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold border ${tab === "run" ? "bg-[#d4af37] text-[#1a1208] border-[#d4af37]" : "border-[#d4af37]/40 text-[#f5d97a]"}`}
            >
              <PlayCircle className="inline h-3 w-3 mr-1" /> Run Check
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold border ${tab === "history" ? "bg-[#d4af37] text-[#1a1208] border-[#d4af37]" : "border-[#d4af37]/40 text-[#f5d97a]"}`}
            >
              <ListChecks className="inline h-3 w-3 mr-1" /> History
            </button>
          </div>
        }
      />

      {tab === "providers" && <ProvidersTab />}
      {tab === "run" && <RunCheckTab />}
      {tab === "history" && <HistoryTab />}
    </AdminLayout>
  );
}

// ============ PROVIDERS TAB ============
function ProvidersTab() {
  const [list, setList] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const testFn = useServerFn(testKycProvider);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kyc_providers")
      .select("*")
      .order("provider");
    setList((data ?? []) as Provider[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (p: Provider, patch: Partial<Provider>) => {
    setSaving(p.id);
    const { error } = await supabase
      .from("kyc_providers")
      .update(patch)
      .eq("id", p.id);
    setSaving(null);
    if (error) alert(error.message);
    else load();
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const r = await testFn();
      setTestResult(JSON.stringify(r, null, 2));
    } catch (e) {
      setTestResult(`Error: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading)
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );

  return (
    <div className="space-y-4">
      {list.map((p) => (
        <GoldCard key={p.id} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg grid place-items-center"
                style={{
                  background:
                    "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                }}
              >
                <ShieldCheck className="h-5 w-5 text-[#1a1208]" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#fff8dc]">
                  {p.display_name}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60">
                  {p.provider} · {p.supported_checks.join(", ")}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] uppercase tracking-widest text-[#f5d97a]/70 font-bold">
                {p.is_active ? "Active" : "Inactive"}
              </span>
              <input
                type="checkbox"
                checked={p.is_active}
                onChange={(e) => update(p, { is_active: e.target.checked })}
                className="h-5 w-5 accent-[#d4af37]"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className={LABEL}>Client ID / App ID</p>
              <input
                className={INPUT}
                defaultValue={p.client_id ?? ""}
                onBlur={(e) =>
                  e.target.value !== (p.client_id ?? "") &&
                  update(p, { client_id: e.target.value || null })
                }
                placeholder="cf_app_..."
              />
            </div>
            <div>
              <p className={LABEL}>Client Secret</p>
              <input
                className={INPUT}
                type="password"
                defaultValue={p.client_secret ?? ""}
                onBlur={(e) =>
                  e.target.value !== (p.client_secret ?? "") &&
                  update(p, { client_secret: e.target.value || null })
                }
                placeholder="cfsk_..."
              />
            </div>
            <div className="sm:col-span-2">
              <p className={LABEL}>Base URL</p>
              <input
                className={INPUT}
                defaultValue={p.base_url ?? ""}
                onBlur={(e) =>
                  e.target.value !== (p.base_url ?? "") &&
                  update(p, { base_url: e.target.value || null })
                }
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={p.is_sandbox}
                onChange={(e) => update(p, { is_sandbox: e.target.checked })}
                className="h-4 w-4 accent-[#d4af37]"
              />
              <span className="text-xs text-[#f5d97a]">Sandbox mode</span>
            </label>
            {saving === p.id && (
              <span className="text-xs text-[#d4af37] flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}
          </div>

          {p.provider === "cashfree" && (
            <div className="mt-4 pt-4 border-t border-[#d4af37]/20">
              <GoldButton onClick={runTest} disabled={testing} size="sm">
                {testing ? "Testing..." : "Test Cashfree Connection"}
              </GoldButton>
              {testResult && (
                <pre className="mt-3 text-[10px] text-[#f5d97a]/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-[#d4af37]/20">
                  {testResult}
                </pre>
              )}
            </div>
          )}
        </GoldCard>
      ))}
    </div>
  );
}

// ============ RUN CHECK TAB ============
function RunCheckTab() {
  const runFn = useServerFn(runKycCheck);
  const [type, setType] = useState<
    "pan" | "aadhaar_otp_send" | "aadhaar_otp_verify" | "gst" | "bank" | "udyam"
  >("pan");
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const submit = async () => {
    setBusy(true);
    setResult("");
    try {
      const r = await runFn({ data: { check_type: type, subject_type: "manual", ...form } as never });
      setResult(JSON.stringify(r, null, 2));
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const fields: Record<string, string[]> = {
    pan: ["pan", "name"],
    aadhaar_otp_send: ["aadhaar_number"],
    aadhaar_otp_verify: ["ref_id", "otp"],
    gst: ["gstin", "name"],
    bank: ["bank_account", "ifsc", "name"],
    udyam: ["udyam"],
  };

  return (
    <GoldCard className="p-5 max-w-2xl">
      <p className={LABEL}>Verification Type</p>
      <select
        value={type}
        onChange={(e) => {
          setType(e.target.value as typeof type);
          setForm({});
          setResult("");
        }}
        className={INPUT}
      >
        <option value="pan">PAN Verification</option>
        <option value="aadhaar_otp_send">Aadhaar — Send OTP</option>
        <option value="aadhaar_otp_verify">Aadhaar — Verify OTP</option>
        <option value="gst">GSTIN Verification</option>
        <option value="bank">Bank Account Verification</option>
        <option value="udyam">Udyam Verification</option>
      </select>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {fields[type].map((f) => (
          <div key={f}>
            <p className={LABEL}>{f.replace(/_/g, " ")}</p>
            <input
              className={INPUT}
              value={form[f] ?? ""}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              placeholder={f}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <GoldButton onClick={submit} disabled={busy}>
          {busy ? "Verifying..." : "Run Verification"}
        </GoldButton>
      </div>

      {result && (
        <pre className="mt-4 text-[11px] text-[#f5d97a]/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-[#d4af37]/20">
          {result}
        </pre>
      )}
    </GoldCard>
  );
}

// ============ HISTORY TAB ============
function HistoryTab() {
  const [rows, setRows] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("kyc_verifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []) as Verification[]);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
      </div>
    );

  if (rows.length === 0)
    return (
      <GoldCard className="p-10 text-center text-[#f5d97a]/60 text-sm">
        No verifications yet — run your first check from the "Run Check" tab.
      </GoldCard>
    );

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <GoldCard key={r.id} className="p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <span className="font-bold text-[#fff8dc] uppercase text-xs">
                {r.check_type.replace(/_/g, " ")}
              </span>
              <span className="ml-2 text-[10px] text-[#d4af37]/70">
                via {r.provider ?? "manual"}
              </span>
              {r.document_number && (
                <span className="ml-2 text-[10px] text-[#f5d97a]/60">
                  · {r.document_number}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${
                r.status === "verified"
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                  : r.status === "failed"
                    ? "border-red-500/40 text-red-300 bg-red-500/10"
                    : "border-[#d4af37]/40 text-[#f5d97a] bg-[#d4af37]/10"
              }`}
            >
              {r.status}
            </span>
          </div>
          <p className="text-[10px] text-[#d4af37]/50 mt-1">
            {new Date(r.created_at).toLocaleString()}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] text-[#f5d97a]/60 uppercase tracking-widest">
              Response
            </summary>
            <pre className="mt-2 text-[10px] text-[#f5d97a]/70 bg-black/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(r.response_payload, null, 2)}
            </pre>
          </details>
        </GoldCard>
      ))}
    </div>
  );
}
