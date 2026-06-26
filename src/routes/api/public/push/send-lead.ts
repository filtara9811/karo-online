import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  vendor_ids: z.array(z.string().uuid()).default([]),
});

export const Route = createFileRoute("/api/public/push/send-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
        }

        const { sendLeadPushToVendorInternal } = await import("@/lib/push.functions");
        let sent = 0;
        const results = [] as Array<{ vendor_id: string; ok: boolean; reason?: string }>;
        for (const vendorId of body.vendor_ids) {
          const result = await sendLeadPushToVendorInternal({ vendor_id: vendorId, lead_id: body.lead_id });
          const ok = !!(result as any)?.ok;
          if (ok) sent += 1;
          results.push({ vendor_id: vendorId, ok, reason: (result as any)?.reason ?? (result as any)?.error });
        }

        return Response.json({ ok: true, sent, total: body.vendor_ids.length, results: results.slice(0, 20) });
      },
    },
  },
});