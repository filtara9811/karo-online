import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * Staff Panel server functions
 * ============================================================ */

// ---------- Types ----------
export type StaffProfile = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  employee_code: string | null;
  staff_status: "pending" | "active" | "suspended" | "soon";
  payout_model: "per_task" | "monthly" | "hybrid";
  monthly_salary_inr: number;
  upi_id: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type StaffTask = {
  id: string;
  staff_id: string;
  title: string;
  description: string | null;
  task_type: "vendor_onboarding" | "verification" | "follow_up" | "custom";
  vendor_id: string | null;
  amount_inr: number;
  status: "assigned" | "in_progress" | "submitted" | "approved" | "rejected" | "paid";
  assigned_at: string;
  due_at: string | null;
  submitted_at: string | null;
  proof_urls: string[];
  admin_note: string | null;
};

// ---------- Get my staff row ----------
export const getMyStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any | null> => {
    const { data } = await context.supabase
      .from("staff_profiles" as never)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

// ---------- Signup request (self) ----------
const SignupInput = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(6).max(20).optional(),
  note: z.string().max(500).optional(),
});
export const submitStaffSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SignupInput.parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("staff_signup_requests" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ ...data, user_id: context.userId, status: "pending" } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: list staff ----------
export const listAllStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data } = await context.supabase
      .from("staff_profiles" as never)
      .select("*")
      .order("created_at", { ascending: false });
    return (data as unknown as unknown[]) ?? [];
  });

// ---------- Admin: list signup requests ----------
export const listSignupRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data } = await context.supabase
      .from("staff_signup_requests" as never)
      .select("*")
      .order("created_at", { ascending: false });
    return (data as unknown as unknown[]) ?? [];
  });

// ---------- Admin: approve signup ----------
const ApproveInput = z.object({
  request_id: z.string().uuid(),
  employee_code: z.string().min(2).max(20).optional(),
  payout_model: z.enum(["per_task", "monthly", "hybrid"]).default("per_task"),
  monthly_salary_inr: z.number().min(0).default(0),
});
export const approveSignupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ApproveInput.parse(v))
  .handler(async ({ data, context }) => {
    // check admin
    const { data: roleRow } = await context.supabase
      .rpc("is_admin_user" as never, { _user_id: context.userId } as never);
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("staff_signup_requests" as never)
      .select("*")
      .eq("id", data.request_id)
      .maybeSingle();
    if (reqErr || !req) throw new Error("Request not found");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = req as any;

    // Insert user_role
    await supabaseAdmin.from("user_roles" as never).insert({
      user_id: r.user_id,
      role: "staff",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Insert staff_profiles
    await supabaseAdmin.from("staff_profiles" as never).insert({
      user_id: r.user_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      employee_code: data.employee_code ?? null,
      staff_status: "active",
      payout_model: data.payout_model,
      monthly_salary_inr: data.monthly_salary_inr,
      joined_at: new Date().toISOString(),
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await supabaseAdmin
      .from("staff_signup_requests" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "approved", reviewed_by: context.userId, reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.request_id);

    return { ok: true };
  });

// ---------- Admin: reject signup ----------
export const rejectSignupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ request_id: z.string().uuid(), note: z.string().optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("staff_signup_requests" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "rejected", decision_note: data.note ?? null, reviewed_by: context.userId, reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.request_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: create staff (with credentials) ----------
const CreateStaffInput = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(72),
  employee_code: z.string().max(20).optional(),
  payout_model: z.enum(["per_task", "monthly", "hybrid"]).default("per_task"),
  monthly_salary_inr: z.number().min(0).default(0),
});
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CreateStaffInput.parse(v))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_admin_user" as never, { _user_id: context.userId } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, role: "staff" },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Failed to create user");

    const uid = created.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from("user_roles" as never).insert({ user_id: uid, role: "staff" } as any);
    await supabaseAdmin.from("staff_profiles" as never).insert({
      user_id: uid,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      employee_code: data.employee_code ?? null,
      staff_status: "active",
      payout_model: data.payout_model,
      monthly_salary_inr: data.monthly_salary_inr,
      joined_at: new Date().toISOString(),
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return { ok: true, user_id: uid };
  });

// ---------- Tasks ----------
export const listMyTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    // resolve my staff_id
    const { data: sp } = await context.supabase
      .from("staff_profiles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (sp as any)?.id;
    if (!sid) return [];
    const { data } = await context.supabase
      .from("staff_tasks" as never)
      .select("*")
      .eq("staff_id", sid)
      .order("assigned_at", { ascending: false });
    return (data as unknown as unknown[]) ?? [];
  });

