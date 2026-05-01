import { useEffect, useState } from "react";
import {
  X,
  Ban,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  Send,
  UserCog,
  Tag as TagIcon,
  StickyNote,
  Loader2,
  Mail,
  Phone,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdminEntity = "customers" | "vendors" | "staff_profiles";

export type AdminRecord = {
  id: string;
  user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_blocked: boolean;
  status: string;
  verified?: boolean;
  admin_notes?: string | null;
  tags?: string[] | null;
  assigned_to?: string | null;
  created_at: string;
  // arbitrary extra fields for display
  [k: string]: unknown;
};

type StaffOption = { user_id: string; name: string | null; email: string | null };

interface Props {
  open: boolean;
  onClose: () => void;
  record: AdminRecord | null;
  entity: AdminEntity;
  entityLabel: string; // "Vendor" / "Customer" / "Staff"
  extraFields?: Array<{ label: string; value: string | null | undefined }>;
  onMutated: () => void;
}

export function AdminRecordDrawer({
  open,
  onClose,
  record,
  entity,
  entityLabel,
  extraFields = [],
  onMutated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");

  useEffect(() => {
    if (!record) return;
    setNotes(record.admin_notes ?? "");
    setTags(record.tags ?? []);
    setAssignedTo(record.assigned_to ?? "");
    setMsgTitle("");
    setMsgBody("");
  }, [record?.id]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("staff_profiles")
      .select("user_id, name, email")
      .order("name")
      .then(({ data }) => setStaff((data as StaffOption[]) ?? []));
  }, [open]);

  if (!open || !record) return null;

  const update = async (patch: Record<string, unknown>, msg = "Saved") => {
    setBusy(true);
    const { error } = await supabase.from(entity).update(patch).eq("id", record.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(msg);
    onMutated();
    return true;
  };

  const toggleBlock = () =>
    update(
      { is_blocked: !record.is_blocked, status: !record.is_blocked ? "blocked" : "active" },
      record.is_blocked ? "Unblocked" : "Blocked",
    );

  const toggleVerify = () => update({ verified: !record.verified }, "Verification updated");

  const saveNotes = () => update({ admin_notes: notes }, "Notes saved");

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    update({ tags: next }, "Tag added");
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    update({ tags: next }, "Tag removed");
  };

  const saveAssignment = () =>
    update({ assigned_to: assignedTo || null }, "Assignment updated");

  const sendMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast.error("Title aur message dono daaliye");
      return;
    }
    setBusy(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_notifications").insert({
      user_id: record.user_id,
      title: msgTitle.trim(),
      message: msgBody.trim(),
      created_by: sess.user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notification sent");
    setMsgTitle("");
    setMsgBody("");
  };

  const remove = async () => {
    if (!confirm(`${entityLabel} ko delete karna hai?`)) return;
    setBusy(true);
    const { error } = await supabase.from(entity).delete().eq("id", record.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onMutated();
    onClose();
  };

  const copy = (v: string | null | undefined) => {
    if (!v) return;
    navigator.clipboard.writeText(v);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.16 0.03 80) 0%, oklch(0.10 0.02 80) 100%)",
          borderColor: "rgba(212,175,55,0.4)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#d4af37]/20 backdrop-blur bg-black/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-[#d4af37]/40 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center flex-shrink-0">
              {record.avatar_url ? (
                <img src={record.avatar_url} className="h-full w-full object-cover" alt="" />
              ) : (
                <span className="font-bold text-[#1a1a1a]">
                  {(record.name || record.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-[#fff8dc] truncate">
                {record.name || "Unnamed"}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <Badge tone={record.is_blocked ? "red" : "green"}>
                  {record.is_blocked ? "BLOCKED" : record.status?.toUpperCase() || "ACTIVE"}
                </Badge>
                {record.verified && <Badge tone="blue">VERIFIED</Badge>}
              </div>
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <ActionTile
              onClick={toggleVerify}
              icon={ShieldCheck}
              label={record.verified ? "Unverify" : "Verify"}
              active={!!record.verified}
              tone="blue"
              disabled={busy}
            />
            <ActionTile
              onClick={toggleBlock}
              icon={record.is_blocked ? CheckCircle2 : Ban}
              label={record.is_blocked ? "Unblock" : "Block"}
              tone={record.is_blocked ? "green" : "orange"}
              disabled={busy}
            />
            <ActionTile
              onClick={remove}
              icon={Trash2}
              label="Delete"
              tone="red"
              disabled={busy}
            />
          </div>

          {/* Identity (read-only) */}
          <Section title="Identity" icon={UserCog}>
            <Row label="Name" value={record.name} onCopy={copy} />
            <Row label="Email" value={record.email} icon={Mail} onCopy={copy} />
            <Row label="Phone" value={record.phone} icon={Phone} onCopy={copy} />
            <Row label="User ID" value={record.user_id} mono onCopy={copy} />
            {extraFields.map((f) => (
              <Row key={f.label} label={f.label} value={f.value} onCopy={copy} />
            ))}
          </Section>

          {/* Tags */}
          <Section title="Tags" icon={TagIcon}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.length === 0 && (
                <span className="text-[11px] text-[#f5d97a]/50">No tags</span>
              )}
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#fff8dc]"
                >
                  {t}
                  <button onClick={() => removeTag(t)} disabled={busy}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37] text-xs"
              />
              <button
                onClick={addTag}
                disabled={busy || !tagInput.trim()}
                className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#1a1208] disabled:opacity-50"
                style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)" }}
              >
                Add
              </button>
            </div>
          </Section>

          {/* Assignment */}
          <Section title="Assigned Staff" icon={UserCog}>
            <div className="flex gap-2">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
              >
                <option value="">— Unassigned —</option>
                {staff.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.name || s.email || s.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <button
                onClick={saveAssignment}
                disabled={busy}
                className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#1a1208] disabled:opacity-50"
                style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)" }}
              >
                Save
              </button>
            </div>
            {staff.length === 0 && (
              <p className="text-[10px] text-[#f5d97a]/40 mt-1.5">
                Pehle Staff & Roles me staff add karein.
              </p>
            )}
          </Section>

          {/* Admin notes */}
          <Section title="Admin Notes (private)" icon={StickyNote}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes only admins see…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37] text-xs resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={busy}
              className="mt-2 w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#1a1208] disabled:opacity-50"
              style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)" }}
            >
              Save Notes
            </button>
          </Section>

          {/* Send notification */}
          <Section title="Send In-App Message" icon={Send}>
            <input
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 mb-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37] text-xs"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Message body…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/40 outline-none focus:border-[#d4af37] text-xs resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={busy || !msgTitle.trim() || !msgBody.trim()}
              className="mt-2 w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#1a1208] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(180deg, #fff8dc, #d4af37)" }}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send Notification
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserCog;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#d4af37]/20 bg-black/30 p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/80 font-bold mb-2">
        <Icon className="h-3 w-3" />
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  mono,
  onCopy,
}: {
  label: string;
  value?: string | null;
  icon?: typeof Mail;
  mono?: boolean;
  onCopy?: (v: string | null | undefined) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b border-[#d4af37]/10 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider text-[#d4af37]/60">{label}</p>
        <p
          className={`text-xs text-[#fff8dc] ${mono ? "font-mono" : ""} flex items-center gap-1 truncate`}
        >
          {Icon && <Icon className="h-3 w-3 flex-shrink-0 text-[#d4af37]/60" />}
          <span className="truncate">{value}</span>
        </p>
      </div>
      {onCopy && (
        <button
          onClick={() => onCopy(value)}
          className="p-1 rounded text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10 flex-shrink-0"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "red" | "green" | "blue" | "orange" }) {
  const map = {
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${map[tone]}`}>
      {children}
    </span>
  );
}

function ActionTile({
  onClick,
  icon: Icon,
  label,
  tone,
  active,
  disabled,
}: {
  onClick: () => void;
  icon: typeof Ban;
  label: string;
  tone: "red" | "green" | "blue" | "orange";
  active?: boolean;
  disabled?: boolean;
}) {
  const map = {
    red: "border-red-500/40 text-red-300 bg-red-500/10",
    green: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    blue: "border-sky-500/40 text-sky-300 bg-sky-500/10",
    orange: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border ${map[tone]} active:scale-95 disabled:opacity-50 ${active ? "ring-2 ring-current/40" : ""}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
