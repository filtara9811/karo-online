import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Store, FolderTree, Shield, CreditCard, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminHome,
});

type Stats = {
  customers: number;
  vendors: number;
  staff: number;
  categories: number;
  activeGateways: number;
};

function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [staffRes, catRes, gwRes] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase
          .from("payment_gateways")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      setStats({
        customers: 0, // wired when customer table exists
        vendors: 0, // wired when vendors table exists
        staff: staffRes.count ?? 0,
        categories: catRes.count ?? 0,
        activeGateways: gwRes.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Customers", value: stats?.customers ?? 0, icon: Users, to: "/admin/customers", hint: "Registered users" },
    { label: "Vendors", value: stats?.vendors ?? 0, icon: Store, to: "/admin/vendors", hint: "Active sellers" },
    { label: "Staff", value: stats?.staff ?? 0, icon: Shield, to: "/admin/staff", hint: "Admin accounts" },
    { label: "Catalog", value: stats?.categories ?? 0, icon: FolderTree, to: "/admin/catalog", hint: "Types, categories, items" },
    { label: "Payment Gateways", value: stats?.activeGateways ?? 0, icon: CreditCard, to: "/admin/payments", hint: "Active providers" },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your platform"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to}>
              <GoldCard className="p-4 sm:p-5 h-full hover:scale-[1.02] transition cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center"
                    style={{
                      background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                    }}
                  >
                    <Icon className="h-5 w-5 text-[#1a1208]" />
                  </div>
                  <TrendingUp className="h-3.5 w-3.5 text-[#d4af37]/50" />
                </div>
                <p
                  className="font-display text-3xl font-bold leading-none"
                  style={{
                    background: "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {c.value}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold mt-2">
                  {c.label}
                </p>
                <p className="text-[10px] text-[#d4af37]/50 mt-0.5">{c.hint}</p>
              </GoldCard>
            </Link>
          );
        })}
      </div>

      {/* Welcome panel */}
      <GoldCard className="mt-6 p-6">
        <h3
          className="font-display text-xl font-bold mb-2"
          style={{
            background: "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ✨ Welcome to your Super Admin Panel
        </h3>
        <p className="text-sm text-[#f5d97a]/70 leading-relaxed">
          Sidebar se kisi bhi module mein jaaiye — Categories add kariye, Staff
          ko roles assign kariye, Payment Gateways configure kariye. Sab kuch
          mobile aur laptop dono par smoothly chalega.
        </p>
      </GoldCard>
    </AdminLayout>
  );
}
