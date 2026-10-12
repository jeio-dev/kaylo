# Delegate one build task

Read this only when using a worker or preparing a manual handoff.

## Choose the worker

- Read `.kaylo/preferences.md` in the user's project and select the builder row below using both its Quality, Balanced, or Budget preference and this task's S/M/L estimate before dispatch. These rows repeat the canonical [worker model guidance](../../../WORKERS.md); read the actual row, not only search excerpts mentioning tiers. Balanced alone does not mean Medium: a Balanced S builder starts at Light. Missing, unsupported, or unknown preferences mean Inherit: keep the host's normal worker model choice and say which case applies. Never ask for a preference during build, including phase mode.

| Work | Quality | Balanced | Budget |
| --- | --- | --- | --- |
| Builder, S task | Medium | Light | Light |
| Builder, M task | Strong | Medium | Medium |
| Builder, L task | Strong | Strong | Strong |

- For Inherit, keep the host's normal model choice and the existing task suitability advice: S may use an economical worker; M needs a capable builder; L needs a strong model or smaller tasks. For a tiered preference, use the table and raise the required tier for consequential work, large context, uncertainty, or a failed verification whose diagnosis shows capability matters; Budget never lowers an L build below Strong. Escalate under the repair rules in [WORKERS.md](../../../WORKERS.md): Light → Medium or Medium → Strong, Strong stays Strong, Inherit stays Inherit without the user's choice, and no model change adds repairs.
- A known missing dependency or unavailable check is a blocker to record, not a reason by itself to raise the builder tier; a stronger model does not supply the missing dependency or access.
- Do not assume a model, subscription-backed subagent, or paid API is available. Use host-native controls without silently changing providers or account settings. Dispatch through a metered route, or one whose billing is unknown, only under the metered-route rules in [WORKERS.md](../../../WORKERS.md).
- For Quality, Balanced, or Budget, dispatch only when an available model can be established at the required tier or higher. If availability or capability is unknown, the tier is unavailable, or the host cannot select it for this dispatch, stop for a user choice before using Inherit or another model; explain any unknown or weaker inherited model. No valid preference means Inherit without a new question.
- Before dispatch, record the preference, task estimate, table tier and chosen tier (or no tier for Inherit), requested worker setting, billing route and its authorization source, and any fallback in the task's existing `Result:` line. If the chosen tier is higher than the table row, state the concrete reason beside that choice before dispatch. That pre-dispatch statement is prose. Append the builder `dispatch` record when the worker returns, with its actual outcome; a record written earlier is never edited, so its later outcome is an appended `update`. Afterward record the model observed when known; once the `dispatch` record is written, add a later observation as `vendor` and `model` on an appended `update`. Keep expected test-only baseline red outside the event grammar, with purpose and coverage in prose; use a distinct phase-unique builder ID for later implementation and attribute the initial verify to it. Actual test defects retain ordinary corrective failure accounting. Append the builder `dispatch` record and the worker's initial-implementation `verify` and corrective `repair` records in the forms shown in [build](../SKILL.md#verification-and-completion) and described in [dispatch records](../../../WORKERS.md#dispatch-records); `tier` is the required tier you dispatched for, or `Inherit` when no tier applies, never `unknown`. A worker report is not evidence of the model selected by the host.
- If delegation is unavailable, work directly when capable or prepare a handoff for the user's chosen tool. A required independent high-risk test-author stage follows [test-author routing](test-author.md); direct work is not labelled independent and cannot silently waive that constraint. Native registration is optional: an actually available generic fresh worker or separate fresh conversation may qualify. If none can meet the stage, retain the explicit handoff/exception/pause choice; apply the pre-adoption rule and reuse valid existing scoped routing authority instead of asking again.
- Run one worker at a time except for an explicit parallel phase request on Claude Code under the Phase mode wave procedure in [build](../SKILL.md); never run more than two workers in a wave.

## Prepare the handoff

Resolve [project decisions](../../plan/references/decisions.md) before preparing
this packet. In its existing relevant-decisions/interface-contract content,
include applicable ADR links and needed content, project-wide/cross-area rules,
replacement chains and explicit settled phase-local changes with Design/Agreement
provenance. Confirm records exist in the actual worker/manual-handoff workspace;
when supplying snapshots instead, identify sources and limits. Missing or
ambiguous required authority blocks the assignment. Do not include all phase
history by default. Workers report conflicts/corrections and never allocate IDs,
promote decisions, or edit accepted ADRs/the shared index.

Use [the builder brief](../../../agents/builder.md), resolved relative to this reference file, not the user's project. Observed registration: Claude Code lists Kaylo's native brief as `kaylo:builder`, Antigravity lists it as `builder`, and Gemini CLI's agent loader returns it as `builder`. Check that a bare name resolves to Kaylo's brief before using it, as described in [WORKERS.md](../../../WORKERS.md). For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- Project location and task or review comment, with its phase.
- Steps, constraints, starting files, and required packages or tools.
- Contracts the task uses from completed tasks, such as interfaces, formats, or commands, and where they live; not whole `Result` histories.
- Applicable [testing strategy and evidence](../../plan/references/testing.md), criterion-to-named-check mapping, mock/resource limits and expected observations, targeted failure proof or justified exception, and integrity baseline/maintenance rationale. For a high-risk test-only stage follow [test-author packet and handoff](test-author.md), assigning only explicit test/fixture/test-support paths and keeping expectation source independent of implementation advocacy. For implementation include those same inspected artifacts and workspace prerequisites.
- Acceptance criteria and test plan, with each check's exact command, working directory, and what it covers. The guiding assistant keeps the project's full gate check and other shared checks unless the packet assigns one.
- Earlier failed repair attempts and outcomes.

Supply relevant decisions and interface contracts, rather than the full conversation. `Blocked by` sets order only; it does not authorize running tasks concurrently without the Phase mode ownership check. Keep the assignment within the selected task or review comment; implementing, testing, and debugging it does not authorize the rest of the phase. In phase mode, prepare a separate packet for each task; outside an approved parallel wave, dispatch the next task only after the current task is checked off and the structural plan check has passed. Within one high-risk task, the inspected test-author stage hands off to its implementation builder before task check-off, under the test-author contract. For a wave, name each worker's planned files and focused checks; keep shared checks with the guiding assistant.

## Workspace and execution

- Before dispatch, record the workspace path and starting changes in the task's `Result`: branch and commit when available, staged and unstaged edits, and untracked files in scope. Retain enough relevant starting content to distinguish later edits; avoid copying secrets or unrelated files.
- Confirm completed dependencies and required contracts are present in that workspace. A separate worktree based on a commit does not contain the parent workspace's uncommitted edits.
- The worker owns implementation and verification within its assignment. The guiding assistant keeps shared plans and avoids editing the worker's assigned files while it runs. Coordinate any actively changing user edits before assigning overlapping work.
- Let the worker finish its check and repair loop within Kaylo's repair limit. Avoid repeated status requests or duplicate investigation; a wait timeout alone does not establish a blocker. Respond when a decision or access issue blocks progress.

## Return and continuation

Request the compact report in [WORKERS.md](../../../WORKERS.md), naming the task or review comment ID; match a report to its task by that ID, since a host may label repeated runs of one worker identically. Inspect the actual changes against the recorded starting state, including untracked additions, and the evidence before marking work complete.

Batch related corrections within the agreed scope and continue with the same worker when practical. Carry forward failed attempts; one correction request may contain several repair attempts and does not reset Kaylo's limit. Preserve the separate review and the recheck required for fixes to blocking comments.

For interrupted or blocked work, record completed work, unfinished steps, the last failure, repair history, and the exact resume action in the task's `Result` and phase plan's `Next step`. Include a worker thread ID when the host exposes one and continuation needs it; where a finished worker cannot be continued, give a new worker a packet carrying that record. A new checkpoint file is unnecessary. The guiding assistant owns these plan updates.
