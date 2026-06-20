import { useApp } from '../state/AppContext';

// Swaps the deep-thread summary + draft for a real LLM call (via OpenRouter
// through the dev proxy), silently falling back to deterministic on any failure.
// Styled to mirror AiTriageToggle; SVG glyph (no emoji), focus-visible + motion-reduce.
export function LiveAiToggle() {
  const { state, dispatch } = useApp();
  const on = state.settings.liveAI;
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'TOGGLE_LIVE_AI' })}
      title="Swaps the deep-thread summary+draft for a real LLM call via OpenRouter; silently falls back to deterministic."
      aria-pressed={on}
      className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 motion-reduce:transition-none ${
        on
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="m5.6 5.6 2.1 2.1" />
        <path d="m16.3 16.3 2.1 2.1" />
        <path d="m18.4 5.6-2.1 2.1" />
        <path d="m7.7 16.3-2.1 2.1" />
      </svg>
      <span>Live AI</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition motion-reduce:transition-none ${
          on ? 'bg-white/30' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition motion-reduce:transition-none ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="w-7 text-xs font-bold">{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}
