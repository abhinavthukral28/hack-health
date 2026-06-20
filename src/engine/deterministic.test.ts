import { describe, it, expect } from 'vitest';
import { deterministicEngine, classify } from './deterministic';
import { messages } from '../fixtures/messages';
import { patient } from '../fixtures/patient';

const byId = (id: string) => {
  const m = messages.find((x) => x.id === id);
  if (!m) throw new Error(`fixture ${id} missing`);
  return m;
};

describe('deterministic rule engine — criticality mapping', () => {
  it('critical lab (CRITICAL flag) -> critical / high', () => {
    const r = classify(byId('msg-lab-k'));
    expect(r.criticality).toBe('critical');
    expect(r.confidence).toBe('high');
  });

  it('STAT / ED discharge -> critical (keyword, medium)', () => {
    const r = classify(byId('msg-hosp-ed'));
    expect(r.criticality).toBe('critical');
    expect(r.confidence).toBe('medium');
  });

  it('abnormal-but-not-critical lab (HbA1c High) -> today / high', () => {
    const r = classify(byId('msg-lab-hba1c'));
    expect(r.criticality).toBe('today');
    expect(r.confidence).toBe('high');
  });

  it('imaging incidental nodule with recommendation -> today', () => {
    expect(classify(byId('msg-imaging-cxr')).criticality).toBe('today');
  });

  it('normal lab (within normal limits) -> can_wait / high', () => {
    const r = classify(byId('msg-lab-cbc'));
    expect(r.criticality).toBe('can_wait');
    expect(r.confidence).toBe('high');
  });

  it('refill and fax form -> can_wait', () => {
    expect(classify(byId('msg-refill-statin')).criticality).toBe('can_wait');
    expect(classify(byId('msg-fax-form')).criticality).toBe('can_wait');
  });

  it('garbled / unreadable fax -> needs_review / low (never throws)', () => {
    const r = classify(byId('msg-fax-garbled'));
    expect(r.criticality).toBe('needs_review');
    expect(r.confidence).toBe('low');
  });
});

describe('deterministic engine — triage pipeline', () => {
  const triaged = deterministicEngine.triage(messages, patient);

  it('triages every message without throwing', () => {
    expect(triaged).toHaveLength(messages.length);
    expect(triaged.every((t) => !!t.criticality)).toBe(true);
  });

  it('the abnormal-lab fixture lands in the critical bucket', () => {
    const k = triaged.find((t) => t.message.id === 'msg-lab-k');
    expect(k?.criticality).toBe('critical');
  });

  it('dedupe collapses the near-duplicate pair (corrected report -> original)', () => {
    const dup = triaged.find((t) => t.message.id === 'msg-lab-k-dup');
    expect(dup?.duplicateOf).toBe('msg-lab-k');
    // the kept original is NOT marked as a duplicate
    const orig = triaged.find((t) => t.message.id === 'msg-lab-k');
    expect(orig?.duplicateOf).toBeUndefined();
  });

  it('the backbone-patient message carries patient-context evidence (tap-to-source)', () => {
    const k = triaged.find((t) => t.message.id === 'msg-lab-k');
    const labels = k?.evidence.map((e) => e.label) ?? [];
    expect(labels).toContain('Source document');
    expect(labels).toContain('Patient medications');
  });
});

describe('deterministic engine — analyze (deep thread)', () => {
  it('produces BOTH a patient-message draft and a follow-up task', () => {
    const sug = deterministicEngine.analyze(byId('msg-lab-k'), patient);
    const types = sug.proposedActions.map((a) => a.type);
    expect(types).toContain('patient_message');
    expect(types).toContain('followup_task');
    expect(sug.proposedActions.every((a) => a.requiresApproval)).toBe(true);
  });
});
