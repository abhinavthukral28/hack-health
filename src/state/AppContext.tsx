import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { TriagedMessage, Task, AuditEntry, Patient } from '../types';
import { deterministicEngine } from '../engine/deterministic';
import { messages } from '../fixtures/messages';
import { patient } from '../fixtures/patient';

type SuggestionStatus = 'pending' | 'approved' | 'edited' | 'rejected';

// One AppContext, reducer-shaped, zero deps — boring by default.
// The approve flow being reducer-shaped is what keeps it clean + testable, and
// is why every deferred "future spine" module plugs in without touching the shell.

interface Settings {
  aiTriageOn: boolean; // the AI triage LAYER on/off (before -> after). Distinct from liveAI.
  liveAI: boolean; // deterministic vs live Claude (future block)
  doNotInterrupt: boolean;
}

interface AppState {
  patient: Patient;
  triaged: TriagedMessage[];
  tasks: Task[];
  audit: AuditEntry[]; // newest first
  // Per-suggestion approval status, keyed by suggestion id (suggestions are
  // computed on demand from the selected message, so we track status here).
  actionStatus: Record<string, SuggestionStatus>;
  // Clinician's own free-text notes, keyed by message id — added alongside the
  // AI triage/suggestions. The human's voice next to the AI's.
  notes: Record<string, string>;
  settings: Settings;
  selectedMessageId: string | null;
}

type Action =
  | { type: 'SELECT_MESSAGE'; id: string | null }
  | { type: 'TOGGLE_AI_TRIAGE' }
  | { type: 'TOGGLE_DND' }
  | { type: 'TOGGLE_LIVE_AI' }
  | { type: 'APPROVE_SUGGESTION'; suggestionId: string; tasks: Task[]; audits: AuditEntry[] }
  | { type: 'REJECT_SUGGESTION'; suggestionId: string; audit: AuditEntry }
  | { type: 'SET_NOTE'; messageId: string; text: string };

// Fixtures re-seed identically on every load (demo-day rule: refresh resets the pile).
function initialState(): AppState {
  return {
    patient,
    triaged: deterministicEngine.triage(messages, patient),
    tasks: [],
    audit: [],
    actionStatus: {},
    notes: {},
    // AI triage starts OFF so the demo opens on the raw inbox ("before"), then
    // the presenter flips it ON to reveal the stratified queue ("after").
    settings: { aiTriageOn: false, liveAI: false, doNotInterrupt: false },
    selectedMessageId: null,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_MESSAGE':
      return { ...state, selectedMessageId: action.id };
    case 'TOGGLE_AI_TRIAGE':
      return { ...state, settings: { ...state.settings, aiTriageOn: !state.settings.aiTriageOn } };
    case 'TOGGLE_DND':
      return { ...state, settings: { ...state.settings, doNotInterrupt: !state.settings.doNotInterrupt } };
    case 'TOGGLE_LIVE_AI':
      return { ...state, settings: { ...state.settings, liveAI: !state.settings.liveAI } };
    case 'APPROVE_SUGGESTION':
      return {
        ...state,
        tasks: [...state.tasks, ...action.tasks],
        audit: [...action.audits, ...state.audit],
        actionStatus: { ...state.actionStatus, [action.suggestionId]: 'approved' },
      };
    case 'REJECT_SUGGESTION':
      return {
        ...state,
        audit: [action.audit, ...state.audit],
        actionStatus: { ...state.actionStatus, [action.suggestionId]: 'rejected' },
      };
    case 'SET_NOTE':
      return { ...state, notes: { ...state.notes, [action.messageId]: action.text } };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
