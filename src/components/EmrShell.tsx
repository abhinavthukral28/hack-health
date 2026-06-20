import { useApp } from '../state/AppContext';
import { BucketGroup } from './BucketGroup';
import { EvidencePanel } from './EvidencePanel';
import { DndToggle } from './DndToggle';
import { BUCKETS } from './criticality';

// Inflated stakes counter — the SME's real daily volume. We render ~11 in detail
// but show the true scale so a judge feels the "message 149" problem.
const INBOX_TOTAL_TODAY = 150;

export function EmrShell() {
  const { state, dispatch } = useApp();
  const { triaged, selectedMessageId, patient } = state;

  const selected = triaged.find((t) => t.message.id === selectedMessageId) ?? null;
  const criticalCount = triaged.filter((t) => t.criticality === 'critical' && !t.duplicateOf).length;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Context bar — no login, this is "inside the EMR" */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-900 px-2 py-1 text-sm font-bold tracking-tight text-white">
            COMPASS
          </span>
          <span className="text-sm text-slate-400">EMR · Inbox</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            Signed in as <span className="font-medium text-slate-700">Dr. A. Okafor, MD</span>
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="text-slate-500">Provider inbox</span>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_400px] overflow-hidden">
        {/* Inbox — the hero */}
        <main className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{INBOX_TOTAL_TODAY}</span>
                <span className="text-sm text-slate-500">messages in inbox today</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                AI triaged the queue ·{' '}
                <span className="font-semibold text-critical-text">{criticalCount} critical</span> surfaced to the top
              </div>
            </div>
            <DndToggle />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {BUCKETS.map((b) => (
              <BucketGroup
                key={b.key}
                criticality={b.key}
                items={triaged.filter((t) => t.criticality === b.key)}
                selectedId={selectedMessageId}
                onSelect={(id) => dispatch({ type: 'SELECT_MESSAGE', id })}
              />
            ))}
          </div>
        </main>

        {/* AI rail — evidence + (later) actions */}
        <aside className="flex flex-col border-l border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-700">AI triage panel</span>
            <span className="text-xs text-slate-400">{patient.name.split(' ')[0]}'s context</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <EvidencePanel triaged={selected} />
          </div>
        </aside>
      </div>
    </div>
  );
}
