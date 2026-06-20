import type { TriagedMessage } from '../types';
import { ConfidenceBadge, EvidenceBadge } from './TriageBadge';
import { bucketConfig, ACCENT_BORDER } from './criticality';

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
  const Icon = cfg.icon;
  const isCritical = criticality === 'critical';

  return (
    <button
      onClick={onSelect}
      className={`w-full cursor-pointer rounded-lg border border-l-4 ${ACCENT_BORDER[criticality]} px-4 py-3 text-left transition-shadow duration-150 motion-reduce:transition-none hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 ${
        selected ? 'border-slate-300 shadow-md ring-2 ring-slate-800' : 'border-slate-200'
      } ${isCritical ? cfg.softBg : 'bg-white'}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.accent}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-slate-900">{message.subject}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-400">
              {message.patientName ? `${message.patientName} · ` : ''}
              {time(message.receivedAt)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-600">{summary}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
