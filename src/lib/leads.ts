export type LeadSource = "whatsapp" | "call" | "digital" | "quick";
export type LeadStatus = "new" | "process" | "success" | "rejected";

export type LeadEvent = {
  at: string;
  label: string;
  kind: "created" | "accepted" | "rejected" | "contacted" | "scheduled" | "payment" | "note";
};

export type Lead = {
  id: string;
  leadCode?: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  productImage?: string | null;
  distanceKm?: number | null;
  email?: string;
  address?: string;
  service: string;
  amount: number;
  rating?: number;
  source: LeadSource;
  status: LeadStatus;
  time: string;
  createdAtIso?: string;
  progressPct?: number;
  note: string;
  timeline: LeadEvent[];
};


export const LEADS: Lead[] = [
  {
    id: "L-1042",
    name: "Aarav Kapoor",
    phone: "9250179030",
    email: "aarav.k@gmail.com",
    address: "B-204, Greenwood Society, Sector 45, Gurugram",
    service: "AC Service · Split",
    amount: 2100,
    source: "whatsapp",
    status: "new",
    time: "2 min ago",
    note: "Urgent · Same-day visit. AC not cooling, gas top-up needed.",
    timeline: [
      { at: "2 min ago", label: "Lead received via WhatsApp", kind: "created" },
    ],
  },
  {
    id: "L-1041",
    name: "Riya Sharma",
    phone: "9871156720",
    email: "riya.sharma22@outlook.com",
    address: "Flat 1102, Prestige Heights, Saket, New Delhi",
    service: "Deep Cleaning · 3BHK",
    amount: 3499,
    source: "digital",
    status: "new",
    time: "18 min ago",
    note: "Weekend slot preferred. Bring eco-friendly products.",
    timeline: [
      { at: "18 min ago", label: "Booking placed via Digital Dukan", kind: "created" },
    ],
  },
  {
    id: "L-1039",
    name: "Karan Mehta",
    phone: "8287545843",
    email: "karan.m@yahoo.com",
    address: "C-78, Lajpat Nagar III, New Delhi",
    service: "Plumbing Repair",
    amount: 899,
    source: "call",
    status: "process",
    time: "1 hr ago",
    note: "Bathroom leak from ceiling, water dripping into kitchen.",
    timeline: [
      { at: "1 hr ago", label: "Inbound call captured", kind: "created" },
      { at: "55 min ago", label: "Lead accepted by you", kind: "accepted" },
      { at: "40 min ago", label: "WhatsApp sent · ETA shared", kind: "contacted" },
      { at: "20 min ago", label: "Visit scheduled · Today 5:30 PM", kind: "scheduled" },
    ],
  },
  {
    id: "L-1037",
    name: "Ananya Verma",
    phone: "9988776655",
    email: "ananya.verma@gmail.com",
    address: "A-12, DLF Phase 2, Gurugram",
    service: "Salon at Home",
    amount: 1499,
    source: "quick",
    status: "success",
    time: "Yesterday",
    note: "Bridal package · Full body service. Payout released.",
    timeline: [
      { at: "Yesterday 10:00 AM", label: "Quick Service request", kind: "created" },
      { at: "Yesterday 10:05 AM", label: "Accepted instantly", kind: "accepted" },
      { at: "Yesterday 02:30 PM", label: "Service completed", kind: "scheduled" },
      { at: "Yesterday 06:00 PM", label: "Payment received · ₹1,499", kind: "payment" },
    ],
  },
  {
    id: "L-1031",
    name: "Vikram Singh",
    phone: "9123456780",
    address: "Sector 22, Noida",
    service: "Pest Control",
    amount: 1899,
    source: "whatsapp",
    status: "rejected",
    time: "2 days ago",
    note: "Out of service area · Vendor unavailable.",
    timeline: [
      { at: "2 days ago", label: "Lead received via WhatsApp", kind: "created" },
      { at: "2 days ago", label: "Marked rejected · Out of area", kind: "rejected" },
    ],
  },
];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  whatsapp: "WhatsApp",
  call: "Calling",
  digital: "Digital Dukan",
  quick: "Quick Service",
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Action Required",
  process: "In Process",
  success: "Payout Released",
  rejected: "Rejected",
};
