import type { ExtraLink } from "@/components/landing/landing-shared";

/** Config id stored (disabled) inside merchant extra_links so it never renders as a link. */
export const EXTRAS_ID = "cfg-landing-extras";

export type LandingExtras = {
  gate_enabled: boolean;
  gate_title: string;
  gate_message: string;
  ask_city: boolean;
  ask_message: boolean;
  popup_enabled: boolean;
  popup_title: string;
  popup_message: string;
  show_details: boolean;
};

export const EXTRAS_DEFAULTS: LandingExtras = {
  gate_enabled: true,
  gate_title: "Aap kaun hain?",
  gate_message: "Naam aur mobile number dijiye — hum turant connect karenge.",
  ask_city: false,
  ask_message: false,
  popup_enabled: false,
  popup_title: "",
  popup_message: "",
  show_details: true,
};

/** Read the extras config out of an extra_links array. */
export function readExtras(links: ExtraLink[] | null | undefined): LandingExtras {
  const row = (links ?? []).find((l) => l.id === EXTRAS_ID);
  if (!row?.url) return EXTRAS_DEFAULTS;
  try {
    const parsed = JSON.parse(row.url) as Partial<LandingExtras>;
    return { ...EXTRAS_DEFAULTS, ...parsed };
  } catch {
    return EXTRAS_DEFAULTS;
  }
}

/** Merge the extras config back into an extra_links array. */
export function writeExtras(links: ExtraLink[], extras: LandingExtras): ExtraLink[] {
  const row: ExtraLink = {
    id: EXTRAS_ID,
    label: "Landing settings",
    url: JSON.stringify(extras),
    enabled: false,
    category: "config",
  };
  const rest = links.filter((l) => l.id !== EXTRAS_ID);
  return [...rest, row];
}
