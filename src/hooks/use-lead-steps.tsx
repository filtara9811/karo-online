import { useCallback, useEffect, useState } from "react";

/**
 * Per-lead 3-step vendor workflow: accept → call → message.
 * Accept tick is always true (these leads are already "started").
 * Call + message ticks persist in localStorage so the visual progress
 * survives reloads, and update reactively across tabs.
 */
export type LeadSteps = { accept: boolean; call: boolean; msg: boolean };

const KEY = (leadId: string) => `lead-steps:${leadId}`;

function read(leadId: string): LeadSteps {
  if (typeof window === "undefined") return { accept: true, call: false, msg: false };
  try {
    const raw = window.localStorage.getItem(KEY(leadId));
    if (!raw) return { accept: true, call: false, msg: false };
    const j = JSON.parse(raw);
    return { accept: true, call: !!j.call, msg: !!j.msg };
  } catch {
    return { accept: true, call: false, msg: false };
  }
}

function write(leadId: string, s: LeadSteps) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(leadId), JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("lead-steps-change", { detail: { leadId } }));
}

export function useLeadSteps(leadId: string) {
  const [steps, setSteps] = useState<LeadSteps>(() => read(leadId));

  useEffect(() => {
    setSteps(read(leadId));
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ leadId: string }>;
      if (ev.detail?.leadId === leadId) setSteps(read(leadId));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(leadId)) setSteps(read(leadId));
    };
    window.addEventListener("lead-steps-change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("lead-steps-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [leadId]);

  const markCall = useCallback(() => {
    const next = { ...read(leadId), call: true };
    write(leadId, next);
  }, [leadId]);
  const markMsg = useCallback(() => {
    const next = { ...read(leadId), msg: true };
    write(leadId, next);
  }, [leadId]);

  const completed = (steps.accept ? 1 : 0) + (steps.call ? 1 : 0) + (steps.msg ? 1 : 0);
  return { steps, markCall, markMsg, completed };
}
