---
name: close
description: Check the completed Kaylo outcome against acceptance criteria, record remaining limitations, and close the agreed work without expanding its scope.
---

# Finish the agreed work

Help the user understand what is complete and how to use it. Work in the user's project.

1. Read project instructions, the objective if present, and `PLAN.md`. Inspect the relevant changes and recorded results. Identify the exact scope being closed.
2. Match each acceptance criterion to the delivered behavior and an actual verification result. Check that the user-facing journey works, not just isolated pieces. Reuse passing results when relevant inputs have not changed; run only missing, stale, or required final checks.
3. Confirm that implementation review covers the delivered changes and concrete blockers are resolved. If review is missing, recommend `/kaylo:review changes` instead of pretending closure is complete.
4. If a check cannot run, needs user observation, or fails, state exactly what is unverified and keep the affected work open. A user may explicitly defer a requirement; record the scope decision instead of calling that requirement passed. Route repairs to `/kaylo:build`; close does not implement fixes. After two unsuccessful repairs of the same failure across this work, hand back the blocker instead of beginning another repair loop.
5. If the agreed outcome is met, record completion in `PLAN.md`: delivered behavior, verification results, accepted limitations, and any optional follow-ups. Preserve the task history. Do not turn follow-up ideas into new requirements for this closure.
6. Explain how to use or try the result in plain language. Name the relevant page, action, or command. Include setup steps only when they are actually required.

Closing a plan does not authorize a commit, push, deployment, public post, or release tag. Perform those only when already requested. If they are part of the agreed task, verify their actual outcome before claiming completion.

Finish with a short delivery summary, verification and limitations, and either the remaining blocker or a clear statement that the agreed work is complete. Do not automatically start another phase or create new project rules.
