---
name: build
description: Implement and verify an agreed Kaylo task, or fix a concrete review finding. Use with a task or finding ID, or let the plan identify the next ready task.
---

# Build one task

Work in the user's project. Complete the requested task without expanding the product.

## Workflow

1. Read project instructions and `PLAN.md`. Select the requested task or finding using the rules below; confirm its agreed scope, concrete result, acceptance criteria, and verification.
2. Inspect working changes, relevant files, and earlier failed repairs. Apply the repair limit before corrective edits. Preserve unrelated edits. Trace the affected flow and callers to fix the cause; listed files are starting points for investigation.
3. Resolve local implementation details yourself. Apply the scope rules below before implementing.
4. Work directly when capable. If a worker would materially help or the user requests one, read [references/delegation.md](references/delegation.md) before delegating.
5. Implement the smallest sufficient change using existing patterns, helpers, standard libraries, native capabilities, and installed dependencies. Retain readability, required validation, error handling, security, and accessibility.
6. Run relevant checks directly, retaining exit status and useful output. Inspect the diff. Diagnose failures before editing or rerunning.
7. Update the task or finding in `PLAN.md` using the completion rules below. Record checks, limitations, failed repairs, and outcomes.

## Selection and scope

- Use the supplied ID, such as `T1` or `R2`. Report an unknown ID; do not substitute other work.
- Without an ID, choose the first unfinished task with completed dependencies. Do not automatically select optional findings.
- A plan finding returns to `/kaylo:plan`. An implementation finding needs a bounded correction, affected criteria, and relevant verification.
- Confirm agreement from the conversation or plan. A finding does not authorize extra scope. If agreement is missing, explain the work and ask; existing authorization counts.
- If the selected work depends on a plan area marked `Needs revision`, return to plan. Unaffected, agreed work may proceed.
- A material scope mismatch requires `Status: Needs revision: <reason>` and a return to plan. A missing consequential decision also returns to plan; an ordinary implementation defect does not invalidate it.
- For older plans with `Draft` or no status, inspect scope and agreement; the label alone grants no approval and creates no blocker.
- Exclude adjacent refactoring and optional features. Do not change terminal profiles, global settings, or unrelated tooling to make the task pass.

## Repair limit

- A repair attempt is a corrective change followed by verification; diagnosis alone is not an attempt.
- After two unsuccessful repairs of the same unresolved failure, including earlier attempts, stop corrective edits. Preserve the work and report the failure, attempts, and one next action. Diagnosis may continue.
- A further correction requires material new evidence, a changed blocking condition, or explicit user authorization. Record the reason and outcome; stop again if unresolved, without a fresh allowance of two attempts. A new session, task ID, or worker alone does not qualify.

## Verification and completion

- Reuse passing checks only when history establishes unchanged relevant inputs: implementation, dependencies, configuration, runtime, data, and criteria. If uncertain, rerun an affected check when feasible or leave verification unresolved.
- Honor required repository checks without expanding release criteria. Explain replacement checks and why they establish the same result.
- Check off a task only when acceptance is met and required verification passed. Unavailable checks or required user observations leave affected work open; record the blocker and next action in `Result` (optionally prefixed `Blocked:`).
- The guiding assistant marks a finding `fixed` after inspecting the correction and evidence. Blocker fixes need a focused `/kaylo:review changes` recheck before closure; optional fixes need no separate review round. Preserve IDs and earlier results.
- Commit, publish, deploy, or push only when already authorized.

## Response

Report changes, check results, and one next step. Stop after this task unless a larger set was authorized. Use `/kaylo:review changes` when the agreed implementation is ready.
