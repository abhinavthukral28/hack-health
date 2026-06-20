import type { Confidence } from '../types';
import { CONFIDENCE_LABEL } from './criticality';
import { FileText } from './icons';

const LEVEL: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

// Color-coded so confidence reads at a glance: green = high, amber = medium,
// slate = low. Never a fabricated percentage — it maps to rule strength.
const TONE: Record<Confidence, { text: string; fill: string }> = {
  high: { text: 'text-emerald-700', fill: 'bg-emerald-500' },
  medium: { text: 'text-amber-700', fill: 'bg-amber-500' },
  low: { text: 'text-slate-500', fill: 'bg-slate-400' },
};

// Compact badge for inbox cards.
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const filled = LEVEL[confidence];
  const tone = TONE[confidence];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text}`} title={CONFIDENCE_LABEL[confidence]}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= filled ? tone.fill : 'bg-slate-200'}`} />
        ))}
      </span>
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

// Prominent meter for the evidence panel — makes the AI's confidence unmistakable.
export function ConfidenceMeter({ confidence }: { confidence: Confidence }) {
  const filled = LEVEL[confidence];
  const tone = TONE[confidence];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI confidence</span>
        <span className={`text-sm font-bold ${tone.text}`}>{CONFIDENCE_LABEL[confidence]}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i <= filled ? tone.fill : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  );
}

// Evidence count chip — signals tap-to-source is available.
export function EvidenceBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
      <FileText className="h-3.5 w-3.5" />
      {count} source{count > 1 ? 's' : ''}
    </span>
  );
}
