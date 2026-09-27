# Delegate one build task

Read this only when using a worker or preparing a manual handoff.

## Choose the worker

- Recommend an available model suited to uncertainty and consequence: S may use an economical worker; M needs a capable builder; L needs a strong model or smaller tasks.
- Do not assume a model, subscription-backed subagent, or paid API is available. Use host-native controls without silently changing providers or account settings.
- If delegation is unavailable, work directly when capable or prepare a handoff for the user's chosen tool.
- Run one worker at a time.

## Prepare the handoff

Use [the builder brief](../../../agents/builder.md), resolved relative to this reference file, not the user's project. Hosts listing `kaylo:builder` provide its native brief. For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- Project location and task or finding, with its phase.
- Steps, constraints, starting files, and required packages or tools.
- Contracts the task uses from completed tasks, such as interfaces, formats, or commands, and where they live; not whole `Result` histories.
- Acceptance criteria and verification checks.
- Earlier failed repair attempts and outcomes.

Supply relevant decisions and interface contracts, rather than the full conversation. `Depends on` sets order only; it does not authorize running tasks concurrently. Keep the assignment within the selected task or finding; implementing, testing, and debugging it does not authorize the rest of the phase.

## Workspace and execution

- Before dispatch, record the workspace path and starting changes in the task's `Result`: branch and commit when available, staged and unstaged edits, and untracked files in scope. Retain enough relevant starting content to distinguish later edits; avoid copying secrets or unrelated files.
- Confirm completed dependencies and required contracts are present in that workspace. A separate worktree based on a commit does not contain the parent workspace's uncommitted edits.
- The worker owns implementation and verification within its assignment. The guiding assistant keeps shared plans and avoids editing the worker's assigned files while it runs. Coordinate any actively changing user edits before assigning overlapping work.
- Let the worker finish its check and repair loop within Kaylo's repair limit. Avoid repeated status requests or duplicate investigation; a wait timeout alone does not establish a blocker. Respond when a decision or access issue blocks progress.

## Return and continuation

Request the compact report in [WORKERS.md](../../../WORKERS.md). Inspect the actual changes against the recorded starting state, including untracked additions, and the evidence before marking work complete.

Batch related corrections within the agreed scope and continue with the same worker when practical. Carry forward failed attempts; one correction request may contain several repair attempts and does not reset Kaylo's limit. Preserve the separate review and blocker-recheck requirements.

For interrupted or blocked work, record completed work, unfinished steps, the last failure, repair history, and the exact resume action in the task's `Result` and phase plan's `Next step`. Include a worker thread ID when the host exposes one and continuation needs it. A new checkpoint file is unnecessary. The guiding assistant owns these plan updates.
