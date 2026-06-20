import type { Task, AuditEntry } from '../types';
import { Check, FileText } from './icons';

// Icons not in the shared set — defined inline per the no-edit-icons rule.
type IconProps = { className?: string };
const iconBase = (className?: string) => ({
  className,
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

const CalendarCheck = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 15 11 17 15 13" />
  </svg>
);

const ShieldCheck = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

const byNewest = <T extends { createdAt?: string; timestamp?: string }>(a: T, b: T) =>
  (b.createdAt ?? b.timestamp ?? '').localeCompare(a.createdAt ?? a.timestamp ?? '');

// Presentational. The receipt for the approve flow: every filed Task and every
// audited action, newest first. This is what "you stay in control" looks like.
export function AuditTrail({ tasks, audit }: { tasks: Task[]; audit: AuditEntry[] }) {
  const sortedTasks = [...tasks].sort(byNewest);
  const sortedAudit = [...audit].sort(byNewest);

  if (sortedTasks.length === 0 && sortedAudit.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
        <ShieldCheck className="h-6 w-6 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-600">No actions filed yet</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Approved actions write a task and an audit entry here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tasks created */}
      {sortedTasks.length > 0 && (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tasks created
          </div>
          <ul className="space-y-1.5">
            {sortedTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug text-slate-800">{task.label}</div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                    {task.due ? `Due ${dateOnly(task.due)} · ` : ''}
                    Filed {dateTime(task.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Audit log */}
      {sortedAudit.length > 0 && (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Audit log
          </div>
          <ul className="space-y-1.5">
            {sortedAudit.map((entry) => {
              const edited = entry.before !== undefined || entry.after !== undefined;
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  {edited ? (
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug text-slate-800">{entry.action}</div>
                    <div className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                      {entry.actor} · {dateTime(entry.timestamp)}
                    </div>
                    {edited && (
                      <div className="mt-1.5 space-y-0.5 border-l-2 border-amber-200 pl-2 text-[11px] leading-snug">
                        <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                          edited before filing
                        </span>
                        {entry.before !== undefined && (
                          <div className="text-slate-400 line-through">{entry.before}</div>
                        )}
                        {entry.after !== undefined && (
                          <div className="text-slate-600">{entry.after}</div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
