import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// A scan history row for the vendor's own use.
// Table lives at public.vendor_scan_history — see migration.

export type ScanHistoryEntry = {
  id: string;
  kinds: string[];
  thumbnail: string | null;
  extracted: Record<string, unknown>;
  confidence: number | null;
  field_confidence: Record<string, number> | null;
  status?: string | null;
  created_at: string;
};

export const listScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data, error } = await context.supabase
      .from("vendor_scan_history" as never)
      .select("id, kinds, thumbnail, extracted, confidence, field_confidence, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
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
  confidence: z.number().min(0).max(1).nullable().optional(),
  field_confidence: z.record(z.string(), z.number()).nullable().optional(),
  status: z.enum(["complete", "pending_ocr"]).optional(),
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
        confidence: data.confidence ?? null,
        field_confidence: data.field_confidence ?? null,
        status: data.status ?? "complete",
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

export type ScanInsights = {
  total: number;
  last7d: number;
  last30d: number;
  today: number;
  avgConfidence: number | null;
  emptyRate: number;
  fieldFillRate: Record<string, number>;
  recent: {
    id: string;
    created_at: string;
    thumbnail: string | null;
    confidence: number | null;
    business_name: string | null;
    mobile: string | null;
    kinds: string[];
  }[];
};

export const getScanInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScanInsights> => {
    // Admin gate
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("vendor_scan_history" as never)
      .select("id, created_at, thumbnail, confidence, extracted, kinds")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = (data as unknown as {
      id: string;
      created_at: string;
      thumbnail: string | null;
      confidence: number | null;
      extracted: Record<string, unknown> | null;
      kinds: string[] | null;
    }[]) ?? [];

    const now = Date.now();
    const D = 24 * 60 * 60 * 1000;
    const in7 = now - 7 * D;
    const in30 = now - 30 * D;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let confSum = 0;
    let confCount = 0;
    let empty = 0;
    const fieldHit: Record<string, number> = {};
    const TRACK = [
      "business_name", "owner_name", "mobile", "address",
      "city", "state", "pincode", "gstin", "email", "shop_type_hint",
    ];
    for (const k of TRACK) fieldHit[k] = 0;

    for (const r of rows) {
      if (typeof r.confidence === "number") {
        confSum += r.confidence;
        confCount++;
      }
      const ex = r.extracted ?? {};
      let hasAny = false;
      for (const k of TRACK) {
        const v = (ex as Record<string, unknown>)[k];
        const ok = Array.isArray(v) ? v.length > 0 : Boolean(v);
        if (ok) {
          fieldHit[k]++;
          hasAny = true;
        }
      }
      if (!hasAny) empty++;
    }

    const fieldFillRate: Record<string, number> = {};
    const denom = Math.max(1, rows.length);
    for (const k of TRACK) fieldFillRate[k] = fieldHit[k] / denom;

    const recent = rows.slice(0, 15).map((r) => {
      const ex = (r.extracted ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        created_at: r.created_at,
        thumbnail: r.thumbnail,
        confidence: r.confidence,
        business_name: (ex.business_name as string) ?? null,
        mobile: (ex.mobile as string) ?? null,
        kinds: r.kinds ?? [],
      };
    });

    return {
      total: rows.length,
      last7d: rows.filter((r) => new Date(r.created_at).getTime() >= in7).length,
      last30d: rows.filter((r) => new Date(r.created_at).getTime() >= in30).length,
      today: rows.filter((r) => new Date(r.created_at).getTime() >= startOfToday.getTime()).length,
      avgConfidence: confCount > 0 ? confSum / confCount : null,
      emptyRate: rows.length ? empty / rows.length : 0,
      fieldFillRate,
      recent,
    };
  });
