---
name: build
description: Implement and verify an agreed Kaylo task, or fix a concrete review finding. Use with a task ID or let the plan identify the next ready task.
---

# Build one task

Work in the user's project. Complete the requested task without expanding the product.

1. Read project instructions and `PLAN.md`. Find the requested task, or the first unfinished task whose dependencies are complete. Confirm the scope was agreed in the conversation or plan. If agreement is missing, explain the task and ask before implementation. Do not ask again when already authorized.
2. Inspect the current working changes and relevant files. Preserve unrelated edits. Trace the affected flow; for a bug, inspect relevant callers and fix the cause rather than only the reported symptom. The file list is a starting point, not a prohibition on investigation.
3. Check that the task supplies a concrete result and verification. Resolve a local implementation detail yourself. Return to `/kaylo:plan` if completing it requires a material scope change or a missing product decision.
4. Work directly when capable unless a worker would materially help or the user requests one. For delegated work, recommend an available model suited to the task's uncertainty and consequence: S may use an economical worker; M needs a capable builder; L needs a strong model or smaller tasks. Never assume a model, subscription-backed subagent, or paid API is available. Use the host's native controls; do not silently change providers or account settings. If delegation is unavailable, work directly when capable or provide a handoff for the user's chosen tool.
5. For delegation, provide the builder brief from this package's `agents/builder.md` (or paste it), project location, task steps, constraints, relevant files, dependencies, acceptance criteria, checks, and earlier failed repair attempts. Run one worker at a time. Tell it to return changes, verification results, and blockers. The guiding assistant owns plan updates and reviews the returned diff.
6. Implement the smallest sufficient change following existing patterns. Reuse existing helpers, standard libraries, native capabilities, and installed dependencies when suitable. Keep code readable and retain required validation, error handling, security, and accessibility. Keep adjacent refactoring and optional features out of the task. Do not change terminal profiles, global settings, or unrelated tooling to make a local task pass.
7. Run the specified relevant checks directly so their exit status and useful output are retained, and inspect the resulting diff. Record what actually ran and its result. If a check fails, diagnose before editing or rerunning. After two unsuccessful repair attempts for the same failure, stop, preserve the work, and report the cause or uncertainty with one recommended next action. Do not silently switch workers to reset this limit.
8. Update the task in `PLAN.md`, including failed repair attempts and their outcomes so another session does not repeat them. Check it off only when its acceptance criteria are met and required verification passed. If a check is unavailable or needs user observation, leave the task open and state what remains. Explain any replacement check and why it establishes the same result.

Do not repeat passing checks unless relevant code, inputs, or requirements changed. Honor required repository checks, but do not expand the release criteria during this task. Do not commit, publish, deploy, or push unless that action is already authorized.

Finish with what changed, the check results, and one next step. Stop after the task unless the user authorized completing a larger set. Use `/kaylo:review changes` when the agreed implementation is ready for review.
