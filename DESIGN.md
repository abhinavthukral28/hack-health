# hack-health — Design Doc

> **Build status (2026-06-20): COMPLETE — implements this design doc.** Hero stratified-triage inbox (Critical now / Today / Can wait / Needs review) + tap-to-source evidence + deep-thread draft→edit→approve→audit + live-AI toggle (OpenRouter, silent deterministic fallback) + Tasks tab + Clinician Notes. Code review: clean (0 critical; trust boundary correct, enum-complete). Deterministic deep-thread drafts are value-specific; lab classifier hardened to structured flags.
>
> **+ Referral intelligence SHIPPED (15:28):** inbound referral triage (`referral_in`) with the clinician-sourced cancer intake rule (bloods + CT), a **Needs info** disposition + a drafted request-for-info routed through the existing approve→audit flow, and the self-learning **"add an intake rule"** gesture (the practice rules list compounds live). Additive — triage hero untouched. **16/16 tests, tsc + production build clean.** Visual eyeball pending (local browser was locked during build).



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

---

## SME insight #2 — referrals are the real moat (post-build, 2026-06-20)

A second clinician, asked "this triage seems simple — why hasn't it been done?", named the actual hard problem:

> "It gets very complicated with **referrals**. Some clinics don't accept some kinds of referrals; each clinic has its own way of accepting or declining. Every referral has to be studied. Sometimes a referral gets **declined 10 days after** it was received. The filter has to be more issue-based — 'referral likely to be declined.' You have to **give the model context** so it can filter better. That's why this hasn't been done."

**What this means for the product (do NOT rebuild today — this reframes the pitch and the roadmap):**

1. **The triage we built is the tractable slice; it is NOT the moat.** Lab/result acuity is mechanically classifiable. The unsolved core is **referral disposition** — per-clinic, undocumented, idiosyncratic acceptance rules, with a decline that lands days late. That's the same wound as our opener (silent failure + lost time), in a second domain.
2. **The moat is the accumulated per-clinic referral-acceptance context** — a knowledge layer that compounds with use and is hard to copy. That's what makes this a company, not a feature.
3. **Our architecture is already the right shape for it.** "Referral likely to be declined" drops into the existing `Suggestion` contract: classify disposition → surface the clinic rule that fired → draft the fix/resubmission → human approves. Same panel, same approval flow, plus a per-clinic rule/context layer. We don't pretend the model knows — we encode the rules, show the reasoning, keep the human in control. That's the honest answer to "naive LLMs filter referrals badly," and it's our strongest line with skeptical clinician judges.

**Pitch upgrades (use at 6pm):**
- **Second anecdote** that rhymes with the opener: "a referral silently declined 10 days later." Two wounds, one cause — the inbox has no intelligence about *disposition*.
- **Answer to "isn't triage easy?":** results triage is tractable; **referral intelligence is the hard, unsolved core, and our architecture is built for it.** Position the demo as the wedge that earns the right to build the hard part — with the per-clinic context layer as exactly what clinician co-design produces.
- **Promote referral intelligence** from "one of six future-spine modules" to **the named, highest-value, most-defensible next build.**
- **Do not oversell** triage as the whole solution. The honest framing scores higher on every judging axis.

---

## Feature design — Referral Intelligence (inbound referral triage)

**Reframe (per the build team):** the SME's pain is the *receiving* side — referrals **arrive** in the inbox, each must be studied against the practice's own intake criteria, and the disposition crawls out ~10 days *after it was received*. This is not an outbound compose tool. An inbound referral is **just another item in the 150-message pile** — the inbox already owes it a disposition. So this triages like everything else, with referral-specific logic. Stronger fit: it lives inside the inbox we already built.

**Goal:** when an inbound referral lands, the AI assigns a **disposition on arrival** — Accept / Needs info / Decline-or-redirect — against the practice's intake rules, shows the rule it applied, and drafts the response (acknowledge, request the missing item from the referrer, or a decline-with-redirect note). Disposition the day it arrives, not 10 days later.

