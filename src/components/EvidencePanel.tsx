import { useEffect, useState } from 'react';
import type { TriagedMessage, EvidenceRef, Suggestion, ProposedAction, ReferralDisposition } from '../types';
import { ConfidenceMeter } from './TriageBadge';
import { bucketConfig } from './criticality';
import { DocumentModal } from './DocumentModal';
import { SuggestionCard } from './SuggestionCard';
import { AuditTrail } from './AuditTrail';
import { ClinicianNotes } from './ClinicianNotes';
import { FileText, User, Pill, Sparkles } from './icons';
import { useApp } from '../state/AppContext';
import { deterministicEngine } from '../engine/deterministic';
import { analyzeWithClaude } from '../engine/claude';
import { assessReferral } from '../engine/referral';
import { approveSuggestion, makeAuditEntry } from '../state/actionQueue';

const SourceIcon = ({ type, className }: { type: EvidenceRef['sourceType']; className?: string }) => {
  if (type === 'fhir') return <User className={className} />;
  if (type === 'dpd') return <Pill className={className} />;
  return <FileText className={className} />;
};

// One source = one openable file. Shows a 2-line preview; "Open file" launches
// the full document so the clinician verifies the real source, not a snippet.
function EvidenceCard({ ev, onOpen }: { ev: EvidenceRef; onOpen: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow duration-150 motion-reduce:transition-none hover:shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <SourceIcon type={ev.sourceType} className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{ev.label}</div>
          <div className="truncate text-xs text-slate-500">{ev.value}</div>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 cursor-pointer rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800"
        >
          Open file
        </button>
      </div>
      <button
        onClick={onOpen}
        className="block w-full cursor-pointer border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300"
        title="Open the full source document"
      >
        <pre className="line-clamp-2 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-500">
{ev.snippet}
        </pre>
        <span className="mt-1 inline-block text-[11px] font-medium text-slate-400">Tap to verify the full document</span>
      </button>
    </div>
  );
}

