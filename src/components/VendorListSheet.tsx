import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { X, Star, Phone, MessageCircle, MoreVertical, Check, ShieldCheck } from "lucide-react";
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
  cover: string;
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
  { id: "v1", name: "Aryan | Bansal", body: "AC service expert · 6 yrs", rating: 4.9, avatar: avatarAryan, cover: COVERS[0], productTitle: "Ac sarvic", productPrice: "499 | 299", approved: true },
  { id: "v2", name: "Karan | Bansal", body: "Quick & affordable repair", rating: 4.7, avatar: avatarRaj, cover: COVERS[1], productTitle: "Ac repair", productPrice: "599 | 349" },
  { id: "v3", name: "Rani | kumari", body: "Premium installation team", rating: 4.8, avatar: avatarRani, cover: COVERS[2], productTitle: "Ac install", productPrice: "799 | 499" },
  { id: "v4", name: "Ashu | Qureshi", body: "Gas & deep clean specialist", rating: 4.6, avatar: avatarUser, cover: COVERS[0], productTitle: "Gas refill", productPrice: "899 | 599" },
];

type Props = {
  open: boolean;
  category: string | null;
  onClose: () => void;
};

export function VendorListSheet({ open, category, onClose }: Props) {
  const navigate = useNavigate();
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set(["v1"]));
  const [activeContact, setActiveContact] = useState<MatchedVendor | null>(null);

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

  const toggleApprove = (id: string) => {
    setApprovedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    // After approving, navigate to status tracking screen
    setTimeout(() => {
      onClose();
      navigate({ to: "/status" });
    }, 350);
  };

  const goToChat = () => {
    onClose();
    navigate({ to: "/chat" });
  };

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
          Vander | Profile · tap to contact
        </p>

        {/* Vendor cards */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {MATCHED.map((v, i) => {
            const isApproved = approvedIds.has(v.id);
            return (
              <motion.article
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.4)] overflow-hidden shadow-sm"
              >
                {/* Cover — tap opens contact popup */}
                <button
                  onClick={() => setActiveContact(v)}
                  className="relative h-28 w-full overflow-hidden block text-left active:opacity-90"
                  aria-label={`Open ${v.name} profile`}
                >
                  <img src={v.cover} alt={v.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
                    <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
                    <span className="text-[10px] font-bold text-[color:oklch(0.25_0.05_85)]">{v.rating}</span>
                  </div>
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
                </button>

                {/* Body — tap opens popup too */}
                <button
                  onClick={() => setActiveContact(v)}
                  className="px-3 pt-5 pb-2 w-full text-left active:bg-[#fffbeb]"
                >
                  <h4 className="font-display text-base font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
                    {v.name}
                  </h4>
                  <p className="text-[11px] text-[color:oklch(0.50_0.08_85)]">{v.body}</p>

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
                </button>

                {/* Action bar */}
                <div className="flex items-stretch border-t border-[color:oklch(0.78_0.14_82/0.3)] bg-[color:oklch(0.13_0.02_85)]">
                  <button
                    onClick={() => toggleApprove(v.id)}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-display font-bold text-sm underline underline-offset-2 ${
                      isApproved ? "text-amber-300" : "text-white"
                    } active:scale-95 transition`}
                  >
                    {isApproved && <Check className="h-4 w-4" strokeWidth={3} />}
                    {isApproved ? "Aproved" : "Approve"}
                  </button>
                  <button
                    onClick={() => setActiveContact(v)}
                    aria-label="Call"
                    className="px-4 grid place-items-center border-l border-white/10 active:scale-95"
                  >
                    <Phone className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </button>
                  <button
                    onClick={goToChat}
                    aria-label="Chat"
                    className="px-4 grid place-items-center border-l border-white/10 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </button>
                  <button
                    onClick={() => setActiveContact(v)}
                    aria-label="More"
                    className="px-3 grid place-items-center border-l border-white/10 active:scale-95"
                  >
                    <MoreVertical className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Contact action popup */}
      <AnimatePresence>
        {activeContact && (
          <ContactActionPopup vendor={activeContact} onClose={() => setActiveContact(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactActionPopup({ vendor, onClose }: { vendor: MatchedVendor; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-6">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.65)] backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-white to-[#fff8e7] border-2 border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        {/* Hero */}
        <div className="relative h-32 w-full">
          <img src={vendor.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white/95 border border-white shadow active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.25_0.05_85)]" />
          </button>
          <div className="absolute -bottom-8 left-4 h-16 w-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
            <img src={vendor.avatar} alt={vendor.name} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="px-4 pt-10 pb-3">
          <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)]">
            {vendor.name}
          </h3>
          <p className="text-xs text-[color:oklch(0.50_0.08_85)]">{vendor.body}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3 w-3 text-amber-500" fill="currentColor" />
              ))}
            </div>
            <span className="text-xs font-bold text-[color:oklch(0.30_0.05_85)]">{vendor.rating}</span>
            <span className="text-[10px] text-[color:oklch(0.50_0.08_85)]">· verified</span>
          </div>
        </div>

        {/* Action grid */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          <ActionTile
            icon={<Phone className="h-5 w-5" strokeWidth={2.4} />}
            label="Call"
            tone="emerald"
            onClick={onClose}
          />
          <ActionTile
            icon={<MessageCircle className="h-5 w-5" strokeWidth={2.4} />}
            label="Chat"
            tone="sky"
            onClick={onClose}
          />
          <ActionTile
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={2.4} />}
            label="Proof"
            tone="gold"
            onClick={onClose}
          />
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white font-display font-bold text-sm shadow-[0_4px_12px_-2px_rgba(217,119,6,0.5)] active:scale-95 underline underline-offset-2"
          >
            Approve | Vendor
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "sky" | "gold";
  onClick: () => void;
}) {
  const styles =
    tone === "emerald"
      ? "from-emerald-400 to-emerald-600 shadow-[0_4px_12px_-2px_rgba(5,150,105,0.5)]"
      : tone === "sky"
      ? "from-sky-400 to-sky-600 shadow-[0_4px_12px_-2px_rgba(2,132,199,0.5)]"
      : "from-[#fbbf24] to-[#d97706] shadow-[0_4px_12px_-2px_rgba(217,119,6,0.5)]";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-b ${styles} text-white active:scale-95 transition`}
    >
      {icon}
      <span className="text-[11px] font-display font-bold">{label}</span>
    </button>
  );
}
