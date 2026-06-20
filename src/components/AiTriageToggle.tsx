import { useApp } from '../state/AppContext';

// The hero interaction: flips the inbox from raw/chronological ("before") to the
// AI-stratified queue ("after"). This is demo beat 1 -> 2.
export function AiTriageToggle() {
  const { state, dispatch } = useApp();
  const on = state.settings.aiTriageOn;
  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_AI_TRIAGE' })}
      className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        on
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
      }`}
      aria-pressed={on}
    >
      <span aria-hidden>✦</span>
      <span>Fast Triage</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          on ? 'bg-white/30' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="w-7 text-xs font-bold">{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}
