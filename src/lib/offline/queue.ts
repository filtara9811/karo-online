import { getDB, type QueuedAction } from "./db";

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function subscribeQueue(fn: Listener) {
  listeners.add(fn);
  void getQueueCount().then(fn);
  return () => listeners.delete(fn);
}

async function emit() {
  const n = await getQueueCount();
  listeners.forEach((l) => l(n));
}

export async function enqueue(
  type: QueuedAction["type"],
  payload: Record<string, unknown>,
): Promise<QueuedAction> {
  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  try {
    const db = await getDB();
    await db.put("queue", action);
    void emit();
  } catch {
    /* ignore */
  }
  return action;
}

export async function getPending(): Promise<QueuedAction[]> {
  try {
    const db = await getDB();
    const all = (await db.getAll("queue")) as QueuedAction[];
    return all
      .filter((a) => a.status === "pending" || a.status === "failed")
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function getQueueCount(): Promise<number> {
  return (await getPending()).length;
}

export async function markSyncing(id: string) {
  const db = await getDB();
  const a = (await db.get("queue", id)) as QueuedAction | undefined;
  if (!a) return;
  a.status = "syncing";
  a.attempts += 1;
  await db.put("queue", a);
}

export async function markDone(id: string) {
  const db = await getDB();
  await db.delete("queue", id);
  void emit();
}

export async function markFailed(id: string, err: string) {
  const db = await getDB();
  const a = (await db.get("queue", id)) as QueuedAction | undefined;
  if (!a) return;
  a.status = "failed";
  a.lastError = err;
  await db.put("queue", a);
  void emit();
}
