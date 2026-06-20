# FirstPass — Submission Kit

*AI in Healthcare Co-Design Hackathon · June 20, 2026 · Invest Ottawa*

An LLM-powered AI workflow layer embedded inside the primary-care EMR inbox: it reads every incoming message, decides what matters, drafts what comes next, and triages inbound referrals against each clinic's own intake rules. Built and clinician-validated on event day, on synthetic data only.

> **Name:** "FirstPass" is the working name (swappable). Alternatives in the appendix.

---

## Written submission

> ## FirstPass — the inbox that thinks before you do.
> *An LLM-powered layer inside the primary-care EMR that reads every incoming message, decides what matters, and drafts what comes next.*
>
> **The inbox is a dumb pipe.** A doctor we sat with this morning faces **~150 messages a day** in one EMR panel — labs, faxes, hospital reports, referrals — dumped in arrival order, no filtering, worked through one by one. *"If you don't get to message 149, you just don't get to it."* The inbox *moves* information; it has never *understood* it. His real example: a patient's results sat **unseen for 10 days** because the responsible doctor was away and nothing caught it.
>
> **We made it think.** FirstPass reads every message with a large language model and gives each one the three things the inbox never has:
> - **A disposition** — *Critical now / Today / Can wait* — so the dangerous result is at the top, not buried at #149.
> - **Its evidence** — the **actual source document, inline**, one tap away, with a confidence level. You verify, edit, override. It never acts on its own.
> - **An action** — for an abnormal result it ties the value to the patient's medications and drafts the patient message *and* the follow-up task for one-click approval, with a full audit trail.
>
> **The hard part nobody has solved: referrals.** FirstPass triages inbound referrals against the practice's *own* intake rules — *Needs info / Accept / Redirect*. A suspected-cancer referral missing its required bloodwork and CT is caught **on arrival**, with a same-day request to the sender — instead of bouncing back declined 10 days later.
>
> **Why we win.** Triage is the easy part; the unsolved part is referral *disposition* — and the reason it's unsolved is that the rules deciding it **aren't written down anywhere.** They live in doctors' heads, differ by clinic, and change. A general LLM has the world's medical knowledge but not *your clinic's* intake criteria — ask it to triage a referral and it guesses. FirstPass captures those rules — starting from what a doctor tells you in five minutes, then learning from every correction they make — and makes them **explicit, auditable, and human-owned.** The rule set compounds with use. That accumulated, ratified, clinic-specific judgment is a proprietary knowledge layer a base model will never have, and it gets stronger the more the clinic uses it.
>
> **Safe, and real today.** Synthetic data only (Synthea / MTSamples-shaped). Every action is human-approved; the system biases to *ask the human*, never a silent decline. Text-in/text-out and FHIR-shaped — realistically deployable in 6–12 months.
>
> **Built with doctors, today.** Two clinician conversations *this afternoon* shaped the wedge and the cancer-referral intake rule. We didn't imagine the pain — they told us, and we built it.

---

## 3-minute presentation script

**[0:00 · Open. Look at the judges.]**
> "This morning, a doctor told us about a patient whose results sat **unseen for ten days** — because the one doctor who'd have caught them was on vacation, and no system flagged it. That's not negligence. That's the inbox."

**[0:20]**
> "A doctor gets about **150 messages a day** in a single EMR panel — labs, faxes, hospital reports, referrals — in arrival order, no filtering, worked through one by one. In his words: *'If you don't get to message 149, you just don't get to it.'* The inbox moves information. It has never *understood* it."

**[0:45]**
> "We built **FirstPass** — an AI layer that lives *inside* the EMR inbox. No new app, no second login. It reads every message and gives it the three things the inbox never has: a **disposition**, its **evidence**, and an **action**."

**[1:00 · CLICK: AI Triage ON]**
> "Watch. One click — and 150 messages stratify: **Critical now, Today, Can wait.** The dangerous result is at the top, not buried at 149."

**[1:15 · CLICK: open the critical lab]**
> "Open this critical result. The AI ties the value to the patient's medications, shows its confidence — and, the part that matters, it shows me the **actual lab report, right here, one tap.** I verify the source. It never acts on its own."

**[1:35 · CLICK: drafted actions → Approve]**
> "And it doesn't just summarize — it **drafts the action**: the message to the patient, the follow-up task. I edit one line, approve, and it's filed with an audit trail. Most tools stop at 'here's a summary.' Care falls through the gap between information and action. **We close it.**"

