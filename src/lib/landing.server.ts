/**
 * Server-only helper that reads the public merchant landing payload with the
 * publishable (anon) key. Used by the cacheable landing server function so the
 * shop shell can be server-rendered instead of waiting on client JS.
 */
import { createClient } from "@supabase/supabase-js";

export type LandingPayload = Record<string, unknown> & { ok?: boolean };

export async function fetchPublicLanding(code: string): Promise<LandingPayload> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false, error: "not_configured" };

  const client = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers: h });
      },
    },
  });

  const { data, error } = await client.rpc("get_public_landing", { _code: code });
  if (error) return { ok: false, error: error.message };
  return (data as LandingPayload) ?? { ok: false };
}