**Hard constraint: purely additive.** New message type + intake-rules fixture + assessment; reuse the existing card/evidence/approval/audit. Triage engine, buckets, and hero untouched. If it can't be additive, cut it.

### Pressure-test refinements (locked)
- **Hero disposition = `needs_info`, not `decline`.** It's the literal antidote to the SME's wound ("would've been declined in 10 days — so we ask for the missing item on day zero"), it's pure assist, and it carries none of the "AI is rejecting referrals" liability that a clinician panel will push on.
- **Hero scenario is high-stakes:** an **urgent** referral (suspected-cancer / 2-week-wait pathway) missing required imaging. A bounce here = *delayed diagnosis*, matching the harm register of the lab-unseen opener — not "admin waste."
- **Safety asymmetry → bias to needs-info/route-to-human.** A false `needs_info` just asks a question; a false `decline` can harm a patient. `decline_redirect` is a *recommendation only*, always human-gated, never auto-acted. When unsure, the engine routes to the human, it does not decline.
- **Honest moat framing.** Don't claim "3 rules = a moat." Claim the *mechanism + compounding*: the intake rules are explicit, auditable, and editable by the practice, and they accumulate — the context a base model doesn't have. **Field note (2026-06-20):** a clinician could only give a *high-level* filter off the top of their head ("cancer referral needs bloods + a CT or the appointment's useless"). That coarseness IS the thesis — the detailed per-clinic acceptance logic lives in people's heads and isn't written down anywhere; the product makes it explicit and lets it compound. We're not transcribing a rulebook that exists, we're building the one that doesn't.
- **One crisp beat (~30s).** One referral, one disposition, one drafted request. No separate referrals tab; resist showing all three dispositions on stage.

### Data model (additive to `types.ts`)
```ts
type MessageType = ... | 'referral_in';        // an inbound referral request
interface InboxMessage { ...; referral?: InboundReferral }

interface InboundReferral {
  fromProvider: string;        // 'Dr. Patel, Bytown Walk-in Clinic'
  requestedService: string;    // 'ongoing diabetes management'
  reason: string;
  enclosed: string[];          // what the referrer attached: ['recent A1c']
  patientPostalCode?: string;  // for catchment checks
}

// The CONTEXT LAYER = OUR practice's own intake criteria (the moat — one set,
// the knowledge that compounds and that a base model doesn't have).
interface IntakeRule {
  id: string; label: string;            // 'New diabetes referral requires a recent A1c (<3mo)'
  check: (r: InboundReferral) => boolean;   // true = satisfied
  onFail: 'needs_info' | 'decline_redirect';
  reason: string;                       // shown when it fails
  redirectTo?: string;                  // for decline_redirect: 'Endocrinology, Riverside'
}

interface ReferralDisposition {
  status: 'accept' | 'needs_info' | 'decline_redirect';
  confidence: Confidence;
  firedRule?: { label: string; reason: string };
  redirectTo?: string;
  proposedActions: ProposedAction[];    // 'acknowledge' | 'request_info' | 'decline_redirect'
}
```

### Engine (additive — does NOT change `classify`/`triage`)
`assessReferral(message, intakeRules): ReferralDisposition` — deterministic, first-fail-wins:
1. Run the practice's `intakeRules` against the inbound referral.
2. First rule that fails → its `onFail` status (`needs_info` or `decline_redirect`) + the reason; if none fail → `accept`.
3. Draft the matching response: acknowledge / request-the-missing-item-from-referrer / decline-with-redirect note. The fired rule **is** the rationale shown in the evidence panel — same pattern as triage. Live-AI overlay optional (Claude phrases it; deterministic owns the disposition).

### UI (additive)
- `referral_in` messages render in the inbox with a **disposition badge** (green Accept / amber Needs info / slate Decline→redirect). They slot into the triage buckets naturally (a needs-info referral → Today).
- Selecting one opens the disposition in the **existing** right panel — reuse `SuggestionCard` + `EvidencePanel` + `ApprovalModal` + `AuditTrail`. The evidence "source" is the **practice intake rule** that fired (the context layer, made visible — the moat on screen).
- Approve → files the drafted response as a `Task` + `AuditEntry`, exactly like the triage approve flow.

