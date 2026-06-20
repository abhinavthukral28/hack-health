import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { TriagedMessage, Suggestion, Task, AuditEntry, Patient } from '../types';
import { deterministicEngine } from '../engine/deterministic';
import { messages } from '../fixtures/messages';
import { patient } from '../fixtures/patient';

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
  suggestions: Suggestion[];
  tasks: Task[];
  audit: AuditEntry[];
  settings: Settings;
  selectedMessageId: string | null;
}

type Action =
  | { type: 'SELECT_MESSAGE'; id: string | null }
  | { type: 'TOGGLE_AI_TRIAGE' }
  | { type: 'TOGGLE_DND' }
  | { type: 'TOGGLE_LIVE_AI' }
  | { type: 'APPROVE'; suggestion: Suggestion; task: Task; audit: AuditEntry }
  | { type: 'EDIT'; suggestionId: string; audit: AuditEntry }
  | { type: 'REJECT'; suggestionId: string; audit: AuditEntry };

// Fixtures re-seed identically on every load (demo-day rule: refresh resets the pile).
function initialState(): AppState {
  return {
    patient,
    triaged: deterministicEngine.triage(messages, patient),
    suggestions: [],
    tasks: [],
    audit: [],
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
    case 'APPROVE':
      return {
        ...state,
        tasks: [...state.tasks, action.task],
        audit: [action.audit, ...state.audit],
        suggestions: state.suggestions.map((s) =>
          s.id === action.suggestion.id ? { ...s, status: 'approved' } : s,
        ),
      };
    case 'EDIT':
      return {
        ...state,
        audit: [action.audit, ...state.audit],
        suggestions: state.suggestions.map((s) =>
          s.id === action.suggestionId ? { ...s, status: 'edited' } : s,
        ),
      };
    case 'REJECT':
      return {
        ...state,
        audit: [action.audit, ...state.audit],
        suggestions: state.suggestions.map((s) =>
          s.id === action.suggestionId ? { ...s, status: 'rejected' } : s,
        ),
      };
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
