import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Search, Trash2, Mail, Phone, MapPin, RefreshCw } from "lucide-react";
import {
  AdminLayout,
  GoldCard,
  PageHeader,
} from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomersPage,
});

type Customer = {
  id: string;
  user_id: string;
  name: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatar_url: string | null;
  signup_method: string | null;
  created_at: string;
};

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Customers load fail");
      console.error(error);
    } else {
      setCustomers((data as Customer[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Customer ko delete karna hai?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast.error("Delete fail");
    } else {
      toast.success("Deleted");
      setCustomers((c) => c.filter((x) => x.id !== id));
    }
  };

  const filtered = customers.filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      c.name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered users`}
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4af37]/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full bg-black/40 border border-[#d4af37]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f5d97a] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37]/60"
          />
        </div>
        <button
          onClick={load}
          className="h-10 w-10 grid place-items-center rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#d4af37] active:scale-95"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <GoldCard className="p-12 text-center">
          <p className="text-[#f5d97a]/60">Loading customers…</p>
        </GoldCard>
      ) : filtered.length === 0 ? (
        <GoldCard className="p-12 text-center">
          <Users className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
          <h3
            className="font-display text-xl font-bold mb-2"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {customers.length === 0 ? "No customers yet" : "No matches"}
          </h3>
          <p className="text-sm text-[#f5d97a]/60 max-w-md mx-auto leading-relaxed">
            {customers.length === 0
              ? "Jab koi customer signup karega, uska entry yahan dikh jayegi."
              : "Try different search terms."}
          </p>
        </GoldCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <GoldCard key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-[#d4af37]/40 flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-lg font-bold text-[#1a1a1a]">
                      {(c.name || c.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display text-base font-bold text-[#f5d97a] truncate">
                      {c.name || "Unnamed customer"}
                    </h3>
                    {c.gender && (
                      <span className="text-[10px] uppercase tracking-wider text-[#d4af37]/70">
                        {c.gender}
                      </span>
                    )}
                    {c.signup_method && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                        {c.signup_method}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-[#f5d97a]/75">
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#f5d97a]/40 mt-1.5">
                    Joined {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  className="h-9 w-9 grid place-items-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 flex-shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </GoldCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