export const listAllTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data } = await context.supabase
      .from("staff_tasks" as never)
      .select("*, staff:staff_profiles(name, employee_code)")
      .order("assigned_at", { ascending: false })
      .limit(200);
    return (data as unknown as unknown[]) ?? [];
  });

const CreateTaskInput = z.object({
  staff_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  task_type: z.enum(["vendor_onboarding", "verification", "follow_up", "custom"]).default("vendor_onboarding"),
  vendor_id: z.string().uuid().optional(),
  amount_inr: z.number().min(0).default(0),
  due_at: z.string().optional(),
});
export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CreateTaskInput.parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("staff_tasks" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ ...data, assigned_by: context.userId } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    task_id: z.string().uuid(),
    status: z.enum(["in_progress", "submitted"]),
    proof_urls: z.array(z.string()).optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { status: data.status };
    if (data.status === "submitted") patch.submitted_at = new Date().toISOString();
    if (data.proof_urls) patch.proof_urls = data.proof_urls;
    const { error } = await context.supabase.from("staff_tasks" as never).update(patch as never).eq("id", data.task_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    task_id: z.string().uuid(),
    approved: z.boolean(),
    admin_note: z.string().optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_admin_user" as never, { _user_id: context.userId } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {
      status: data.approved ? "approved" : "rejected",
      admin_note: data.admin_note ?? null,
      completed_at: new Date().toISOString(),
    };
    const { data: updated, error } = await supabaseAdmin
      .from("staff_tasks" as never)
      .update(patch as never)
      .eq("id", data.task_id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = updated as any;
    if (data.approved && t && Number(t.amount_inr) > 0) {
      await supabaseAdmin.from("staff_wallet_ledger" as never).insert({
        staff_id: t.staff_id,
        kind: "task_earned",
        amount_inr: t.amount_inr,
        ref_id: t.id,
        note: `Task: ${t.title}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      await supabaseAdmin.from("staff_tasks" as never).update({ status: "paid" } as never).eq("id", t.id);
    }
    return { ok: true };
  });

// ---------- Wallet ----------
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<{ wallet: any; ledger: any[] }> => {
    const { data: sp } = await context.supabase
      .from("staff_profiles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (sp as any)?.id;
    if (!sid) return { wallet: null, ledger: [] };
    const [{ data: wallet }, { data: ledger }] = await Promise.all([
      context.supabase.from("staff_wallets" as never).select("*").eq("staff_id", sid).maybeSingle(),
      context.supabase.from("staff_wallet_ledger" as never).select("*").eq("staff_id", sid).order("created_at", { ascending: false }).limit(50),
    ]);
    return { wallet: wallet ?? null, ledger: (ledger as unknown as unknown[]) ?? [] };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    amount_inr: z.number().min(1),
    upi_id: z.string().min(4).max(80),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: sp } = await context.supabase
      .from("staff_profiles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (sp as any)?.id;
    if (!sid) throw new Error("Staff profile not found");
    const { data: w } = await context.supabase
      .from("staff_wallets" as never)
      .select("balance_inr")
      .eq("staff_id", sid)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!w || Number((w as any).balance_inr) < data.amount_inr) throw new Error("Insufficient balance");
    const { error } = await context.supabase.from("staff_withdrawal_requests" as never).insert({
      staff_id: sid,
      amount_inr: data.amount_inr,
      upi_id: data.upi_id,
      status: "pending",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data } = await context.supabase
      .from("staff_withdrawal_requests" as never)
      .select("*, staff:staff_profiles(name, employee_code)")
      .order("created_at", { ascending: false });
    return (data as unknown as unknown[]) ?? [];
  });

export const processWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "reject", "paid"]),
    utr: z.string().optional(),
    note: z.string().optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_admin_user" as never, { _user_id: context.userId } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { admin_note: data.note ?? null, reviewed_by: context.userId, reviewed_at: new Date().toISOString() };
    if (data.action === "approve") patch.status = "approved";
    if (data.action === "reject") patch.status = "rejected";
    if (data.action === "paid") { patch.status = "paid"; patch.utr = data.utr ?? null; patch.paid_at = new Date().toISOString(); }

    const { data: updated, error } = await supabaseAdmin
      .from("staff_withdrawal_requests" as never)
      .update(patch as never).eq("id", data.id).select("*").maybeSingle();
    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wr = updated as any;
    if (data.action === "paid" && wr) {
      await supabaseAdmin.from("staff_wallet_ledger" as never).insert({
        staff_id: wr.staff_id,
        kind: "withdrawal",
        amount_inr: wr.amount_inr,
        ref_id: wr.id,
        note: `Withdrawal UTR ${wr.utr ?? ""}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
    return { ok: true };
  });

// ---------- Chat ----------
export const listMyChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data: members } = await context.supabase
      .from("staff_chat_members" as never)
      .select("chat_id, last_read_at")
      .eq("user_id", context.userId);
    const ids = ((members as unknown as { chat_id: string }[]) ?? []).map(m => m.chat_id);
    if (!ids.length) return [];
    const { data: chats } = await context.supabase
      .from("staff_chats" as never)
      .select("*")
      .in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    return (chats as unknown as unknown[]) ?? [];
  });

