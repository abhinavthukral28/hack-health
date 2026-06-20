import type { InboxMessage, Patient, TriagedMessage, Suggestion } from '../types';

// One interface, two implementations — the live-AI toggle is a swap, not a rewrite.
//   deterministicEngine (default) | claudeEngine (same interface, falls back to deterministic on ANY failure)
export interface AiEngine {
  // stratify -> dedupe -> summarize
  triage(messages: InboxMessage[], patient: Patient): TriagedMessage[];
  // deep thread -> drafted actions
  analyze(message: InboxMessage, patient: Patient): Suggestion;
}
