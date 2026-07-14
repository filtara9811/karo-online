import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListChecks, Loader2, CheckCircle2, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyTasks, updateMyTaskStatus, type StaffTask } from "@/lib/staff.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/tasks")({
  component: StaffTasksPage,
});

const STATUS_COLOR: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-emerald-600 text-white",
};

function StaffTasksPage() {
  const fetchTasks = useServerFn(listMyTasks);
  const updateStatus = useServerFn(updateMyTaskStatus);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchTasks().then((r) => setTasks(r as StaffTask[])).catch(() => {});
  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, status: "in_progress" | "submitted") => {
    setBusy(id);
    try {
      await updateStatus({ data: { task_id: id, status } });
      toast.success(status === "submitted" ? "Submitted for review" : "Started");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[color:oklch(0.9_0.03_85)] px-4 py-3">
        <h1 className="text-lg font-bold">Tasks</h1>
        <p className="text-xs text-muted-foreground">{tasks.length} total</p>
      </header>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <div className="p-10 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Koi task assign nahi hua abhi.</p>
        </div>
      ) : (
        <ul className="p-3 space-y-3">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-2xl bg-white border border-[color:oklch(0.9_0.03_85)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.task_type.replace("_", " ")}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
              {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[color:oklch(0.55_0.16_82)]">₹{Number(t.amount_inr).toFixed(0)}</div>
                {t.due_at && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(t.due_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              {(t.status === "assigned" || t.status === "in_progress") && (
                <div className="flex gap-2 mt-3">
                  {t.status === "assigned" && (
                    <button onClick={() => act(t.id, "in_progress")} disabled={busy === t.id}
                      className="flex-1 h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold disabled:opacity-60">
                      Start
                    </button>
                  )}
                  <button onClick={() => act(t.id, "submitted")} disabled={busy === t.id}
                    className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Submit
                  </button>
                </div>
              )}
              {t.admin_note && (
                <p className="mt-2 text-xs bg-amber-50 text-amber-800 p-2 rounded-lg">Note: {t.admin_note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
