import { useState } from 'react';
import type { TriagedMessage, EvidenceRef } from '../types';
import { ConfidenceBadge } from './TriageBadge';
import { bucketConfig } from './criticality';
import { DocumentModal } from './DocumentModal';

const SOURCE_ICON: Record<EvidenceRef['sourceType'], string> = {
  lab: '🧪',
  note: '📝',
  fhir: '👤',
  dpd: '💊',
};

// One source = one openable file. Shows a 2-line preview; "Open file" launches
// the full document so the clinician verifies the real source, not a snippet.
function EvidenceCard({ ev, onOpen }: { ev: EvidenceRef; onOpen: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <span>{SOURCE_ICON[ev.sourceType]}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{ev.label}</div>
          <div className="truncate text-xs text-slate-500">{ev.value}</div>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Open file →
        </button>
      </div>
      <button
        onClick={onOpen}
        className="block w-full border-t border-slate-100 px-3 py-2 text-left"
        title="Open the full source document"
      >
        <pre className="line-clamp-2 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-500">
{ev.snippet}
        </pre>
        <span className="mt-1 inline-block text-[11px] font-medium text-slate-400">tap to verify the full document</span>
      </button>
    </div>
  );
}

export function EvidencePanel({ triaged }: { triaged: TriagedMessage | null }) {
  const [openDoc, setOpenDoc] = useState<EvidenceRef | null>(null);
  if (!triaged) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
        <div className="text-4xl">🧭</div>
        <p className="mt-3 text-sm font-medium text-slate-500">Select a message</p>
        <p className="mt-1 text-xs">
          AI prepares the triage. You verify the source. You approve.
          <br />
          It never acts on its own.
        </p>
      </div>
    );
  }

  const cfg = bucketConfig(triaged.criticality);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full ${cfg.chip} px-2.5 py-0.5 text-xs font-bold text-white`}>
            {cfg.label}
          </span>
          <ConfidenceBadge confidence={triaged.confidence} />
        </div>
        <h2 className="mt-2 text-base font-semibold text-slate-900">{triaged.message.subject}</h2>
        <p className="mt-1 text-sm text-slate-600">{triaged.summary}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-lg bg-slate-800 p-3 text-sm text-slate-100">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Why the AI ranked it here
          </div>
          {triaged.rationale}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Evidence — the actual source, inline
          </div>
          <div className="space-y-2">
            {triaged.evidence.map((ev, i) => (
              <EvidenceCard key={i} ev={ev} onOpen={() => setOpenDoc(ev)} />
            ))}
          </div>
        </div>
      </div>

      <DocumentModal ev={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
