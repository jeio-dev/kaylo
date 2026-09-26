# Delegate a review

Read this only when using a fresh reviewer conversation, subagent, or manual handoff.

Use [the reviewer brief](../../../agents/reviewer.md), resolved relative to this reference file, not the user's project. Hosts listing `kaylo:reviewer` provide its native brief. For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- Objective and plan, including existing findings and IDs.
- Applicable repository instructions.
- Exact files or diff being reviewed, including untracked files in scope.
- Requirements and facts, without the author's defense of the approach.

The reviewer returns findings, readiness, coverage, and limitations without editing shared plan state. The guiding assistant inspects the artifacts and evidence and records the results in `PLAN.md`.
