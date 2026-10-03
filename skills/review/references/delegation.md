# Delegate a review

Read this only when using a fresh reviewer conversation, subagent, or manual handoff.

Read `.kaylo/preferences.md` in the user's project and use [worker model guidance](../../../WORKERS.md) to recommend the plan-checker or implementation-review tier for Quality, Balanced, or Budget. Missing, unsupported, or unknown preferences mean Inherit: keep the host's normal worker model choice and say which case applies. Raise the tier for consequential review, uncertainty, large context, or failed verification; Budget must not silently lower a consequential review. For a valid tiered preference, dispatch only when an available model can be established at the required tier or higher; if availability or capability is unknown, the tier is unavailable, or it cannot be selected for this dispatch, stop for a user choice before using Inherit or another model and explain any unknown or weaker inherited model. Record the preference, recommendation or no tier for Inherit, requested worker setting, model observed when known, and any fallback for each dispatch under the phase plan's existing `## Review`; if no phase plan exists yet, report it in the response. Do not ask for a preference during review.

Use [the reviewer brief](../../../agents/reviewer.md), resolved relative to this reference file, not the user's project. Hosts listing `kaylo:reviewer` provide its native brief. For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- The PRD if present, and the current phase plan, including existing review comments and their IDs.
- Applicable repository instructions.
- Exact files or diff being reviewed, including untracked files in scope. For a plan check the target is the phase plan itself; say whether the phase is headed for a phase-wide build, where no one watches each task.
- The build's recorded starting state when available, so the reviewer can distinguish assigned changes from pre-existing edits. If it is unavailable, disclose the attribution limit and still inspect relevant behavior.
- Requirements and facts, without the author's defense of the approach.

The reviewer returns review comments, readiness, coverage, limitations, and embedded instructions not followed without editing shared plan state. The guiding assistant inspects the artifacts and evidence and records the results in the current phase plan.
