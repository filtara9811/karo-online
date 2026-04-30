import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Roles — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

type RoleRow = {
  id: string;
  user_id: string;
  role: "super_admin" | "admin" | "moderator" | "support";
  created_at: string;
};

const ROLES: RoleRow["role"][] = ["super_admin", "admin", "moderator", "support"];

function StaffPage() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<RoleRow["role"]>("support");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = rows.reduce<Record<string, RoleRow[]>>((acc, r) => {
    (acc[r.user_id] ||= []).push(r);
    return acc;
  }, {});

  const assign = async () => {
    setError(null);
    if (!newUserId.trim()) {
      setError("User ID daaliye");
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.from("user_roles").insert({
      user_id: newUserId.trim(),
      role: newRole,
    });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setAdding(false);
    setNewUserId("");
    setNewRole("support");
    load();
  };

  const removeRole = async (id: string) => {
    if (!confirm("Yeh role hata dein?")) return;
    await supabase.from("user_roles").delete().eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Staff & Roles"
        subtitle="Admin users ko role assign kariye"
        action={
          <GoldButton onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" /> Assign Role
          </GoldButton>
        }
      />

      <GoldCard className="p-3 sm:p-4">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <Shield className="h-10 w-10 text-[#d4af37]/40 mx-auto mb-3" />
            <p className="text-sm text-[#f5d97a]/60">
              Abhi koi staff member nahi hai.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#d4af37]/10">
            {Object.entries(grouped).map(([uid, userRoles]) => (
              <div key={uid} className="py-3 px-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60 mb-1">
                    User ID
                  </p>
                  <p className="text-xs text-[#fff8dc] font-mono truncate">
                    {uid}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#1a1208]"
                      style={{
                        background:
                          "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
                      }}
                    >
                      {r.role.replace("_", " ")}
                      <button
                        onClick={() => removeRole(r.id)}
                        className="ml-0.5 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GoldCard>

      <GoldCard className="mt-4 p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70 font-bold mb-2">
          💡 Tip
        </p>
        <p className="text-xs text-[#f5d97a]/70 leading-relaxed">
          Staff member pehle <code className="text-[#d4af37]">/admin/login</code> page
          se "Request Access" se signup karein. Phir unka User ID aapko email
          confirmation ya database se mil jayega — yahan paste karke role
          assign kar dijiye.
        </p>
      </GoldCard>

      {/* Modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !busy && setAdding(false)}
          />
          <div
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border p-6"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.16 0.03 80) 0%, oklch(0.10 0.02 80) 100%)",
              borderColor: "rgba(212,175,55,0.4)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-display text-lg font-bold"
                style={{
                  background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Assign Role
              </h3>
              <button
                onClick={() => !busy && setAdding(false)}
                className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                  User ID (UUID)
                </label>
                <input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleRow["role"])}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <GoldButton variant="outline" onClick={() => setAdding(false)} className="flex-1">
                Cancel
              </GoldButton>
              <GoldButton onClick={assign} disabled={busy} className="flex-1">
                {busy ? "Assigning..." : "Assign"}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
