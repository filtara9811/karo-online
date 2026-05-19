import { supabase } from "@/integrations/supabase/client";

type FieldMap = Record<string, string | null | undefined>;

/**
 * Diff old vs new field values and write one audit row per changed field.
 * Silent on error (audit must not block the user save).
 */
export async function logProfileChanges(
  userId: string,
  before: FieldMap,
  after: FieldMap,
  opts: { verifiedViaOtp?: boolean } = {},
) {
  if (!userId) return;
  const rows: Array<{
    customer_user_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string;
    verified_via_otp: boolean;
  }> = [];
  for (const key of Object.keys(after)) {
    const oldV = (before[key] ?? "") + "";
    const newV = (after[key] ?? "") + "";
    if (oldV.trim() === newV.trim()) continue;
    rows.push({
      customer_user_id: userId,
      field_name: key,
      old_value: oldV || null,
      new_value: newV || null,
      changed_by: userId,
      verified_via_otp: !!opts.verifiedViaOtp,
    });
  }
  if (rows.length === 0) return;
  try {
    await supabase.from("customer_profile_audit" as never).insert(rows as never);
  } catch (e) {
    console.warn("[profile-audit] insert failed", e);
  }
}

export type ProfileAuditRow = {
  id: string;
  customer_user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  verified_via_otp: boolean;
  created_at: string;
};

export async function fetchProfileHistory(userId: string): Promise<ProfileAuditRow[]> {
  const { data } = await supabase
    .from("customer_profile_audit" as never)
    .select("*")
    .eq("customer_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data as unknown) as ProfileAuditRow[]) ?? [];
}
