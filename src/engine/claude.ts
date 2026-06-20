import type { InboxMessage, Patient, Suggestion } from '../types';
import { deterministicEngine } from './deterministic';

// ---------------------------------------------------------------------------
// Live-AI overlay. Same Suggestion shape as the deterministic engine, so the
// fallback is seamless: we START from the deterministic baseline and overlay
// ONLY Claude's summary + drafted action text. Evidence, confidence, approval,
// and audit stay OUR logic (real in both modes).
//
// The live call goes through the Vite dev proxy (/api/claude), which holds the
// API key server-side. No key / no network / error / latency > ~3s => SILENT
// fallback to the deterministic result. This function NEVER throws.
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 3000;

// The contract the dev proxy returns on success.
interface ClaudeProxyResponse {
  summary?: string;
  patient_message?: string;
  followup_task?: string;
}

// Map a proposed-action type to the proxy field holding Claude's drafted text.
function draftFor(
  type: Suggestion['proposedActions'][number]['type'],
  claude: ClaudeProxyResponse,
): string | undefined {
  switch (type) {
    case 'patient_message':
      return claude.patient_message;
    case 'followup_task':
      return claude.followup_task;
    default:
      return undefined;
  }
}

// Build the prompt from the message + patient. The proxy forwards this verbatim
// to the Anthropic Messages API and instructs Claude to return strict JSON.
function buildPrompt(message: InboxMessage, patient: Patient): string {
  const source = message.raw ?? message.body;
  return [
    'You are a clinical inbox assistant for a primary-care EMR.',
    'Given the message and patient context below, produce:',
    '  1. summary: a concise (<= 1 sentence) clinical summary for the clinician.',
    '  2. patient_message: a warm, plain-language draft message to the patient.',
    '  3. followup_task: a concise internal follow-up task for the care team,',
    "     referencing the patient's active medications where relevant.",
    'Respond with STRICT JSON only — no prose, no code fences — of the shape:',
    '{ "summary": string, "patient_message": string, "followup_task": string }',
    '',
    `# Message`,
    `Subject: ${message.subject}`,
    `Body: ${message.body}`,
    `Source document: ${source}`,
    '',
    `# Patient`,
    `Name: ${patient.name}`,
    `Active problems: ${patient.problems.join('; ') || 'none recorded'}`,
    `Active medications: ${patient.medications.join('; ') || 'none recorded'}`,
  ].join('\n');
}

export async function analyzeWithClaude(
  message: InboxMessage,
  patient: Patient,
): Promise<Suggestion> {
  // Deterministic baseline — our logic, the source of truth for the shape.
  const base = deterministicEngine.analyze(message, patient);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(message, patient) }),
      signal: controller.signal,
    });

    if (!res.ok) return base; // no key (503) / proxy error (502) => silent fallback

    const claude = (await res.json()) as ClaudeProxyResponse;

    // Overlay summary + drafts; keep id/evidence/confidence/rationale/status.
    return {
      ...base,
      summary: claude.summary ?? base.summary,
      proposedActions: base.proposedActions.map((action) => ({
        ...action,
        draft: draftFor(action.type, claude) ?? action.draft,
      })),
    };
  } catch {
    // Timeout / abort / network / parse error => silent fallback.
    return base;
  } finally {
    clearTimeout(timer);
  }
}
