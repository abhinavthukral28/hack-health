import type { Criticality, Confidence } from '../types';

// Display config for each bucket. High-contrast + big — must read from the back
// of the room on a projector.
export const BUCKETS: { key: Criticality; label: string; tw: string; chip: string; dot: string }[] = [
  { key: 'critical', label: 'Critical now', tw: 'bg-critical-bg border-critical-border', chip: 'bg-critical-chip', dot: 'bg-critical-chip' },
  { key: 'today', label: 'Today', tw: 'bg-today-bg border-today-border', chip: 'bg-today-chip', dot: 'bg-today-chip' },
  { key: 'can_wait', label: 'Can wait', tw: 'bg-canwait-bg border-canwait-border', chip: 'bg-canwait-chip', dot: 'bg-canwait-chip' },
  { key: 'needs_review', label: 'Needs review', tw: 'bg-review-bg border-review-border', chip: 'bg-review-chip', dot: 'bg-review-chip' },
];

export const bucketConfig = (c: Criticality) => BUCKETS.find((b) => b.key === c)!;

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};
