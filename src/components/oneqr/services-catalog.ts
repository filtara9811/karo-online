/** Catalog + local persistence for One QR "Services & Plugins". */

export type ServiceKey =
  | "gmb"
  | "sound_alert"
  | "customer_apk"
  | "link_domain"
  | "lead_tag"
  | "gift_card"
  | "voice_agent"
  | "delivery"
  | "payment_gateway";

export type ServiceDef = {
  key: ServiceKey;
  name: string;
  tagline: string;
  emoji: string;
  monthly: number;
  yearly: number;
  /** YouTube (or any embeddable) tutorial link. */
  tutorial: string;
  /** Bullet points shown in the detail sheet. */
  benefits: string[];
  /** Free plugins skip the pricing block. */
  free?: boolean;
};

export const SERVICES: ServiceDef[] = [
  {
    key: "gmb",
    name: "Google My Business",
    tagline: "Business profile Google par live rakhein",
    emoji: "🏪",
    monthly: 199,
    yearly: 999,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["Google Maps par shop live", "Photos & timing auto-sync", "Reviews ek jagah"],
  },
  {
    key: "sound_alert",
    name: "Sound Alert",
    tagline: "Naya lead/visit aawaz me sunein",
    emoji: "🔔",
    monthly: 99,
    yearly: 499,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["Customer ka naam bolkar alert", "City & platform announce", "Counter par kuch miss nahi"],
  },
  {
    key: "customer_apk",
    name: "Customer APK Download",
    tagline: "Apni shop app customer ko dein",
    emoji: "📲",
    monthly: 149,
    yearly: 799,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["White-label install button", "Repeat customer badhein", "Push notification ready"],
  },
  {
    key: "link_domain",
    name: "Custom Domain / Link Domain",
    tagline: "Apna khud ka domain jodein",
    emoji: "🌐",
    monthly: 249,
    yearly: 1299,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["shop.yourbrand.com", "SSL free", "Brand trust"],
  },
  {
    key: "lead_tag",
    name: "Lead Capture (All Leads Tag)",
    tagline: "Har scan ko lead me badlein",
    emoji: "🏷️",
    monthly: 149,
    yearly: 799,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["Name & number capture", "Source tagging", "WhatsApp follow-up"],
  },
  {
    key: "gift_card",
    name: "Gift Card & Reward Points",
    tagline: "Loyalty points aur gift card",
    emoji: "🎁",
    monthly: 199,
    yearly: 999,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["Points on every visit", "Gift card share", "Repeat sales"],
  },
  {
    key: "voice_agent",
    name: "AI Voice Agent",
    tagline: "AI aapke customer se baat kare",
    emoji: "🤖",
    monthly: 399,
    yearly: 1999,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["24x7 enquiry handling", "Hindi + English", "Order note auto"],
  },
  {
    key: "delivery",
    name: "Delivery Integration",
    tagline: "Local delivery partner jodein",
    emoji: "🛵",
    monthly: 249,
    yearly: 1299,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["Pickup se drop tracking", "Rider assign", "Customer ko live status"],
  },
  {
    key: "payment_gateway",
    name: "Payment Gateway",
    tagline: "UPI & card payment shop page par",
    emoji: "💳",
    monthly: 0,
    yearly: 0,
    free: true,
    tutorial: "https://www.youtube.com/embed/2MpDdmT2iL8",
    benefits: ["UPI / card / netbanking", "Instant settlement", "Auto invoice"],
  },
];

export type VoiceSettings = {
  enabled: boolean;
  announceName: boolean;
  announceCity: boolean;
  announcePlatform: boolean;
  template: string;
};

export const DEFAULT_VOICE: VoiceSettings = {
  enabled: true,
  announceName: true,
  announceCity: true,
  announcePlatform: true,
  template: "[Platform] se [Name], [City] se [Event] prapt hua",
};

const KEY = (projectId: string) => `oneqr:services:${projectId}`;

export type ServiceState = {
  active: Partial<Record<ServiceKey, { plan: "monthly" | "yearly"; at: string }>>;
  voice: VoiceSettings;
  gmbUrl?: string;
};

const EMPTY: ServiceState = { active: {}, voice: DEFAULT_VOICE };

export function loadServiceState(projectId: string): ServiceState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY(projectId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ServiceState>;
    return { active: parsed.active ?? {}, voice: { ...DEFAULT_VOICE, ...(parsed.voice ?? {}) }, gmbUrl: parsed.gmbUrl };
  } catch {
    return EMPTY;
  }
}

export function saveServiceState(projectId: string, state: ServiceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(projectId), JSON.stringify(state));
  } catch {
    /* storage full / private mode — settings stay in memory */
  }
}

/** Build the spoken sample line from the current voice settings. */
export function voicePreview(v: VoiceSettings) {
  return v.template
    .replace("[Platform]", v.announcePlatform ? "Facebook" : "Karo")
    .replace("[Name]", v.announceName ? "Rahul" : "ek customer")
    .replace("[City]", v.announceCity ? "Jaipur" : "aapke area")
    .replace("[Event]", "naya order");
}
