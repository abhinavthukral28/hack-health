import { useEffect } from 'react';

// A generic confirm dialog mirroring DocumentModal's overlay pattern: fixed
// backdrop, Esc-to-close, click-backdrop-to-close, role="dialog" aria-modal.
// Kept generic so SuggestionCard (or the integrator) can reuse it for the
// approve confirmation — AI prepares, the human confirms.
export function ApprovalModal({
  open,
  title,
  body,
  confirmLabel = 'Approve & file',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {body && <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-md bg-slate-800 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-1"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
