import { Pencil, Check } from './icons';

// The clinician's own free-text notes, sitting alongside the AI triage and the
// AI-prepared actions. Deliberately styled as "your input" (indigo) to read as
// distinct from the AI's drafts (slate) — the human's voice next to the AI's.
// Auto-saves on change (per the UX guidance: persist without an explicit submit).
export function ClinicianNotes({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const hasNote = value.trim().length > 0;
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40">
      <div className="flex items-center justify-between gap-2 border-b border-indigo-100 px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Pencil className="h-4 w-4 text-indigo-500" />
          Your notes
        </span>
        {hasNote && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
      <div className="p-3">
        <label className="sr-only" htmlFor="clinician-notes">
          Clinician notes
        </label>
        <textarea
          id="clinician-notes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Add your own notes — context, your plan, what you told the patient…"
          className="w-full resize-y rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 transition-colors duration-150 motion-reduce:transition-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        <p className="mt-1.5 text-[11px] text-indigo-400">
          Your notes stay with this message — separate from the AI's draft.
        </p>
      </div>
    </div>
  );
}
