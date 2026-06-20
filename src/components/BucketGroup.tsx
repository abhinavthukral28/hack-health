import { useState } from 'react';
import type { TriagedMessage, Criticality } from '../types';
import { MessageCard } from './MessageCard';
import { bucketConfig } from './criticality';

export function BucketGroup({
  criticality,
  items,
  selectedId,
  onSelect,
}: {
  criticality: Criticality;
  items: TriagedMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const cfg = bucketConfig(criticality);
  // Duplicates collapse by default — they're folded under the kept original.
  const [showDupes, setShowDupes] = useState(false);
  const primary = items.filter((t) => !t.duplicateOf);
  const dupes = items.filter((t) => t.duplicateOf);

  if (items.length === 0) return null;

  return (
    <section className={`rounded-xl border-l-4 ${cfg.tw} p-3`}>
      <header className="mb-2 flex items-center gap-2 px-1">
        <span className={`rounded-full ${cfg.chip} px-2.5 py-0.5 text-sm font-bold text-white`}>
          {cfg.label}
        </span>
        <span className="text-sm font-medium text-slate-500">{primary.length}</span>
      </header>

      <div className="space-y-2">
        {primary.map((t) => (
          <MessageCard
            key={t.message.id}
            triaged={t}
            selected={selectedId === t.message.id}
            onSelect={() => onSelect(t.message.id)}
          />
        ))}
      </div>

      {dupes.length > 0 && (
        <div className="mt-2 px-1">
          <button
            onClick={() => setShowDupes((v) => !v)}
            className="text-xs font-medium text-slate-500 underline decoration-dotted hover:text-slate-700"
          >
            {showDupes ? 'Hide' : 'Show'} {dupes.length} duplicate{dupes.length > 1 ? 's' : ''} collapsed by AI
          </button>
          {showDupes && (
            <div className="mt-2 space-y-2 opacity-70">
              {dupes.map((t) => (
                <MessageCard
                  key={t.message.id}
                  triaged={t}
                  selected={selectedId === t.message.id}
                  onSelect={() => onSelect(t.message.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
