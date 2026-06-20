import { useApp } from '../state/AppContext';
import { TriagedInbox } from './TriagedInbox';
import { EvidencePanel } from './EvidencePanel';
import { DndToggle } from './DndToggle';
import { AiTriageToggle } from './AiTriageToggle';
import { RawInboxList } from './RawInboxList';
import { Sparkles } from './icons';
import { messages } from '../fixtures/messages';

// Generic Canadian family-practice EMR. The product brand here is the *clinic's*
// system — COMPASS is demoted to an embedded AI panel ("powered by COMPASS").
// The doctor should feel "my inbox got an AI panel," not "I opened a new app."
const CLINIC = 'Rideau Valley Family Health Team';
const PROVIDER = 'Dr. A. Okafor, MD CCFP';
const TODAY = '20 Jun 2026';
const INBOX_TOTAL_TODAY = messages.length;

// Familiar EMR modules. Only Inbox is wired — the rest are present so it reads
// as a whole EMR, with AI living inside one part of it.
const NAV = [
  { icon: '📅', label: 'Schedule' },
  { icon: '👥', label: 'Patients' },
  { icon: '📥', label: 'Inbox', active: true, badge: INBOX_TOTAL_TODAY },
  { icon: '🧪', label: 'Labs' },
  { icon: '✓', label: 'Tasks' },
  { icon: '🧾', label: 'Billing' },
  { icon: '📊', label: 'Reports' },
];

export function EmrShell() {
  const { state, dispatch } = useApp();
  const { triaged, selectedMessageId, settings } = state;
  const aiOn = settings.aiTriageOn;

  const selected = triaged.find((t) => t.message.id === selectedMessageId) ?? null;
  const criticalCount = triaged.filter((t) => t.criticality === 'critical' && !t.duplicateOf).length;

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* EMR module nav — the host system */}
      <nav className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <span className="grid h-7 w-7 place-items-center rounded bg-slate-800 text-xs font-bold text-white">
            ▦
          </span>
          <span className="text-sm font-semibold text-slate-700">MapleChart</span>
        </div>
        <div className="flex-1 py-2">
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                item.active
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-slate-400'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-400">
          {CLINIC}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Masthead — the clinic's system, the provider, the date */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{CLINIC}</span>
            <span className="mx-2 text-slate-300">›</span>
            Provider Inbox
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">{TODAY}</span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="font-medium text-slate-700">{PROVIDER}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              AO
            </span>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px] overflow-hidden">
          {/* Inbox */}
          <main className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900">Inbox</span>
                  <span className="text-2xl font-bold text-slate-900">{INBOX_TOTAL_TODAY}</span>
                  <span className="text-sm text-slate-500">today</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {aiOn ? (
                    <>
                      AI triaged ·{' '}
                      <span className="font-semibold text-critical-text">{criticalCount} critical</span> surfaced to the top
                    </>
                  ) : (
                    <>Newest first · untriaged — reviewed one by one</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiOn && <DndToggle />}
                <AiTriageToggle />
              </div>
            </div>

            {aiOn ? (
              <TriagedInbox
                triaged={triaged}
                selectedId={selectedMessageId}
                onSelect={(id) => dispatch({ type: 'SELECT_MESSAGE', id })}
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <RawInboxList messages={messages} />
              </div>
            )}
          </main>

          {/* AI rail — embedded panel, not a separate app */}
          <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-indigo-600" /> AI Triage
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                powered by COMPASS
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {aiOn ? (
                <EvidencePanel triaged={selected} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="text-4xl">✦</div>
                  <p className="mt-3 text-sm font-semibold text-slate-600">AI Triage is off</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Turn it on to rank, dedupe and summarize today's {INBOX_TOTAL_TODAY} messages —
                    the critical ones rise to the top.
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_AI_TRIAGE' })}
                    className="mt-4 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Turn on AI Triage
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
