/** JSON shape returned by the public `get_public_landing` RPC. Shared by the
 * server function, the route loader and the storefront components. */

/** Call-to-action button shown on a shoppable product card. */
export type ProductCta = {
  /** Preset id (amazon / flipkart / meesho / whatsapp / inquiry / call / custom). */
  preset?: string | null;
  label?: string | null;
  color?: string | null;
  url?: string | null;
};

/** A product attached to one video / media slot. */
export type VideoProduct = {
  id: string;
  name: string;
  price?: string | null;
  /** Strike-through / MRP price shown next to the selling price. */
  mrp?: string | null;
  image?: string | null;
  description?: string | null;
  enquiry?: string | null;
  url?: string | null;
  rating?: number | null;
  reviews?: number | null;
  /** Small corner badge, e.g. "New" or "Bestseller". */
  badge?: string | null;
  /** Available quantity / stock the merchant entered. */
  quantity?: number | string | null;
  cta?: ProductCta | null;
};

export type LandingMediaItem = {
  type: "image" | "video" | "url";
  src: string;
  poster?: string | null;
  products?: VideoProduct[];
};

export type LandingPayload = {
  ok: boolean;
  error?: string;
  merchant?: {
    name?: string;
    shop_name?: string;
    avatar_url?: string;
    verified?: boolean;
    code?: string;
    cover_url?: string;
    phone?: string;
    trade?: string;
    address?: string;
  };
  links?: {
    poster_bg_url?: string;
    poster_bg_urls?: string[];
    poster_media?: LandingMediaItem[];
    play_store_enabled?: boolean;
    payment_enabled?: boolean;
    payment_provider?: string;
    payment_upi_id?: string;
    payment_label?: string;
    payment_amount_inr?: number | string | null;
    digital_shop_enabled?: boolean;
    digital_shop_url?: string;
    extra_links?: Array<{ id: string; label: string; url: string; enabled: boolean }>;
  };
  landing?: {
    top_banner_url?: string;
    top_banner_link?: string;
    bottom_banner_url?: string;
    bottom_banner_link?: string;
    announcement_text?: string;
    announcement_active?: boolean;
    ios_app_url?: string;
  };
  theme?: {
    key?: string;
    preset?: string;
    style?: string;
    accent_color?: string;
    bg_from?: string;
    bg_to?: string;
  };
  ads?: Array<{ name?: string; trade?: string | null; image?: string | null; url?: string | null }>;
};

/** Real engagement counters for a merchant page (get_public_landing_stats). */
export type LandingStats = {
  views: number;
  shares: number;
  inquiries: number;
  tags: number;
  orders: number;
  installs: number;
};
