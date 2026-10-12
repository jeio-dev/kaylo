# Pull requests and issues

Read this before Kaylo creates or updates a phase pull request, prepares pull request or issue text, files an issue the user asked for, or reads a task's `Issue:` field. Plan, build, review, and close share it; resolve it relative to the skill that links here. Commits, branches, standing authority, and the current availability of automatic steps are in [Git workflow](git.md).

## One pull request per phase

A phase has at most one pull request, from its phase branch to the actual default branch or the base the user chose. `Git autonomy: pr` covers creating or reusing that draft and its readiness changes; in this Kaylo version only a request in the conversation or other existing authorization starts them (see [Git workflow](git.md#what-this-version-does)).

- Find it before creating it: look up pull requests by repository, head branch, and base, for example `gh pr list --repo <owner/repo> --head <branch> --state all`. Reuse an open match. A closed or merged match, or more than one candidate, stops the step for the user's choice; never reopen, replace, or duplicate one blindly. After a lost response, look again before retrying.
- Create it only after the branch push succeeded and the branch has commits the base lacks; a branch with no difference gets no pull request. Create it as a draft and name the repository, base, and head explicitly, for example `gh pr create --draft --repo <owner/repo> --base <base> --head <branch>`, so the tool does not push, fork, or guess a target on its own.
- Record its URL and state as a `Pull request:` line under the phase plan's `## Review`, and keep it current.
- When updating the body, reread it first and change only text Kaylo wrote that nobody has edited since. If others edited it, add to it without removing their text, or ask.

## Draft and ready

- Mark it ready for review when every task is accepted and the required full phase checks pass, at the end of a phase build. Ready means a request for review. It does not mean the phase review passed, the phase can close, it can merge, or CI is green; the phase implementation review and blocking rechecks still govern close.
- If later work invalidates that state, for example a reopened task, a blocking finding, or a failed full check, refresh its evidence and return it to draft within existing authority; otherwise record the pending change and its exact action.
- Never merge, delete the branch, or rewrite history as part of these steps.

## Visibility, CI, and capabilities

- A draft is visible to everyone who can read the repository. Pushes and pull request changes can send notifications, start CI, or deploy. Read the repository's workflow triggers, branch and path filters, and draft conditions before acting, and act only when authority covers those effects.
- Report the checks actually observed on the pushed revision, following close's [CI evidence](../../close/references/ci-evidence.md). A missing, pending, skipped, or unavailable check is not a pass. A draft may start no run, marking it ready may start none, and one push of several commits gives no per-task run.
- Establish capabilities through the interface the user authorized: sign-in, write access, draft support, allowed merge methods, and CI visibility. An installed CLI or a subscription proves none of them. Install nothing, sign in to nothing, and change no remote, account, or provider.
- Offline, without a provider such as GitHub, or when the interface fails: keep the local commits and records, prepare the pull request body as text, and give the user the manual action. Prepared text is not an opened pull request; record the step as pending.

## Pull request body

Look for the repository's templates first: `pull_request_template.md` in the root, `docs/`, or `.github/` (any letter case), a `.github/PULL_REQUEST_TEMPLATE/` folder of several, and organization defaults when visible. Use the matching template, keep its required content, and put Kaylo's evidence into its sections. Add Kaylo metadata only where the template allows it.

Without a template, use this layout with the phase's real values:

```markdown
## Summary
The outcome this phase delivers for the user.

## Phase
[03 Login](.kaylo/phases/03-login/03-PLAN.md) · Refs #12

## Changes
- A user-visible change (03-T1)
- Another user-visible change (03-T2)

## Verification
- The command, its directory, the revision, and the result, as actually run
- Task-specific evidence and the limits of what was checked

## Risk
High-risk tasks with their reviewer route, observed vendor and tier, and any exception, or the review evidence still pending or unknown

## Release note
feature (provisional) — One line for the changelog
```

Link the plan path that `ROADMAP.md` links. Never write a command, SHA, or check that did not run. Missing risk evidence is pending or unknown, never `None`.

## Release note record

Record the phase's release classification under the phase plan's `## Review`, in this form:

```text
Release note: feature (provisional) — Users can reset their password by email.
```

- The class is `feature`, `fix`, `breaking`, or `internal`; the status is `provisional`, `reviewed`, or `pending`. It is not the commit type.
- Write it when the phase gets a pull request or prepared pull request text, or when the project keeps release notes. The phase implementation review confirms it as `reviewed` or corrects it. When a reviewer, a pull request comment, or the user disagrees, or no reviewed classification exists, it stays `pending` with the competing classes in prose; neither side is chosen silently.
- For mixed work retain relevant user-visible descriptions and choose the highest impact: breaking > feature > fix > internal. Record classification rationale and review history in prose. Deprecation of a stable public contract is a feature-level change unless it already breaks that contract.
- At close/adoption, use the [release metadata and reconciliation contract](../../close/references/release-notes.md) to record the permanent phase identity and reviewed contribution boundary/delta, without requiring a PR or another ledger. A new delta from a previously published phase needs its own reviewed, demonstrably unreleased description; preserve the earlier review record as history.
- This line is the source for release notes. Reconcile later pull request feedback into it before release preparation, and keep one line per phase, with the pull request link when one exists. It works the same without a pull request or provider.

## Issue links

A task may carry an optional `Issue:` field naming the issue it works on:

```text
  - Issue: #12, acme/api#40, https://tracker.example/browse/PROJ-7
```

Each entry is `#N` for the same repository, `owner/repo#N` (more segments allowed, as in `group/sub/repo#N`) for another, or an `https://` link; separate entries with a comma and a space. Plans without it stay valid. It is separate from `Blocked by:`, which names earlier tasks in the same phase.

- Refer to an issue with an ordinary link or `Refs #12` when the pull request delivers part of it. Use `Closes #12` only when the pull request completes everything the issue's agreed scope requires; one finished task does not show that. Name each issue separately, and qualify one in another repository as `owner/repo#N`.
- Closing keywords close issues only when the pull request targets the default branch. For another base, do not promise automatic closure. After publishing, check what the provider actually linked.

## Filing and editing issues

- Create an issue only when the user asks. Editing or commenting on one needs authorization for that action and issue; `Git autonomy` grants none. Before retrying a creation, look for the issue you may already have created.
- Apply only labels that exist and the user's request covers. Report a suggested label that does not exist; do not create it, and do not fail an otherwise valid issue over it. Include labels a template adds.
- Use the repository's issue templates or forms in `.github/ISSUE_TEMPLATE/` when one matches. A command-line body does not enforce a form's required fields: fill the form's fields faithfully in the body, or hand the user the form, and say which.
- Adding templates or forms to a repository is separate agreed work; filing one issue does not authorize it.
- When a project rule calls for an issue the user has not asked to file, keep it as a pending action in the plan instead of filing it. If acceptance requires that issue, the requirement stays open until it is filed or the user revises it.

Without a template, title an issue `<type>: <outcome>` where the project's conventions allow, and use one of these layouts:

- **Feature or task:** `## Outcome`, `## Context`, `## Acceptance criteria` as observable checkboxes, `## Out of scope`, and `## Notes` with risk, estimate, and the Kaylo phase and task ID, or "not planned yet".
- **Bug:** `## What happened`, `## Expected`, `## Steps to reproduce`, `## Evidence` with secrets redacted, `## Environment`, and `## Severity`.
- **Chore:** `## Outcome`, `## Context`, and `## Acceptance criteria`.
