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

- Project location and task or finding.
- Steps, constraints, starting files, and dependencies.
- Acceptance criteria and verification checks.
- Earlier failed repair attempts and outcomes.

Request changes, verification results, and blockers. The guiding assistant inspects the returned diff and evidence and owns all shared plan updates.
