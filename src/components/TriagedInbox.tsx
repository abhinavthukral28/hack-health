import { useState } from 'react';
import type { TriagedMessage, Criticality } from '../types';
import { BucketGroup } from './BucketGroup';
import { BUCKETS } from './criticality';

type Filter = Criticality | 'all' | 'referrals';

// The AI-triaged view: a KPI summary strip (counts per bucket, click to filter)
// over the stratified message list. Data-dense but calm — color lives in the
// accents and KPI dots, and filtering makes 150 messages manageable.
export function TriagedInbox({
  triaged,
  selectedId,
  onSelect,
}: {
  triaged: TriagedMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  // Headline counts exclude collapsed duplicates.
  const count = (k: Criticality) => triaged.filter((t) => t.criticality === k && !t.duplicateOf).length;
  const total = triaged.filter((t) => !t.duplicateOf).length;
  // Inbound referrals are a separate axis (disposition, not acuity) — let the
  // clinician filter the pile to just referrals from the top row.
  const referralCount = triaged.filter((t) => t.message.type === 'referral_in' && !t.duplicateOf).length;
  const bucketItems = (k: Criticality) =>
    triaged.filter((t) => t.criticality === k && (filter !== 'referrals' || t.message.type === 'referral_in'));
  const visibleBuckets = BUCKETS.filter((b) =>
    filter === 'referrals' ? bucketItems(b.key).length > 0 : (filter === 'all' || filter === b.key) && count(b.key) > 0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* KPI summary strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3">
        <KpiChip
          label="All"
          n={total}
          active={filter === 'all'}
          dot="bg-slate-800"
          activeRing="ring-slate-800"
          onClick={() => setFilter('all')}
        />
        {BUCKETS.map((b) => (
          <KpiChip
            key={b.key}
            label={b.label}
            n={count(b.key)}
            active={filter === b.key}
            dot={b.dot}
            activeRing={b.ring}
            onClick={() => setFilter((f) => (f === b.key ? 'all' : b.key))}
          />
        ))}
        {referralCount > 0 && (
          <KpiChip
            label="Referrals"
            n={referralCount}
            active={filter === 'referrals'}
            dot="bg-indigo-600"
            activeRing="ring-indigo-500"
            onClick={() => setFilter((f) => (f === 'referrals' ? 'all' : 'referrals'))}
          />
        )}
      </div>

      {/* Stratified list */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {visibleBuckets.map((b) => (
          <BucketGroup
            key={b.key}
            criticality={b.key}
            items={bucketItems(b.key)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function KpiChip({
  label,
  n,
  active,
  dot,
  activeRing,
  onClick,
}: {
  label: string;
  n: number;
  active: boolean;
  dot: string;
  activeRing: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-left transition-shadow duration-150 motion-reduce:transition-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 ${activeRing} ${
        active ? `border-transparent ring-2 ${activeRing}` : 'border-slate-200'
      }`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="text-xl font-bold leading-none tabular-nums text-slate-900">{n}</span>
      <span className="text-xs font-medium leading-tight text-slate-500">{label}</span>
    </button>
  );
}
