---
name: plan
description: Inspect a project and turn an agreed Kaylo outcome into small, verifiable tasks, or revise its plan after feedback or a blocker.
---

# Plan a small change

Guide the user toward the simplest approach that meets the outcome. Work in the user's project.

## Workflow

1. Read project instructions, `OBJECTIVE.md` if present, and `PLAN.md`. A concrete small-change request can supply the objective. Ask for missing intent only when it changes the work.
2. Inspect relevant code, dependencies, and checks. Establish repository facts yourself. A research worker may answer a bounded factual question; request file references or source links and remaining uncertainties.
3. Trace the user flow and choose an approach using the rules below. Explain why it meets the outcome.
4. Resolve consequential unknowns: at most three numbered questions per round, each with a recommendation. For technical investigation, define a bounded research task with a question and expected deliverable.
5. Write or revise `PLAN.md` using the plan and task requirements below. Apply the revision rules when existing work is affected.

## Approach

- Check existing capability and configuration first, then helpers, standard libraries, native features, and installed dependencies before custom code.
- Prefer extending existing patterns. Recommend a more elaborate option only for a concrete requirement.
- Preserve requested behavior, readability, security, and accessibility; fewest lines is not the goal.
- Size tasks so a worker can complete one without designing the rest. Split L work where useful; keep remaining architectural judgment with a capable guiding model.

## Plan contents

Record goal, scope and exclusions, approach, constraints, dependency-ordered tasks, review findings, actual agreement, and next step. Never invent approval. Preserve unrelated work and completed results.

Use the optional [plan template](../../templates/PLAN.md), resolved relative to this skill directory, or preserve an existing equivalent format. A missing template does not block planning.

Each task requires:

- ID and checkbox; intended result and acceptance criteria.
- Verification: working directory, exact command and expected result, or manual action and observation.
- S/M/L complexity and free-text `Result` for evidence or blockers.
- Starting points, dependencies, concrete steps, and a complexity reason when needed to execute without guessing. Clear local S tasks need no redundant explanation.
- Existing failed-repair history.

Complexity: **S** = clear local edit following an existing pattern; **M** = bounded feature or bug fix requiring reasoning; **L** = uncertain or cross-cutting work. Account for consequence: a short sensitive change may need a stronger model. Research tasks deliver findings, not code.

## Verification

- Verify that named commands exist; label proposed checks still needing creation.
- Checks must establish acceptance, not repeat implementation. Use existing project checks; do not add a testing framework for a small change.
- Include a user-facing check when automated tests do not establish the feature works.

## Status and revision

- `Status: Current` means the plan matches intended work. Otherwise use `Status: Needs revision: <reason>`; restore `Current` after revising affected instructions. Status does not mean agreed, verified, or complete.
- For older plans with `Draft` or no status, inspect scope and agreement. Normalize status during a relevant update without requiring a wholesale rewrite.
- Identify affected tasks and evidence. Reopen only for unmet acceptance or insufficient evidence following relevant changes. Optional findings alone do not reopen work.
- Reconsider dependent checks only when their inputs or assumptions changed, not merely because a task reopened.
- Preserve finding IDs, resolutions, and repair history. A new task ID does not reset an unresolved failure's repair limit.
- Request renewed agreement only for material changes to outcome, scope, or tradeoffs.

## Response

Keep implementation detail in `PLAN.md`. Summarize the approach, first task, remaining decision, and one next step. Substantial or uncertain work → `/kaylo:review plan`; otherwise obtain any missing agreement, then `/kaylo:build`. Do not begin implementation. For hosts using a skill picker, identify the matching Kaylo skill.
