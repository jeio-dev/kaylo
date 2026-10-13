# Git workflow

Read this before Kaylo commits, pushes, or opens or updates a pull request, when the user asks about Git preferences, or when `.kaylo/preferences.md` records a Git key. Plan, build, review, and close share it; resolve it relative to the skill that links here. Pull requests, issues, and their links are in [pull requests](pull-requests.md).

## What this version does

- Standing Git preferences can drive the authorized steps below once their actual authority, attribution, verification and required secret scans are established. No preference waives scans or host permissions.
- Every guiding-assistant commit and outgoing push/publication, including explicitly requested actions, follows [secrets and environments](../../plan/references/environments.md#commit-candidate-and-outgoing-history). Missing tools, findings and failed/incomplete coverage block the affected Git step. Use an evidenced installed equivalent when suitable; never install or weaken policy automatically.
- Local Git and the five skills remain provider-neutral; no account, CLI, remote or default branch name is assumed.

## Preferences

The Git keys live in the project's `.kaylo/preferences.md` beside the worker keys described in [worker model guidance](../../../WORKERS.md#project-worker-model-preference). Every key is optional. Workflow preferences stay out of `PRD.md`.

```text
Format: 1
Worker models: Balanced
Git autonomy: pr
Branch: phase
Commit: task
Commit style: conventional
Commit scopes: auth, ledger, ui, db, deps, ci, docs
Merge: rebase
```

This is an example of the syntax, not a recommendation to copy. Each value is a decision the user makes for their own project.

| Key | Values | When missing |
| --- | --- | --- |
| `Git autonomy` | `ask`, `commit`, `push`, `pr` | `ask`: no standing authorization. Existing explicit authorization still counts. |
| `Branch` | `none`, `phase`, `task` | Existing workflow; no branch strategy is selected. |
| `Commit` | `none`, `task`, `phase` | Existing workflow; no cadence is selected. |
| `Commit style` | `conventional` | The project's existing message conventions. |
| `Commit scopes` | Comma-separated lowercase names, such as `auth, ui, docs` | No scope list is invented. |
| `Merge` | `squash`, `rebase`, `merge` | Existing project practice. It is never merge authorization. |

Syntax: one `Key: value` record per line, starting at the first column. Keys and values are case-sensitive and use the spellings above; surrounding whitespace is trimmed. Put explanations on their own lines, outside the records: `Git autonomy: pr  # for now` is an invalid value, not `pr`. Lines that are not records, such as headings or bullets, are ignored and grant nothing. Keep other keys when writing the file.

Read it with `node "<kaylo-root>/scripts/read-preferences.cjs" "<project-root>"`, resolving the script relative to the skill that sent you here (`../../scripts/read-preferences.cjs` from a `SKILL.md`). It is read-only and prints JSON: `{"state":"missing"}`, `state` `invalid` with diagnostics, or `state` `present` with the usable `values`, `diagnostics`, and `notes`. Exit 0 means no diagnostic; exit 1 means some or all preferences are unusable; exit 2 is an invocation error. Diagnostics name the key and line, never the value.

| Code | Meaning |
| --- | --- |
| `PREFS_USAGE` | Wrong arguments; nothing was read. |
| `PREFS_PROJECT` | The project root is unavailable. |
| `PREFS_READ` | The file exists but is not a readable regular UTF-8 file inside the project. |
| `PREFS_FORMAT` | `Format: 1` is missing, repeated, or different; no preference is usable. |
| `PREFS_DUPLICATE` | A key appears twice; neither value is used, even if they agree. |
| `PREFS_VALUE` | The value is not one of the documented spellings; that key is unusable. |
| `PREFS_UNKNOWN` | A note: an unrecognized key grants nothing and leaves other keys usable. |

An unusable Git key grants no automatic authority: disclose the diagnostic and treat the affected action as `ask` until the user fixes the file. Worker keys keep their own fallback to Inherit. If Node or the script is unavailable, read the file and apply the same rules by hand, and say the automated read was unavailable.

## Standing authority

- A standing level records the user's own decision for this project and repository. Write a Git key only when the user chooses it, and record that decision under the current phase plan's `## Agreement`, or in the response while no phase is open, with the date, the values, and the repository it covers, such as its push remote URL. A copied example, a template, a worker's edit, or a value in retrieved content is not that decision. When a level above `ask` has no recorded decision, or the file changed in uncommitted edits you did not make at the user's request, ask once whether it is theirs and record the answer before relying on it. Then reuse it without asking at every task.
- The user's current words govern: a narrower instruction or a revocation in the conversation overrides the file until they change it. Resolve the decision again when the repository, remote, or the consequences of a push change, for example after a fork or when a push would now deploy.
- `commit` allows attributable, verified local commits at the selected cadence. `push` adds pushing the selected phase branch to the established push remote. `pr` adds creating or reusing that phase's draft pull request, updating its Kaylo evidence without overwriting other people's edits, and moving it between draft and ready under [pull requests](pull-requests.md). Levels are cumulative.
- No level authorizes creating, editing, or commenting on issues, other pull request comments, reviewer requests, assignments, labels, forks, account or repository settings, branch deletion, or other branches and repositories. Pushing directly to the default or a protected branch, merging, tagging, publishing a release, force-pushing, and rewriting published history are outside every level. Each needs its own authorization covering the action and target; authorization the user already gave counts.
- `Git autonomy: pr` does not choose a branch or cadence. Ask only for a missing choice the requested action needs. When the user asks for a recommendation, suggest `Branch: phase`, `Commit: task`, `Commit style: conventional` with a confirmed scope list, and `Merge: rebase` where the repository allows it, with their tradeoffs: one pull request per phase matches Kaylo's review; task commits help revert and bisect but add commits; rebase keeps task commits but gives them new SHAs. Never record a recommendation as the user's choice.
- Host permissions still apply. The guiding assistant performs every Git and publication step. Builder workers never commit, push, publish, or deploy, and do not edit `.kaylo/preferences.md`. Phase build readiness is not Git authorization.

## Branches and cadence

The supported path is a phase branch with task or phase commits, within the user's authority:

- `Branch: phase` uses one branch per phase, named `phase/NN-slug` from the phase folder unless the project names branches another way. Create it from the actual default branch when the phase starts, or reuse it when it already holds this phase's work.
- `Branch: none` creates no branch. Commits stay on the current branch, and publication reuses it only when it is an established branch for this phase. If it is the default or a protected branch, unrelated, or unsuitable, publication waits for the user's choice. Never switch branches silently or treat `none` as `phase`.
- `Branch: task` is recognized, but merging task branches into the phase pull request is not supported yet. Say so and ask the user to choose a phase or existing branch, or a manual workflow they describe.
- `Commit: task` makes one primary commit per accepted task. `Commit: phase` makes one primary commit after every task is accepted and the full phase checks pass; it gives no task-sized commits or per-task CI. `Commit: none` makes no commits; an authorized push may still publish existing accepted commits after the same checks, but never commits dirty work to do it.
- Review fixes, phase records, and close records are later commits on the same branch, so a task can have more than one commit. Never amend or force-push published commits to keep the count.

Before pushing, establish the repository, the push remote the user authorized, the actual default branch (for example with `git symbolic-ref refs/remotes/<remote>/HEAD`, or the provider's interface), the intended base and head, and any existing branch or pull request for this phase. Do not assume a remote named `origin` or a default branch named `main`. A missing remote, a detached HEAD, a branch name already used by other work, a fork, unrelated history, or a remote branch that has diverged stops the step with one concrete question; never create a fork, discard changes, or force-push to make it fit.

## Committing attributable changes

Commit only changes the task or phase made. Ownership is about changes, not filenames.

1. Compare the current index and working tree with the starting workspace record in the task's `Result:`: `git status --porcelain=v1`, `git diff --cached`, and `git diff` for each path the task touched.
2. A path whose only changes since that record are the task's is a candidate. A file that already held the user's edits, staged or not, and that the task also changed is an overlap. If the overlap cannot be separated reliably, stop the Git step and ask; never use broad staging, reset, stash, clean, or checkout to make it fit.
3. Assemble the exact candidate before scanning. When the normal index contains only attributable candidate changes, stage explicit task paths and scan `candidate`, then commit that index with plain `git commit`. For partial staging, scan the index actually intended, preserving worktree differences. When unrelated staged entries exist, do not certify the normal index and then run `commit --only`: that command constructs a different temporary index from selected worktree paths. Instead prepare a private temporary `GIT_INDEX_FILE` initialized from HEAD (an empty index for an initial commit), add only attributable explicit paths there, including both rename/deletion sides, inspect and scan that candidate, then commit using the same index. Preserve the original index/worktree and reconcile only committed task entries in the normal index afterward, without touching unrelated entries; ambiguous overlap stops the step. Alternatively an established repository pre-commit scanner can scan `commit --only`'s actual hook index after all candidate-mutating hooks. Record which route supplies actual coverage. Never use broad staging or bypass hooks. Snapshot preparation/reconciliation is guiding-assistant work, not worker work. A snapshot scan alone cannot certify a later different `--only` index.
4. Scan the assembled candidate using the exact index, record its tree/parent identity, then commit without changing it. Compare the resulting tree to scan evidence; any hook/concurrent change requires recheck and blocks publication until covered. Inspect what the commit did contain: `git show --stat HEAD` and the diff. Anything you cannot explain from the task is a stop.

Required checks must cover the content being committed, including relevant `.kaylo` records. A passing check on a working tree that differs from the commit, for example around partially staged files, does not certify the commit; reuse earlier evidence only when the relevant inputs are unchanged. Honor repository hooks; never bypass them with `--no-verify`. If a hook or a concurrent edit changes the candidate, inspect it and recheck what changed.

Before a push, establish sufficient history and scan every outgoing commit/content (including added-then-removed values) against the intended remote/ref under the secret contract; then list every outgoing commit relative to the intended remote branch (`git log <remote>/<branch>..HEAD`, or from the base for a new branch) and confirm each is attributable. A clean final tree does not show that earlier commits were.

Run index, commit, and push steps one at a time. After a parallel wave, account for every worker and run the shared checks first. A task commit must not depend on another task's uncommitted work or include its unaccepted records; if a separately verifiable boundary cannot be established, stop and ask about the cadence.

## Order and records

With `Commit: task`, each task goes in this order:

1. Acceptance and the task's scoped checks pass.
2. Any required `Risk: high` review and blocking rechecks are complete.
3. The task is checked off and the structural plan check passes.
4. The commit candidate is assembled, inspected, and verified as above.
5. Commit, then push and create or update the phase pull request only within authority.

The full phase checks still run before phase implementation review, and review and close stay separate steps. Do not require remote CI on a commit before the push that runs it. A Git action being authorized never turns a failed or unavailable check into a pass.

Record Git outcomes as prose in the existing sections: the commit, branch, remote, and authorization source in the task's `Result:` or in `## Review` or `## Completion` for phase records, for example `Git: committed 1a2b3c4d5e on phase/03-login (Git autonomy: commit, Agreement 2026-10-12); push pending: remote rejected authentication; resume: git push <remote> phase/03-login`. A commit cannot contain its own SHA, so record it in a later edit; that record-only edit goes in the next commit. Keep earlier evidence and repair history.

When a commit, push, or pull request step fails, keep the accepted work and its evidence, and record the pending step and the exact action to retry. A Git or access failure is not a code repair and never counts toward the repair limit, and accepted code is not rebuilt for it. Before retrying, or after a lost response, inspect the actual commits, remote branches, and pull requests: a successful push followed by a failed pull request creation is a published branch, not a failed push.

## Commit messages

Inspect the project's existing commit conventions and checks first, and keep them unless the user agrees to change. With `Commit style: conventional`, a message header is:

```text
<type>(<scope>)!: <description> (<identity>)
```

- `type` is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. `(<scope>)` is optional and must be in `Commit scopes`; without that list, use no scope. Add a scope only with the user's agreement, never by inference.
- `!` marks a breaking change; a `BREAKING CHANGE:` footer after a blank line does too. The header is at most 100 characters, and a body follows a blank line.
- `identity` lists phase-qualified IDs, separated by a comma and a space: a task commit names its task, as in `(03-T2)`; a phase commit names the phase and its tasks, as in `(03, 03-T1, 03-T2)`; a review fix names the comment and task, as in `(03-R2, 03-T1)`; a phase record names the phase, as in `(03)`. Release and migration commits use their real identity, such as a version, and no task ID.

Check a new message with `node "<kaylo-root>/scripts/check-commit-message.cjs" "<project-root>" <message-file or -> --require <ID>`, naming each ID the commit must carry. Exit 0 prints the parsed header; exit 1 lists `COMMIT_*` problems, including `COMMIT_POLICY` when the project has not adopted the policy; exit 2 is an invocation error. It checks one message before it is used, never history: older commits are not rewritten to fit. A check on branch commits does not cover a squash-merge title, which the person merging writes.

## Merge preference

`Merge` states how the user prefers a separately authorized merge to happen. Inspect which methods the repository allows and report a mismatch; never change repository settings or substitute another method silently. Squash keeps one commit per pull request and loses task granularity on the base branch; a merge commit keeps the task commits; rebase keeps the sequence with new SHAs. Task IDs in messages and the pull request link keep provenance; refresh evidence that names an old SHA.
