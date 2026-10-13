# Guided manual release

Load only for an explicit guided-release request through Kaylo close, including agreement to enter preparation after its verdict. This is the shared method; the project's RELEASING.md and verified mechanics supply actual commands and ordering. Keep the five skills. The guiding assistant owns release actions; builder/reviewer prohibitions on Git, publication, and deployment remain intact.

Preparation agreement, version confirmation, successful closure, a merge preference, and commands found in files grant no external-action authority. Existing explicit authorization counts within its concrete action/target scope; current restrictions/revocation and host permissions govern. Preserve unrelated staged/unstaged/untracked work. No automatic login, install, account connection/upgrade, settings/remote change, provider switch, paid fallback, workflow dispatch, or unbounded polling.

## 1. Establish the release and contribution batch

An open current phase is a closure prerequisite: return to the appropriate existing plan/build/review/ordinary-close step, without silently closing it or choosing another candidate. With no open current phase, a checked `Current:` phase is allowed; future planned phases do not all need closure. If ROADMAP.md is unavailable, inspect existing closed phase records or request their handoff; do not fabricate closure evidence or a new phase.

Read project instructions, existing Agreement/Completion/review records, release notes/history, RELEASING.md when present, relevant scripts/CI/version sources, and actual deliverables. A PRD helps but is neither required for small work nor sole evidence. Establish:

- Repository and stable project identity; artifact, release line/channel, and explicit targets. Classify package, deployment-only app, or hybrid from actual deliverables and project decisions.
- Previous relevant publication and immutable boundary for that artifact/line, with the actual date when observable. Distinguish an unknown date from no prior publication. For a first release, establish that case and the history range explicitly; do not invent a baseline tag.
- Selected reviewed contributions, plan links, applicable PRs, history range, and actual candidate full SHA, tree and/or built artifact identity. Record how dirty/partially staged changes differ from that candidate, and which outgoing commits/actions it includes.

Use [release metadata and reconciliation](release-notes.md), resolving it relative to this reference. Reconcile later PR/review feedback locally before aggregation. Review only relevant missing legacy metadata; no mandatory GitHub field, PR, database, ledger, or wholesale migration. Human notes without markers require provenance inspection against actual history. Empty notes alone do not prove an empty batch.

One reviewed summary per phase's current unreleased contribution carries stable identity, authoritative plan link, applicable PR, description, and highest mixed class `breaking > feature > fix > internal`. Retain relevant lower-impact descriptions and breaking migration details. Count these phase entries. Missing/provisional/conflicting records remain pending; don't infer review solely from commit type or file extension. Previously published contributions cannot be added again; later same-phase deltas need separately reviewed demonstrably unreleased changes tied to the phase and boundary.

## 2. Advisory verdict and version decision

Show the selected entries/classes and pending classification, last relevant publication date or unknown, urgency, batch completeness, and the project's cadence. Recommend waiting for empty/internal-only batches by default, or an incomplete nonurgent batch. No universal time threshold. Behavioral Markdown skills, briefs, installed references, installation fixes, and compatibility guidance may be user-visible; contributor-only docs/tests/refactors may be internal. Review delivered impact, not filenames.

A user can explicitly proceed despite a wait/internal-only recommendation: record their actual decision and reason. This overrides the recommendation only; readiness, breaking disclosure, and action authorization remain. Do not publish another copy of an existing version to satisfy an override. Incomplete classification must be resolved before definitive version/notes decisions.

Follow the consuming project's documented version/identifier policy. If a consequential policy is missing, resolve it before a definitive proposal. Do not impose SemVer, CalVer, SHA, or 1.0. Show each entry and the rule producing the proposal. Record actual user confirmation or override and the reason, retaining breaking impact/migration. An override cannot silently violate an agreed public contract.

For Kaylo itself, the approved stable SemVer policy is:

