import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Star, Phone, MessageCircle, MoreVertical, Check } from "lucide-react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

type MatchedVendor = {
  id: string;
  name: string;
  body: string;
  rating: number;
  avatar: string;
  cover: string; // hero work photo URL
  productTitle: string;
  productPrice: string;
  approved?: boolean;
};

const COVERS = [
  "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=400&q=70",
  "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=70",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",
];

const MATCHED: MatchedVendor[] = [
  {
    id: "v1",
    name: "Aryan | Bansal",
    body: "Add a little bit of body text",
    rating: 4.9,
    avatar: avatarAryan,
    cover: COVERS[0],
    productTitle: "Ac sarvic",
    productPrice: "499 | 299",
    approved: true,
  },
  {
    id: "v2",
    name: "Karan | Bansal",
    body: "Add a little bit of body text",
    rating: 4.7,
    avatar: avatarRaj,
    cover: COVERS[1],
    productTitle: "Ac repair",
    productPrice: "599 | 349",
  },
  {
    id: "v3",
    name: "Rani | kumari",
    body: "Add a little bit of body text",
    rating: 4.8,
    avatar: avatarRani,
    cover: COVERS[2],
    productTitle: "Ac install",
    productPrice: "799 | 499",
  },
  {
    id: "v4",
    name: "Ashu | Qureshi",
    body: "Add a little bit of body text",
    rating: 4.6,
    avatar: avatarUser,
    cover: COVERS[0],
    productTitle: "Gas refill",
    productPrice: "899 | 599",
  },
];

type Props = {
  open: boolean;
  category: string | null;
  onClose: () => void;
};

export function VendorListSheet({ open, category, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-variation-open", "true");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.removeAttribute("data-variation-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-gradient-to-b from-white to-[#fff8e7] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Matched ✦
            </p>
            <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)]">
              {category ?? "Ac"} | service vendor
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
              <span className="text-xs font-bold text-[color:oklch(0.30_0.05_85)]">4.9</span>
              <span className="text-[10px] text-[color:oklch(0.50_0.08_85)]">
                · {MATCHED.length} vendors found
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <p className="px-5 text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)] underline underline-offset-2 mb-2">
          Vander | Profile
        </p>

        {/* Vendor cards */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {MATCHED.map((v, i) => (
            <motion.article
              key={v.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.4)] overflow-hidden shadow-sm"
            >
              {/* Cover */}
              <div className="relative h-28 w-full overflow-hidden">
                <img
                  src={v.cover}
                  alt={v.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {/* Rating chip */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
                  <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
                  <span className="text-[10px] font-bold text-[color:oklch(0.25_0.05_85)]">{v.rating}</span>
                </div>
                {/* Quick note pill */}
                <div className="absolute -bottom-3 left-3 right-3 h-9 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-2 border-white shadow-md flex items-center px-2 gap-2">
                  <span className="h-7 w-7 rounded-full overflow-hidden border border-white flex-shrink-0">
                    <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="text-[11px] font-display italic text-white truncate">
                    Quick message Note….
                  </span>
                  <span className="ml-auto flex items-center gap-0.5 text-white text-[10px] font-bold flex-shrink-0">
                    <Star className="h-3 w-3" fill="currentColor" />
                    {v.rating}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-3 pt-5 pb-2">
                <h4 className="font-display text-base font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
                  {v.name}
                </h4>
                <p className="text-[11px] text-[color:oklch(0.50_0.08_85)]">{v.body}</p>

                {/* Product mini card */}
                <div className="mt-2 rounded-xl bg-[#fffbeb] border border-[color:oklch(0.78_0.14_82/0.35)] p-2 flex items-center gap-2">
                  <div className="h-12 w-14 rounded-lg bg-gradient-to-br from-sky-200 to-emerald-200 grid place-items-center flex-shrink-0">
                    <span className="text-[18px]">☁️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)]">
                      {v.productTitle}
                    </p>
                    <p className="text-[11px] text-[color:oklch(0.50_0.08_85)]">{v.productPrice}</p>
                    <p className="text-[10px] text-[color:oklch(0.50_0.08_85)] truncate">
                      Add a little bit of body text
                    </p>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-stretch border-t border-[color:oklch(0.78_0.14_82/0.3)] bg-[color:oklch(0.13_0.02_85)]">
                <button
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-display font-bold text-sm underline underline-offset-2 ${
                    v.approved
                      ? "text-amber-300"
                      : "text-white"
                  } active:scale-95 transition`}
                >
                  {v.approved && <Check className="h-4 w-4" strokeWidth={3} />}
                  {v.approved ? "Aproved" : "Approve"}
                </button>
                <button
                  aria-label="Call"
                  className="px-4 grid place-items-center border-l border-white/10 active:scale-95"
                >
                  <Phone className="h-4 w-4 text-white" strokeWidth={2.4} />
                </button>
                <button
                  aria-label="Chat"
                  className="px-4 grid place-items-center border-l border-white/10 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4 text-white" strokeWidth={2.4} />
                </button>
                <button
                  aria-label="More"
                  className="px-3 grid place-items-center border-l border-white/10 active:scale-95"
                >
                  <MoreVertical className="h-4 w-4 text-white" strokeWidth={2.4} />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
