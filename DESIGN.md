# hack-health — Design Doc

**Event:** AI in Healthcare Co-Design Hackathon · June 20, 2026 · Invest Ottawa
**Session goal:** Win the 6pm demo with one sharp workflow that is also the credible first step of a real clinical pilot ("wedge that scales").
**Mode:** Builder/Hackathon with startup-grade rigor on demand + feasibility.

---

## The concept (one sentence)

An **AI triage panel embedded inside an EMR inbox** — no new app, no login — that turns a chaotic pile of incoming clinical messages into a ranked, deduped, summarized queue, and takes one thread all the way to a **drafted, evidence-backed, confidence-scored action the clinician edits and approves**, writing an audit trail.

## Why this wedge (the evidence)

- **It's the #1 stated need, twice.** The guide's expert panel ranked "digital medical office assistant" and "inbox manager" as the top two ideas, and named admin "where AI should start."
- **Highest frequency = highest clinical-importance score.** The inbox is a daily, multi-times-a-day wound. Family docs lose ~19 hrs/week to this class of work.
- **It demos in one glance.** Chaos → sorted queue is a visible before/after a judge feels in 5 seconds.
- **Most feasible in 6–12 months.** Text-in/text-out. No live EMR *write* access needed to be credible.
- **It's the wedge that scales into the whole product.** Own the inbox and the natural expansion is the *action each message implies*: a lab → follow-up tracking; a specialist note → referral loop; a form request → forms autofill. The inbox is the front door to every other COMPASS module.

## The risk we're naming (and beating)

Every team read the same guide saying inbox is #1, so the room converges here. **The pick is not the differentiator — execution is.** Most teams stop at "summarize the message." We win by being the team whose AI **drafts the action and routes it through approval + an audit trail** — the guide's "actionable outputs" and "calibrated trust" requirements, which most teams skip.

---

## SME interview findings (2026-06-20) — validated, re-weighted

Talked to a practicing family physician. The wedge is confirmed and sharper. *Their version wins where it differs from the above.*

**What they said (the gold):**
- **~150 messages/day**, gone through **one by one, no automatic filtration.** "If you don't get to message 149, you just don't get to it." The inbox is the single EMR panel where labs, x-rays, specialist consults, and results all land.
- **Miss = liability:** "If you miss something critical, you're responsible." Misses happen; a critical result can sit a day or more.
- **The story (pitch opener):** a patient's results sat **unseen for ~10 days** because the responsible physician was on vacation and no system caught it. "You have to have a system to review it — but no system's perfect."
- **Trust unlock = source transparency:** "Show me what it's drawing from — the lab result, the consult note, right there. In the initial phase I need to **independently verify everything.** We can't hand off to AI."
- **Their stated MVP:** "At the very least, **stratification** — what's critical and needs dealing with now vs. what can wait till tomorrow." He called that "very minimal" — i.e. even *just* prioritization earns its keep.

