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
  const Icon = cfg.icon;
  // Duplicates collapse by default — folded under the kept original.
  const [showDupes, setShowDupes] = useState(false);
  const primary = items.filter((t) => !t.duplicateOf);
  const dupes = items.filter((t) => t.duplicateOf);

  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2 px-0.5">
        <Icon className={`h-4 w-4 ${cfg.accent}`} />
        <h3 className="text-sm font-bold tracking-tight text-slate-700">{cfg.label}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
          {primary.length}
        </span>
        <span className={`ml-1 h-px flex-1 ${cfg.accent} opacity-20`} style={{ background: 'currentColor' }} />
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
        <div className="px-0.5">
          <button
            onClick={() => setShowDupes((v) => !v)}
            className="cursor-pointer text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700"
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
