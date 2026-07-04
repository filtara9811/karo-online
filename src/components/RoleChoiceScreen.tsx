import { Users, Store, ArrowRight, ShieldCheck, Headphones, Lock } from "lucide-react";

/**
 * Post-registration role chooser (Buyer vs Seller).
 * Shown right after the customer completes their basic details form,
 * before landing on the home screen. If the user picks "Become a Seller",
 * the parent routes to `/vendor/join`. If "Continue as Buyer", parent
 * routes to `/quick` (home).
 */
export function RoleChoiceScreen({
  onBuyer,
  onSeller,
}: {
  onBuyer: () => void;
  onSeller: () => void;
}) {
  return (
    <main
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{
        background:
          "linear-gradient(180deg, #f6f0dd 0%, #fbf5e4 40%, #ffffff 100%)",
      }}
    >
      {/* Hero */}
      <div className="pt-16 pb-6 px-6 text-center">
        <div className="inline-flex items-center gap-2 mb-1">
          <span className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm">
            <span className="text-[color:oklch(0.35_0.12_60)] font-bold text-lg">K</span>
          </span>
          <h1 className="text-3xl font-display font-bold text-[color:oklch(0.30_0.05_85)]">
            Karo Online
          </h1>
        </div>
      </div>

      {/* Prompt */}
      <div className="px-6 text-center mb-6">
        <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-[color:oklch(0.78_0.14_82)]/60" />
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] grid place-items-center">
            <span className="text-[color:oklch(0.35_0.12_60)] font-bold text-xs">K</span>
          </span>
          <span className="text-lg font-display font-bold text-[color:oklch(0.55_0.12_75)]">
            Karo Online
          </span>
        </div>
        <h2 className="text-[22px] leading-[1.25] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
          Aap yahan kis roop me<br />aage badhna chahte hain?
        </h2>
        <p className="mt-2 text-[15px] text-[color:oklch(0.45_0.03_85)] leading-snug">
          Apni jarurat ke hisaab se chune aur<br />apna safar shuru karein
        </p>
      </div>

      {/* Options */}
      <div className="px-5 flex flex-col gap-4">
        <button
          onClick={onBuyer}
          aria-label="Continue as Buyer"
          className="w-full text-left rounded-2xl bg-white border-2 border-[color:oklch(0.85_0.08_85)] p-4 flex items-center gap-3 shadow-[0_6px_18px_-8px_rgba(212,175,55,0.35)] active:scale-[0.99] transition"
        >
          <span className="h-14 w-14 rounded-full grid place-items-center bg-[color:oklch(0.94_0.05_85)] shrink-0">
            <Users className="h-6 w-6 text-[color:oklch(0.55_0.12_75)]" strokeWidth={2.2} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[17px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
              Continue as Buyer
            </span>
            <span className="block text-[13px] text-[color:oklch(0.45_0.03_85)] leading-snug mt-0.5">
              Services dhundein, experts se connect karein aur kaam pura karein.
            </span>
          </span>
          <span className="h-10 w-10 rounded-full grid place-items-center bg-[color:oklch(0.78_0.14_82)] text-white shrink-0">
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </span>
        </button>

        <button
          onClick={onSeller}
          aria-label="Become a Seller"
          className="w-full text-left rounded-2xl bg-white border-2 border-[color:oklch(0.90_0.04_20)] p-4 flex items-center gap-3 shadow-[0_6px_18px_-8px_rgba(194,65,12,0.35)] active:scale-[0.99] transition"
        >
          <span className="h-14 w-14 rounded-full grid place-items-center bg-[color:oklch(0.95_0.03_20)] shrink-0">
            <Store className="h-6 w-6 text-[color:oklch(0.55_0.15_25)]" strokeWidth={2.2} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[17px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
              Become a Seller
            </span>
            <span className="block text-[13px] text-[color:oklch(0.45_0.03_85)] leading-snug mt-0.5">
              Apna business badhayein, leads paayein aur naye customers tak pahunchein.
            </span>
          </span>
          <span className="h-10 w-10 rounded-full grid place-items-center bg-[color:oklch(0.55_0.15_25)] text-white shrink-0">
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </span>
        </button>
      </div>

      {/* Trust footer */}
      <div className="mt-8 mb-10 px-4 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: ShieldCheck, title: "Trusted Platform", sub: "100% Verified Professionals" },
          { icon: Headphones, title: "24x7 Support", sub: "Har waqt aapke saath" },
          { icon: Lock, title: "Safe & Secure", sub: "Aapki suraksha hamari zimmedari" },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex flex-col items-center gap-1">
            <Icon className="h-6 w-6 text-[color:oklch(0.55_0.12_75)]" strokeWidth={2} />
            <span className="text-[12px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
              {title}
            </span>
            <span className="text-[11px] text-[color:oklch(0.50_0.03_85)] leading-tight">
              {sub}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