**What changes in the build:**
1. **Lead with criticality stratification, not summaries.** The hero of the triage view is buckets — **Critical now / Today / Can wait** — his explicit #1 and his floor-of-value. Dedupe/summarize support it; they aren't the headline.
2. **Evidence = the actual source document, inline, one tap.** The real lab value / consult note visible right there, so he verifies without leaving the panel. This is the trust unlock.
3. **Show the volume.** Render ~10–12 in detail but display a **"150 in inbox today"** count to set stakes.
4. **Frame as "AI prepares, you verify, you approve" — never auto-acts.** No handoff. Confidence + source link + approval are the whole trust story.
5. **Open the pitch with the 10-days-unseen story**, and name **coverage/handoff** (critical items don't vanish when a doc is away) as future spine.

---

## Scope

### In (build today)
- **EMR shell**, no login: top patient/context bar, inbox-centric layout, right-hand AI rail.
- **Mixed inbox** of ~10–12 synthetic messages (labs, specialist/hospital reports, faxes/forms), with a **"150 in inbox today"** counter for stakes → AI triage view that **stratifies into Critical now / Today / Can wait** (the clinician's stated #1), then dedupes and one-line-summarizes within each bucket. **This is the "whoa."**
- **One deep thread — abnormal lab result** — taken fully through:
  classify → dedupe → summarize → **tie the abnormal value to the patient's meds/conditions** → draft patient message + draft follow-up task → clinician **edit / approve / reject** → write **AuditEntry**.
  **Trust requirement (from SME):** the evidence panel shows the **actual source document inline** — the real lab value / consult note, one tap, so the clinician verifies without leaving the panel. AI prepares; the human verifies and approves; it never auto-acts.
- **Shared spine primitives** (built once, demoed via inbox): `Suggestion` contract, evidence + confidence badges, approval flow, audit trail, "don't interrupt me now" toggle.
- **"Live AI" toggle** that swaps deterministic logic for a real Claude call on the deep thread.

### Out (named in the pitch as "future spine," not built)
Pre-visit prep, prescribing safety, follow-up automation, encounter nudges, continuity/whole-person. Each is "the same panel, a different message-implied action."

---

## Build approach — deterministic-first + live toggle

**Decision: a demo that can't fail beats a demo that's impressive only when it works.**

- **Default engine is deterministic** — hand-written rule classifiers, templated summaries and action drafts. Runs offline, never fails, no key, privacy-clean. The full inbox + the deep thread work end-to-end with zero network.
- **"Live AI" toggle** swaps in a real **Claude** call (via a Vite dev proxy holding the API key server-side, never bundled) for the summary/draft on the deep thread — same UI, same `Suggestion` shape. Proves the real-AI story on demand. No key or no network → silent fallback to deterministic.
- Evidence, confidence, approval, and audit are **real in both modes** — they're our logic, not the model's.

This is the only approach that simultaneously: guarantees a working 6pm demo, shows real AI when we want it, and is an honest pilot seed (the architecture is real; the model is swappable).

---

## Architecture (only the inbox slice is built today)

```
src/
  core/
    Suggestion.ts        # the one contract every (future) module emits
    actionQueue.ts       # approval flow → task creation → AuditEntry log
    ai/engine.ts         # dispatcher: deterministic (default) | claude (toggle)
    ai/deterministic.ts  # rule classifiers + templated summary/draft
    ai/claude.ts         # live call via dev proxy (optional)
  components/
    EmrShell.tsx         # no-login shell: context bar | inbox | AI rail
    SuggestionCard.tsx ConfidenceBadge.tsx EvidenceBadge.tsx
    ApprovalModal.tsx AuditTrail.tsx DoNotInterruptToggle.tsx
  modules/inbox/         # the only module built today
  fixtures/              # committed synthetic data (see below)
vite.config.ts           # dev-only /api/claude proxy
```

**The one contract (`Suggestion`):** `{ id, patientId, title, summary, rationale, evidence[], confidence, proposedActions[], status }` — where each action `requiresApproval: true`. Every future module emits this same shape, which is why the inbox proves the whole spine.

## Data (synthetic / public only — no real patient data)

- **Inbox message text** — shaped from **MTSamples** (public medical transcriptions). ~10 curated messages committed as fixtures.
- **Patient backbone** (the abnormal-lab patient's meds/conditions the AI reasons against) — one **Synthea** FHIR R4 patient, normalized to a fixture, raw FHIR kept for the evidence panel.
- Optional: **Health Canada DPD** for a drug-name lookup if the lab ties to a medication.
- Only curated fixtures are committed; any raw downloads stay gitignored. Provenance recorded in `data/README.md`.

---

## Demo script (each beat mapped to a judging axis)

> **Open with the true story:** a patient's results sat unseen for ~10 days because the responsible physician was away and no system caught it. *"This is what we're here to prevent."*

1. **Open the EMR inbox** — "**150 today**," unsorted, the critical one buried among labs, faxes, consult notes. *"This is Dr. X at 7pm, going through every one by hand — no filtration."* → **workflow fit** (inside their EMR, no new login).
2. **Triage fires** — the pile **stratifies into Critical now / Today / Can wait**, deduped and summarized. *"The thing that could hurt someone is now at the top, not at message 149."* → **clinical importance** (the #1 daily burden, in their own words).
3. **Open the abnormal lab** — AI ties the value to the patient's meds/conditions, shows its **evidence + confidence**. → **safety & privacy** (shows reasoning, auditable, synthetic data).
4. **The differentiator** — AI has **drafted** the patient message + follow-up task. Clinician **edits one line, approves.** Audit entry appears. *"Most tools summarize. This one acts — and you stay in control."* → **actionable outputs + calibrated trust.**
5. **Flip "Live AI" on**, re-run the thread → real Claude, same flow. → real-AI credibility.
6. **The scale story** — *"This same panel, with a different message-implied action, is pre-visit, prescribing, follow-up, referrals. The inbox is the front door."* → feasibility + product trajectory.

## Build timeline (~7 hrs: 10:15 → 17:30, lunch 12:30)

| Block | Build |
|---|---|
| 10:15–11:15 | Scaffold (Vite/React/TS/Tailwind), `EmrShell`, fixtures from MTSamples + 1 Synthea patient |
| 11:15–12:30 | `Suggestion` contract, deterministic engine, inbox triage view (the "whoa") |
| 12:30–13:15 | Lunch (let the triage view marinate; grab a clinician SME — see assignment) |
| 13:15–15:00 | Deep thread: abnormal-lab reasoning, evidence + confidence, draft action |
| 15:00–16:00 | Approval flow + audit trail + "don't interrupt me" toggle |
| 16:00–16:45 | Live-AI toggle + dev proxy (timeboxed; cut first if behind) |
| 16:45–17:30 | Polish, rehearse the 6-beat demo, write the pitch |

---

## The assignment (do this before writing code)

Clinician SMEs are in the room today — that is the single most valuable resource here, and most teams won't use it well.

**Before 11:15, spend 10 minutes with a clinician SME and ask exactly this:**
1. "Walk me through the last time your inbox felt unmanageable. What was in it?"
2. "When an abnormal lab comes in, what do you *actually* do with it — and where does it fall through?"
3. "If an AI drafted the patient message and the follow-up task for you, what would have to be true for you to trust clicking approve?"

Capture their **exact words.** Use the most painful quote to open your 6pm pitch, and use answer #3 to sanity-check the approval/audit design. If they describe the pain differently than this doc does, *their version is the truth* — adjust the deep thread to match.

---

## What I noticed (founder signals)
- Strong instinct to attack problems "one by one on a shared architecture" — that's exactly the wedge-that-scales discipline, you just had the scope dial set too wide for one day.
- You asked for the recommendation instead of defending a pre-built plan — good sign you're optimizing for the right answer, not your sunk cost in the earlier draft.

**Status:** DONE — design approved across goal, wedge, slice, and build approach. Ready to build in the next session.

---

## CEO review — build discipline (HOLD on full scope / Approach B)

You chose full scope including the live-AI toggle. That's the highest-value *and* highest-risk path. These rules exist so the toggle can't cost you the hero.

### Hard build order + cut-line (the #1 protection)
Build so the **validated hero is demo-ready first**, the differentiator second, and the fragile toggle strictly last behind a wall-clock gate.

| By | Checkpoint | Rule |
|---|---|---|
| ~11:30 | **Foundation locked** | Scaffold + fixtures (MTSamples curation + 1 Synthea patient). This is the dependency for everything — do it first, timebox it. |
| ~15:00 | **HERO locked** | Stratified inbox (Critical now / Today / Can wait) + tap-to-source evidence, demo-ready and rehearsable. If this isn't done, everything below waits. |
| ~16:30 | **DIFFERENTIATOR locked** | Deep abnormal-lab thread: draft → edit → approve → AuditEntry. |
| **16:30 CUT-LINE** | **Toggle gate** | Only start the live-AI toggle if hero **and** differentiator are both demo-ready and rehearsed. If not, you do NOT build the toggle — you rehearse instead. |
| 16:30–17:30 | **Rehearse** | Run the 6-beat demo on the *deterministic-only* path until it's automatic. |

### Toggle containment (it must be additive, never load-bearing)
- **Separate code path behind a flag.** The live call never touches the hero render path. Hero is 100% deterministic, always.
- **Silent fallback:** no key / no network / error / latency over ~3s → return the deterministic result, show no error. Same `Suggestion` shape either way, so the UI is identical.
- **Demo rule:** rehearse to present fully deterministic. The toggle is a *bonus reveal*, not load-bearing. If it's flaky at 5:00, you simply don't flip it on stage — and the demo is unaffected.
- **Pre-test the exact demo message.** The one abnormal-lab message you'll flip live must be tested against the real Claude call beforehand so its output is predictable; keep its deterministic fallback ready for that exact message.

### Demo-day failure modes (live-presentation edge cases)
- **No venue internet** → deterministic path is 100% offline. Non-negotiable; it's the default anyway.
- **Projector legibility** → "150 today," the three buckets, and the critical flag must read from the back of the room. Big type, high contrast. Test on the actual screen.
- **Unclassifiable message** → route to a **"Needs review"** state, never crash. Empty/edge states are features.
- **Browser refresh mid-demo** → fixtures re-seed to the identical pile every load; state resets cleanly.
- **Near-duplicate messages** → dedupe must collapse them visibly (it's part of the "whoa").

### Resolve-now decisions (so you don't stall mid-build)
- **Buckets:** exactly 3 — Critical now / Today / Can wait (his words).
- **How "critical" is decided (deterministic):** a small rule table on message type + flags/keywords (abnormal-result flag, critical-value thresholds, "STAT", ER/discharge). Keep it explainable — **that rule IS the confidence rationale** shown in the evidence panel.
- **Confidence:** derive from rule strength (exact threshold breach = high; keyword-only = medium). Don't fabricate a number.
- **Evidence panel:** shows the **actual source document inline** (the lab value table / the consult-note text), one tap. This is the SME's trust unlock — treat it as P0, not polish.
- **Approval writes:** a `Task` + an `AuditEntry {actor, action, before, after, timestamp}`, rendered in a visible audit list.

### Deferred (future spine — name in the pitch, do not build)
Pre-visit prep · prescribing safety · follow-up automation · encounter nudges · continuity/whole-person · **coverage/handoff** (the vacation-gap story → "critical items don't vanish when a doc is away"). Each is "the same panel, a different message-implied action."

**Review verdict:** Scope is right and clinician-validated. The single live risk is the toggle eating polish time. The cut-line above neutralizes it. Ship it.

---

## Engineering review — locked architecture (build from this)

### Data model (the shared contract)
```ts
type MessageType  = 'lab' | 'specialist_report' | 'hospital_report' | 'fax_form' | 'refill';
type Criticality  = 'critical' | 'today' | 'can_wait' | 'needs_review';  // 4th = never-crash fallback bucket
type Confidence   = 'high' | 'medium' | 'low';

InboxMessage   { id; type; receivedAt; patientId; subject; body; raw?; dedupeKey? }
TriagedMessage { message; criticality; confidence; rationale; summary; evidence[]; duplicateOf? }
EvidenceRef    { label; sourceType:'lab'|'note'|'fhir'|'dpd'; value; snippet }   // powers tap-to-source
Suggestion     { id; messageId; patientId; title; summary; rationale; evidence[]; confidence;
                 proposedActions[]; status:'pending'|'approved'|'edited'|'rejected' }
ProposedAction { type:'patient_message'|'followup_task'; label; draft; requiresApproval:true }
Task           { id; label; due?; sourceSuggestionId; createdAt }
AuditEntry     { id; actor; action; targetId; before?; after?; timestamp }
Patient        { id; name; dob; problems[]; medications[]; recentObs[]; raw /* FHIR */ }
```

### Engine interface (one interface, two impls — toggle is a swap, not a rewrite)
```ts
interface AiEngine {
  triage(messages, patient): TriagedMessage[];   // stratify -> dedupe -> summarize
  analyze(message, patient): Suggestion;          // deep thread -> drafted actions
}
// deterministicEngine (default) | claudeEngine (same interface, wraps try/catch -> deterministic on ANY failure)
```
The fallback is the wrapper: `claudeEngine` calls `/api/claude`; on no-key / no-network / error / >3s timeout it returns the deterministic result. Same `Suggestion` shape either way, so the UI never changes.

### Core logic = deterministic rule table (first-match-wins)
```ts
type Rule = { match(msg, patient): boolean; criticality: Criticality; confidence: Confidence; rationale: string };
// e.g. abnormal-flag + critical threshold -> 'critical'/'high'; 'STAT'/ER/discharge keywords -> 'critical'/'medium';
// routine normal lab -> 'can_wait'/'high'; unmatched -> 'needs_review'/'low'
```
The rule that fires **is** the `rationale` shown in the evidence panel. Explainable + unit-testable in one move — this is how the SME's "show me what it's drawing from" requirement is satisfied cheaply.

### State = React Context + useReducer (boring by default, zero deps)
One `AppContext`: `{ patient, triaged[], suggestions[], tasks[], audit[], settings:{liveAI, doNotInterrupt} }`.
Actions: `APPROVE` (creates `Task` + appends `AuditEntry`), `EDIT`, `REJECT`, `TOGGLE_LIVE_AI`, `TOGGLE_DND`, `SELECT_MESSAGE`. The approve flow is reducer-shaped, so it's clean and testable.

### Data flow
```
fixtures (MTSamples msgs + 1 Synthea patient)
      |
      v
 AiEngine.triage(messages, patient)      <-- deterministic rules (default) | claude (toggle -> falls back)
      |  stratify -> dedupe -> summarize
      v
 TriagedMessage[] --> Inbox: [Critical now][Today][Can wait][Needs review]
      | select critical lab
      v
 AiEngine.analyze(msg, patient) --> Suggestion {draft actions, evidence, confidence}
      | clinician edit / approve / reject
      v
 reducer APPROVE --> Task + AuditEntry --> AuditTrail view
```

### File tree (concrete)
```
src/
  types.ts                       # all the interfaces above
  state/AppContext.tsx           # Context + useReducer
  engine/AiEngine.ts             # interface
  engine/deterministic.ts        # rule table + templated summary/draft  (UNIT TESTED)
  engine/deterministic.test.ts   # Vitest — the only test file
  engine/claude.ts               # live call + fallback wrapper
  fixtures/messages.ts patient.ts # committed synthetic data
  components/ EmrShell InboxList BucketGroup MessageCard TriageBadge
             EvidencePanel SuggestionCard ApprovalModal AuditTrail DndToggle LiveAiToggle
  api/claude (vite dev proxy in vite.config.ts)
```

### Test plan (locked: A — rule-engine units only)
`deterministic.test.ts` (Vitest, ~12 assertions): each criticality rule maps to the right bucket; the abnormal-lab fixture lands in `critical`; dedupe collapses the near-duplicate pair; `analyze()` produces both a patient-message draft and a follow-up task; unmatched message -> `needs_review` (never throws). No component/e2e tests — they're low-ROI for a one-day build, and the rule engine is where a stage-fatal bug would live.

### Performance / async
In-memory, synchronous, 10-12 messages — no perf concern. Only `claudeEngine.analyze` is async: spinner on that one card, ~3s timeout, fallback. Never blocks the inbox render.

**Eng verdict:** Architecture locked. Boring, testable, swap-friendly. The Context+reducer + single AiEngine interface mean every deferred module ("future spine") plugs in without touching the shell. Build foundation -> hero -> differentiator in that order. Ready to implement.
