---
name: plan
description: Inspect a project and turn an agreed Kaylo outcome into ordered phases and small, verifiable tasks, or revise the current phase plan after feedback or a blocker.
---

# Plan phases and tasks

Guide the user toward the simplest approach that meets the outcome. Work in the user's project.

## Workflow

1. Read project instructions, `OBJECTIVE.md` if present, `PLAN.md`, and the current phase plan its `Current:` line links. A concrete small-change request can supply the objective. Ask for missing intent only when it changes the work.
2. Inspect relevant code, dependencies, and checks. Establish repository facts yourself. A research worker may answer a bounded factual question; request file references or source links and remaining uncertainties.
3. Identify the planning case below. Trace the user flow and choose an approach using the rules below. Explain why it meets the outcome.
4. Resolve consequential unknowns: at most three numbered questions per round, each with a recommendation. For technical investigation, define a bounded research task with a question and expected deliverable.
5. Write or revise the phase plan using the plan and task requirements below, then update the index. Apply the revision rules when existing work is affected.

## Index and phases

- `PLAN.md` is the index: a `Current:` link to the current phase plan, then one ordered checklist line per phase with checkbox, number, name, link once its file exists, and a one-line goal. Nothing else.
- The phase plan holds everything else: scope, approach, agreement, tasks, findings, results, repair history, next step, and completion. Never duplicate these in the index.
- Phase state is derived: `[x]` is closed; the phase `Current:` links is current; other unchecked phases are planned. `Current:` may rest on a closed phase until the next plan; then no phase is open.
- Phase numbers are two-digit permanent IDs. Never renumber. An inserted phase takes the next free number; checklist position sets order. The folder slug is fixed at creation.
- A phase plan lives at `.kaylo/phases/NN-slug/NN-PLAN.md`; the index links are authoritative. Add `NN-RESEARCH.md` beside it only when research findings are too long for the phase plan.
- `.kaylo/` is project history; commit it with the project. Closed phases stay in place; read them only when a task needs their history.

## Planning cases

- No plan: write the index with every phase as an unlinked one-liner. Detail only the first phase, then link it and point `Current:` at it. A small change can be one phase.
- Current phase closed: detail the next unchecked phase, then link it and move `Current:`. Recheck the remaining one-liners against what was learned. Consider open optional follow-ups from the closed phase.
- Current phase open: revise only its phase plan, plus index lines when phase order, names, or goals change.
- Write the phase plan before moving `Current:`. Never create a later phase's folder or file while the current phase is open.
- Build routes work for another phase, or any ID while no phase is open, here. Reopen a closed phase only for unmet acceptance or insufficient evidence while no phase is open: uncheck it and move `Current:` back. Otherwise plan the work in the current or a new phase.

## Approach

- Check existing capability and configuration first, then helpers, standard libraries, native features, and installed dependencies before custom code.
- Prefer extending existing patterns. Recommend a more elaborate option only for a concrete requirement.
- Preserve requested behavior, readability, security, and accessibility; fewest lines is not the goal.
- Size tasks so a worker can complete one without designing the rest. Split L work where useful; keep remaining architectural judgment with a capable guiding model.

## Plan contents

Each phase plan records goal, scope and exclusions, approach, constraints, dependency-ordered tasks, review findings, actual agreement, and next step. Never invent approval. Preserve unrelated work and completed results.

Use the optional [index template](../../templates/PLAN.md) and [phase template](../../templates/PHASE.md), resolved relative to this skill directory, or preserve an existing equivalent format. A missing template does not block planning.

Each task requires:

- ID and checkbox; intended result and acceptance criteria.
- Verification: working directory, exact command and expected result, or manual action and observation.
- S/M/L complexity and free-text `Result` for evidence or blockers.
- Starting points, dependencies, concrete steps, and a complexity reason when needed to execute without guessing. Clear local S tasks need no redundant explanation.
- Existing failed-repair history.

Task and finding IDs restart per phase (`T1`, `R1`). A bare ID means the current phase; `02-T3` or `02-R1` names a specific phase. Never renumber or reuse an ID within a phase.

Complexity: **S** = clear local edit following an existing pattern; **M** = bounded feature or bug fix requiring reasoning; **L** = uncertain or cross-cutting work. Account for consequence: a short sensitive change may need a stronger model. Research tasks deliver findings, not code.

## Verification

- Verify that named commands exist; label proposed checks still needing creation.
- Checks must establish acceptance, not repeat implementation. Use existing project checks; do not add a testing framework for a small change.
- Include a user-facing check when automated tests do not establish the feature works.

## Status and revision

- `Status: Current` in a phase plan means it matches intended work. Otherwise use `Status: Needs revision: <reason>`; restore `Status: Current` after revising affected instructions and any index lines the reason names. Status does not mean agreed, verified, or complete.
- For older plans with `Draft` or no status, inspect scope and agreement. Normalize status during a relevant update without requiring a wholesale rewrite.
- Identify affected tasks and evidence. Reopen only for unmet acceptance or insufficient evidence following relevant changes. Optional findings alone do not reopen work.
- Reconsider dependent checks only when their inputs or assumptions changed, not merely because a task reopened.
- Preserve finding IDs, resolutions, and repair history. A new task ID does not reset an unresolved failure's repair limit.
- Request renewed agreement only for material changes to outcome, scope, or tradeoffs.

## Older single-file plans

- A `PLAN.md` with tasks inline is one implicit phase, including its `Status:` line. Build, review, and close use it unchanged.
- Convert it only during a relevant update: move its contents unchanged into `.kaylo/phases/01-<slug>/01-PLAN.md`, preserving IDs, findings, status, and history. Then write the index with `Current:` linking it, checked if its completion is recorded.

## Response

Keep implementation detail in the phase plan. Summarize the approach, first task, remaining decision, and one next step. Substantial or uncertain work → `/kaylo:review plan`; otherwise obtain any missing agreement, then `/kaylo:build`. Do not begin implementation. For hosts using a skill picker, identify the matching Kaylo skill.
