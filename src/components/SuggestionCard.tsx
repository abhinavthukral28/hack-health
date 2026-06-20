import { useState } from 'react';
import type { Suggestion, ProposedAction } from '../types';
import { Check } from './icons';

// Icons not in the shared set — defined inline here per the no-edit-icons rule.
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

// Patient message
const MessageSquare = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  </svg>
);

// Follow-up task
const CalendarCheck = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 15 11 17 15 13" />
  </svg>
);

const X = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Sparkles = ({ className }: IconProps) => (
  <svg {...iconBase(className)}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z" />
  </svg>
);

const ACTION_META: Record<
  ProposedAction['type'],
  { label: string; Icon: (p: IconProps) => JSX.Element }
> = {
  patient_message: { label: 'Patient message', Icon: MessageSquare },
  followup_task: { label: 'Follow-up task', Icon: CalendarCheck },
};

// Presentational. The AI has DRAFTED the actions; the clinician edits a line,
// then approves (writes a Task + AuditEntry) or rejects. Never auto-acts.
export function SuggestionCard({
  suggestion,
  status,
  onApprove,
  onReject,
}: {
  suggestion: Suggestion;
  status: 'pending' | 'approved' | 'edited' | 'rejected';
  onApprove: (editedActions: ProposedAction[]) => void;
  onReject: () => void;
}) {
  // Local edits start from the AI's drafts; index-aligned with proposedActions.
  const [drafts, setDrafts] = useState<string[]>(() =>
    suggestion.proposedActions.map((a) => a.draft),
  );

  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const locked = isApproved || isRejected;

  const setDraft = (i: number, value: string) =>
    setDrafts((prev) => prev.map((d, j) => (j === i ? value : d)));

  const handleApprove = () => {
    const editedActions: ProposedAction[] = suggestion.proposedActions.map((a, i) => ({
      ...a,
      draft: drafts[i],
    }));
    onApprove(editedActions);
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition-shadow duration-150 motion-reduce:transition-none ${
        isApproved
          ? 'border-emerald-200'
          : isRejected
            ? 'border-slate-200 opacity-75'
            : 'border-slate-200'
      }`}
    >
      {/* Header — framing the trust model */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">
            AI-prepared actions — review &amp; approve
          </h3>
        </div>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          AI prepared · you approve · never auto-acts
        </p>
        {suggestion.title && (
          <p className="mt-2 text-sm font-medium text-slate-700">{suggestion.title}</p>
        )}
        {suggestion.summary && (
          <p className="mt-1 text-sm leading-snug text-slate-600">{suggestion.summary}</p>
        )}
      </div>

      {/* Editable action blocks */}
      <div className="space-y-3 p-4">
        {suggestion.proposedActions.map((action, i) => {
          const meta = ACTION_META[action.type];
          const { Icon } = meta;
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {meta.label}
                </span>
                <span className="text-[11px] font-medium text-slate-400">{action.label}</span>
              </div>
              <label className="sr-only" htmlFor={`draft-${suggestion.id}-${i}`}>
                {meta.label} draft
              </label>
              <textarea
                id={`draft-${suggestion.id}-${i}`}
                value={drafts[i]}
                onChange={(e) => setDraft(i, e.target.value)}
                disabled={locked}
                rows={3}
                className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 transition-colors duration-150 motion-reduce:transition-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          );
        })}
      </div>

      {/* Footer — state-dependent */}
      <div className="border-t border-slate-100 px-4 py-3">
        {isApproved ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            Filed — audit written
          </div>
        ) : isRejected ? (
          <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">
            <X className="h-4 w-4 shrink-0" />
            Rejected — nothing filed
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onReject}
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-1"
            >
              <Check className="h-4 w-4" />
              Approve &amp; file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
