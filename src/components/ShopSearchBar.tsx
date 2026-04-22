import { Search, X } from "lucide-react";

/**
 * Rounded gold-bordered search pill that filters the vendor product feed.
 */
export function ShopSearchBar({
  value,
  onChange,
  placeholder = "Search products, categories…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 grid place-items-center pointer-events-none">
        <Search className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" strokeWidth={2.4} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-9 pr-9 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] text-sm text-[color:oklch(0.22_0.05_85)] placeholder:text-[color:oklch(0.55_0.10_82)] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 transition"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute inset-y-0 right-2 my-auto h-7 w-7 grid place-items-center rounded-full bg-[color:oklch(0.96_0.02_85)] active:scale-90"
        >
          <X className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" />
        </button>
      )}
    </div>
  );
}
