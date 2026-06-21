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
    case "visit.create": {
      const { error } = await supabase
        .from("vendor_customer_visits")
        .insert(a.payload as never);
      if (error) throw error;
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
