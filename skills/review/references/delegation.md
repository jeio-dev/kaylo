# Delegate a review

Read this only when using a fresh reviewer conversation, subagent, or manual handoff.

Use [the reviewer brief](../../../agents/reviewer.md), resolved relative to this reference file, not the user's project. Hosts listing `kaylo:reviewer` provide its native brief. For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- PRD and current phase plan, including existing review comments and their IDs.
- Applicable repository instructions.
- Exact files or diff being reviewed, including untracked files in scope.
- The build's recorded starting state when available, so the reviewer can distinguish assigned changes from pre-existing edits. If it is unavailable, disclose the attribution limit and still inspect relevant behavior.
- Requirements and facts, without the author's defense of the approach.

The reviewer returns review comments, readiness, coverage, and limitations without editing shared plan state. The guiding assistant inspects the artifacts and evidence and records the results in the current phase plan.
