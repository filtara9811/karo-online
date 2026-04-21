import productCosmetics from "@/assets/product-cosmetics.jpg";
import productBags from "@/assets/product-bags.jpg";
import productCleaning from "@/assets/product-cleaning.jpg";
import productPerfume from "@/assets/product-perfume.jpg";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  mrp: number;
  image: string;
  rating: number;
  reviews: number;
  seller: string;
  category: string;
  variations?: { label: string; value: string }[];
  badge?: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "maison-cosmetics",
    name: "Maison Cosmetics",
    tagline: "Premium beauty kit · Add a little touch of luxury",
    description:
      "A curated 5-piece luxury cosmetics palette featuring rich pigments, satin finishes and long-lasting wear. Crafted for the modern maison aesthetic.",
    price: 2199,
    mrp: 3499,
    image: productCosmetics,
    rating: 4.8,
    reviews: 348,
    seller: "Aanya · Delhi",
    category: "Beauty",
    variations: [
      { label: "Nude", value: "nude" },
      { label: "Bold", value: "bold" },
      { label: "Classic", value: "classic" },
    ],
    badge: "Bestseller",
  },
  {
    id: "croc-briefcase",
    name: "Croc Briefcase",
    tagline: "Hand-crafted leather · Heritage line",
    description:
      "Hand-stitched croc-embossed leather briefcase. Brass hardware, suede interior, and a heritage finish that ages gracefully.",
    price: 12499,
    mrp: 18999,
    image: productBags,
    rating: 4.9,
    reviews: 122,
    seller: "Vihaan · Mumbai",
    category: "Fashion",
    variations: [
      { label: "Cognac", value: "cognac" },
      { label: "Black", value: "black" },
    ],
    badge: "Heritage",
  },
  {
    id: "home-essentials",
    name: "Home Essentials",
    tagline: "Eco-friendly cleaning · Citrus blend",
    description:
      "Plant-derived multi-surface cleaner kit with citrus essential oils. Non-toxic, biodegradable and beautifully packaged.",
    price: 899,
    mrp: 1299,
    image: productCleaning,
    rating: 4.7,
    reviews: 521,
    seller: "Riya · Bangalore",
    category: "Home",
    variations: [
      { label: "Citrus", value: "citrus" },
      { label: "Lavender", value: "lavender" },
    ],
  },
  {
    id: "aurum-perfume",
    name: "Aurum Perfume",
    tagline: "24K gold cap · Oud & amber notes",
    description:
      "Long-lasting eau de parfum with notes of oud, amber and bergamot. Finished with a 24K gold-plated cap and hand-blown glass body.",
    price: 4499,
    mrp: 6999,
    image: productPerfume,
    rating: 4.9,
    reviews: 256,
    seller: "Karan · Hyderabad",
    category: "Beauty",
    variations: [
      { label: "50ml", value: "50" },
      { label: "100ml", value: "100" },
    ],
    badge: "Hot Deal",
  },
];

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}
