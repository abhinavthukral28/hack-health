import type { Confidence } from '../types';
import { CONFIDENCE_LABEL } from './criticality';

const DOTS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

// Confidence shown as filled dots — calibrated trust, never a fake number.
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const filled = DOTS[confidence];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600" title={CONFIDENCE_LABEL[confidence]}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i <= filled ? 'bg-slate-700' : 'bg-slate-300'}`}
          />
        ))}
      </span>
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

// Evidence count chip — signals tap-to-source is available.
export function EvidenceBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      📎 {count} source{count > 1 ? 's' : ''}
    </span>
  );
}