**[2:00 · CLICK: Referrals filter → cancer referral]**
> "Now — the part nobody has solved. **Referrals.** That same doctor told us a referral often gets declined *ten days after it arrives*, because every clinic has its own acceptance rules. This is an urgent **suspected-cancer** referral. FirstPass checks it against *this practice's own* intake rules and flags it: **Needs info — the bloodwork and CT aren't attached.** Without them the specialist visit is wasted. So it drafts a same-day request back to the sender. **Caught on arrival** — not declined, ten days from now, on a cancer pathway."

**[2:30 · Step away from the laptop. Face the judges.]**
> "And here's why this is defensible: those intake rules **aren't written down anywhere** — they live in doctors' heads and differ by clinic. A general AI guesses. FirstPass makes them explicit, lets doctors add to them, and **compounds** them — every clinic that uses it makes its own copy smarter. That human-approved judgment is the moat, and because every rule is approved by a person, it improves *without* becoming a black box."

**[2:50]**
> "Synthetic data only, every action human-approved, FHIR-shaped — deployable in 6 to 12 months. Doctors lose nearly **19 hours a week** to this. We didn't guess what they need. We asked them, today — and we built it. **FirstPass: the inbox that finally thinks before you do.** Thank you."

**Delivery tips:** rehearse the 5 clicks (triage ON → critical lab → approve → Referrals filter → cancer referral) until automatic; slow down on the two quotes; deliver the moat line off-screen, eye contact; if long, cut the 19-hours line.

---

## 60-second video-demo script

**[0:00 — raw 150-message inbox]**
> "Doctors face **150 messages a day** in one inbox — labs, faxes, referrals. Miss one, and a critical result can sit unseen for ten days."

**[0:09 — CLICK: AI Triage ON]**
> "FirstPass is an AI layer *inside* the EMR. One click — and it sorts everything: **Critical now, Today, Can wait.**"

**[0:18 — CLICK: open the critical lab]**
> "Open the critical result — it ties the value to the patient's meds, shows its confidence, and the **actual source document, one tap.**"

**[0:28 — CLICK: edit → Approve]**
> "It doesn't just summarize — it **drafts** the patient message and the follow-up task. You approve. It never acts on its own."

**[0:37 — CLICK: Referrals filter → cancer referral]**
> "Now the hard part: **referrals.** This urgent cancer referral is missing its required bloodwork and CT — so FirstPass flags it **Needs info** and drafts a same-day request to the sender. **Caught on arrival** — not declined ten days later."

**[0:50 — Practice intake rules card]**
> "It checks each clinic's **own** intake rules — and learns new ones as doctors add them. That's the moat a general AI can't copy."

**[0:57 — hold on the panel / title]**
> "**FirstPass — the inbox that finally thinks before you do.**"

**Recording tips:** run the deterministic path so nothing hangs; pre-stage the clicks with one silent dry run; pause a half-beat on the triage-ON and "Needs info" reveals; if over 60s, cut the intake-rules line.

---

## Defensibility, distilled (for judge Q&A)

> "Sorting messages is commodity. The defensible asset is the **per-clinic intake knowledge** — the idiosyncratic, unwritten rules that decide which referrals get accepted. A foundation model doesn't have them; they live in people's heads. We turn them into an explicit, growing, human-ratified rule set. Every clinic that uses FirstPass makes its own copy smarter, and that knowledge compounds and travels. It's a data network effect in the one domain where trust and specificity matter most — and because every rule is human-approved, it gets better *without* becoming a black box."

---

## How it maps to the judging criteria

| Axis | How FirstPass scores |
|---|---|
| **Clinical importance** | ~150 messages/day, ~19 hrs/week lost; the 10-days-unseen wound. High-frequency, high-stakes. |
| **Technical feasibility** | Working prototype today; text-in/text-out, FHIR-shaped, synthetic data — deployable in 6–12 months. |
| **Safety & privacy** | Synthetic data only; every action human-approved; shown reasoning + inline source + audit trail; biases to ask-the-human, never a silent decline. |
| **Workflow fit** | Lives *inside* the EMR inbox — no new app, no second login. Disposition + evidence + drafted action with no added clicks. |

---

## Appendix — name options

| Name | Why |
|---|---|
| **FirstPass** (rec) | The AI takes the first pass so nothing reaches the doctor unsorted. Clear, clinical, trustworthy. |
| **Sift** | Short, brandable; separates the critical from the noise. |
| **Throughline** | Keeps the patient's thread across a fragmented inbox; nods to continuity. |
| **Cardinal** | Compass/direction gravitas; clinical, memorable. |
| **Relay** | Leans into the referral/handoff angle. |
