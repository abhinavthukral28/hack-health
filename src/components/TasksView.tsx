import { useApp } from '../state/AppContext';
import { ClipboardList, Sparkles, Check, FileText } from './icons';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

// Full-width Tasks module. Every follow-up task the clinician approved from an
// AI-prepared suggestion is filed here, alongside the audit log. This is the
// doctor's running worklist across the whole inbox.
export function TasksView() {
  const { state } = useApp();
  const tasks = [...state.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const audit = [...state.audit];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <div className="flex items-baseline gap-2">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            <h1 className="text-lg font-bold text-slate-900">Tasks</h1>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {tasks.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Follow-ups filed from AI-prepared suggestions you approved in the inbox.
          </p>
        </header>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <ClipboardList className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No tasks yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              Open a message in the inbox, review the AI-prepared follow-up task, and approve it.
              It will be filed here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-slate-800">{task.label}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600">
                        <Sparkles className="h-3 w-3" />
                        AI-prepared · approved
                      </span>
                      {task.due && (
                        <span className="tabular-nums text-amber-600">Due {dateOnly(task.due)}</span>
                      )}
                      <span className="tabular-nums text-slate-400">Filed {dateTime(task.createdAt)}</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <Check className="h-3 w-3" />
                    Open
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Audit log — the receipt behind every filed task */}
        {audit.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Audit log
            </div>
            <ul className="space-y-1.5">
              {audit.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-sm leading-snug text-slate-800">{entry.action}</div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                    {entry.actor} · {dateTime(entry.timestamp)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
