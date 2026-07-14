/**
 * Offline scan queue.
 *
 * Market-area vendors often join with weak/no network. We let them capture
 * photos + extracted data (if scan already succeeded) or raw photos alone
 * (if OCR failed due to no network), persist to IndexedDB, and auto-sync
 * to `vendor_scan_history` when the connection returns.
 *
 * We piggyback on the existing `queue` object store instead of adding a
 * new store — the payload just carries dataUrls + kinds + extracted JSON.
 */
import { getDB } from "./db";
import { enqueue, getPending } from "./queue";

export type OfflineScanPayload = {
  kinds: string[];
  images: string[]; // data URLs, base64 jpeg
  thumbnail: string | null;
  extracted: Record<string, unknown> | null; // null = pending OCR
  confidence: number | null;
  fieldConfidence: Record<string, number> | null;
  status: "pending_ocr" | "complete";
  createdAt: number;
};

/** Queue a scan for later sync. Returns queued action id. */
export async function queueOfflineScan(p: OfflineScanPayload): Promise<string> {
  const action = await enqueue("generic", {
    kind: "scan.save",
    payload: p as unknown as Record<string, unknown>,
  });
  return action.id;
}

/** Return all pending offline scans (regardless of network state). */
export async function listOfflineScans(): Promise<
  { id: string; scan: OfflineScanPayload; queuedAt: number }[]
> {
  try {
    const all = await getPending();
    return all
      .filter((a) => a.type === "generic" && (a.payload as { kind?: string })?.kind === "scan.save")
      .map((a) => ({
        id: a.id,
        scan: (a.payload as { payload: OfflineScanPayload }).payload,
        queuedAt: a.createdAt,
      }))
      .sort((a, b) => b.queuedAt - a.queuedAt);
  } catch {
    return [];
  }
}

export async function removeOfflineScan(id: string) {
  try {
    const db = await getDB();
    await db.delete("queue", id);
  } catch {
    /* ignore */
  }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}
