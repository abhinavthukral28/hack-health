import type { InboxMessage } from '../types';

// The "before" state: the inbox exactly as it arrives — flat, chronological,
// newest first, no ranking, no summaries. The critical result is buried in the
// pile. This is what the clinician faces today, "one by one, no filtration."

const TYPE_LABEL: Record<InboxMessage['type'], string> = {
  lab: 'Lab',
  specialist_report: 'Consult',
  hospital_report: 'Hospital',
  fax_form: 'Fax / form',
  refill: 'Refill',
  referral_in: 'Referral',
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function RawInboxList({ messages }: { messages: InboxMessage[] }) {
  const chronological = [...messages].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {chronological.map((m, i) => (
        <div
          key={m.id}
          className={`flex items-center gap-3 px-4 py-2.5 ${
            i > 0 ? 'border-t border-slate-100' : ''
          } hover:bg-slate-50`}
        >
          {/* unread dot — everything is unread, that's the point */}
          <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
          <span className="w-20 shrink-0 text-xs font-medium text-slate-400">{TYPE_LABEL[m.type]}</span>
          <span className="flex-1 truncate text-sm font-medium text-slate-800">{m.subject}</span>
          <span className="w-32 shrink-0 truncate text-xs text-slate-400">
            {m.patientName ?? `Patient ${m.patientId}`}
          </span>
          <span className="w-14 shrink-0 text-right text-xs text-slate-400">{time(m.receivedAt)}</span>
        </div>
      ))}
    </div>
  );
}
