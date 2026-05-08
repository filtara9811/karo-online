import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Cashfree caller ----------
async function cashfreeFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { data: row, error } = await supabaseAdmin
    .from("kyc_providers")
    .select("client_id, client_secret, base_url, is_active")
    .eq("provider", "cashfree")
    .maybeSingle();

  if (error) throw new Error(`KYC provider lookup failed: ${error.message}`);
  if (!row) throw new Error("Cashfree provider not configured");
  if (!row.is_active) throw new Error("Cashfree is disabled in admin");
  if (!row.client_id || !row.client_secret)
    throw new Error("Cashfree credentials missing — add them in Admin → KYC");

  const baseUrl = row.base_url || "https://sandbox.cashfree.com/verification";
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": row.client_id,
      "x-client-secret": row.client_secret,
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }

  return { ok: res.ok, status: res.status, data };
}

// ---------- Auth helper ----------
async function ensureAdmin(authHeader: string | null): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const isAdmin = (roles ?? []).some((r) =>
    ["super_admin", "admin", "moderator", "support"].includes(r.role as string),
  );
  if (!isAdmin) throw new Error("Forbidden — admin only");
  return data.user.id;
}

// ---------- Run a verification ----------
const RunSchema = z.object({
  check_type: z.enum(["pan", "aadhaar_otp_send", "aadhaar_otp_verify", "gst", "bank", "udyam"]),
  subject_user_id: z.string().uuid().nullable().optional(),
  subject_type: z.enum(["vendor", "customer", "staff", "manual"]).default("manual"),
  // Per-check fields (loose; provider validates)
  pan: z.string().optional(),
  name: z.string().optional(),
  aadhaar_number: z.string().optional(),
  ref_id: z.string().optional(),
  otp: z.string().optional(),
  gstin: z.string().optional(),
  bank_account: z.string().optional(),
  ifsc: z.string().optional(),
  udyam: z.string().optional(),
});

export const runKycCheck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunSchema.parse(input))
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const adminId = await ensureAdmin(getRequestHeader("authorization") ?? null);

    let path = "";
    let body: Record<string, unknown> = {};
    let docNumber: string | null = null;

    switch (data.check_type) {
      case "pan":
        path = "/pan";
        body = { pan: data.pan, name: data.name };
        docNumber = data.pan ?? null;
        break;
      case "aadhaar_otp_send":
        path = "/offline-aadhaar/otp";
        body = { aadhaar_number: data.aadhaar_number };
        docNumber = data.aadhaar_number ?? null;
        break;
      case "aadhaar_otp_verify":
        path = "/offline-aadhaar/verify";
        body = { ref_id: data.ref_id, otp: data.otp };
        break;
      case "gst":
        path = "/gstin";
        body = { GSTIN: data.gstin, business_name: data.name };
        docNumber = data.gstin ?? null;
        break;
      case "bank":
        path = "/bank-account/sync";
        body = { bank_account: data.bank_account, ifsc: data.ifsc, name: data.name };
        docNumber = data.bank_account ?? null;
        break;
      case "udyam":
        path = "/udyam";
        body = { udyam: data.udyam };
        docNumber = data.udyam ?? null;
        break;
    }

    let response: { ok: boolean; status: number; data: unknown };
    try {
      response = await cashfreeFetch(path, body);
    } catch (e) {
      response = { ok: false, status: 0, data: { error: (e as Error).message } };
    }

    const status = response.ok ? "verified" : "failed";

    const { data: row, error } = await supabaseAdmin
      .from("kyc_verifications")
      .insert({
        subject_type: data.subject_type,
        subject_user_id: data.subject_user_id ?? null,
        check_type: data.check_type,
        method: "api",
        provider: "cashfree",
        document_number: docNumber,
        request_payload: body as never,
        response_payload: response.data as never,
        status,
        reviewer_id: adminId,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Save failed: ${error.message}`);
    return { ok: response.ok, status: response.status, verification: row };
  });

// ---------- Test connection ----------
export const testKycProvider = createServerFn({ method: "POST" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  await ensureAdmin(getRequestHeader("authorization") ?? null);
  // Try a harmless dummy PAN call — Cashfree returns auth error if creds wrong, validation error if creds OK
  try {
    const r = await cashfreeFetch("/pan", { pan: "ABCDE1234F", name: "TEST" });
    return {
      ok: true,
      reachable: true,
      auth_ok: r.status !== 401 && r.status !== 403,
      status: r.status,
      sample: r.data,
    };
  } catch (e) {
    return { ok: false, reachable: false, error: (e as Error).message };
  }
});
