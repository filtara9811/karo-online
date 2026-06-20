import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check } from "lucide-react";

export type ReferralStatusFilter = "all" | "pending" | "successful";

export function ReferralFilterSheet({
  open, onOpenChange, value, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: ReferralStatusFilter;
  onChange: (v: ReferralStatusFilter) => void;
}) {
  const options: { key: ReferralStatusFilter; label: string; desc: string }[] = [
    { key: "all", label: "All", desc: "Sabhi referrals dikhao" },
    { key: "pending", label: "Pending", desc: "Abhi tak unlock nahi hue" },
    { key: "successful", label: "Successful", desc: "Reward release ho chuka" },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[60vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-7">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
          <SheetHeader>
            <SheetTitle className="font-display text-lg text-slate-800">Filter referrals</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {options.map((o) => {
              const active = value === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => { onChange(o.key); onOpenChange(false); }}
                  className={`w-full rounded-xl border-2 p-3 text-left flex items-center gap-3 active:scale-[0.99] transition ${
                    active ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{o.label}</p>
                    <p className="text-[11px] text-slate-500">{o.desc}</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-amber-700" />}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
