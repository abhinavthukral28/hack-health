import type { TriagedMessage } from '../types';
import { ConfidenceBadge, EvidenceBadge } from './TriageBadge';
import { bucketConfig } from './criticality';

const TYPE_LABEL: Record<string, string> = {
  lab: 'Lab',
  specialist_report: 'Consult',
  hospital_report: 'Hospital',
  fax_form: 'Fax / form',
  refill: 'Refill',
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function MessageCard({
  triaged,
  selected,
  onSelect,
}: {
  triaged: TriagedMessage;
  selected: boolean;
  onSelect: () => void;
}) {
  const { message, criticality, confidence, summary, evidence } = triaged;
  const cfg = bucketConfig(criticality);

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border bg-white px-4 py-3 text-left transition hover:shadow-md ${
        selected ? 'ring-2 ring-slate-800 shadow-md' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{message.subject}</span>
            <span className="shrink-0 text-xs text-slate-400">{time(message.receivedAt)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
              {TYPE_LABEL[message.type]}
            </span>
            <ConfidenceBadge confidence={confidence} />
            <EvidenceBadge count={evidence.length} />
          </div>
        </div>
      </div>
    </button>
  );
}
