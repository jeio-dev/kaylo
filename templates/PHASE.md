# NN [Phase name]: [one-line goal]

Status: Current

[Plan validity only: Current, or Needs revision: reason. Agreement and completion are recorded separately. Keep this the only line that starts with `Status:`; every such line in this file counts as the plan status.]

## Goal and scope

[The outcome for this phase, applicable constraints, and exclusions.]

## Design

[The simplest sufficient approach, what existing capability it reuses, and why it meets the criteria. When relevant, the foundation assessment and draft testing or environment decisions. Changed trust boundaries with their abuse or failure cases, mitigations, and the tasks and checks that establish them, or one line saying no boundary changes.]

[Consequential decisions use phase-local D1, D2, etc. with area/applicability,
rationale, alternatives/sacrifices, cost if wrong, reversal effort, revisit
trigger, and explicit whole-record supersession when applicable. Their identity
includes this phase and plan path, separate from dispatch D IDs. Ordinary
reversible local choices may remain one line. Accepted project ADRs plus settled
phase changes govern current work; promotion happens at close.]

## Agreement

[What the user actually agreed to, or which decision remains. Record the user's decisions as theirs and label choices you made as defaults. Ordinary single-task building needs nothing more. Only when the user has confirmed this phase ready for a phase-wide build, add a line beginning `Phase build readiness: confirmed by the user on YYYY-MM-DD`, with the actual date and a short statement of what they confirmed; remove it after a material revision; plan restores it only after a recheck and the user's new confirmation.]

## Tasks

- [ ] T1: [Observable result]
  - Estimate: S
  - Blocked by: None
  - Acceptance criteria: [What must be true]
  - Test plan: [Working directory, exact command and expected result, or manual action and observation; identify any check that must first be created]
  - Result: Not started

[`Blocked by` lists tasks above this one in this phase whose output it needs to implement or verify, or None; every task needs it. It sets order, not concurrency. For tasks that need them, add starting points, required packages or tools, concrete steps, and an estimate reason. Add `Issue: #12` (or `owner/repo#12`, or an `https://` link) when the task works on a tracked issue. Add `Risk: high` with its reason when the task changes consequential security behavior; build then requires a focused review before check-off. Use M or L for more complex work. IDs restart per phase. Before the first edit, replace a bare `Not started` placeholder with `In progress`; otherwise put `In progress` at the start of the existing `Result` and keep all earlier records in that line. Replace the leading unfinished state with actual evidence at check-off while retaining the starting workspace record, recorded check failures, superseded evidence, and failed-repair history within the same `Result:` line. Append dispatch records such as `{kaylo:v1 verify by=direct result=pass}` there as described in Kaylo's `WORKERS.md`. A blocked result includes the failure and next action.]

## Review

[Target, coverage, who performed the review, and limitations, with a dispatch or direct record naming `covers=`; a direct plan review records that it lacked fresh context. When the phase has them, keep a `Pull request:` line with its URL and state and a `Release note: <feature/fix/breaking/internal> (<provisional/reviewed/pending>) — <one line>` line here. When release-note adoption establishes the relevant release boundary, add `Release contribution: <boundary> / <delta>` here using close's release metadata contract, and optionally `Release area: <area>` for the project's concrete notes label; leave legacy plans valid when these are absent. Preserve classification rationale and earlier reviewed contributions as prose history, and reconcile later PR feedback locally. Record None when there are no review comments; otherwise use stable IDs, with the label first and then ` — `, for example:]

- R1: [blocking / non-blocking] — [open / fixed / accepted by user; decision: question asked and the user's answer, or where it is recorded]
  - Target and location: [Plan task or implementation file]
  - Consequence: [Observable failure or unmet requirement]
  - Correction: [Smallest useful correction]
  - Resolution: [Fix evidence (a blocking comment stays open until its recheck), or actual user decision for acceptance]
  - Recheck: [Required for fixes to blocking comments before closure; outcome and evidence]

## Next step

[One concrete action or decision, or None once nothing remains.]

## Completion

[Delivered outcome, verification, known limitations, and optional follow-ups. When consequential decisions are promoted, record Decision promotion: phase NN D1 -> ADR link, consistency checks, and historical-baseline limits before phase check-off. Call a limitation accepted only with the user's actual recorded decision naming it; cite that decision.]
