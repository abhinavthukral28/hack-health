import type {
  InboxMessage,
  InboundReferral,
  IntakeRule,
  ReferralDisposition,
  ProposedAction,
  Confidence,
} from '../types';
import { intakeRules as defaultRules } from '../fixtures/intakeRules';

// ---------------------------------------------------------------------------
// Inbound referral triage. An inbound referral is just another item the inbox
// owes a disposition. assessReferral runs the practice's intake rules (first-
// fail-wins) and proposes a drafted response. AI prepares; the human approves;
// nothing is auto-acted. Bias is to needs_info / route-to-human, never to a
// silent decline (a false decline can harm a patient; a false needs_info just
// asks a question).
// ---------------------------------------------------------------------------

const fmtList = (items: string[]): string =>
  items.length <= 1
    ? items[0] ?? ''
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

function missingItems(rule: IntakeRule, r: InboundReferral): string[] {
  return (rule.requiredItems ?? []).filter(
    (k) => !r.enclosed.some((e) => e.toLowerCase().includes(k.toLowerCase())),
  );
}

function buildActions(
  status: ReferralDisposition['status'],
  rule: IntakeRule | undefined,
  r: InboundReferral,
): ProposedAction[] {
  if (status === 'needs_info') {
    const missing = rule ? missingItems(rule, r) : [];
    const need = missing.length ? fmtList(missing) : 'the missing item(s)';
    return [
      {
        type: 'request_info',
        label: 'Request missing items from referrer',
        draft: `To ${r.fromProvider}: before we can book "${r.requestedService}", our intake requires ${need} to be enclosed (not received). Please forward same-day so this referral isn't returned. Thank you — Carling Family Health Team.`,
        requiresApproval: true,
      },
    ];
  }
  if (status === 'decline_redirect') {
    return [
      {
        type: 'decline_redirect',
        label: 'Decline & redirect (recommendation — your approval)',
        draft: `To ${r.fromProvider}: this request is outside our scope${
          rule?.redirectTo ? ` — please redirect to ${rule.redirectTo}` : ''
        }. ${rule?.reason ?? ''}`.trim(),
        requiresApproval: true,
      },
    ];
  }
  return [
    {
      type: 'acknowledge',
      label: 'Acknowledge & accept',
      draft: `To ${r.fromProvider}: referral received and accepted for "${r.requestedService}". The patient will be contacted to book.`,
      requiresApproval: true,
    },
  ];
}

export function assessReferral(
  message: InboxMessage,
  rules: IntakeRule[] = defaultRules,
): ReferralDisposition {
  const r = message.referral;
  if (!r) {
    // Not a referral — defensive no-op; callers should gate on type === 'referral_in'.
    return { status: 'accept', confidence: 'low', proposedActions: [] };
  }

  const failed = rules.find((rule) => !rule.check(r));
  if (!failed) {
    return { status: 'accept', confidence: 'high', proposedActions: buildActions('accept', undefined, r) };
  }

  // needs_info is high confidence (a required item is objectively absent); a
  // decline is only ever a medium-confidence recommendation for the human.
  const confidence: Confidence = failed.onFail === 'needs_info' ? 'high' : 'medium';
  return {
    status: failed.onFail,
    confidence,
    firedRule: { label: failed.label, reason: failed.reason },
    redirectTo: failed.redirectTo,
    proposedActions: buildActions(failed.onFail, failed, r),
  };
}
