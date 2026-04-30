import { useEffect, useState } from "react";

/**
 * Globally-shared "active catalog type" (Product / Service / Other).
 * Persisted in localStorage, broadcast via a custom window event so any
 * component (BottomActionBar pills, /quick categories) stays in sync.
 */
const STORAGE_KEY = "ko-active-type-id";
const EVENT = "ko-active-type-change";

export function getActiveTypeId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setActiveTypeId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function useActiveTypeId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(() => getActiveTypeId());

  useEffect(() => {
    const handler = (e: Event) => setId((e as CustomEvent<string | null>).detail ?? null);
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setId(e.newValue);
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storage);
    };
  }, []);

  return [id, setActiveTypeId];
}
