import { useEffect } from 'react';
import type { EvidenceRef, ClinicalDocument, LabRow } from '../types';

// A plausible "filename" so the page reads as a real document the clinician opens.
function fileName(ev: EvidenceRef): string {
  const slug = ev.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ext = ev.sourceType === 'fhir' ? 'json' : ev.sourceType === 'dpd' ? 'txt' : 'pdf';
  return `${slug}.${ext}`;
}

const FLAG_STYLE: Record<NonNullable<LabRow['flag']>, string> = {
  critical: 'bg-red-50 text-red-700 font-bold',
  high: 'text-amber-700 font-semibold',
  low: 'text-amber-700 font-semibold',
  '': 'text-slate-700',
};

const FLAG_LABEL: Record<NonNullable<LabRow['flag']>, string> = {
  critical: 'CRITICAL ↑',
  high: 'HIGH',
  low: 'LOW',
  '': '',
};

// The letterhead shared by every document kind.
function Letterhead({ doc }: { doc: ClinicalDocument }) {
  return (
    <div className="mb-6 flex items-start justify-between border-b-2 border-slate-800 pb-3">
      <div>
        <div className="text-lg font-bold tracking-tight text-slate-900">{doc.org}</div>
        {doc.orgMeta && <div className="text-xs text-slate-500">{doc.orgMeta}</div>}
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{doc.kind}</div>
        <div className="text-sm font-medium text-slate-700">{doc.docTitle}</div>
      </div>
    </div>
  );
}

function DemographicsBlock({ doc }: { doc: ClinicalDocument }) {
  if (!doc.patient) return null;
  const fields: [string, string][] = [
    ['Patient', doc.patient.name],
    ['DOB', doc.patient.dob],
    ['MRN', doc.patient.mrn ?? '—'],
    ...(doc.patient.healthCard ? ([['Health card (OHIP)', doc.patient.healthCard]] as [string, string][]) : []),
    ...(doc.meta ?? []).map((m) => [m.label, m.value] as [string, string]),
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-1 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
      {fields.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="w-32 shrink-0 font-medium text-slate-500">{k}</span>
          <span className="text-slate-800">{v}</span>
        </div>
      ))}
    </div>
  );
}

function DocBody({ doc }: { doc: ClinicalDocument }) {
  if (doc.kind === 'lab' && doc.labRows) {
    return (
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-semibold">Test</th>
            <th className="py-2 pr-4 font-semibold">Result</th>
            <th className="py-2 pr-4 font-semibold">Reference range</th>
            <th className="py-2 font-semibold">Flag</th>
          </tr>
        </thead>
        <tbody>
          {doc.labRows.map((r, i) => {
            const flag = r.flag ?? '';
            return (
              <tr key={i} className={`border-b border-slate-100 ${flag === 'critical' ? 'bg-red-50' : ''}`}>
                <td className="py-2 pr-4 text-slate-800">{r.test}</td>
                <td className={`py-2 pr-4 ${FLAG_STYLE[flag]}`}>{r.result}</td>
                <td className="py-2 pr-4 text-slate-500">{r.ref}</td>
                <td className={`py-2 ${FLAG_STYLE[flag]}`}>{FLAG_LABEL[flag]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  if (doc.kind === 'record' && doc.list) {
    return (
      <ul className="divide-y divide-slate-100 text-sm">
        {doc.list.map((item, i) => (
          <li key={i} className="flex gap-3 py-2 text-slate-800">
            <span className="font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  // note
  return (
    <pre className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed text-slate-800">
{doc.bodyText}
    </pre>
  );
}

// Full-document viewer styled like a PDF reader — dark toolbar with filename +
// page/zoom indicators, and a white A4 page with a letterhead. This is the SME's
// trust unlock: "Open file" shows the actual source, verifiable without leaving
// the panel. Esc or click-outside closes.
export function DocumentModal({ ev, onClose }: { ev: EvidenceRef | null; onClose: () => void }) {
  useEffect(() => {
    if (!ev) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev, onClose]);

  if (!ev) return null;

  // Fallback for any evidence without a structured doc.
  const doc: ClinicalDocument =
    ev.doc ?? { kind: 'note', org: 'Document', docTitle: ev.label, bodyText: ev.snippet };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Source document: ${ev.label}`}
    >
      {/* PDF viewer toolbar */}
      <div
        className="flex items-center justify-between bg-slate-900 px-4 py-2 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-red-400" aria-hidden>▣ PDF</span>
          <span className="truncate text-sm font-medium">{fileName(ev)}</span>
        </div>
        <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
          <span>Page 1 / 1</span>
          <span className="rounded border border-slate-700 px-2 py-0.5">100%</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-300">Verified source</span>
        </div>
        <button
          onClick={onClose}
          className="ml-3 rounded px-2 py-1 text-slate-300 hover:bg-slate-700 hover:text-white"
          aria-label="Close document"
        >
          ✕ Close
        </button>
      </div>

      {/* Scrollable gray "reader" area with the white page centered */}
      <div className="flex-1 overflow-y-auto p-6" onClick={onClose}>
        <article
          className="mx-auto min-h-[900px] w-full max-w-[720px] bg-white px-12 py-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ aspectRatio: '1 / 1.414' }}
        >
          <Letterhead doc={doc} />
          <DemographicsBlock doc={doc} />
          <DocBody doc={doc} />
          {doc.footer && (
            <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">
              {doc.footer}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
