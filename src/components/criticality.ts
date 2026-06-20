import type { Criticality, Confidence } from '../types';
import { AlertTriangle, Clock, Check, HelpCircle } from './icons';

// Display config per bucket. Status colors (red/amber/green/slate), calm by
// default — color lives in the accent bar, chip, and icon, not in heavy fills.
export interface BucketConfig {
  key: Criticality;
  label: string;
  icon: typeof AlertTriangle;
  accent: string; // left bar / icon color (text-*)
  chip: string; // solid chip bg
  ring: string; // selected/active ring
  softBg: string; // faint tint for critical emphasis
  dot: string;
}

export const BUCKETS: BucketConfig[] = [
  { key: 'critical', label: 'Critical now', icon: AlertTriangle, accent: 'text-red-600', chip: 'bg-red-600', ring: 'ring-red-500', softBg: 'bg-red-50', dot: 'bg-red-600' },
  { key: 'today', label: 'Today', icon: Clock, accent: 'text-amber-600', chip: 'bg-amber-500', ring: 'ring-amber-500', softBg: 'bg-amber-50', dot: 'bg-amber-500' },
  { key: 'can_wait', label: 'Can wait', icon: Check, accent: 'text-emerald-600', chip: 'bg-emerald-600', ring: 'ring-emerald-500', softBg: 'bg-emerald-50', dot: 'bg-emerald-600' },
  { key: 'needs_review', label: 'Needs review', icon: HelpCircle, accent: 'text-slate-500', chip: 'bg-slate-500', ring: 'ring-slate-400', softBg: 'bg-slate-50', dot: 'bg-slate-400' },
];

export const bucketConfig = (c: Criticality) => BUCKETS.find((b) => b.key === c)!;

// Left-border accent class per bucket (kept static so Tailwind keeps the classes).
export const ACCENT_BORDER: Record<Criticality, string> = {
  critical: 'border-l-red-500',
  today: 'border-l-amber-500',
  can_wait: 'border-l-emerald-500',
  needs_review: 'border-l-slate-300',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};
