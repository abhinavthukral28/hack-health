import { useApp } from '../state/AppContext';

// "Don't interrupt me now" — a shared spine primitive. When on, the AI rail
// stays quiet (no proactive nudges); the clinician pulls instead of being pushed.
export function DndToggle() {
  const { state, dispatch } = useApp();
  const on = state.settings.doNotInterrupt;
  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_DND' })}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
        on ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600'
      }`}
      title="When on, the AI won't push proactive nudges"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-300'}`} />
      {on ? "Don't interrupt: ON" : "Don't interrupt"}
    </button>
  );
}
