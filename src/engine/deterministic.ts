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
    match: (m) =>
      Boolean(m.labReport?.some((r) => r.flag === 'critical')) ||
      has(m, 'critical high', 'critical low', 'critical value', 'critical result'),
    criticality: 'critical',
    confidence: 'high',
    rationale: 'Lab flagged CRITICAL by the lab — value breaches a critical threshold. Exact threshold breach = high confidence.',
  },
  {
    id: 'stat-ed',
    match: (m) =>
      hasWord(m, 'stat') ||
      has(
        m,
        'ed discharge', 'emergency department', 'discharged from emergency',
        'within 48h', 'within 48 hours',
        'pulmonary embolism', 'st elevation', 'acute mi', 'acute myocardial',
        'cord compression', 'active sepsis', 'septic shock',
      ),
    criticality: 'critical',
    confidence: 'medium',
    rationale: 'STAT / ED / time-bound or acute-emergency language (e.g. embolism, hemorrhage, sepsis). Keyword-driven = medium confidence.',
  },
  {
    id: 'abnormal-lab',
    // Prefer the structured lab flags. Do NOT substring-match bare 'high'/'low':
    // 'low' is a substring of 'follow', which would misclassify any lab whose
    // text mentions "follow-up". Fall back to precise flag tokens only.
    match: (m) =>
      m.type === 'lab' &&
      (Boolean(m.labReport?.some((r) => r.flag === 'high' || r.flag === 'low')) ||
        has(m, '(h)', '(l)', 'abnormal', 'above target')),
    criticality: 'today',
    confidence: 'high',
    rationale: 'Abnormal lab value (flagged H/L) but not a critical threshold — review today.',
  },
  {
    id: 'normal-lab',
    match: (m) => m.type === 'lab' && has(m, 'within normal limits', 'no action required', 'all within normal', 'normal.'),
    criticality: 'can_wait',
    confidence: 'high',
    rationale: 'Lab explicitly within normal limits, no action flagged — can wait.',
  },
  {
    id: 'actionable',
    match: (m) =>
      has(
        m,
        'recommend', 'biopsy', 'suspicious', 'malignan', 'mass', 'lesion', 'nodule',
        'fracture', 'abnormal', 'positive for', 'elevated', 'incidental', 'deficiency',
        'new diagnosis', 'referral', 'fleischner', 'concerning', 'follow-up per',
      ),
    criticality: 'today',
    confidence: 'medium',
    rationale: 'Report contains an actionable finding or recommended follow-up — review today.',
  },
  {
    id: 'routine',
    match: (m) =>
      m.type === 'refill' ||
      m.type === 'fax_form' ||
      has(
        m,
        'routine', 'benign', 'reassur', 'prn', 'stable', 'unremarkable', 'no acute',
        'negative', 'well-healed', 'well healed', 'postoperative', 'no significant',
        'as needed', 'no further', 'tolerated the procedure well',
      ),
    criticality: 'can_wait',
    confidence: 'medium',
    rationale: 'Routine / low-acuity message (admin, normal study, stable, or post-op check) — can wait.',
  },
];

// Recognized clinical document with no urgent/abnormal/actionable signal. Parked
// as routine, but LOW confidence — honest: the AI thinks it can wait, the human
// can still glance. This keeps Needs review rare (truly unclassifiable only).
const DEFAULT_RULE = {
  id: 'routine-default',
  criticality: 'can_wait' as Criticality,
  confidence: 'low' as Confidence,
  rationale: 'Recognized clinical document with no critical, abnormal, or actionable signal detected — parked as routine at low confidence; clinician may still review.',
};

const FALLBACK_RULE = {
  id: 'needs-review',
  criticality: 'needs_review' as Criticality,
  confidence: 'low' as Confidence,
  rationale: 'Could not be parsed/classified (e.g. unreadable or partial transmission). Routed to Needs review rather than guessed — never crash.',
};