export const listChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ chat_id: z.string().uuid() }).parse(v))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data, context }): Promise<any[]> => {
    const { data: msgs } = await context.supabase
      .from("staff_chat_messages" as never)
      .select("*")
      .eq("chat_id", data.chat_id)
      .order("sent_at", { ascending: true })
      .limit(200);
    return (msgs as unknown as unknown[]) ?? [];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    chat_id: z.string().uuid(),
    body: z.string().min(1).max(4000),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff_chat_messages" as never).insert({
      chat_id: data.chat_id,
      sender_id: context.userId,
      body: data.body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createDirectChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ other_user_id: z.string().uuid(), title: z.string().optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: chat, error } = await context.supabase
      .from("staff_chats" as never)
      .insert({ chat_type: "direct", created_by: context.userId, title: data.title ?? null } as never)
      .select("id")
      .maybeSingle();
    if (error || !chat) throw new Error(error?.message ?? "Failed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatId = (chat as any).id;
    await context.supabase.from("staff_chat_members" as never).insert([
      { chat_id: chatId, user_id: context.userId, member_role: "admin" },
      { chat_id: chatId, user_id: data.other_user_id, member_role: "member" },
    ] as never);
    return { chat_id: chatId };
  });

// ---------- Categories (admin decides per staff) ----------
export const listMyCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ context }): Promise<any[]> => {
    const { data: sp } = await context.supabase
      .from("staff_profiles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (sp as any)?.id;
    if (!sid) return [];
    const { data } = await context.supabase
      .from("staff_category_assignments" as never)
      .select("*, category:categories(id, name, slug)")
      .eq("staff_id", sid);
    return (data as unknown as unknown[]) ?? [];
  });

export const assignCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    staff_id: z.string().uuid(),
    category_ids: z.array(z.string().uuid()),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_admin_user" as never, { _user_id: context.userId } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("staff_category_assignments" as never).delete().eq("staff_id", data.staff_id);
    if (data.category_ids.length) {
      await supabaseAdmin.from("staff_category_assignments" as never).insert(
        data.category_ids.map(cid => ({ staff_id: data.staff_id, category_id: cid })) as never,
      );
    }
    return { ok: true };
  });
