import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// A scan history row for the vendor's own use.
// Table lives at public.vendor_scan_history — see migration.

export type ScanHistoryEntry = {
  id: string;
  kinds: string[];
  thumbnail: string | null;
  // Loose JSON — validated at consumer level.
  extracted: Record<string, unknown>;
  created_at: string;
};

export const listScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data, error } = await context.supabase
      .from("vendor_scan_history" as never)
      .select("id, kinds, thumbnail, extracted, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      // Table may not exist yet if migration hasn't run — return empty gracefully.
      // eslint-disable-next-line no-console
      console.warn("[scan-history] list failed:", error.message);
      return [];
    }
    return (data as unknown as unknown[]) ?? [];
  });

const SaveInput = z.object({
  kinds: z.array(z.string()).min(1).max(10),
  thumbnail: z.string().nullable(),
  extracted: z.record(z.string(), z.unknown()),
});

export const saveScanHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string | null }> => {
    const { data: row, error } = await context.supabase
      .from("vendor_scan_history" as never)
      .insert({
        user_id: context.userId,
        kinds: data.kinds,
        thumbnail: data.thumbnail,
        extracted: data.extracted,
      } as never)
      .select("id")
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[scan-history] save failed:", error.message);
      return { id: null };
    }
    return { id: (row as { id: string }).id };
  });

export const deleteScanHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vendor_scan_history" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
