// Pure helpers for the approve flow — no React, no global state.
// The reducer (AppContext) stays thin because the Task/AuditEntry shapes are
// built here, deterministically, from a Suggestion + the clinician's edited
// drafts. AI prepares; the human approves; nothing is auto-filed.

import type { Suggestion, ProposedAction, Task, AuditEntry } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// A follow-up task lands tomorrow by default; patient messages carry no due date.
function defaultDue(action: ProposedAction): string | undefined {
  if (action.type !== 'followup_task') return undefined;
  return new Date(Date.now() + ONE_DAY_MS).toISOString();
}

// Build a filed Task from an approved action. Label prefers the (possibly edited)
// draft, falling back to the action's own label.
export function makeTask(suggestion: Suggestion, action: ProposedAction): Task {
  return {
    id: crypto.randomUUID(),
    label: action.draft.trim() || action.label,
    due: defaultDue(action),
    sourceSuggestionId: suggestion.id,
    createdAt: new Date().toISOString(),
  };
}

// Build an audit entry. Pure aside from the id + timestamp.
export function makeAuditEntry(params: {
  actor: string;
  action: string;
  targetId: string;
  before?: string;
  after?: string;
}): AuditEntry {
  return {
    id: crypto.randomUUID(),
    actor: params.actor,
    action: params.action,
    targetId: params.targetId,
    before: params.before,
    after: params.after,
    timestamp: new Date().toISOString(),
  };
}

// Approve a suggestion with the clinician's (possibly edited) actions.
// - one Task per followup_task action
// - one AuditEntry per action (records the before/after when a draft was edited)
// editedActions is matched to suggestion.proposedActions by index.
export function approveSuggestion(
  suggestion: Suggestion,
  editedActions: ProposedAction[],
): { tasks: Task[]; audits: AuditEntry[] } {
  const tasks: Task[] = [];
  const audits: AuditEntry[] = [];

  editedActions.forEach((action, i) => {
    const original = suggestion.proposedActions[i];
    const edited =
      original !== undefined && original.draft.trim() !== action.draft.trim();

    if (action.type === 'followup_task') {
      tasks.push(makeTask(suggestion, action));
    }

    audits.push(
      makeAuditEntry({
        actor: 'Clinician',
        action: `Approved & filed: ${action.label}`,
        targetId: suggestion.id,
        before: edited ? original.draft : undefined,
        after: edited ? action.draft : undefined,
      }),
    );
  });

  return { tasks, audits };
}
