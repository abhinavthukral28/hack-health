import type {
  AiEngine,
} from './AiEngine';
import type {
  InboxMessage,
  Patient,
  TriagedMessage,
  Criticality,
  Confidence,
  EvidenceRef,
  ClinicalDocument,
  Suggestion,
  ProposedAction,
} from '../types';

// ---------------------------------------------------------------------------
// Core logic = a small, explainable rule table (first-match-wins).
// The rule that fires IS the rationale shown in the evidence panel — that's
// how the SME's "show me what it's drawing from" requirement is met cheaply,
// and it's unit-testable in one move.
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  match: (msg: InboxMessage) => boolean;
  criticality: Criticality;
  confidence: Confidence;
  rationale: string;
}

const haystack = (msg: InboxMessage): string =>
  `${msg.subject}\n${msg.body}\n${msg.raw ?? ''}`.toLowerCase();

const has = (msg: InboxMessage, ...needles: string[]): boolean => {
  const h = haystack(msg);
  return needles.some((n) => h.includes(n.toLowerCase()));
};

// Whole-word match — needed for short tokens like "stat" that would otherwise
// match inside words (e.g. "atorva-STAT-in").
const hasWord = (msg: InboxMessage, ...words: string[]): boolean => {
  const h = haystack(msg);
  return words.some((w) => new RegExp(`\\b${w.toLowerCase()}\\b`).test(h));
};

// Order matters — first match wins. Critical checks come first.
export const RULES: Rule[] = [
  {
    id: 'critical-value',
    match: (m) => has(m, 'critical high', 'critical low', 'critical value', 'critical result'),
    criticality: 'critical',
    confidence: 'high',
    rationale: 'Lab flagged CRITICAL by the lab — value breaches a critical threshold. Exact threshold breach = high confidence.',
  },
  {
    id: 'stat-ed',
    match: (m) =>
      hasWord(m, 'stat') ||
      has(m, 'ed discharge', 'emergency department', 'discharged from emergency', 'within 48h', 'within 48 hours'),
    criticality: 'critical',
    confidence: 'medium',
    rationale: 'Hospital/ED message with a STAT or time-bound (≤48h) follow-up request. Keyword-driven = medium confidence.',
  },
  {
    id: 'abnormal-lab',
    match: (m) => m.type === 'lab' && has(m, '(h)', 'high', '(l)', 'low', 'abnormal', 'above target'),
    criticality: 'today',
    confidence: 'high',
    rationale: 'Abnormal lab value (flagged H/L) but not a critical threshold — review today.',
  },
  {
    id: 'imaging-actionable',
    match: (m) => has(m, 'nodule', 'recommend', 'fleischner', 'follow-up per', 'incidental'),
    criticality: 'today',
    confidence: 'medium',
    rationale: 'Report contains an actionable finding with a recommended follow-up — review today.',
  },
  {
    id: 'normal-lab',
    match: (m) => m.type === 'lab' && has(m, 'within normal limits', 'no action required', 'all within normal', 'normal.'),
    criticality: 'can_wait',
    confidence: 'high',
    rationale: 'Lab explicitly within normal limits, no action flagged — can wait.',
  },
  {
    id: 'routine-admin',
    match: (m) => m.type === 'refill' || m.type === 'fax_form' || (m.type === 'specialist_report' && has(m, 'routine', 'benign', 'reassur', 'prn')),
    criticality: 'can_wait',
    confidence: 'medium',
    rationale: 'Routine administrative or low-acuity message (refill / form / routine consult) — can wait.',
  },
];

const FALLBACK_RULE = {
  id: 'needs-review',
  criticality: 'needs_review' as Criticality,
  confidence: 'low' as Confidence,
  rationale: 'No rule matched confidently (e.g. unreadable/partial transmission). Routed to Needs review rather than guessed — never crash.',
};

// Explicit unreadable detection routes to needs_review even if a stray keyword hits.
const isUnreadable = (m: InboxMessage): boolean =>
  has(m, 'illegible', 'unreadable', 'transmission error', 'not parseable', 'ocr confidence low', 'truncated');

export function classify(msg: InboxMessage) {
  if (isUnreadable(msg)) return FALLBACK_RULE;
  const rule = RULES.find((r) => r.match(msg));
  return rule ?? FALLBACK_RULE;
}

// Templated one-line summaries — within each bucket, give the clinician the gist.
function summarize(msg: InboxMessage, criticality: Criticality): string {
  const firstSentence = msg.body.split(/(?<=[.!])\s/)[0].trim();
  switch (criticality) {
    case 'critical':
      return `⚠ ${firstSentence}`;
    case 'needs_review':
      return `Could not classify — ${firstSentence}`;
    default:
      return firstSentence;
  }
}