### Fixtures
- `intakeRules.ts`: 3–4 of the practice's own intake criteria. **Hero rule (clinician-sourced, 2026-06-20):** *"Suspected-cancer referral requires the requisite bloodwork AND a CT enclosed — without them the specialist appointment is wasted → needs_info."* Plus 1–2 supporting rules (e.g. *"specialist referral requires a reason for referral"*, and one human-gated *decline_redirect* for clearly out-of-scope).
- **Hero fixture (build first):** ONE urgent inbound referral — suspected-cancer / 2-week-wait pathway — **missing the required imaging** → `needs_info`, draft a same-day request to the referrer. Bury it in the 150-pile so triage surfaces it.
- Optional, only if time: one clean **Accept**. Keep any `decline_redirect` clearly a *recommendation*, human-gated, never auto-acted.

### Demo beat (append after the deep-thread beat)
> "And here's the part nobody has solved." Point to an **urgent** inbound referral the triage surfaced. AI: **"Referral — NEEDS INFO: suspected-cancer pathway. The requisite bloodwork and CT aren't enclosed — without them the specialist visit is wasted. Drafted a same-day request to the referring office."** Show the intake rule it applied. One click sends it. *"Without this, the patient travels, waits weeks, and gets turned away to redo the workup — 10 days lost on a cancer pathway. Caught the day it arrives instead. And the rule it checked is the high-level filter a clinician gave us in five minutes — the product makes these explicit, and they compound. That's the context a base model doesn't have. That's the moat."* → clinical importance (patient harm) + feasibility + trajectory.

### Self-learning loop (roadmap + one cheap demo gesture)
The compounding vision: the system gets smarter at each practice as it's used. Three loops, by safety/feasibility:
- **(a) Human-ratified rule capture — safe, real, demoable now.** Every clinician override/edit is a labeled correction; the AI proposes *"Add this as an intake rule?"*, the clinician ratifies, it joins `intakeRules`. The `AuditEntry` override log is already this training signal — for free. Intelligence surfaces the rule; authority stays human. Auditable, not a black box.
- **(b) Outcome feedback — real ML, ~12-month.** A "likely accept" that gets declined is a labeled outcome; over volume you learn which features predict a bounce. Needs data infra + the rejection signal + cold-start patience.
- **(c) Cross-practice / federated — network effect, governance-heavy.** Rules learned at one practice seed others; privacy/consent/governance hit immediately.

**Trust rule (say to clinician judges):** never "self-mutating clinical AI" (a validation/regulatory nightmare that trips the black-box alarm). Always: **observes decisions → proposes explicit rules → human ratifies.** The system learns; the logic stays explicit and human-owned.

**Why a base LLM can't just do this:** it lacks your practice's accumulated, *ratified* intake corrections. That explicit, compounding, human-owned rule set is the moat — not the model.

**Optional demo gesture (~15–20 min, ONLY after the hero is solid):** after a clinician approves/overrides a referral disposition, show *"Add this as an intake rule?"* → it appears in a visible rules list. Makes "the system learns" tangible and honest with zero ML. Respect the cut-line.

### Build order + cut-line (~90 min, rehearse before 5:30)
1. `intakeRules.ts` fixture + `types.ts` additions.
2. `assessReferral()` deterministic + 2–3 unit tests (keep the spine green).
3. Disposition badge + wire the assessment into the existing right panel (reuse, don't rebuild).
4. 2 inbound referral fixtures in the pile.
5. **Cut-line T-45min:** stop. Rehearse. **Minimum lovable version** if short: ONE inbound referral + a "Needs info" badge + the intake-rule evidence + a drafted request-for-info. That alone lands the beat.

### The assignment (do now, high-leverage)
Grab a clinician SME for 5 minutes and get **2–3 real intake criteria** that make *their* office bounce an inbound referral (missing test, out of catchment, out of scope). Put their exact words into `intakeRules.ts`. Authentic rules, a second quotable pitch line, and it deepens the co-design story.

**Status: design approved (Approach A, inbound). Additive, demoable, lives inside the inbox you already built — triage hero untouched.**
