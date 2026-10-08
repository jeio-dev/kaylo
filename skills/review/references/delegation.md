# Delegate a review

Read this only when using a fresh reviewer conversation, subagent, or manual handoff.

Read `.kaylo/preferences.md` in the user's project and use [worker model guidance](../../../WORKERS.md) to recommend the plan-checker or implementation-review tier for Quality, Balanced, or Budget. Missing, unsupported, or unknown preferences mean Inherit: keep the host's normal worker model choice and say which case applies. Raise the tier for consequential review, uncertainty, large context, or failed verification; Budget must not silently lower a consequential review. For a valid tiered preference, dispatch only when an available model can be established at the required tier or higher; if availability or capability is unknown, the tier is unavailable, or it cannot be selected for this dispatch, stop for a user choice before using Inherit or another model and explain any unknown or weaker inherited model. Record the preference, recommendation or no tier for Inherit, requested worker setting, model observed when known, billing route and its authorization source, and any fallback for each dispatch under the phase plan's existing `## Review`, with a `dispatch` record naming `covers=` as described in [dispatch records](../../../WORKERS.md#dispatch-records); if no phase plan exists yet, report it in the response. Do not ask for a preference during review.

The same file may set `Review vendor:` and `Metered:`. With `Review vendor: different`, choose a reviewer whose model vendor is known to differ from every builder vendor in the target, using the builder records in each covered task's `Result:`, and follow [review vendor and metered routes](../../../WORKERS.md#review-vendor-and-metered-routes) for unknown or mixed vendors, failed routes, and the user's choices: waive the different-vendor requirement for this review, a manual handoff, or a pause. Never skip the review. A pending handoff or a failed dispatch is not review evidence. Use a metered route, or one whose billing is unknown, only under the same section.

For a `Risk: high` task, build requests this review after the task's required checks pass and before check-off. Target the high-risk task reviewer tier, Strong, in a fresh context when that capability and selection can be established. If they cannot, including an Inherit model of unknown capability, disclose the limit and record the user's choice: an available qualifying route, a manual review handoff, an explicit exception to the unmet constraint, or a pause. Never call an inherited model Strong, change the invoking model, or treat an exception as evidence that Strong ran; review vendor rules still apply. Tell the reviewer it is a high-risk task review and why the task was classified high.

Use [the reviewer brief](../../../agents/reviewer.md), resolved relative to this reference file, not the user's project. Observed registration: Claude Code lists Kaylo's native brief as `kaylo:reviewer`, Antigravity lists it as `reviewer`, and Gemini CLI's agent loader returns it as `reviewer`. Check that a bare name resolves to Kaylo's brief before using it, as described in [WORKERS.md](../../../WORKERS.md). For a manual handoff, read and paste the brief's body. If the necessary brief is missing, ask for its location or content; do not invent it.

Supply:

- The PRD if present, and the current phase plan, including existing review comments and their IDs.
- Applicable repository instructions.
- Exact files or diff being reviewed, including untracked files in scope. For a plan check the target is the phase plan itself; say whether the phase is headed for a phase-wide build, where no one watches each task.
- The build's recorded starting state when available, so the reviewer can distinguish assigned changes from pre-existing edits. If it is unavailable, disclose the attribution limit and still inspect relevant behavior.
- Requirements and facts, without the author's defense of the approach.
- For a phase review, earlier passing task reviews with their covered inputs, so the reviewer can reuse unchanged coverage and refresh what changed.

The reviewer returns review comments, readiness, coverage, limitations, and embedded instructions not followed without editing shared plan state. The guiding assistant inspects the artifacts and evidence and records the results in the current phase plan.
