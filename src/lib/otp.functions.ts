import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

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

const FinalizeCustomerSchema = z.object({
  name: z.string().min(2).max(120),
  gender: z.string().max(40).optional().default(""),
  phone: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\D/g, "").slice(-10)),
  email: z.string().max(160).optional().default(""),
  address: z.string().max(500).optional().default(""),
  referral: z.string().max(40).optional().default(""),
});

function hash(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}:karoonline`).digest("hex");
}

function customerUuidFromPhone(phone: string) {
  const hex = createHash("sha256").update(`ko-customer:${phone}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function phoneAuthEmail(phone: string) {
  return `phone-${phone}@auth.karoonline.local`;
}

async function ensurePhoneAuthUser(phone: string) {
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();
  const userId = existingCustomer?.user_id ?? customerUuidFromPhone(phone);
  const email = phoneAuthEmail(phone);
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const userData = {
    email,
    password,
    email_confirm: true,
    user_metadata: { phone, signup_method: "phone_otp" },
  };

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, userData as never);
  if (updateErr) {
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({ id: userId, ...userData } as never);
    if (createErr) {
      const { error: retryErr } = await supabaseAdmin.auth.admin.updateUserById(userId, userData);
      if (retryErr) throw new Error(createErr.message || retryErr.message || "Could not create login session");
    }
  }

  return { userId, email, password };
}

type SmsTemplate = {
  event?: string;
  label?: string;
  template_id?: string;
  variables?: string;
};

type SmsConfig = Record<string, unknown> & {
  api_key?: string;
  auth_key?: string;
  country?: string;
  message_id?: string;
  route?: string;
  sender_id?: string;
  template_id?: string;
  templates?: SmsTemplate[];
  variables?: string;
  variables_values?: string;
};

function getTemplate(cfg: SmsConfig, event = "otp") {
  const templates = Array.isArray(cfg.templates) ? cfg.templates : [];
  return templates.find((t) => (t.event || "").toLowerCase() === event) ?? templates[0] ?? null;
}

function asSmsConfig(value: unknown): SmsConfig {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SmsConfig) : {};
}

function asJson(value: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  } catch {
    return null;
  }
}

