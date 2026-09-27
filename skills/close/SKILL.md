---
name: close
description: Check the current Kaylo phase against acceptance criteria, record remaining limitations, and close it without expanding its scope.
---

# Finish the current phase

Help the user understand what is complete and how to use it. Work in the user's project.

## Workflow

1. Read project instructions, the objective if present, `PLAN.md`, and the current phase plan its `Current:` line links. Inspect changes and recorded results; the scope being closed is the current phase.
2. Match each acceptance criterion to delivered behavior and actual verification. Check the whole user-facing journey. Apply the verification rules below.
3. Confirm implementation review covers the delivered changes, including evidence and focused rechecks for blocker fixes under existing finding IDs.
4. Apply the closure rules below. If the agreed outcome is met, record delivered behavior, verification, accepted limitations, and optional follow-ups in the phase plan's completion. Preserve history; follow-ups create no new closure requirements.
5. In the same step, check the phase's line in `PLAN.md`. Leave `Current:` in place; the next `/kaylo:plan` moves it.
6. When the last phase closes, also match `OBJECTIVE.md` success criteria to delivered behavior. Unmet criteria → `/kaylo:plan`.
7. Explain how to use the result: relevant page, action, or command, plus required setup only.

## Verification

- Reuse passing results only when history establishes unchanged relevant inputs: implementation, dependencies, configuration, runtime, data, and criteria.
- Run missing, stale, or required final checks. If inputs are uncertain, rerun an affected check when feasible or state the verification limit.
- Confirm evidence covers combined behavior across connected tasks, not only each task in isolation. Run a focused integration check when that coverage is missing.
- A failed or unavailable check, or pending required user observation, leaves affected work open. State exactly what remains unverified.
- Reopen only work with unmet acceptance or insufficient required evidence; preserve unaffected results.

## Closure and routing

- Current phase already checked `[x]` → report that no phase is open and route to `/kaylo:plan`.
- Governing criteria affected by `Status: Needs revision` → `/kaylo:plan`. Do not close an unresolved outcome.
- `Status: Current` means plan validity, not agreement, verification, or completion. An older `PLAN.md` with tasks inline is the current phase plan; record completion there without migration or an index line. For older plans with `Draft` or no status, inspect scope and agreement without requiring migration.
- Missing implementation review or blocker recheck → `/kaylo:review changes`; closure remains incomplete.
- Open optional findings do not block closure. Record actual user decisions for accepted findings. Deferring an unmet requirement changes scope; it does not make the requirement pass.
- Repairs → `/kaylo:build`. Close does not implement fixes.
- After two unsuccessful repairs of the same unresolved failure, hand back the blocker and attempt history. A session, task ID, or worker change does not reset the limit. Another correction requires material new evidence, a changed blocking condition, or explicit user authorization, without a fresh two-attempt allowance.
- Commit, push, deploy, post publicly, or tag a release only when already requested. If included in the agreed task, verify the action's actual outcome before claiming completion.

## Response

Give a short delivery summary, verification and limitations, and either the remaining blocker or a clear completion statement. With phases remaining, the next step is `/kaylo:plan` for the next phase. Do not automatically start another phase or create project rules.