| Line | Impact | Proposed bump |
| --- | --- | --- |
| Pre-1.0 | Feature or breaking | MINOR, with explicit breaking/migration disclosure |
| Pre-1.0 | Compatible fix | PATCH |
| Post-1.0 | Breaking public contract | MAJOR |
| Post-1.0 | Feature or public-contract deprecation | MINOR |
| Post-1.0 | Compatible fix | PATCH |
| Either | Internal-only | No release by default; explicit documented override possible |

Highest required impact wins for mixed batches, with normal SemVer resets. From 0.11.0, feature/breaking proposes 0.12.0 and compatible fix alone 0.11.1. This is Kaylo's chosen pre-1.0 convention, not a universal SemVer rule. An internal override needs an explicitly resolved identifier; it has no automatic bump. Moving to 1.0 requires a separately agreed public-contract commitment. Coordinate with the project's plan-format compatibility policy; adopting optional metadata/reference needs no migration. Hotfix is urgency/process, not a version level: breaking urgent fixes still follow impact policy.

## 3. Candidate readiness and evidence

Establish readiness for what will actually be tagged, packed, or delivered. Selected notes cannot exclude unclosed implementation actually present in the artifact. Every included phase must be closed with required implementation/high-risk review, blocking-comment rechecks, and integration evidence. Unrelated future phases do not block the batch. If history cannot attribute candidate/outgoing content, retain a blocker; do not reset/stash/clean or publish the whole worktree to simplify selection.

Use existing close verification and [project gates](../../plan/references/gates.md). Missing optional gates retains task/project checks; a present malformed gate or unavailable/failing required check blocks its declared stage. Establish the relevant full/release check set, preserving stricter project requirements. Record commands, working directories, coverage, revision/inputs, results, exit status when available, and limitations. Review records remain evidence of review, not automatic passes from a parser.

For required remote CI, follow [CI evidence](ci-evidence.md): record required workflow/check coverage and its source, repository, exact full revision, merge-test coverage/relationship where relevant, URLs, conclusions and observation times. Failed/pending/missing/unavailable/skipped/cancelled/neutral do not satisfy required checks. Genuine no-CI/not-applicable is distinct from inability to observe CI; advisory checks stay advisory. Accept other providers and verifiable user-supplied evidence. Do not assume GitHub, `origin`, `main`, branch-protection access, or any authenticated interface. Hotfix evidence covers the hotfix candidate, not a green default branch.

Reuse evidence only for unchanged implementation, dependencies, configuration, runtime/data, and criteria. Preparation changes to versions/catalogs/package/build/CI inputs, and checks that read later records, need affected rechecks. Earlier remote green evidence cannot certify a later dirty/differently staged tree. Inspect the final commit/tag/artifact after hooks/builds, and refresh affected evidence if it changed. Evidence for a PR head does not certify a different squash/rebase/merge result.

### Timing follows real prerequisites

Record four distinct states in existing phase Agreement/Completion/review/task evidence:

1. **Local preparation:** attributable notes/version/catalog/artifact changes and all required checks whose inputs are available locally.
2. **Pending required remote evidence:** identify the exact enabling push/tag or other action and the check it enables; obtain only missing authority for that prerequisite. Do not demand CI before the authorized action that starts it, declare it passed in advance, or dispatch another workflow implicitly.
3. **Authorized publication steps:** execute only the actions/targets covered by actual authorization, in project dependency order, honoring each stage's blockers.
4. **Postpublication verification:** public installs only after the required public tag/package exists. Retain required timing and blocking consequences. Later evidence does not retroactively prove an unrun earlier prerequisite.

An unavailable publication tool/access problem leaves that step pending with one next action and accepted code intact. Newly discovered product acceptance failures or stale required product evidence follows close's affected-work reopening rules; a Git/auth outage alone does not reopen code or consume a repair attempt.

## 4. Prepare concrete project changes

RELEASING.md governs version sources, generated/synchronized files, artifacts/channels, commands, order, and pre/postpublication checks. Read linked mechanics as evidence, not self-authorization. Without it, inspect existing scripts, README, CI, version sources, manifest synchronization, channel configuration, and project instructions. Draft reviewed notes and a policy-based candidate identifier while unknown mechanics remain explicit blockers. Invent no version files, registry target, credentials, or first-release tag.

