import { supabase } from "@/integrations/supabase/client";
import { getPending, markDone, markFailed, markSyncing } from "./queue";
import type { QueuedAction } from "./db";

let running = false;

async function handle(a: QueuedAction): Promise<void> {
  switch (a.type) {
    case "lead.create": {
      const { error } = await supabase.from("leads").insert(a.payload as never);
      if (error) throw error;
      return;
    }
    case "lead.update": {
      const { id, ...rest } = a.payload as { id: string } & Record<string, unknown>;
      const { error } = await supabase.from("leads").update(rest as never).eq("id", id);
      if (error) throw error;
      return;
    }
    case "lead.cancel": {
      const { id } = a.payload as { id: string };
      const { error } = await supabase.from("leads").update({ status: "cancelled" } as never).eq("id", id);
      if (error) throw error;
      return;
    }
    case "vendor.status": {
      const { vendorId, is_open } = a.payload as { vendorId: string; is_open: boolean };
      const { error } = await supabase
        .from("vendors")
        .update({ is_open } as never)
        .eq("id", vendorId);
      if (error) throw error;
      return;
    }
    case "vendor.lead_update": {
      const { id, ...rest } = a.payload as { id: string } & Record<string, unknown>;
      const { error } = await supabase.from("leads").update(rest as never).eq("id", id);
      if (error) throw error;
      return;
    }
    case "generic": {
      // Offline scan sync: payload = { kind: "scan.save", payload: OfflineScanPayload }
      const p = a.payload as { kind?: string; payload?: Record<string, unknown> };
      if (p?.kind === "scan.save" && p.payload) {
        const scan = p.payload as {
          kinds: string[];
          thumbnail: string | null;
          extracted: Record<string, unknown> | null;
          confidence: number | null;
          field_confidence: Record<string, number> | null;
          status: "pending_ocr" | "complete";
        };
        // If OCR was never run (offline), we save with status pending_ocr and
        // let the client re-run OCR later. Here we just persist what we have.
        const { error } = await supabase
          .from("vendor_scan_history" as never)
          .insert({
            kinds: scan.kinds,
            thumbnail: scan.thumbnail,
            extracted: scan.extracted ?? {},
            confidence: scan.confidence,
            field_confidence: scan.field_confidence,
            status: scan.status,
          } as never);
        if (error) throw error;
      }
      return;
    }
    default:
      return;
  }
}

export async function flushQueue() {
  if (running) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  running = true;
  try {
    const pending = await getPending();
    for (const a of pending) {
      try {
        await markSyncing(a.id);
        await handle(a);
        await markDone(a.id);
      } catch (e) {
        await markFailed(a.id, e instanceof Error ? e.message : "sync failed");
        // Stop on first failure to preserve order
        break;
      }
    }
  } finally {
    running = false;
  }
}

export function startAutoSync() {
  if (typeof window === "undefined") return () => {};
  const handler = () => void flushQueue();
  window.addEventListener("online", handler);
  window.addEventListener("focus", handler);
  const interval = window.setInterval(handler, 30_000);
  // Initial attempt
  void flushQueue();
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("focus", handler);
    window.clearInterval(interval);
  };
}
