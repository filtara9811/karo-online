import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "support"]);

export const requireAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      return { ok: false as const, reason: "lookup_failed" };
    }
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roles.some((r: string) => ADMIN_ROLES.has(r));
    if (!isAdmin) {
      return { ok: false as const, reason: "not_admin" };
    }
    return { ok: true as const, roles };
  });
