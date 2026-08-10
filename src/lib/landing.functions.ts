import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { fetchPublicLanding } from "./landing.server";
import type { LandingPayload } from "./landing-types";

/**
 * Public, edge-cacheable landing payload for /s/$code.
 * Called from the route loader so the shop shell is server-rendered.
 */
export const getLandingPayload = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => ({ code: String(data.code ?? "").slice(0, 64) }))
  .handler(async ({ data }): Promise<LandingPayload> => {
    const payload = await fetchPublicLanding(data.code);
    try {
      setResponseHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=600");
    } catch { /* header not available in this context */ }
    return payload;
  });