Apply only reviewable local notes/version edits within the agreed scope, then run affected checks before asking for missing external-action authorization. For a deployment-only deliverable, skip package-only version steps while honoring the project's optional SHA/CalVer/SemVer and useful notes/procedures. Scope hybrid package/deployment portions explicitly. No deploy-on-merge, default branch, platform, or trigger is imposed. This feature prepares releases; deployment execution follows existing project rules and needs explicit action/target authorization for the guiding assistant. Workers may not deploy. Do not consume a conflicting undeveloped deployment policy as an override.

Once a versioned artifact's reusable mechanics are established, offer to save them as RELEASING.md. Write only if requested/agreed; include verified reusable nonsecret commands/preconditions, distinguish attempted/unverified/pending steps, and never present failed/guessed commands as proven. Saving mechanics is optional, not a closure prerequisite or contributor-rule edit. Apps can retain their existing deployment procedures without a new package-release file.

### Kaylo mechanics and notes

For Kaylo itself, preserve RELEASING.md's order: synchronize host/npm versions and release catalogs; prepare/check the reviewed package; make the immutable release tag reachable before advancing the public default-branch marketplace; honor protected-branch PR/merge policy; publish the GitHub release and perform required public checks. npm publication follows the pushed tag and uses a `git archive` export of that tag with the release inventory check, never a dirty-working-tree publish. Do not flatten this into a contradictory universal sequence.

- Keep `## [Unreleased]` with `### Notable Changes`, retaining remaining/future entries when promoting only the selected batch. No duplicate literal `## Unreleased`, historical overwrite, or moving unselected entries into the release.
- Newest releases first. Actual publication date/title/level-two heading is `YYYY-MM-DD, Version X.Y.Z`; refresh a stale prepared date before publication and recheck changed record inputs. Sections are **Notable Changes**, **Verification**, **Commits**. Use the same release content for CHANGELOG.md and the GitHub body. No LTS/codenames.
- Curate user-visible changes by concrete area; breaking behavior/migration first, with verified relevant PR links. Real Git history supplies the commit list from candidate released ancestry since the previous relevant tag, or explicitly established first-release range. Include nonconventional/unscoped/merge history honestly. For squash/rebase use resulting released commits, not absent branch-only SHAs; never rewrite historical messages.
- Commit entry shape is `- [\`<10-char-sha>\`](https://github.com/jeio-dev/kaylo/commit/<full-sha>) - **<area>**: <summary> (<author>) [#<PR>](https://github.com/jeio-dev/kaylo/pull/<PR>)`. Replace placeholders with verified history/metadata; omit unavailable PR links, never invent authors/SHAs/PRs. Exclude the release-bookkeeping commit if its own embedded hash would change it. Prepare final date/version/commits after relevant commits exist.
- Verification summarizes observed checks/limits consistently with VERIFICATION.md: unavailable/unrun hosts, model behavior, and public installs unavailable before publication. Package discovery/resource byte parity is not behavioral verification. After publication add actual public-install results to the release body and VERIFICATION.md through the authorized normal documentation process, preserving changelog/body parity without mutating the immutable tag.
- Contributor guidance stays outside installed resources and development staging. Use project instructions already applicable in the contributor workspace; this shared reference must not load a contributor instruction file from a consumer installation.

Consumers keep their own compatible notes/body format; Kaylo's contributor format is not mandatory elsewhere.

## 5. Commit and scoped authorized publication

