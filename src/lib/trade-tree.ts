/**
 * Seed-only nested category tree for the Vendor Onboarding "Trade Line" picker.
 *
 * Shape: each node can optionally have `children`. A node WITHOUT children is a
 * leaf (terminal selection). Every parent renders an "Other" option automatically
 * (added at runtime by the picker), so we don't repeat it in the data here.
 *
 * To extend remotely later, swap this static export for a fetch from an
 * admin-managed table — the picker only cares about the `TradeNode` shape.
 */

export type TradeNode = {
  value: string;
  label: string;
  sub?: string;
  children?: TradeNode[];
};

export const TRADE_TREE: TradeNode[] = [
  {
    value: "manufacturer",
    label: "Manufacturer",
    sub: "We produce / make goods",
    children: [
      {
        value: "garments_textiles",
        label: "Garments & Textiles",
        sub: "Apparel, fabric, knitwear",
        children: [
          { value: "readymade", label: "Readymade Apparel", sub: "Shirts, kurtas, jeans" },
          { value: "knitwear", label: "Knitwear & Hosiery", sub: "T-shirts, innerwear" },
          { value: "fabric", label: "Fabric / Yarn", sub: "Rolls, weaving, yarn" },
          { value: "uniforms", label: "Uniforms", sub: "School, corporate" },
        ],
      },
      {
        value: "electronics",
        label: "Electronics",
        sub: "Devices, components, assembly",
        children: [
          { value: "consumer_elec", label: "Consumer Electronics", sub: "TV, audio, gadgets" },
          { value: "components", label: "Components / PCB", sub: "Boards, parts" },
          { value: "lighting", label: "Lighting / LED", sub: "Bulbs, fixtures" },
        ],
      },
      {
        value: "food_production",
        label: "Food Production",
        sub: "Packaged food, snacks, dairy",
        children: [
          { value: "snacks", label: "Snacks & Namkeen" },
          { value: "dairy", label: "Dairy & Sweets" },
          { value: "bakery", label: "Bakery & Confectionery" },
          { value: "spices", label: "Spices & Masala" },
        ],
      },
      { value: "furniture", label: "Furniture & Wood", sub: "Wooden, modular, metal" },
      { value: "auto_parts", label: "Auto Parts", sub: "Spares, accessories" },
      { value: "chemicals", label: "Chemicals & Plastics", sub: "Industrial, packaging" },
    ],
  },
  {
    value: "wholesaler",
    label: "Wholesaler",
    sub: "Bulk supply / distribution",
    children: [
      { value: "fmcg", label: "FMCG", sub: "Daily-use goods" },
      { value: "apparel_w", label: "Apparel & Fashion" },
      { value: "kirana", label: "Kirana / Grocery" },
      { value: "stationery", label: "Stationery & Books" },
      { value: "hardware", label: "Hardware & Tools" },
    ],
  },
  {
    value: "retailer",
    label: "Retailer",
    sub: "Shop / store / counter",
    children: [
      { value: "kirana_r", label: "Kirana Store" },
      { value: "apparel_r", label: "Apparel Shop" },
      { value: "mobile_r", label: "Mobile & Accessories" },
      { value: "medical_r", label: "Medical / Pharmacy" },
      { value: "salon_r", label: "Salon / Beauty" },
      { value: "restaurant_r", label: "Restaurant / Cafe" },
    ],
  },
  {
    value: "service",
    label: "Service Provider",
    sub: "Skill, labour, professional",
    children: [
      {
        value: "home_services",
        label: "Home Services",
        sub: "Repair, cleaning, plumbing",
        children: [
          { value: "ac_repair", label: "AC / Appliance Repair" },
          { value: "plumber", label: "Plumber" },
          { value: "electrician", label: "Electrician" },
          { value: "cleaning", label: "Cleaning / Pest" },
        ],
      },
      {
        value: "professional",
        label: "Professional Services",
        sub: "CA, lawyer, consultant",
        children: [
          { value: "ca", label: "CA / Accountant" },
          { value: "lawyer", label: "Lawyer / Legal" },
          { value: "it_consult", label: "IT / Software" },
          { value: "designer", label: "Designer / Creative" },
        ],
      },
      { value: "logistics", label: "Logistics / Transport", sub: "Tempo, courier, packers" },
      { value: "education", label: "Education / Coaching" },
      { value: "events", label: "Events & Catering" },
    ],
  },
];

export type TradeSelection = {
  /** Ordered list of selected nodes from root → leaf. Last item may be `{ value: "other", customText: "..." }`. */
  path: Array<{ value: string; label: string; customText?: string }>;
};

export function summarizeSelection(sel: TradeSelection | null | undefined): string {
  if (!sel || !sel.path.length) return "";
  return sel.path
    .map((p) => (p.value === "__other__" ? p.customText || "Other" : p.label))
    .join(" › ");
}
