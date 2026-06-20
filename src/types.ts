// The shared contract — locked in the engineering review.
// Every (future) COMPASS module emits this same shape, which is why the inbox
// slice proves the whole spine.

export type MessageType =
  | 'lab'
  | 'specialist_report'
  | 'hospital_report'
  | 'fax_form'
  | 'refill';

// 4th bucket ('needs_review') is the never-crash fallback for unclassifiable input.
export type Criticality = 'critical' | 'today' | 'can_wait' | 'needs_review';

export type Confidence = 'high' | 'medium' | 'low';

export interface InboxMessage {
  id: string;
  type: MessageType;
  receivedAt: string; // ISO
  patientId: string;
  subject: string;
  body: string;
  raw?: string; // raw source doc (lab table text, consult note) for the evidence panel
  dedupeKey?: string; // messages sharing a key are near-duplicates
}

// powers tap-to-source — the SME's trust unlock
export interface EvidenceRef {
  label: string;
  sourceType: 'lab' | 'note' | 'fhir' | 'dpd';
  value: string;
  snippet: string;
}

export interface TriagedMessage {
  message: InboxMessage;
  criticality: Criticality;
  confidence: Confidence;
  rationale: string; // the rule that fired — shown in the evidence panel
  summary: string;
  evidence: EvidenceRef[];
  duplicateOf?: string; // id of the message this one collapses into
}

export interface ProposedAction {
  type: 'patient_message' | 'followup_task';
  label: string;
  draft: string;
  requiresApproval: true;
}

export interface Suggestion {
  id: string;
  messageId: string;
  patientId: string;
  title: string;
  summary: string;
  rationale: string;
  evidence: EvidenceRef[];
  confidence: Confidence;
  proposedActions: ProposedAction[];
  status: 'pending' | 'approved' | 'edited' | 'rejected';
}

export interface Task {
  id: string;
  label: string;
  due?: string;
  sourceSuggestionId: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  before?: string;
  after?: string;
  timestamp: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  problems: string[];
  medications: string[];
  recentObs: { label: string; value: string; flag?: 'H' | 'L' | 'critical' }[];
  raw?: unknown; // FHIR R4 source kept for the evidence panel
}