const REF_LABEL: Record<ReferralDisposition['status'], string> = {
  needs_info: 'Needs info',
  decline_redirect: 'Decline / redirect',
  accept: 'Accept',
};
const REF_BADGE: Record<ReferralDisposition['status'], string> = {
  needs_info: 'border-amber-300 bg-amber-50 text-amber-800',
  decline_redirect: 'border-slate-300 bg-slate-200/60 text-slate-700',
  accept: 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

// Reuse the existing SuggestionCard + approval flow for referrals by mapping a
// ReferralDisposition onto the Suggestion shape. The fired intake rule becomes
// the rationale; the drafted response becomes the proposed action.
function referralToSuggestion(triaged: TriagedMessage, disp: ReferralDisposition): Suggestion {
  const msg = triaged.message;
  const label =
    disp.status === 'needs_info' ? 'NEEDS INFO' : disp.status === 'decline_redirect' ? 'DECLINE / REDIRECT' : 'ACCEPT';
  return {
    id: `ref-${msg.id}`,
    messageId: msg.id,
    patientId: msg.patientId,
    title: msg.subject,
    summary: disp.firedRule ? `${label} — ${disp.firedRule.reason}` : `${label} — meets intake criteria`,
    rationale: disp.firedRule?.reason ?? 'Meets the practice intake criteria — accept.',
    evidence: triaged.evidence,
    confidence: disp.confidence,
    proposedActions: disp.proposedActions,
    status: 'pending',
  };
}

// The self-learning loop, made tangible (and honest): the practice's intake
// rules are explicit and editable. A clinician adds a rule; it appears in the
// list and the engine checks every future referral against it. The intelligence
// surfaces candidate rules; authority stays human. Never a black box.
function PracticeRulesCard() {
  const { state, dispatch } = useApp();
  const [draft, setDraft] = useState('');
  const add = () => {
    const label = draft.trim();
    if (!label) return;
    dispatch({ type: 'ADD_INTAKE_RULE', label });
    setDraft('');
  };
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">
        Practice intake rules ({state.practiceRules.length})
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-indigo-700/70">
        Every referral is checked against these. Clinicians add rules as they go — the list compounds. That accumulated
        judgement is the moat a base model doesn't have.
      </p>
      <ul className="mt-2 space-y-1">
        {state.practiceRules.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-xs text-slate-700">
            <span className="shrink-0 text-indigo-400">▸</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Teach the system a new intake rule…"
          className="min-w-0 flex-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={add}
          className="shrink-0 cursor-pointer rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}

export function EvidencePanel({ triaged }: { triaged: TriagedMessage | null }) {
  const { state, dispatch } = useApp();
  const { patient, settings, actionStatus, tasks, audit, notes } = state;
  const [openDoc, setOpenDoc] = useState<EvidenceRef | null>(null);

  // Deep-thread suggestion for the selected message. Deterministic is synchronous;
  // live AI is async (overlays Claude's summary+drafts, silently falls back).
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [drafting, setDrafting] = useState(false);
  const messageId = triaged?.message.id ?? null;

  useEffect(() => {
    if (!triaged) {
      setSuggestion(null);
      return;
    }
    const msg = triaged.message;
    if (msg.type === 'referral_in') {
      // Referrals are assessed deterministically against the practice intake rules.
      setSuggestion(referralToSuggestion(triaged, assessReferral(msg)));
      setDrafting(false);
      return;
    }
    if (settings.liveAI) {
      let cancelled = false;
      setDrafting(true);
      setSuggestion(null);
      analyzeWithClaude(msg, patient).then((s) => {
        if (!cancelled) {
          setSuggestion(s);
          setDrafting(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    setSuggestion(deterministicEngine.analyze(msg, patient));
    setDrafting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, settings.liveAI]);

  if (!triaged) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <Sparkles className="h-7 w-7 text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-600">Select a message to verify</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          AI prepares the triage. You verify the source. You approve.
          It never acts on its own.
        </p>
      </div>
    );
  }

  const cfg = bucketConfig(triaged.criticality);
  const refDisp: ReferralDisposition | null =
    triaged.message.type === 'referral_in' ? assessReferral(triaged.message) : null;
  const status = suggestion ? actionStatus[suggestion.id] ?? 'pending' : 'pending';

  const handleApprove = (editedActions: ProposedAction[]) => {
    if (!suggestion) return;
    const { tasks: newTasks, audits } = approveSuggestion(suggestion, editedActions);
    dispatch({ type: 'APPROVE_SUGGESTION', suggestionId: suggestion.id, tasks: newTasks, audits });
  };

  const handleReject = () => {
    if (!suggestion) return;
    dispatch({
      type: 'REJECT_SUGGESTION',
      suggestionId: suggestion.id,
      audit: makeAuditEntry({ actor: 'Clinician', action: `Rejected draft: ${suggestion.title}`, targetId: suggestion.id }),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full ${cfg.chip} px-2.5 py-0.5 text-xs font-bold text-white`}>
            {cfg.label}
          </span>
          {triaged.message.patientName && (
            <span className="text-xs font-medium text-slate-500">{triaged.message.patientName}</span>
          )}
        </div>
        <h2 className="mt-2 text-base font-semibold text-slate-900">{triaged.message.subject}</h2>
        <p className="mt-1 text-sm text-slate-600">{triaged.summary}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <ConfidenceMeter confidence={triaged.confidence} />

        {refDisp && (
          <div className={`rounded-lg border px-3 py-2.5 ${REF_BADGE[refDisp.status]}`}>
            <div className="text-xs font-bold uppercase tracking-wide">
              Referral disposition: {REF_LABEL[refDisp.status]}
            </div>
            {refDisp.firedRule && <div className="mt-1 text-sm leading-snug">{refDisp.firedRule.reason}</div>}
            <div className="mt-1.5 text-[11px] opacity-80">
              Checked against the practice's intake rules. AI prepares the response; you approve. Never auto-acted.
            </div>
          </div>
        )}

        {refDisp && <PracticeRulesCard />}

        <div className="rounded-lg bg-slate-800 p-3 text-sm text-slate-100">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Why the AI ranked it here
          </div>
          {triaged.rationale}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Evidence — the actual source, inline
          </div>
          <div className="space-y-2">
            {triaged.evidence.map((ev, i) => (
              <EvidenceCard key={i} ev={ev} onOpen={() => setOpenDoc(ev)} />
            ))}
          </div>
        </div>

        {/* The differentiator: AI-drafted actions the clinician edits + approves */}
        {drafting ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 motion-reduce:animate-none" />
            Drafting actions with live AI…
          </div>
        ) : (
          suggestion && (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              status={status}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )
        )}

        {/* The clinician's own notes — their voice alongside the AI's */}
        <ClinicianNotes
          value={notes[triaged.message.id] ?? ''}
          onChange={(text) => dispatch({ type: 'SET_NOTE', messageId: triaged.message.id, text })}
        />

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filed for this patient
          </div>
          <AuditTrail tasks={tasks} audit={audit} />
        </div>
      </div>

      <DocumentModal ev={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
