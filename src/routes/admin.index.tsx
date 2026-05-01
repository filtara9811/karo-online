import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Store,
  FolderTree,
  Shield,
  CreditCard,
  TrendingUp,
  Ban,
  Calendar,
  Sparkles,
} from "lucide-react";
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

type Bucket = { total: number; week: number; month: number; blocked: number };
type Stats = {
  customers: Bucket;
  vendors: Bucket;
  staff: Bucket;
  categories: number;
  activeGateways: number;
};

const ZERO: Bucket = { total: 0, week: 0, month: 0, blocked: 0 };

function AdminHome() {
  const [stats, setStats] = useState<Stats>({
    customers: ZERO,
    vendors: ZERO,
    staff: ZERO,
    categories: 0,
    activeGateways: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [statsRes, catRes, gwRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase
          .from("payment_gateways")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      const s = statsRes.data as
        | { customers: Bucket; vendors: Bucket; staff: Bucket }
        | null;
      setStats({
        customers: s?.customers ?? ZERO,
        vendors: s?.vendors ?? ZERO,
        staff: s?.staff ?? ZERO,
        categories: catRes.count ?? 0,
        activeGateways: gwRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle={loading ? "Loading live counts…" : "Live overview of your platform"}
      />

      {/* Live people counts — Customers / Vendors / Staff */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <PeopleCard
          label="Customers"
          icon={Users}
          to="/admin/customers"
          bucket={stats.customers}
        />
        <PeopleCard
          label="Vendors"
          icon={Store}
          to="/admin/vendors"
          bucket={stats.vendors}
        />
        <PeopleCard
          label="Staff"
          icon={Shield}
          to="/admin/staff"
          bucket={stats.staff}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
        <SmallCard label="Catalog Items" value={stats.categories} icon={FolderTree} to="/admin/catalog" />
        <SmallCard
          label="Active Gateways"
          value={stats.activeGateways}
          icon={CreditCard}
          to="/admin/payments"
        />
      </div>

      <GoldCard className="mt-6 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[#d4af37]" />
          <h3
            className="font-display text-xl font-bold"
            style={{
              background: "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome to your Super Admin Panel
          </h3>
        </div>
        <p className="text-sm text-[#f5d97a]/70 leading-relaxed">
          Yahan se aap har user ko manage kar sakte hain — customers, vendors,
          staff. Kisi ko block/unblock kar sakte hain, profile edit kar sakte
          hain, aur weekly/monthly growth track kar sakte hain.
        </p>
      </GoldCard>
    </AdminLayout>
  );
}

function PeopleCard({
  label,
  icon: Icon,
  to,
  bucket,
}: {
  label: string;
  icon: typeof Users;
  to: string;
  bucket: Bucket;
}) {
  return (
    <Link to={to}>
      <GoldCard className="p-5 h-full hover:scale-[1.01] transition cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-11 w-11 rounded-xl grid place-items-center"
            style={{
              background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
            }}
          >
            <Icon className="h-5 w-5 text-[#1a1208]" />
          </div>
          <TrendingUp className="h-4 w-4 text-[#d4af37]/60" />
        </div>
        <p
          className="font-display text-4xl font-bold leading-none"
          style={{
            background: "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {bucket.total}
        </p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/85 font-bold mt-2">
          Total {label}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <Pill icon={Calendar} label="7d" value={bucket.week} />
          <Pill icon={Calendar} label="30d" value={bucket.month} />
          <Pill icon={Ban} label="Blocked" value={bucket.blocked} danger />
        </div>
      </GoldCard>
    </Link>
  );
}

function Pill({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-2 py-1.5 text-center"
      style={{
        background: danger ? "rgba(239,68,68,0.08)" : "rgba(212,175,55,0.08)",
        borderColor: danger ? "rgba(239,68,68,0.3)" : "rgba(212,175,55,0.25)",
      }}
    >
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider"
        style={{ color: danger ? "rgb(252,165,165)" : "rgba(245,217,122,0.7)" }}
      >
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <p
        className="font-display text-base font-bold mt-0.5"
        style={{ color: danger ? "rgb(252,165,165)" : "#fff8dc" }}
      >
        {value}
      </p>
    </div>
  );
}

function SmallCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string;
  value: number;
  icon: typeof FolderTree;
  to: string;
}) {
  return (
    <Link to={to}>
      <GoldCard className="p-4 h-full hover:scale-[1.02] transition cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg grid place-items-center"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
          >
            <Icon className="h-4 w-4 text-[#1a1208]" />
          </div>
          <div>
            <p
              className="font-display text-2xl font-bold leading-none"
              style={{
                background: "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {value}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/70 font-bold mt-1">
              {label}
            </p>
          </div>
        </div>
      </GoldCard>
    </Link>
  );
}
