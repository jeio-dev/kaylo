---
name: review
description: Review a Kaylo plan or implemented changes against the agreed outcome. Use before building uncertain work or before closing completed work.
---

# Review the work

Review either `plan` or `changes`. If unspecified, inspect the current phase plan and the working changes to choose the relevant target; ask only if the target remains ambiguous.

Read `PLAN.md` and follow its `Current:` link to the current phase plan; review only that phase. If its index line is checked `[x]`, report that no phase is open and route to `/kaylo:plan`. An older `PLAN.md` with tasks inline is the current phase plan; do not migrate it.

## Workflow

1. Prefer a fresh reviewer conversation or subagent within the user's tools and budget. When using one, read [references/delegation.md](references/delegation.md). Otherwise review directly and disclose the lack of a fresh context.
2. Inspect the selected target against the review checks below.
3. Read recorded verification. Run a focused missing check when useful. Reuse passing results only when history establishes unchanged relevant inputs: implementation, dependencies, configuration, runtime, data, and criteria. If uncertain, run an affected check when feasible or state the limit.
4. Check existing findings before reporting concrete issues. Use the finding rules below to record results in the current phase plan.

## Review checks

- **Plan:** requested outcome, reuse of existing capabilities, executable tasks, correct dependencies, and meaningful verification. Identify decisions a small-model builder would otherwise guess.
- **Changes:** actual implementation and relevant callers, acceptance criteria, correctness, regressions, and applicable security, accessibility, and data handling. Check that the user can reach the intended behavior; passing tests alone do not establish this.
- Identify duplicated capability, unnecessary dependencies, and speculative abstractions. Fewer lines alone do not justify changing readable, correct code.
- Report observable failures or unmet requirements. Preferences and hypothetical future features are not blockers. No findings is a valid result.
- Do not implement fixes during review.

## Findings and plan updates

- Record target, coverage, and limitations in the review section of the current phase plan.
- Each finding needs a file or task reference, consequence, smallest useful correction, blocker/optional label, and resolution: `open`, `fixed` with evidence, or `accepted by user` with the decision.
- The guiding assistant assigns stable `R1`, `R2`, etc., restarting per phase. Never renumber or reuse IDs within a phase. Give older unnumbered findings an ID when needed; avoid duplicates.
- Recheck a fix under its existing ID, recording evidence and outcome. Focus on the finding and affected behavior; widen review only for new evidence. Blocker fixes require this recheck before closure.
- The guiding assistant records resolutions after inspecting artifacts and evidence. Delegated reviewers return reports without editing shared plan state.
- Keep unresolved findings visible. Optional findings alone do not reopen completed tasks or block closure.
- Reopen affected work only when a blocker shows acceptance is unmet or relevant changes make required evidence insufficient.
- A material scope mismatch requires `Status: Needs revision: <reason>` in the current phase plan and a return to plan. An ordinary implementation defect does not. Plan restores `Status: Current` after revision; status does not imply agreement or completion.

## Response

State readiness, concrete blockers, and one next step:

- Plan corrections → `/kaylo:plan`.
- Implementation fixes → `/kaylo:build`.
- Implementation ready → `/kaylo:close`.
- Plan ready → obtain any missing agreement, then build.