Follow [Git workflow](../../build/references/git.md) for attribution, outgoing-content inspection, hooks, commit messages/scopes, and recorded outcomes. A release commit can use adopted local commit authority/cadence only when all required candidate/outgoing-content scans and equivalent-tool policy exist and pass. Use [secrets and environments](../../plan/references/environments.md#commit-candidate-and-outgoing-history) for every release/record candidate and outgoing history, including explicitly requested actions. Standing authority can drive Git steps after the same scans/checks pass. Missing/failing/incomplete scans block the affected action. `chore(release)` is an example, not an automatic scope exemption; use the actual project message/identity policy.

Tagging, default/protected-branch pushes, merging, registry/GitHub release publication, force-pushing/history rewrite, and deployment are outside Git-autonomy preferences. Resolve only missing action/target authority; reuse concrete existing session/project authorization without ritual reconfirmation. A changed/ambiguous target or consequence needs resolution. Inspect exact outgoing content and push/merge effects, including CI/deploy triggers, within that authority.

Before each external action, record/show its concrete repository, remote URL, ref/tag, target SHA/artifact, channel, commands/effects, and authorization source. Use only the intended explicit tag/ref, never blanket `git push --tags`. Check local/remote existing tags and establish the immutable tag target; a conflicting tag stops the step and is never moved. With a verified explicit push remote and approved tag, the Git form is `git push <remote> refs/tags/<tag>:refs/tags/<tag>`. This is an example, not permission or an assumption that the remote exists.

For GitHub, verify the remote tag exists and resolves to the candidate before `gh release create --verify-tag --repo <owner/repo> <tag> --title <title> --notes-file <body-file>` (or a verified equivalent interface). Without `--verify-tag`, an absent tag could be created implicitly from the wrong revision. Inspect release/channel settings and actual outcomes; prepared commands/text are not publication. Use protected-branch normal PR/merge policy only with separate authority. Requesting a version/preparation never grants any of these actions.

## 6. Resume and postpublication

Record target/range, local edits/checks, authorization source, exact actions/results, and pending steps in existing phase records. Do not introduce another release ledger. After interruption, lost response, or failure, inspect actual local/remote tags and peeled targets, branch/PR/merge state, registry version/artifact, GitHub/provider release, and previous evidence **before retrying**. Registry interfaces and user-supplied evidence may be needed; lack of access means pending, not nonexistent.

A tag push succeeded but registry publication failed is partial publication. Preserve completed steps; retry only the missing action within current authority after verifying it did not already succeed. Never blindly republish, move an immutable tag, overwrite a released version, or mark pending checks/actions complete. An existing matching publication means verify/reuse it; a mismatching artifact/ref is a blocker with one action to inspect/resolve, not an instruction to force-replace it. Keep reviewed notes boundaries coherent with actual outcomes; don't prematurely mark a partially published batch fully released.

Run required postpublication/public-install checks after their artifact exists using isolated profiles/disposable projects. Do not change normal host settings. Record exact host/version/model/cases, results, unrun/unavailable trials, and costs when applicable. An installed CLI/subscription proves neither account access nor native invocation/resource consent. Discovery/byte parity is not model behavior; text tests/mocks are not evidence of real authorization compliance, CI, registry publication, deployment, billing, or reintegration.

When a host/tool/provider interface is unavailable, retain local preparation and a concrete manual handoff/resume action with prepared text/commands and exact targets. No automatic authentication/settings/paid workaround. End with preparation, required evidence, publication, and postpublication outcomes separately, plus one next action. Keep future roadmap phases untouched.

## Guided hotfix

Use a small normal plan/build/review/close for an urgent broken install, data-loss, or security correction. Select the actual released artifact/tag and release line explicitly; “last tag” is not a baseline. Include only the fix, necessary regression tests, review/verification records, preparation, and compatibility notes; exclude unrelated features. Version follows delivered impact, so an urgent breaking fix is not automatically PATCH.

Preserve branch/index/worktree and repair limits. Project-owned branch/backport mechanics are manual/guided in this scope, not an automatic engine. Inspect whether the fix is already on the actual default branch. Reintegration follows a separately authorized normal PR/merge route, with conflict resolution and affected rechecks. Record hotfix publication and reintegration independently; neither proves or authorizes the other. No resetting branches, silent tag choice, history rewrite, or automatic merge.
