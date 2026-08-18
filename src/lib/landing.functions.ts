import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { fetchPublicLanding } from "./landing.server";
import type { LandingPayload } from "./landing-types";

/**
 * Public, edge-cacheable landing payload for /s/$code.
 * Called from the route loader so the shop shell is server-rendered.
 * `project` is the QR project slug (?p=) so multi-shop merchants resolve the
 * exact scanned shop instead of their default project.
 */
export const getLandingPayload = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string; project?: string | null }) => ({
    code: String(data.code ?? "").slice(0, 64),
    project: data.project ? String(data.project).slice(0, 120) : null,
  }))
  .handler(async ({ data }): Promise<LandingPayload> => {
    const payload = await fetchPublicLanding(data.code, data.project);
    try {
      setResponseHeader("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=600");
    } catch { /* header not available in this context */ }
    return payload;
  });
