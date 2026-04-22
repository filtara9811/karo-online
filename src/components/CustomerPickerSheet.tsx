import { useEffect, useState } from "react";
import {
  X,
  User,
  Phone,
  Plus,
  Search,
  Camera,
  MapPin,
  FileText,
  Share2,
  ChevronDown,
  Check,
} from "lucide-react";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  type?: "retail" | "wholesale" | "reseller";
  gst?: string;
  address?: string;
  avatar?: string;
};

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Aarav Sharma",
    phone: "9810000001",
    type: "retail",
    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Aarav",
  },
  {
    id: "c2",
    name: "Riya Kapoor",
    phone: "9810000002",
    type: "wholesale",
    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Riya",
  },
  {
    id: "c3",
    name: "Mohan Verma",
    phone: "9810000003",
    type: "reseller",
    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Mohan",
  },
  {
    id: "c4",
    name: "Sneha Iyer",
    phone: "9810000004",
    type: "retail",
    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Sneha",
  },
  {
    id: "c5",
    name: "Karan Mehta",
    phone: "9810000005",
    type: "retail",
    avatar: "https://api.dicebear.com/7.x/personas/svg?seed=Karan",
  },
];

type Props = {
  current?: Customer | null;
  onPick: (c: Customer) => void;
  onClose: () => void;
};

export function CustomerPickerSheet({ current, onPick, onClose }: Props) {
  const [tab, setTab] = useState<"retail" | "wholesale" | "reseller">("retail");
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [draft, setDraft] = useState<Customer>({
    id: "",
    name: "",
    phone: "",
    type: "retail",
    gst: "",
    address: "",
    avatar: "",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const filtered = SEED_CUSTOMERS.filter(
    (c) =>
      c.type === tab &&
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)),
  );

  const canSave = draft.name.trim().length > 0 && draft.phone.trim().length >= 6;

  const save = () => {
    if (!canSave) return;
    onPick({ ...draft, id: `new-${Date.now()}`, type: draft.type ?? "retail" });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[92vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        {/* Header */}
        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Customer ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">Add to Invoice</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {(["retail", "wholesale", "reseller"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border transition ${
                  tab === t
                    ? "bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-[#d4af37] text-[color:oklch(0.25_0.05_85)] shadow-sm"
                    : "bg-white border-[color:oklch(0.78_0.14_82/0.4)] text-[color:oklch(0.55_0.10_82)]"
                }`}
              >
                {t} | customer
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mt-2">
          <div className="flex items-center gap-2 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[color:oklch(0.55_0.10_82)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or number"
              className="flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        {/* Existing customers list */}
        <div className="flex-1 overflow-y-auto px-5 mt-2 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-[11px] text-center py-3 text-[color:oklch(0.55_0.10_82)] italic">
              No saved customers · add a new one below
            </p>
          ) : (
            filtered.map((c) => {
              const active = current?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onPick(c)}
                  className={`w-full flex items-center gap-3 rounded-2xl bg-white border px-3 py-2 text-left active:scale-[0.99] transition ${
                    active
                      ? "border-[#d4af37] shadow-gold-glow"
                      : "border-[color:oklch(0.78_0.14_82/0.4)]"
                  }`}
                >
                  <span className="h-10 w-10 rounded-full overflow-hidden bg-[#fff8dc] grid place-items-center flex-shrink-0">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-[#d4af37]" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-display font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] truncate">
                      {c.phone} · More Details..
                    </p>
                  </div>
                  <span
                    className={`h-8 px-3 rounded-full grid place-items-center text-[10px] font-bold ${
                      active
                        ? "bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] text-[color:oklch(0.25_0.05_85)] border border-[#d4af37]"
                        : "bg-[#22c55e] text-white"
                    }`}
                  >
                    {active ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Added
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> ADD
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Add new customer card */}
        <div className="mx-5 my-3 rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.5)] p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border-2 border-[color:oklch(0.45_0.15_320/0.5)] px-3 py-2">
              <User className="h-3.5 w-3.5 text-[color:oklch(0.45_0.15_320)]" />
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Customer | Name"
                className="flex-1 bg-transparent text-xs outline-none"
              />
              <span className="text-[10px] text-[color:oklch(0.55_0.10_82)]">|</span>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Customer["type"] })}
                className="text-[10px] bg-transparent outline-none font-bold uppercase"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-[color:oklch(0.45_0.15_320/0.5)] px-3 py-2 mb-2">
            <Phone className="h-3.5 w-3.5 text-[color:oklch(0.45_0.15_320)]" />
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="Customer | number"
              type="tel"
              className="flex-1 bg-transparent text-xs outline-none"
            />
          </div>

          <button
            onClick={() => setShowMore((v) => !v)}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-[color:oklch(0.45_0.15_320)] underline"
          >
            More details | ADD
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </button>

          {showMore && (
            <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 rounded-xl border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2">
                <FileText className="h-3.5 w-3.5 text-[color:oklch(0.55_0.10_82)]" />
                <input
                  value={draft.gst ?? ""}
                  onChange={(e) => setDraft({ ...draft, gst: e.target.value })}
                  placeholder="GST Number (optional)"
                  className="flex-1 bg-transparent text-xs outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2">
                <MapPin className="h-3.5 w-3.5 text-[color:oklch(0.55_0.10_82)]" />
                <input
                  value={draft.address ?? ""}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="Address (optional)"
                  className="flex-1 bg-transparent text-xs outline-none"
                />
              </div>
              <button className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[color:oklch(0.78_0.14_82/0.6)] py-2 text-[11px] font-bold text-[color:oklch(0.42_0.10_82)]">
                <Camera className="h-3.5 w-3.5" /> Add Photo
              </button>
            </div>
          )}

          <button
            onClick={save}
            disabled={!canSave}
            className="mt-3 w-full py-2.5 rounded-xl font-display font-bold text-sm text-white disabled:opacity-40 active:scale-95 flex items-center justify-center gap-1.5"
            style={{
              background: canSave
                ? "linear-gradient(180deg, oklch(0.45 0.18 320) 0%, oklch(0.30 0.15 320) 100%)"
                : "oklch(0.55 0.05 320)",
            }}
          >
            <Plus className="h-4 w-4" /> Customer | ADD
          </button>
        </div>
      </div>
    </div>
  );
}
