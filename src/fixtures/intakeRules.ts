import type { IntakeRule } from '../types';

// The practice's OWN intake criteria = the context layer (the moat). First-fail-wins.
// The hero rule is clinician-sourced (2026-06-20): a doctor told us a cancer referral
// needs the requisite bloodwork and a CT, "otherwise the appointment is useless."
// That coarseness IS the thesis — the detailed acceptance logic lives in people's
// heads and isn't written down; the product makes it explicit and lets it compound.

const encloses = (r: { enclosed: string[] }, keyword: string): boolean =>
  r.enclosed.some((e) => e.toLowerCase().includes(keyword.toLowerCase()));

export const intakeRules: IntakeRule[] = [
  {
    id: 'cancer-workup',
    label: 'Suspected-cancer referral requires the requisite bloodwork and a CT enclosed',
    requiredItems: ['bloodwork', 'CT'],
    check: (r) => {
      const isCancer = /cancer|malignan|2-week|two-week|suspected (lung|breast|colorect|prostate)/i.test(
        `${r.requestedService} ${r.reason}`,
      );
      if (!isCancer) return true; // rule doesn't apply
      return encloses(r, 'bloodwork') && encloses(r, 'CT');
    },
    onFail: 'needs_info',
    reason:
      'Suspected-cancer pathway: the requisite bloodwork and CT imaging are not enclosed — without them the specialist appointment is wasted. (High-level intake filter given by a clinician, 2026-06-20.)',
  },
  {
    id: 'reason-required',
    label: 'A referral must state a reason for referral',
    check: (r) => r.reason.trim().length > 0,
    onFail: 'needs_info',
    requiredItems: ['reason for referral'],
    reason: 'No reason for referral was provided — required before the consult can be triaged.',
  },
  {
    id: 'out-of-scope-cosmetic',
    label: 'Cosmetic dermatology requests are out of scope for this practice',
    check: (r) => !/cosmetic/i.test(`${r.requestedService} ${r.reason}`),
    onFail: 'decline_redirect',
    reason: 'Cosmetic dermatology is outside this practice’s scope of service.',
    redirectTo: 'a private cosmetic dermatology clinic',
  },
];
