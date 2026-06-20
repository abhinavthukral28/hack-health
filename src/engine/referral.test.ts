import { describe, it, expect } from 'vitest';
import { assessReferral } from './referral';
import { messages } from '../fixtures/messages';
import type { InboxMessage } from '../types';

const byId = (id: string): InboxMessage => {
  const m = messages.find((x) => x.id === id);
  if (!m) throw new Error(`fixture ${id} missing`);
  return m;
};

describe('inbound referral intake assessment', () => {
  it('urgent cancer referral missing bloodwork + CT -> needs_info / high', () => {
    const d = assessReferral(byId('msg-referral-cancer'));
    expect(d.status).toBe('needs_info');
    expect(d.confidence).toBe('high');
    expect(d.firedRule?.label).toMatch(/cancer/i);
  });

  it('drafts a request that names the missing items (bloodwork + CT)', () => {
    const d = assessReferral(byId('msg-referral-cancer'));
    const req = d.proposedActions.find((a) => a.type === 'request_info');
    expect(req).toBeTruthy();
    expect(req!.draft.toLowerCase()).toContain('bloodwork');
    expect(req!.draft.toLowerCase()).toContain('ct');
  });

  it('a complete cancer referral (bloods + CT enclosed) -> accept', () => {
    const base = byId('msg-referral-cancer');
    const complete: InboxMessage = {
      ...base,
      referral: { ...base.referral!, enclosed: ['referral letter', 'bloodwork panel', 'CT chest'] },
    };
    expect(assessReferral(complete).status).toBe('accept');
  });

  it('never auto-declines: decline is a recommendation requiring approval', () => {
    const d = assessReferral(byId('msg-referral-cancer'));
    expect(d.proposedActions.every((a) => a.requiresApproval)).toBe(true);
  });
});

describe('inbound referral fixtures span all dispositions', () => {
  const referrals = messages.filter((m) => m.type === 'referral_in');
  const dispositions = referrals.map((m) => assessReferral(m).status);

  it('has at least 6 inbound referrals to populate the Referrals filter', () => {
    expect(referrals.length).toBeGreaterThanOrEqual(6);
  });

  it('covers needs_info, accept, and decline_redirect', () => {
    expect(dispositions).toContain('needs_info');
    expect(dispositions).toContain('accept');
    expect(dispositions).toContain('decline_redirect');
  });
});
