import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PhoneSchema = z.object({
  phone: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\D/g, "").slice(-10)),
});

const VerifySchema = z.object({
  phone: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\D/g, "").slice(-10)),
  code: z.string().min(4).max(6).regex(/^\d+$/),
});

function hash(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}:karoonline`).digest("hex");
}

async function logSystem(
  kind: "sms" | "otp" | "payment",
  provider: string | null,
  status: "success" | "error",
  message: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await (supabaseAdmin.from("system_logs") as any).insert({
      kind,
      provider,
      status,
      message: message.slice(0, 500),
      meta,
    });
  } catch (e) {
    console.error("[system_logs.insert] failed", e);
  }
}

async function getActiveSmsGateway() {
  const { data, error } = await supabaseAdmin
    .from("sms_gateways")
    .select("provider, is_test_mode, config")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`SMS gateway lookup failed: ${error.message}`);
  return data;
}

async function sendViaFast2SMS(
  phone: string,
  code: string,
  cfg: Record<string, string>,
): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const apiKey = cfg.api_key?.trim();
  const senderId = cfg.sender_id?.trim() || "FILPRA";
  const route = cfg.route?.trim() || "dlt";
  const templateId = cfg.template_id?.trim();
  if (!apiKey) return { ok: false, error: "Fast2SMS api_key missing in admin config" };
  if (route === "dlt" && !templateId) return { ok: false, error: "Fast2SMS template_id required for DLT route" };

  const params = new URLSearchParams({
    authorization: apiKey,
    route,
    sender_id: senderId,
    numbers: phone,
    variables_values: code,
    flash: "0",
  });
  if (templateId) params.set("template_id", templateId);
  if (cfg.message_id?.trim()) params.set("message_id", cfg.message_id.trim());

  const url = `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const json = (await res.json().catch(() => ({}))) as { return?: boolean; message?: unknown };
    if (!res.ok || json.return === false) {
      const msg = typeof json.message === "string" ? json.message : JSON.stringify(json).slice(0, 300);
      return { ok: false, error: `Fast2SMS ${res.status}: ${msg}`, raw: json };
    }
    return { ok: true, raw: json };
  } catch (e) {
    return { ok: false, error: `Fast2SMS network: ${(e as Error).message}` };
  }
}

async function sendViaMSG91(
  phone: string,
  code: string,
  cfg: Record<string, string>,
): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const authKey = cfg.auth_key?.trim();
  const templateId = cfg.template_id?.trim();
  const country = cfg.country?.trim() || "91";
  if (!authKey) return { ok: false, error: "MSG91 auth_key missing in admin config" };
  if (!templateId) return { ok: false, error: "MSG91 template_id missing in admin config" };

  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
    templateId,
  )}&mobile=${country}${phone}&otp=${code}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as { type?: string; message?: unknown };
    if (!res.ok || json.type === "error") {
      const msg = typeof json.message === "string" ? json.message : JSON.stringify(json).slice(0, 300);
      return { ok: false, error: `MSG91 ${res.status}: ${msg}`, raw: json };
    }
    return { ok: true, raw: json };
  } catch (e) {
    return { ok: false, error: `MSG91 network: ${(e as Error).message}` };
  }
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => PhoneSchema.parse(d))
  .handler(async ({ data }) => {
    const phone = data.phone;
    if (phone.length !== 10) {
      return { ok: false, error: "Invalid 10-digit mobile number" };
    }

    const gateway = await getActiveSmsGateway();
    if (!gateway) {
      await logSystem("otp", null, "error", "No active SMS gateway configured");
      return { ok: false, error: "No active SMS gateway. Admin → SMS Gateways me ek gateway activate karein." };
    }

    const code = String(randomInt(1000, 10000));
    const codeHash = hash(code, phone);

    // Invalidate any previous unverified codes for this phone
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", phone)
      .is("verified_at", null);

    const { error: insErr } = await supabaseAdmin.from("otp_codes").insert({
      phone,
      code_hash: codeHash,
      provider: gateway.provider,
    });
    if (insErr) {
      await logSystem("otp", gateway.provider, "error", `Insert failed: ${insErr.message}`);
      return { ok: false, error: "Could not initiate OTP. Try again." };
    }

    if (gateway.is_test_mode) {
      await logSystem("otp", gateway.provider, "success", `Test mode OTP issued for ${phone}`, {
        test_mode: true,
      });
      return { ok: true, test_mode: true, message: "Test mode active — use 1234" };
    }

    // Real send
    const cfg = (gateway.config ?? {}) as Record<string, string>;
    const result =
      gateway.provider === "msg91"
        ? await sendViaMSG91(phone, code, cfg)
        : await sendViaFast2SMS(phone, code, cfg);

    if (!result.ok) {
      await logSystem("sms", gateway.provider, "error", result.error ?? "Unknown error", {
        phone_last4: phone.slice(-4),
      });
      return { ok: false, error: result.error ?? "SMS delivery failed" };
    }

    await logSystem("sms", gateway.provider, "success", `OTP delivered to ${phone.slice(-4).padStart(10, "•")}`, {
      phone_last4: phone.slice(-4),
    });
    return { ok: true, test_mode: false };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data }) => {
    const phone = data.phone;
    const code = data.code;

    // Check active gateway test_mode
    const gateway = await getActiveSmsGateway();
    if (gateway?.is_test_mode && code === "1234") {
      return { ok: true, test_mode: true };
    }

    const { data: rows, error } = await supabaseAdmin
      .from("otp_codes")
      .select("id, code_hash, expires_at, attempts, verified_at")
      .eq("phone", phone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return { ok: false, error: "Verify lookup failed" };
    const row = rows?.[0];
    if (!row) return { ok: false, error: "No active OTP — request a new one" };

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "OTP expired — request a new one" };
    }
    if ((row.attempts ?? 0) >= 5) {
      return { ok: false, error: "Too many attempts — request a new OTP" };
    }

    if (row.code_hash !== hash(code, phone)) {
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false, error: "Wrong OTP" };
    }

    await supabaseAdmin
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true, test_mode: false };
  });