function renderVariables(pattern: string | undefined, code: string) {
  const rendered = (pattern || "{otp}")
    .replace(/\{#var#\}/gi, code)
    .replace(/\{otp\}/gi, code)
    .replace(/\{code\}/gi, code)
    .replace(/#VAR#/gi, code);
  return rendered
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("|");
}

async function logSystem(
  kind: "sms" | "otp" | "payment",
  provider: string | null,
  status: "success" | "error",
  message: string,
  meta: Json = {},
) {
  try {
    await supabaseAdmin.from("system_logs").insert({
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
  cfg: SmsConfig,
): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const apiKey = cfg.api_key?.trim();
  const senderId = cfg.sender_id?.trim().toUpperCase();
  const route = cfg.route?.trim() || "dlt";
  const template = getTemplate(cfg);
  const templateId = (template?.template_id || cfg.template_id || "").trim();
  const variablesValues = renderVariables(
    template?.variables || cfg.variables_values || cfg.variables,
    code,
  );
  const messageId = (cfg.message_id || "").trim();
  if (!apiKey) return { ok: false, error: "Fast2SMS api_key missing in admin config" };
  if (route === "dlt" && !/^[A-Z0-9]{6}$/.test(senderId || "")) {
    return {
      ok: false,
      error: "Fast2SMS Sender ID must be the exact 6-character DLT-approved header",
    };
  }
  if (route === "dlt" && !templateId && !messageId)
    return { ok: false, error: "Fast2SMS template_id or message_id required for DLT route" };

  const params = new URLSearchParams({
    authorization: apiKey,
    route,
    numbers: phone,
    variables_values: variablesValues,
    flash: "0",
  });
  if (senderId) params.set("sender_id", senderId);
  // Fast2SMS DLT expects the approved Message/Template ID in the `message` parameter.
  if (route === "dlt") params.set("message", messageId || templateId);
  else if (messageId) params.set("message_id", messageId);
  else if (templateId) params.set("template_id", templateId);

  const url = `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const body = await res.text();
    const json = (
      body
        ? (() => {
            try {
              return JSON.parse(body);
            } catch {
              return { raw_text: body };
            }
          })()
        : {}
    ) as { return?: boolean; message?: unknown };
    if (!res.ok || json.return === false) {
      const msg =
        typeof json.message === "string" ? json.message : JSON.stringify(json).slice(0, 300);
      if (/invalid sender id/i.test(msg)) {
        return {
          ok: false,
          error:
            "Fast2SMS Invalid Sender ID: Admin SMS settings me wahi 6-character DLT Header daalein jo Fast2SMS account me approved/active hai.",
          raw: json,
        };
      }
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
  cfg: SmsConfig,
): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const authKey = cfg.auth_key?.trim();
  const template = getTemplate(cfg);
  const templateId = (template?.template_id || cfg.template_id || "").trim();
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
      const msg =
        typeof json.message === "string" ? json.message : JSON.stringify(json).slice(0, 300);
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
      return {
        ok: false,
        error: "No active SMS gateway. Admin → SMS Gateways me ek gateway activate karein.",
      };
    }

    // Per-phone rate limit: reject if an OTP was issued in the last 60s.
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("otp_codes")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", sixtySecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      await logSystem("otp", gateway.provider, "error", "OTP cooldown active", {
        phone_last4: phone.slice(-4),
      });
      return {
        ok: false,
        error: "Bahut jaldi-jaldi OTP request kar rahe ho — 60 second ruk kar try karein.",
      };
    }

    const code = String(randomInt(1000, 10000));
    const codeHash = hash(code, phone);

    // Invalidate any previous unverified codes for this phone
    await supabaseAdmin.from("otp_codes").delete().eq("phone", phone).is("verified_at", null);

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
      await logSystem(
        "otp",
        gateway.provider,
        "error",
        "SMS gateway is in test mode; live OTP was not sent",
        {
          test_mode: true,
        },
      );
      return {
        ok: false,
        error: "SMS Test mode ON hai. Live OTP ke liye Admin SMS settings me Test mode OFF karein.",
      };
    }

    // Real send
    const cfg = asSmsConfig(gateway.config);
    const result =
      gateway.provider === "msg91"
        ? await sendViaMSG91(phone, code, cfg)
        : await sendViaFast2SMS(phone, code, cfg);

    if (!result.ok) {
      await logSystem("sms", gateway.provider, "error", result.error ?? "Unknown error", {
        phone_last4: phone.slice(-4),
        provider_response: asJson(result.raw),
      });
      return { ok: false, error: result.error ?? "SMS delivery failed" };
    }

    await logSystem(
      "sms",
      gateway.provider,
      "success",
      `OTP delivered to ${phone.slice(-4).padStart(10, "•")}`,
      {
        phone_last4: phone.slice(-4),
        provider_response: asJson(result.raw),
      },
    );
    return { ok: true, test_mode: false };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data }) => {
    const phone = data.phone;
    const code = data.code;

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

export const finalizeCustomerRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => FinalizeCustomerSchema.parse(d))
  .handler(async ({ data }) => {
    const phone = data.phone;
    const { data: verifiedRows, error: otpErr } = await supabaseAdmin
      .from("otp_codes")
      .select("id, verified_at")
      .eq("phone", phone)
      .not("verified_at", "is", null)
      .order("verified_at", { ascending: false })
      .limit(1);
    if (otpErr) return { ok: false, error: "OTP verify check fail hua" };
    const verifiedRow = verifiedRows?.[0];
    if (!verifiedRow) return { ok: false, error: "Pehle mobile OTP verify karein" };
    // Time-bounded check: verified OTP must be within last 15 minutes
    const verifiedAt = verifiedRow.verified_at ? new Date(verifiedRow.verified_at).getTime() : 0;
    if (!verifiedAt || Date.now() - verifiedAt > 15 * 60 * 1000) {
      return { ok: false, error: "Session expired — please re-verify your OTP" };
    }

    const payload = {
      name: data.name.trim(),
      gender: data.gender?.trim() || null,
      phone,
      email: data.email?.trim() || null,
      address: data.address.trim(),
      verified: true,
      status: "active",
      signup_method: "phone_otp",
    };
    let authUser: { userId: string; email: string; password: string };
    try {
      authUser = await ensurePhoneAuthUser(phone);
    } catch (e) {
      return { ok: false, error: (e as Error).message || "Login session create nahi ho paya" };
    }

    const { error } = await (supabaseAdmin as any).rpc("save_customer_profile_as_user", {
      _uid: authUser.userId,
      _name: payload.name,
      _gender: payload.gender ?? "",
      _phone: payload.phone,
      _email: payload.email || authUser.email,
      _address: payload.address,
    } as never);
    if (error) return { ok: false, error: error.message };

    const { data: signedIn, error: signErr } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.email,
      password: authUser.password,
    });
    if (signErr || !signedIn.session) return { ok: false, error: signErr?.message || "Login session start nahi ho paya" };

    return { ok: true, customer_id: authUser.userId, session: signedIn.session };
  });
