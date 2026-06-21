import { openDB, type IDBPDatabase } from "idb";

export interface OfflineSchema {
  cache: {
    key: string;
    value: { key: string; data: unknown; updatedAt: number; ttlMs: number };
  };
  queue: {
    key: string;
    value: QueuedAction;
    indexes: { byStatus: string; byCreatedAt: number };
  };
}

export type QueuedAction = {
  id: string;
  type:
    | "lead.create"
    | "lead.update"
    | "lead.cancel"
    | "vendor.status"
    | "vendor.lead_update"
    | "visit.create"
    | "generic";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

const DB_NAME = "ko-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

export function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("queue")) {
          const s = db.createObjectStore("queue", { keyPath: "id" });
          s.createIndex("byStatus", "status");
          s.createIndex("byCreatedAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}