// Letterhead organization per message type — makes each opened file read like a
// real document from a real source.
const ORG_BY_TYPE: Record<InboxMessage['type'], { org: string; orgMeta: string }> = {
  lab: { org: 'Eastern Ontario Regional Laboratory', orgMeta: '501 Smyth Rd, Ottawa ON · Accredited by IQMH' },
  specialist_report: { org: 'Specialist Consultation', orgMeta: 'Faxed to referring provider' },
  hospital_report: { org: 'The Ottawa Hospital', orgMeta: '1053 Carling Ave, Ottawa ON' },
  fax_form: { org: 'Incoming Fax', orgMeta: 'Document management' },
  refill: { org: 'Community Pharmacy', orgMeta: 'Rx renewal request' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// Build the structured "source document" so Open file renders a real-looking page.
function buildSourceDoc(msg: InboxMessage, patient: Patient): ClinicalDocument {
  const org = ORG_BY_TYPE[msg.type];
  const isBackbone = msg.patientId === patient.id;
  const demographics = isBackbone
    ? { name: patient.name, dob: patient.dob, mrn: patient.id }
    : { name: 'Synthetic Patient', dob: '—', mrn: msg.patientId };

  if (msg.type === 'lab' && msg.labReport) {
    return {
      kind: 'lab',
      org: org.org,
      orgMeta: org.orgMeta,
      docTitle: 'Laboratory Report',
      patient: demographics,
      meta: [
        { label: 'Reported', value: fmtDate(msg.receivedAt) },
        { label: 'Ordering provider', value: 'Dr. A. Okafor, MD' },
        { label: 'Specimen', value: 'Serum / whole blood' },
      ],
      labRows: msg.labReport,
      footer:
        msg.labReport.some((r) => r.flag === 'critical')
          ? 'CRITICAL VALUE — telephoned to ordering provider per lab protocol. Synthetic data, not a real patient.'
          : 'Synthetic data — not a real patient.',
    };
  }

  return {
    kind: 'note',
    org: org.org,
    orgMeta: org.orgMeta,
    docTitle: msg.subject,
    patient: demographics,
    meta: [{ label: 'Received', value: fmtDate(msg.receivedAt) }],
    bodyText: msg.raw ?? msg.body,
    footer: 'Synthetic data — not a real patient.',
  };
}

// Evidence = the actual source document inline, plus patient context when the
// message is about our backbone patient (powers tap-to-source, the trust unlock).
function buildEvidence(msg: InboxMessage, patient: Patient): EvidenceRef[] {
  const ev: EvidenceRef[] = [];

  if (msg.raw) {
    ev.push({
      label: 'Source document',
      sourceType: msg.type === 'lab' ? 'lab' : 'note',
      value: msg.subject,
      snippet: msg.raw,
      doc: buildSourceDoc(msg, patient),
    });
  }

  // If this message concerns the backbone patient, surface the meds/conditions
  // the value should be read against — this is what makes the critical lab "tie
  // to the patient's meds" without leaving the panel.
  if (msg.patientId === patient.id) {
    ev.push({
      label: 'Patient medications',
      sourceType: 'fhir',
      value: `${patient.name} — active meds`,
      snippet: patient.medications.join('\n'),
      doc: {
        kind: 'record',
        org: 'COMPASS EMR — Patient Chart',
        orgMeta: 'Medication profile',
        docTitle: 'Active Medications',
        patient: { name: patient.name, dob: patient.dob, mrn: patient.id },
        list: patient.medications,
        footer: 'Synthetic data — not a real patient.',
      },
    });
    ev.push({
      label: 'Active problems',
      sourceType: 'fhir',
      value: `${patient.name} — problem list`,
      snippet: patient.problems.join('\n'),
      doc: {
        kind: 'record',
        org: 'COMPASS EMR — Patient Chart',
        orgMeta: 'Problem list',
        docTitle: 'Active Problems',
        patient: { name: patient.name, dob: patient.dob, mrn: patient.id },
        list: patient.problems,
        footer: 'Synthetic data — not a real patient.',
      },
    });
  }

  return ev;
}

// Dedupe: messages sharing a dedupeKey collapse into the first (earliest) one;
// later ones get duplicateOf set so the UI can visibly fold them.
function markDuplicates(triaged: TriagedMessage[]): TriagedMessage[] {
  const seenByKey = new Map<string, string>(); // dedupeKey -> kept message id
  return triaged.map((t) => {
    const key = t.message.dedupeKey;
    if (!key) return t;
    const existing = seenByKey.get(key);
    if (existing) return { ...t, duplicateOf: existing };
    seenByKey.set(key, t.message.id);
    return t;
  });
}

export const deterministicEngine: AiEngine = {
  triage(messages: InboxMessage[], patient: Patient): TriagedMessage[] {
    const triaged = messages.map<TriagedMessage>((message) => {
      const rule = classify(message);
      return {
        message,
        criticality: rule.criticality,
        confidence: rule.confidence,
        rationale: rule.rationale,
        summary: summarize(message, rule.criticality),
        evidence: buildEvidence(message, patient),
      };
    });
    return markDuplicates(triaged);
  },

  // Deep-thread draft. Fully built in the differentiator block; implemented here
  // so the interface is complete and unit-testable now.
  analyze(message: InboxMessage, patient: Patient): Suggestion {
    const rule = classify(message);
    const actions: ProposedAction[] = [
      {
        type: 'patient_message',
        label: 'Draft patient message',
        draft: `Hello ${patient.name.split(' ')[0]}, your recent results need a quick follow-up. Please book an appointment so we can review and adjust your care. — Your care team`,
        requiresApproval: true,
      },
      {
        type: 'followup_task',
        label: 'Create follow-up task',
        draft: `Review ${message.subject} for ${patient.name}; reconcile against active meds (${patient.medications[0]}).`,
        requiresApproval: true,
      },
    ];
    return {
      id: `sug-${message.id}`,
      messageId: message.id,
      patientId: patient.id,
      title: message.subject,
      summary: summarize(message, rule.criticality),
      rationale: rule.rationale,
      evidence: buildEvidence(message, patient),
      confidence: rule.confidence,
      proposedActions: actions,
      status: 'pending',
    };
  },
};
