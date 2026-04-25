import { useEffect, useState } from "react";
import { X, Check, UserPlus, Users, Phone } from "lucide-react";

export type Staff = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  avatar?: string;
  color?: string;
};

const DEFAULT_STAFF: Staff[] = [
  { id: "owner", name: "Ashhu (Owner)", role: "Owner", phone: "+91 98xxxx0001", color: "#d4af37" },
  { id: "s1", name: "Rahul Kumar", role: "Cashier", phone: "+91 98xxxx0002", color: "#10b981" },
  { id: "s2", name: "Priya Sharma", role: "Sales", phone: "+91 98xxxx0003", color: "#3b82f6" },
  { id: "s3", name: "Aman Singh", role: "Helper", phone: "+91 98xxxx0004", color: "#f97316" },
];

type Props = {
  current: Staff | null;
  onPick: (s: Staff) => void;
  onClose: () => void;
};

export function StaffPickerSheet({ current, onPick, onClose }: Props) {
  const [staff, setStaff] = useState<Staff[]>(DEFAULT_STAFF);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const addStaff = () => {
    if (!newName.trim()) return;
    const s: Staff = {
      id: `s-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || "Staff",
      phone: newPhone.trim() || undefined,
      color: "#8b5cf6",
    };
    setStaff((prev) => [...prev, s]);
    onPick(s);
    setAdding(false);
    setNewName("");
    setNewRole("");
    setNewPhone("");
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
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 50%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-9 w-9 rounded-full grid place-items-center text-white shadow-gold-glow"
              style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
            >
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
                ✦ Bill By ✦
              </p>
              <h3 className="font-display text-base text-gold-gradient font-bold leading-tight">
                Choose Staff
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4 flex-1 overflow-y-auto space-y-2">
          {staff.map((s) => {
            const isActive = current?.id === s.id;
            const initial = s.name.trim().charAt(0).toUpperCase();
            return (
              <button
                key={s.id}
                onClick={() => {
                  onPick(s);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 rounded-2xl p-3 border-2 active:scale-[0.99] transition ${
                  isActive
                    ? "border-[#d4af37] bg-gradient-to-br from-[#fffaeb] to-white shadow-gold-glow"
                    : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white"
                }`}
              >
                <span
                  className="h-11 w-11 rounded-full grid place-items-center text-white font-display font-bold text-base flex-shrink-0 border-2 border-white shadow-md overflow-hidden"
                  style={{ background: s.color ?? "#d4af37" }}
                >
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                    {s.name}
                  </p>
                  <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="font-bold">{s.role}</span>
                    {s.phone && (
                      <>
                        <span>·</span>
                        <Phone className="h-2.5 w-2.5" />
                        <span>{s.phone}</span>
                      </>
                    )}
                  </p>
                </div>
                {isActive && (
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center border-2 border-white">
                    <Check className="h-3.5 w-3.5 text-[color:oklch(0.18_0.06_18)]" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}

          {adding ? (
            <div className="rounded-2xl p-3 border-2 border-dashed border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-white space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Staff name"
                className="w-full px-3 py-2 rounded-lg border border-[color:oklch(0.78_0.14_82/0.5)] outline-none text-sm bg-white"
              />
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role (Cashier, Sales...)"
                className="w-full px-3 py-2 rounded-lg border border-[color:oklch(0.78_0.14_82/0.5)] outline-none text-sm bg-white"
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                inputMode="tel"
                className="w-full px-3 py-2 rounded-lg border border-[color:oklch(0.78_0.14_82/0.5)] outline-none text-sm bg-white"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAdding(false)}
                  className="flex-1 py-2 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] text-xs font-bold text-[color:oklch(0.45_0.08_85)]"
                >
                  Cancel
                </button>
                <button
                  onClick={addStaff}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 rounded-lg font-display font-bold text-xs text-[color:oklch(0.18_0.06_18)] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
                  }}
                >
                  Add & Select
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-3 rounded-2xl p-3 border-2 border-dashed border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-white active:scale-[0.99]"
            >
              <span
                className="h-11 w-11 rounded-full grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
                style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)" }}
              >
                <UserPlus className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="text-left flex-1">
                <span className="block font-display text-sm font-bold text-gold-gradient">
                  + Add New Staff
                </span>
                <span className="block text-[10px] text-[color:oklch(0.45_0.08_85)]">
                  Add a teammate (like adding Gmail account)
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