const KNOWN_TYPES: InboxMessage['type'][] = ['lab', 'specialist_report', 'hospital_report', 'fax_form', 'refill', 'referral_in'];

// Explicit unreadable detection routes to needs_review even if a stray keyword hits.
const isUnreadable = (m: InboxMessage): boolean =>
  has(m, 'illegible', 'unreadable', 'transmission error', 'not parseable', 'ocr confidence low', 'truncated');

export function classify(msg: InboxMessage) {
  if (isUnreadable(msg)) return FALLBACK_RULE;
  const rule = RULES.find((r) => r.match(msg));
  if (rule) return rule;
  // No rule fired: a recognized document type is routine-by-default, not unclassifiable.
  return KNOWN_TYPES.includes(msg.type) ? DEFAULT_RULE : FALLBACK_RULE;
}

// Templated one-line summaries — within each bucket, give the clinician the gist.
function summarize(msg: InboxMessage, criticality: Criticality): string {
  const firstSentence = msg.body.split(/(?<=[.!])\s/)[0].trim();
  switch (criticality) {
    case 'needs_review':
      return `Could not classify — ${firstSentence}`;
    default:
      return firstSentence;
  }
}

// The single most salient abnormal value in a message (critical first, then
// any H/L flag), used to make the deep-thread drafts reference the actual
// finding rather than generic boilerplate. Undefined when there's no lab table.
function salientFinding(message: InboxMessage): string | undefined {
  const rows = message.labReport;
  if (!rows?.length) return undefined;
  const pick =
    rows.find((r) => r.flag === 'critical') ??
    rows.find((r) => r.flag === 'high' || r.flag === 'low');
  return pick ? `${pick.test} ${pick.result} (ref ${pick.ref})` : undefined;
}

// Letterhead organization per message type — makes each opened file read like a
// real document from a real source.
const ORG_BY_TYPE: Record<InboxMessage['type'], { org: string; orgMeta: string }> = {
  lab: { org: 'Eastern Ontario Regional Laboratory', orgMeta: '501 Smyth Rd, Ottawa ON · Accredited by IQMH' },
  specialist_report: { org: 'Specialist Consultation', orgMeta: 'Faxed to referring provider' },
  hospital_report: { org: 'The Ottawa Hospital', orgMeta: '1053 Carling Ave, Ottawa ON' },
  fax_form: { org: 'Incoming Fax', orgMeta: 'Document management' },
  refill: { org: 'Community Pharmacy', orgMeta: 'Rx renewal request' },
  referral_in: { org: 'Inbound Referral', orgMeta: 'Referral intake' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// Build the structured "source document" so Open file renders a real-looking page.
function buildSourceDoc(msg: InboxMessage, patient: Patient): ClinicalDocument {
  const org = ORG_BY_TYPE[msg.type];
  const isBackbone = msg.patientId === patient.id;
  const demographics = isBackbone
    ? { name: patient.name, dob: patient.dob, mrn: patient.id, healthCard: patient.healthCard }
    : { name: msg.patientName ?? 'Synthetic Patient', dob: '—', mrn: msg.patientId };

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
    const finding = salientFinding(message);
    const first = patient.name.split(' ')[0];
    const med = patient.medications[0];
    const actions: ProposedAction[] = [
      {
        type: 'patient_message',
        label: 'Draft patient message',
        draft: finding
          ? `Hello ${first}, we've reviewed your recent results and one value needs a quick follow-up (${finding}). Please book an appointment so we can review it together and adjust your care if needed. — Your care team`
          : `Hello ${first}, your recent results need a quick follow-up. Please book an appointment so we can review and adjust your care. — Your care team`,
        requiresApproval: true,
      },
      {
        type: 'followup_task',
        label: 'Create follow-up task',
        draft: `Review ${message.subject}${finding ? ` — ${finding}` : ''} for ${patient.name}; reconcile against active meds${med ? ` (${med})` : ''}.`,
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
