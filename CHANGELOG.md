# Changelog

## [Unreleased]

### Notable Changes

- **tools**: `kaylo status` reports each host's installed version and, where
  its active path is available, compares installed files with this package.
  Codex reports its listed version without a file comparison. Install and
  update now warn about unselected hosts with Kaylo and a newer npm release
  before confirmation; an interactive prompt can add those hosts, while
  `--yes` and `--dry-run` leave the selection unchanged. Status reads leftover
  OpenCode cleanup directories without removing them
  ([#61](https://github.com/jeio-dev/kaylo/issues/61)).
- **tools**: The `kaylo` installer now supports OpenCode 2 through `--opencode`
  and `--all`. It copies and verifies the full package in a versioned data
  directory, then edits the global JSON or JSONC config while preserving its
  comments and other settings. Updates keep the referenced copy until the new
  one is verified; an interrupted same-version replacement is recovered on the
  next mutating run. Symlinked global configs are refused. If removal of an old
  copy fails after the config edit commits, the installer reports the active
  state and warns that cleanup is pending. A later run can proceed while that
  old copy remains blocked. Uninstall removes the Kaylo skills
  entry and its copy when deletion succeeds.
  OpenCode 1 and per-project config are outside this installer path
  ([#60](https://github.com/jeio-dev/kaylo/issues/60)).
- **tools**: A new `kaylo` command (`bin/kaylo.cjs`, the npm package's `bin`)
  installs, updates, and uninstalls Kaylo on Claude Code, Codex, Antigravity
  CLI, and Gemini CLI. It runs each host's own commands, pinned to the
  package's release tag, and then checks each install. A host passes only when
  it reports that version and the installed files match the package. Codex is
  checked against the path its own `plugin add --json` reports, Gemini CLI
  against the path its extension list names, and no host against a cached
  copy. Without host flags, a terminal gets a picker; `--dry-run` runs only
  read-only commands. Declining the confirmation, closing input, or pressing
  Ctrl-C at a prompt changes nothing. The package is not on npm
  yet; this was tried from a checkout against a local mirror, not public GitHub
  ([#59](https://github.com/jeio-dev/kaylo/issues/59)).
- **tools**: The repository now carries an npm `package.json` for the planned
  `kaylo` package, with the same version as the plugin manifests. Its `files`
  list matches the files Git tracks, and a new inventory test proves the packed
  tarball holds exactly those files and passes package validation. Nothing is
  published to npm yet, and the package has no installer command. Git-based
  installs now also contain `package.json`; the Claude Code and Antigravity
  validators accept it, but no host install was tested
  ([#58](https://github.com/jeio-dev/kaylo/issues/58)).

## 2026-10-03, Version 0.9.3

### Notable Changes

- **docs**: The README's “Five commands” table now lists the five shipped
  skills, with `/kaylo:build phase` explained below it as a build mode
  ([#36](https://github.com/jeio-dev/kaylo/issues/36)).
- **docs**: Worker registration guidance now distinguishes Claude Code's
  `kaylo:` names from the bare names observed on Antigravity and in Gemini
  CLI's agent loader. The delegation references tell readers to confirm that
  a bare name resolves to Kaylo's brief; Codex and OpenCode continue to use
  the brief as a manual handoff ([#33](https://github.com/jeio-dev/kaylo/issues/33)).
- **skills**: An explicit parallel phase request on Claude Code can dispatch up
  to two ready builder tasks together when their files and mutable check
  resources are disjoint. Plain `/kaylo:build phase` and other hosts remain
  sequential. The guiding assistant records each task's baseline and model
  selection, inspects changes by path, runs shared checks, and keeps partial
  failures recoverable ([#31](https://github.com/jeio-dev/kaylo/issues/31)).
- **agents**: Claude Code's `kaylo:reviewer` adapter now allows `Read`, `Glob`,
  `Grep`, `Bash`, `WebFetch`, and `WebSearch` for both plan checks and
  implementation reviews. It no longer inherits `Edit`, `Write`,
  `NotebookEdit`, the subagent tool, or MCP tools; a review that used one of
  those tools needs the guiding assistant to do that step. `Bash` can still
  write files, so the reviewer's instruction to edit nothing during a plan
  check remains necessary. The builder remains unrestricted and the
  researcher's adapter is unchanged. The installed reviewer started with a
  model, but tool use and background subagent behavior with this list remain
  untested
  ([#34](https://github.com/jeio-dev/kaylo/issues/34)).
- **skills**: Plan now asks once for a project worker model preference when it
  expects workers for which Kaylo can select a model at dispatch. The versioned
  `.kaylo/preferences.md` uses Quality, Balanced, Budget, or Inherit; build and
  review use Inherit when the file is absent or invalid and never ask during a
  build. Delegation records the tier recommendation, resolved model when known,
  and fallbacks; an unavailable tier requires a user choice before dispatch.
  Packaged Gemini CLI and Antigravity workers remain at Inherit and do not
  trigger the preference question.
  Host model selection with this preference has not been observed in a live
  trial.
- **docs**: The README is shorter. Its validator rules now live only in the
  glossary's validation rules, its workflow detail points to the glossary's
  definitions, and notes for contributors moved to `RELEASING.md`. The
  migration note for the pre-0.6.0 local Codex catalog is removed.
- **docs**: `VERIFICATION.md` opens with a current-status table per host
  (installation, session reminder, workers, and Kaylo runs with a model) and
  keeps the records from 0.9.0 onward. Records for 0.6.0 through 0.8.0 are
  read from the `v0.9.2` tag. That documentation change did not modify shipped
  skills, briefs, or scripts.

### Verification

The package validator, all 107 Node tests, strict Claude plugin and marketplace
validation, Antigravity validation, staged-resource comparison, and whitespace
checks passed. An isolated v0.9.2 → v0.9.3 update trial confirmed tag selection
and 23 matching resources on Claude Code, Codex, Gemini CLI, and Antigravity;
Codex and OpenCode discovered all five skills. Installed builder, researcher,
and reviewer workers each started, reached a model, and answered on Claude Code
and Antigravity. These starts check registration, not instruction-following
quality. After publication, fresh public GitHub installs on Claude, Codex,
Gemini CLI, and Antigravity each matched the v0.9.3 tag and all 23 shared
resources; that check made no model requests. Earlier live trials of parallel
phase builds are single observations. OpenCode 2.0.18 also discovered all five
skills with exact instruction bodies from a public v0.9.3 checkout; no model
was run for that check. The reviewer tool restriction and model preference
have not had a behavior trial. Gemini CLI model behavior and signed-in worker
starts, and Antigravity IDE loading remain untested. Details and limits are in
`VERIFICATION.md`.

### Commits

- [`fe93b855d2`](https://github.com/jeio-dev/kaylo/commit/fe93b855d2cb214e9b194bffc4cec484f98497cb) - **docs**: record v0.9.2 public installation checks (Jeio)
- [`8858b9cd9e`](https://github.com/jeio-dev/kaylo/commit/8858b9cd9e2179cfedac931275315124abd58f46) - **docs**: trim the README and archive pre-0.9.0 verification records (Jeio) [#50](https://github.com/jeio-dev/kaylo/pull/50)
- [`326be77108`](https://github.com/jeio-dev/kaylo/commit/326be77108d3f1d6da4816cef32367c8b1c9fdb0) - **docs**: separate v0.9.2 worker starts from model results and qualify the reminder skip (Jeio) [#50](https://github.com/jeio-dev/kaylo/pull/50)
- [`0bd3771f52`](https://github.com/jeio-dev/kaylo/commit/0bd3771f52dddfabf2c7c58b9f83023e0f7f9957) - **docs**: merge PR #50: trim the README and archive pre-0.9.0 verification records (Jeio) [#50](https://github.com/jeio-dev/kaylo/pull/50)
- [`5a33d23f5b`](https://github.com/jeio-dev/kaylo/commit/5a33d23f5bfbbee05d8b1808d3183d3f3f71e684) - **skills**: add a project worker model preference (Jeio) [#51](https://github.com/jeio-dev/kaylo/pull/51)
- [`01c08001e1`](https://github.com/jeio-dev/kaylo/commit/01c08001e13bd091b0d52e97250c1ece09921072) - **skills**: merge PR #51: add a project worker model preference (Jeio) [#51](https://github.com/jeio-dev/kaylo/pull/51)
- [`6ac6a6f439`](https://github.com/jeio-dev/kaylo/commit/6ac6a6f439862c0aa3405767f903e970863262d5) - **agents**: restrict Claude reviewer adapter tools (Jeio) [#52](https://github.com/jeio-dev/kaylo/pull/52)
- [`baf099735c`](https://github.com/jeio-dev/kaylo/commit/baf099735cc616b3f21365fc14576af637183c6c) - **agents**: merge PR #52: restrict Claude reviewer adapter tools (Jeio) [#52](https://github.com/jeio-dev/kaylo/pull/52)
- [`1014baadd1`](https://github.com/jeio-dev/kaylo/commit/1014baadd12c649e8783fc3d1a2d6c727c585140) - **skills**: add opt-in Claude parallel phase waves (Jeio) [#53](https://github.com/jeio-dev/kaylo/pull/53)
- [`40bdd8588c`](https://github.com/jeio-dev/kaylo/commit/40bdd8588cdacb5b54beb3ad32748fafe6fa6044) - **skills**: merge pull request #53 from jeio-dev/issue-31-parallel-phase (Jeio) [#53](https://github.com/jeio-dev/kaylo/pull/53)
- [`cf634a3802`](https://github.com/jeio-dev/kaylo/commit/cf634a3802b01e3f143d584136edf07d71020156) - **docs**: clarify worker registration across hosts (Jeio) [#54](https://github.com/jeio-dev/kaylo/pull/54)
- [`8013c49a0b`](https://github.com/jeio-dev/kaylo/commit/8013c49a0be8cbde4572c869e2b318bba7bcf6d0) - **docs**: merge pull request #54 from jeio-dev/issue-33-worker-registration-docs (Jeio) [#54](https://github.com/jeio-dev/kaylo/pull/54)
- [`3e1ebc4691`](https://github.com/jeio-dev/kaylo/commit/3e1ebc46914e990e8f739534e00b02de0bddabec) - **docs**: fix contributor ignores and README command table (Jeio) [#55](https://github.com/jeio-dev/kaylo/pull/55)
- [`1096dc9400`](https://github.com/jeio-dev/kaylo/commit/1096dc9400db3ec78520bc45dd3874f8540d07d7) - **docs**: merge pull request #55 from jeio-dev/fix/issues-35-36-contributor-docs (Jeio) [#55](https://github.com/jeio-dev/kaylo/pull/55)
- [`c22bcf9504`](https://github.com/jeio-dev/kaylo/commit/c22bcf95045072fba702ea571ef3413f30f4c3d4) - **plugins**: prepare v0.9.3 manifests and README (Jeio)

## 2026-10-02, Version 0.9.2

### Notable Changes

- **docs**: The README now states that Gemini CLI support is checked for
  installation and loading only: installing the extension, listing its
  skills, loading the worker briefs, and the session reminder hook firing
  have been observed, all without a sign-in. No Kaylo skill or worker has
  been run with a Gemini model in Gemini CLI, and Antigravity results are
  not evidence for it. The extension is unchanged
  ([#49](https://github.com/jeio-dev/kaylo/pull/49)).
- **docs**: Release preparation now includes live startup checks for the three
  installed Kaylo workers in isolated Claude Code and Antigravity profiles.
  The procedure records model request cost and distinguishes a worker that
  starts from one merely listed after installation. Gemini CLI worker startup
  remains outside this check pending an installed-extension selection test
  ([#44](https://github.com/jeio-dev/kaylo/pull/44)).
- **docs**: `WORKERS.md` now states that the worker briefs register on Gemini
  CLI and Antigravity under their bare names, `builder`, `researcher`, and
  `reviewer`, and that on Gemini CLI a project or user agent with one of those
  names replaces Kaylo's, with a duplicate-name warning. The names are
  unchanged; rename your own agent or hand the worker Kaylo's brief directly.
  The precedence was read in Gemini CLI 0.62.0's source, not observed in a
  signed-in session
  ([#32](https://github.com/jeio-dev/kaylo/issues/32),
  [#47](https://github.com/jeio-dev/kaylo/pull/47)).
- **skills**: Four defects from the v0.9.1 live trials are addressed in skill
  text ([#47](https://github.com/jeio-dev/kaylo/pull/47)). Each failed case
  was rerun once on Claude Code with Claude Opus 5.5 and passed; one run per
  case is an observation, not a consistency claim.
  - `/kaylo:build phase` without a readiness record now names `/kaylo:plan` as
    the one next step, even when the plan's `## Next step` names a task build
    or one task remains. It may mention a single-task build as an alternative
    ([#37](https://github.com/jeio-dev/kaylo/issues/37)).
  - Plan attaches a recommendation and tradeoff to every question in every
    round, including a request to confirm a default, a scope list, or a
    summary. It no longer asks the user to confirm ordinary local choices, and
    a choice that changes existing user-visible behavior is the user's, never
    a default ([#38](https://github.com/jeio-dev/kaylo/issues/38)).
  - Plan asks for confirmation of a summary, or of phase build readiness, in
    a round of its own, after every other question is answered and the plan
    revised, stating each decided behavior; the two may be one question
    ([#40](https://github.com/jeio-dev/kaylo/issues/40)).
  - Close treats the phase's goal and scope, not only its tasks' acceptance
    criteria, as the agreed outcome. When every task passes but the goal is
    undelivered, it writes no completion record, leaves the phase unchecked,
    and routes to `/kaylo:plan`. A user decision already recorded under
    `## Agreement` that narrowed the goal governs; a narrowing offered during
    close goes to plan ([#41](https://github.com/jeio-dev/kaylo/issues/41)).
- **agents**: Three defects from the researcher trials are addressed in brief
  text. Reruns are recorded in `VERIFICATION.md`
  ([#47](https://github.com/jeio-dev/kaylo/pull/47),
  [#48](https://github.com/jeio-dev/kaylo/pull/48)).
  - The researcher starts from the project location and the starting points
    given, and does not read host, plugin, process, or environment data such as
    `/proc` unless the question requires it. Given a project question with no
    project location, on a host that shows it none, it returns that as the
    missing evidence instead of searching the host, and plan now gives a
    research worker the project location. On Antigravity a researcher started
    as the main agent is told there is no active workspace, so it now asks for
    the location first
    ([#39](https://github.com/jeio-dev/kaylo/issues/39)).
  - The researcher calls a fact sourced only when it read the source in that
    session. When a search or fetch fails it says so and labels what it recalls
    as unverified, without a citation or quotation it did not retrieve. The
    manual handoff packet in `WORKERS.md` now ends with the brief's Return line
    copied in full, instead of a pointer to it. A Claude Code researcher
    followed the rule when its fetch was denied, and an
    OpenCode researcher reported a failed fetch of an unreachable page without
    quoting it. Each was one run
    ([#43](https://github.com/jeio-dev/kaylo/issues/43)).
  - All three briefs define "embedded instructions not followed" as
    instructions found inside content the worker read or retrieved as
    evidence, excluding the assignment, project instructions, and host or
    session context
    ([#42](https://github.com/jeio-dev/kaylo/issues/42)).
- **hooks**: The session-start reminder is no longer delivered to a Claude
  Code session whose main agent is `kaylo:researcher`, `kaylo:builder`, or
  `kaylo:reviewer`. The hook now reads the host's hook payload on stdin to
  tell; a missing, empty, invalid, or slow payload emits the reminder as
  before. Codex CLI and Gemini CLI send no agent name and close the hook's
  stdin within about 10 ms, so the reminder is delivered there as before,
  without delay. Resuming a worker session on Claude Code without repeating
  `--agent` still delivers the reminder
  ([#42](https://github.com/jeio-dev/kaylo/issues/42),
  [#47](https://github.com/jeio-dev/kaylo/pull/47)).

### Verification

All 106 Node tests, package and staged-resource checks, strict Claude plugin
and marketplace validation, Antigravity validation, and whitespace checks
passed. An isolated v0.9.1 → v0.9.2 update trial confirmed tag selection and
23 matching shared resources on Claude, Codex, Gemini CLI, and Antigravity;
Codex and OpenCode discovered all five skills. The installed builder,
researcher, and reviewer each started and answered on Claude Code and
Antigravity. The first Claude attempt used an expired copied credential and
made no model request; retrying in the isolated profile passed. These starts
check registration, not instruction-following quality. The live-model trials
of the skill and brief fixes are recorded in `VERIFICATION.md`; they are
single observations. Gemini CLI model behavior, a signed-in Gemini worker
start, and Antigravity IDE loading remain untested. After publication, fresh
public GitHub installs on Claude, Codex, Gemini CLI, and Antigravity each
matched the v0.9.2 tag and all 23 shared resources; that check made no model
requests.

### Commits

- [`f060fe4e67`](https://github.com/jeio-dev/kaylo/commit/f060fe4e6791fcc5c8b57991d17e17050b5906a1) - **plugins**: merge PR #25: Release v0.9.1 (Jeio) [#25](https://github.com/jeio-dev/kaylo/pull/25)
- [`d60e66c07c`](https://github.com/jeio-dev/kaylo/commit/d60e66c07cdab07efcb2423cd7f8ac25bcadeded) - **docs**: record v0.9.1 public installation checks (Jeio) [#26](https://github.com/jeio-dev/kaylo/pull/26)
- [`0c1643b932`](https://github.com/jeio-dev/kaylo/commit/0c1643b9323bbca0d98a84bc0dab15f1af4abd59) - **docs**: merge PR #26: record v0.9.1 public installation checks (Jeio) [#26](https://github.com/jeio-dev/kaylo/pull/26)
- [`4d21c1eda9`](https://github.com/jeio-dev/kaylo/commit/4d21c1eda993e34054df36b3a2730092b9967f16) - **docs**: add a live worker start check to release preparation (Jeio) [#44](https://github.com/jeio-dev/kaylo/pull/44)
- [`d5b5298775`](https://github.com/jeio-dev/kaylo/commit/d5b5298775f931a40ad514053597c1c4fed6b86c) - **docs**: record the researcher and v0.9.0 live-model trials (Jeio) [#45](https://github.com/jeio-dev/kaylo/pull/45)
- [`d6b5b5ad35`](https://github.com/jeio-dev/kaylo/commit/d6b5b5ad353618bfbdeb1510863f5572297a56ce) - **docs**: merge PR #44: add a live worker start check to release preparation (Jeio) [#44](https://github.com/jeio-dev/kaylo/pull/44)
- [`3be29ae68d`](https://github.com/jeio-dev/kaylo/commit/3be29ae68d278f64ea9b59d8cbba1b7efef71887) - **docs**: merge PR #45: record the researcher and v0.9.0 live-model trials (Jeio) [#45](https://github.com/jeio-dev/kaylo/pull/45)
- [`c244dcf767`](https://github.com/jeio-dev/kaylo/commit/c244dcf767c27cb8f7a9ae471434308f4d14120a) - **docs**: finalize the researcher trial record for issue #28 (Jeio) [#46](https://github.com/jeio-dev/kaylo/pull/46)
- [`0ee212fa8f`](https://github.com/jeio-dev/kaylo/commit/0ee212fa8f336e478b5527ef51edd3de63ef91dc) - **docs**: merge PR #46: finalize the researcher trial record for issue #28 (Jeio) [#46](https://github.com/jeio-dev/kaylo/pull/46)
- [`e609921336`](https://github.com/jeio-dev/kaylo/commit/e60992133664aea89089d4d36194e69051d26987) - **skills**: fix phase-build routing, plan question rounds, and closing an undelivered goal (Jeio) [#47](https://github.com/jeio-dev/kaylo/pull/47)
- [`0a5c31c6e1`](https://github.com/jeio-dev/kaylo/commit/0a5c31c6e15ac341dee56e67f636e53cbcd516e7) - **agents**: bound researcher scope and sourcing, define the embedded-instructions item (Jeio) [#47](https://github.com/jeio-dev/kaylo/pull/47)
- [`887579b029`](https://github.com/jeio-dev/kaylo/commit/887579b029d83d216988773f660aac8e0d8eae5c) - **hooks**: skip the session reminder when a Kaylo worker is the main agent (Jeio) [#47](https://github.com/jeio-dev/kaylo/pull/47)
- [`a3b823fd56`](https://github.com/jeio-dev/kaylo/commit/a3b823fd56fe82cdba2b93caca1c90552d385be0) - **docs**: record the live-trial defect fixes, reruns, and the Gemini brief registration check (Jeio) [#47](https://github.com/jeio-dev/kaylo/pull/47)
- [`29f460b158`](https://github.com/jeio-dev/kaylo/commit/29f460b158d3b9ab955735471d3394dfddc1da94) - **skills**: merge PR #47: fix the live-trial defects #37–#43 and document the Gemini brief name collision (Jeio) [#47](https://github.com/jeio-dev/kaylo/pull/47)
- [`69b7e9109e`](https://github.com/jeio-dev/kaylo/commit/69b7e9109e6a605a0a5ddfc7a9dcce06e011d2cf) - **docs**: record the post-merge trials of the #37 to #43 fixes (Jeio) [#48](https://github.com/jeio-dev/kaylo/pull/48)
- [`129d1cf8f8`](https://github.com/jeio-dev/kaylo/commit/129d1cf8f8ebd0e2d5cd066b14e19b1263c81d0b) - **docs**: merge PR #48: record the post-merge trials of the #37–#43 fixes (Jeio) [#48](https://github.com/jeio-dev/kaylo/pull/48)
- [`2acf2726be`](https://github.com/jeio-dev/kaylo/commit/2acf2726be540fdbc53ad79048351df669742cae) - **docs**: state that Gemini CLI support is checked for installation and loading only (Jeio) [#49](https://github.com/jeio-dev/kaylo/pull/49)
- [`75b517a7d5`](https://github.com/jeio-dev/kaylo/commit/75b517a7d5e00335cb1d247e0f09924f6bac35f9) - **docs**: merge PR #49: state that Gemini CLI support is checked for installation and loading only (Jeio) [#49](https://github.com/jeio-dev/kaylo/pull/49)

## 2026-10-01, Version 0.9.1

### Notable Changes

- **agents**: The researcher brief no longer names host tools. Its shared
  frontmatter listed Gemini CLI tool names, and four of them (`list_directory`,
  `glob`, `google_web_search`, and `web_fetch`) are not Antigravity tools, so
  Antigravity could not start the researcher: the run ended with
  `tool "list_directory" not found in registry` before any model request. This
  was observed with the v0.9.0 brief on `agy` 1.2.14; the same frontmatter
  shipped in 0.6.0 through 0.8.0. The shared brief no longer has a `tools`
  line, and only the generated Claude adapter carries a tool list. On Gemini
  CLI the researcher no longer carries a read-only tool list (Gemini's
  enforcement of it was never tested here) and now relies on the brief's
  instruction; the same holds on Antigravity. That instruction is stronger: the
  brief now calls the role read-only and names creating, editing, and deleting
  project files and running commands that change the project, whatever the
  shared guardrails allow other roles. On Claude Code the researcher keeps its
  tool list, `Read, Glob, Grep, WebSearch, WebFetch`, and gains the same
  wording. Adapter generation and the package
  validator now fail if the Claude tool list cannot be added, and the validator
  rejects a `tools` line in any shared brief. On `agy` 1.2.14 the corrected
  brief started in a headless run, which ended without an answer when headless
  mode denied a file read, and answered a one-word prompt in interactive
  sessions both as the main agent and as a subagent. Asked as a subagent to
  create a file, it declined, citing the read-only instruction, and wrote
  nothing. Gemini CLI installed the brief without an agent-definition error,
  as it did the old one; the researcher has not been run there. No project
  files change; update as usual and start a new session. Anyone who copied
  `agents/researcher.md` into a project's `.agents/agents/` should copy it
  again.
  [#24](https://github.com/jeio-dev/kaylo/pull/24)

### Verification

All 100 Node tests, package consistency checks, strict Claude plugin and
marketplace validation, Antigravity validation, and whitespace checks passed.
An isolated update trial installed the real `v0.9.0` tree in Claude, Codex,
and Gemini from local Git mirrors and in Antigravity from a fixture checkout,
confirmed it, then updated each to the prepared 0.9.1. With each mirror's
`main` one changed commit past the tag, every install matched the tag, and
each 0.9.1 install passed the installed-package validator with 23 matching
resources, including the corrected researcher brief. The trial's first run
failed because the trial script validated the 0.9.0 copy that Claude Code
keeps after an update; the script now validates only copies carrying the
prepared version, and the second run passed. Because no skill changed, the tag
match alone does not show the update; the version, the validator, and the
changed brief do. The hook loader returned
the prepared reminder from each hook host's copy, and Codex app-server and
OpenCode discovery returned all five skills. The Codex plugin-creator
validator was not available and did not run. The researcher fix was observed
live on Antigravity (`agy` 1.2.14): the v0.9.0 brief failed to start before
any model request, and the corrected brief answered on Gemini 3.8 Flash as
the main agent and as a subagent and declined a request to create a file.
Those are single runs on one model; a real research task was not run, and the
subagent's own account of having no write tools was not verified. The
corrected researcher has not been run on Claude Code, Gemini CLI, Codex, or
OpenCode. No model has yet run 0.9.0's phase mode,
planning readiness, plan check, or close suggestions. `VERIFICATION.md`
records each run and review with its limits. Signed-in hook lifecycle and
trust and Antigravity IDE loading remain untested. Public installation checks
follow tag publication.

### Commits

- [`2a667478b4`](https://github.com/jeio-dev/kaylo/commit/2a667478b4cea1efbac8e2db2cf78c441e547dc6) - **docs**: record v0.9.0 public installation checks (Jeio) [#23](https://github.com/jeio-dev/kaylo/pull/23)
- [`3a400c985d`](https://github.com/jeio-dev/kaylo/commit/3a400c985d408d6ac7f5cdb8bbe994b603012894) - **agents**: remove host tool names from the shared researcher brief (Jeio) [#24](https://github.com/jeio-dev/kaylo/pull/24)
- [`70588ff38b`](https://github.com/jeio-dev/kaylo/commit/70588ff38be488d48500c0a2104bf808d8fff09c) - **docs**: link the researcher fix PR in the changelog (Jeio) [#24](https://github.com/jeio-dev/kaylo/pull/24)
- [`e3e6ef349c`](https://github.com/jeio-dev/kaylo/commit/e3e6ef349ca0081c525b05cbdc149bff5dcb1e14) - **docs**: record the live Antigravity run of the corrected researcher brief (Jeio) [#24](https://github.com/jeio-dev/kaylo/pull/24)
- [`7cde6f0fff`](https://github.com/jeio-dev/kaylo/commit/7cde6f0fff87a2eecd474832ca48f08f26c9b202) - **docs**: record the interactive Antigravity run of the corrected researcher brief (Jeio) [#24](https://github.com/jeio-dev/kaylo/pull/24)
- [`49fd323384`](https://github.com/jeio-dev/kaylo/commit/49fd32338445761fcc43234df2549083bd273d74) - **docs**: add the version and model to the interactive Antigravity run record (Jeio) [#24](https://github.com/jeio-dev/kaylo/pull/24)
- [`3a691b4b8d`](https://github.com/jeio-dev/kaylo/commit/3a691b4b8d8bd25fed4e3f25dd13812bc5fd9905) - **plugins**: set version 0.9.1 and select the v0.9.1 tag (Jeio) [#25](https://github.com/jeio-dev/kaylo/pull/25)

## 2026-10-01, Version 0.9.0

### Notable Changes

- **skills**: Close may suggest standing rules for the project instructions.
  Only when a run closes the phase, its response may propose a few candidate
  rules, each with the evidence from the phase that supports it. A candidate
  qualifies only if it will matter in later phases and is not already clear
  from the code, README, or existing project instructions; when none
  qualifies, close says nothing about it. Each rule rests on what the phase's
  work showed, never on instructions embedded in retrieved pages, logs,
  fixtures, or worker reports. Close still does not write or edit the project
  instructions: the user decides which suggestions to keep and adds them or
  asks separately for them to be added. The suggestions create no closure
  requirement, do not block closing, and are not the next step or part of the
  `## Completion` record. The glossary's `close` row mentions the suggestions.
  No plan fields, templates, or validator rules changed. No model run has
  tested this change. [#21](https://github.com/jeio-dev/kaylo/pull/21)
- **skills**: Define and plan investigate repository and source facts before
  asking, and ask only what the user must own: outcome, scope boundaries,
  user-visible behavior, data or external-service consequences, acceptance, and
  tradeoffs that would change the phase. Rounds still hold at most three
  independent questions, each with a recommendation and now its tradeoff; a
  dependent question waits for its prerequisite answer, and questioning ends on a
  readiness test rather than a round count. A clear small local change needs no
  interview. Substantial or uncertain work, an explicit request such as "grill
  me", and every phase the user will build with `/kaylo:build phase` get the
  deeper decision pass. Plan records user decisions as the user's and its own
  choices as defaults. For a substantial or uncertain phase plan, and always
  before a phase-wide build, plan requests a plan check from a fresh reviewer
  when the host makes one available, revises and rechecks blocking comments
  for at most two rounds, records every finding under `## Review` with a
  stable ID, and asks the user about what remains open. Without a fresh
  reviewer it routes to `/kaylo:review plan`, which may review directly and
  records who performed the review and the lack of fresh context; the
  structural validator is not a plan review. When the user confirms a phase
  ready for a phase-wide build, plan adds a `Phase build readiness:` line to
  `## Agreement`; a later material revision voids it until the revised parts
  are rechecked and the user confirms again. `/kaylo:review plan` and the
  reviewer brief now check task boundaries, observable acceptance criteria,
  and test-plan feasibility, treat a missing consequential decision as
  blocking, and send a phase headed for a phase-wide build back to plan for
  the readiness confirmation; a review recorded there serves as the plan
  check while the plan has no material revision since. The phase and PRD
  templates describe these records; no section, task field, or validator rule
  was added. No model or host run has tested these changes.
  [#21](https://github.com/jeio-dev/kaylo/pull/21)
- **skills**: Build adds an explicit phase mode. `/kaylo:build phase` (or asking
  the build skill to build the current phase on hosts without that command)
  works through the current open phase's unfinished tasks one at a time in a
  single invocation, in plan order, applying the existing per-task baseline,
  verification, repair-limit, check-off, and structural plan check rules. It
  starts only when the phase plan's `## Agreement` has a
  `Phase build readiness:` line written by `/kaylo:plan` on the user's
  confirmation; otherwise, or when
  the plan needs revision or its records or version history show a material
  revision after that record, it routes to `/kaylo:plan`; build's own `Result`
  and check-off updates are not revisions. It takes tasks strictly in order
  and stops at the first task that is not ready or cannot be checked off,
  without skipping it, records one resume action in that task's `Result` and
  the plan's `## Next step`, and resumes from the plan on re-invocation
  without redoing checked tasks or resetting failed repair attempts. When
  every task passes it inspects the combined diff, runs any phase-level
  integration check the plan names, and routes to `/kaylo:review changes`; it
  does not review or close the phase. `/kaylo:build` and `/kaylo:build T3` still build one task and need no
  readiness record. Workers still run one at a time, and the builder report now
  names its task ID. The README, worker guidance, and glossary describe phase
  mode, the plan check, and the readiness line. No model or host run has
  exercised phase mode. [#21](https://github.com/jeio-dev/kaylo/pull/21)

### Verification

All 94 Node tests, package consistency checks, strict Claude plugin and
marketplace validation, Antigravity validation, and whitespace checks passed.
An isolated update trial installed the real `v0.8.0` tree in Claude, Codex,
and Gemini from local Git mirrors and in Antigravity from a fixture checkout,
confirmed it, then updated each to the prepared 0.9.0. With each mirror's
`main` one changed commit past the tag, every install matched the tag, and each 0.9.0 install passed the installed-package
validator with 23 matching resources. The hook loader returned the prepared
reminder from each hook host's copy, and Codex app-server and OpenCode discovery
returned all five skills. The Codex plugin-creator validator was not available
and did not run. No live-model trial ran during this cycle: the phase mode,
planning readiness, plan check, and close suggestions in this release are
instruction changes that were reviewed as text and have not run with any model
or on any host; the last two wording corrections (`d8acfa7`, `155c995`) have
had no recheck. The define changes from 0.8.0 remain unrun as well. On a
host without a fresh reviewer, the plan check before a phase-wide build is a
direct review by the same assistant. `VERIFICATION.md` records each review and
its limits. Other models and hosts, native worker execution outside Claude
Code, signed-in hook lifecycle and trust, and Antigravity IDE loading remain
untested. Public installation checks follow tag publication.

### Commits

- [`06db6dd3a4`](https://github.com/jeio-dev/kaylo/commit/06db6dd3a42f14c347083902d32ecac4ddcd14c1) - **docs**: record v0.8.0 public installation checks (Jeio) [#20](https://github.com/jeio-dev/kaylo/pull/20)
- [`eaad8ff276`](https://github.com/jeio-dev/kaylo/commit/eaad8ff2768110037b3e9e9dda5637521c06c6c6) - **skills**: add phase mode to build, planning readiness, and close rule suggestions (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`d8acfa783b`](https://github.com/jeio-dev/kaylo/commit/d8acfa783bf560c13f92c7a0385d86cfc8f05925) - **skills**: tighten plan-check routing and readiness wording after recheck (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`155c995d02`](https://github.com/jeio-dev/kaylo/commit/155c995d02324aaf7d484adfba8622d0f0d6813f) - **skills**: describe the direct plan review fallback accurately (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`9588a7618d`](https://github.com/jeio-dev/kaylo/commit/9588a7618d2ae3213e65369e2e7fcca7a565d163) - **plugins**: set version 0.9.0 and select the v0.9.0 tag (Jeio) [#22](https://github.com/jeio-dev/kaylo/pull/22)

## 2026-09-29, Version 0.8.0

### Notable Changes

- **skills**: Plan requires the user's confirmation before marking a converted
  plan `Current`, runs a read-only structural check after plan writes and
  conversions, and reports unfinished conversion steps. Build replaces leading
  unfinished states with evidence, retains baseline and failure history, checks
  the task off as proposed completion, and validates that checked state; failures
  uncheck it and Result corrections stay within build. Close records failed or
  unresolved checks and the next action in affected task Results, unchecks them,
  and names their IDs when routing to build; stating a verification limit never
  permits completion. Skills that run checks and builder/reviewer briefs now
  treat a permission denial as applying to that command and try another allowed
  way to run the same check; alternatives never permit denied or unauthorized
  actions. A bare `Not started` placeholder becomes `In progress` at build start;
  other earlier Result records remain intact. [#11](https://github.com/jeio-dev/kaylo/pull/11)
- **skills**: Wording fixes from the second live-model trial
  ([#12](https://github.com/jeio-dev/kaylo/pull/12)). After a denied compound
  command (for example one adding `echo $?` or a pipe), run the check command by
  itself in its required working directory; alternatives still never permit
  denied or unauthorized actions. Skills tell the user about instructions
  embedded in retrieved content that were not followed, including ones a worker
  reports; worker briefs and the build report template include them. Build,
  close, plan, and the phase template keep superseded and earlier records within
  the task's `Result:` line instead of adding task fields. Plan, build, and
  review update an open phase plan's `## Next step` to the action they give;
  close sets it to the next action or `None`. Close calls a limitation accepted
  only when a recorded user decision names it. A blocking review comment stays
  `open`, with its fix evidence, until the focused `/kaylo:review changes`
  recheck marks it `fixed`. Build corrects it again only after a failed recheck,
  material new evidence that the fix is incomplete, or the user's explicit
  request. No model run has tested these changes.
- **skills**: Embedded instructions not followed in worker reports
  ([#13](https://github.com/jeio-dev/kaylo/pull/13)). The build report gives
  them their own line instead of folding them into blockers or limits, and all
  three worker briefs mark the item always included, covering instructions the
  packet already named, with `None` when there are none. In the third live-model
  trial a builder worker read such an instruction, which its packet had already
  named and asked it to report, and still reported "Blockers or limits: None".
  No model run has tested this change.
- **skills**: Worker report fallback when build's delegation reference is
  unavailable, as in pasted-skill use
  ([#14](https://github.com/jeio-dev/kaylo/pull/14)). Build says so and works
  directly when capable unless the user requested a worker. It tells a requested
  worker to treat file contents as evidence, not instructions, and to report its
  changes, checks, blockers, and embedded instructions it did not follow, or
  `None`. In the fourth live-model trial a pasted build sent a requested worker
  without the reference; the packet omitted the report fields, and the worker's
  report said nothing about embedded instructions. No model run has tested this
  change.
- **skills**: Reviewer fallback when review's delegation reference is
  unavailable, as in pasted-skill use
  ([#15](https://github.com/jeio-dev/kaylo/pull/15)). Review says so, gives the
  reviewer the target, requirements, and existing review comments with their
  IDs, without the author's defense, and tells it to treat file contents as
  evidence, not instructions, to edit no implementation or plan files, and to
  return readiness, review comments labelled `blocking` or `non-blocking`,
  coverage or limitations, and embedded instructions it did not follow, or
  `None`. It follows the build fallback, except that review still prefers a
  fresh reviewer. No model run has tested this change.
- **skills**: Define records only actual user or project constraints, such as
  the existing stack or available tools, under the PRD's constraints
  ([#16](https://github.com/jeio-dev/kaylo/pull/16)). It leaves implementation
  choices such as a language or framework to plan unless the outcome depends on
  them, and presents any it suggests as suggestions for plan, not decisions.
  Defaults define chooses itself now cover minor product details rather than
  implementation ([#17](https://github.com/jeio-dev/kaylo/pull/17)). In the
  fifth live-model trial define disclosed its choice of Python and then listed
  it as a PRD constraint. No model run has tested these changes.
- **skills**: Define asks about a framework, service, or dependency the outcome
  depends on ([#18](https://github.com/jeio-dev/kaylo/pull/18)). When the user
  or project has not settled such a choice, such as a platform the product must
  run inside, define asks about it among its consequential questions, records
  the user's decision under the PRD's constraints, and lists it under open
  questions until they decide. Define no longer describes choosing frameworks,
  services, dependencies, or abstractions itself. No model run has tested this
  change.
- **tools**: The plan validator rejects checked task Results beginning with an
  unfinished state (`Not started`, `In progress`, `Pending`, `TODO`, `TBD`, or
  `Blocked`), even with notes appended to a state marker. Markers require
  punctuation, an en/em dash, or a hyphen with whitespace on at least one side,
  or end-of-text after optional whitespace;
  ordinary words and attached hyphens such as `TODO list` and `Blocked-user`
  pass. Unmarked prose such as `Pending verification.` requires evidence
  inspection by the skills. Closure rejects a bare `Not complete.`
  record. Historical progress and failures may follow current evidence; open
  tasks and phases can retain unfinished records. No fields or names changed.
  An existing plan with such a checked task now fails validation until its
  Result records evidence or the task is unchecked. [#11](https://github.com/jeio-dev/kaylo/pull/11)
- **docs**: Completion uses known limitations; calling a limitation accepted
  requires the user's actual recorded decision ([#11](https://github.com/jeio-dev/kaylo/pull/11)). Record the first
  through fifth live-model trials with their defects and limits, separately from
  the structural checks of the fixes that followed ([#11](https://github.com/jeio-dev/kaylo/pull/11)–[#16](https://github.com/jeio-dev/kaylo/pull/16)). The
  untrusted-instructions guardrail case now expects ignored instructions to be
  reported ([#12](https://github.com/jeio-dev/kaylo/pull/12)).
- **tools**: `validate-package.cjs --installed` now also compares `WORKERS.md`
  and rejects files in the shared folders that the source does not have, such
  as templates left behind by an in-place update. The release update trial
  installs the previous release first and checks that catalogs select the
  release tag rather than the default branch. [#10](https://github.com/jeio-dev/kaylo/pull/10)
- **docs**: Rename `INDUSTRY-TERMS.md` to [GLOSSARY.md](GLOSSARY.md), the usual
  name for this kind of page. `VERIFICATION.md` now keeps records from 0.6.0
  onward; earlier records remain in Git history. [#10](https://github.com/jeio-dev/kaylo/pull/10)

### Verification

All 94 Node tests, package consistency checks, strict Claude plugin and
marketplace validation, Antigravity validation, and whitespace checks passed.
An isolated update trial installed the real `v0.7.0` tree from local Git mirrors
in Claude, Codex, Gemini, and Antigravity, confirmed it, then updated each to
the prepared 0.8.0. With each mirror's `main` one changed commit past the tag,
every install matched the tag, and each 0.8.0 install passed the installed-package
validator with 23 matching resources. The hook loader returned the prepared
reminder from each hook host's copy, and Codex app-server and OpenCode discovery
returned all five skills. The Codex plugin-creator validator was not available
and did not run. Five live-model trials ran with Claude Code and
`claude-opus-5-5` during this cycle, the last against `387844d`; the define
changes in [#16](https://github.com/jeio-dev/kaylo/pull/16)–[#18](https://github.com/jeio-dev/kaylo/pull/18) came after it and have not run with a model. `VERIFICATION.md`
records what each trial exercised. Other models and hosts, native worker
execution outside Claude Code, signed-in hook lifecycle and trust, and
Antigravity IDE loading remain untested. Public installation checks follow tag
publication.

### Commits

- [`9dee3bb800`](https://github.com/jeio-dev/kaylo/commit/9dee3bb800a507501efb5e967d7fbe32f2f3add4) - **docs**: record v0.7.0 public installation checks (Jeio) [#9](https://github.com/jeio-dev/kaylo/pull/9)
- [`d420c1d936`](https://github.com/jeio-dev/kaylo/commit/d420c1d936a520accd1bb07d02bd04dae3e65abf) - **tools**: stricter installed-package checks, glossary rename, and verification trim (Jeio) [#10](https://github.com/jeio-dev/kaylo/pull/10)
- [`9ee5eb95c4`](https://github.com/jeio-dev/kaylo/commit/9ee5eb95c48a6a9292c741235b7b1399a1402ff8) - **skills**: fix gaps found in the first live-model trials (Jeio) [#11](https://github.com/jeio-dev/kaylo/pull/11)
- [`b98be22fa6`](https://github.com/jeio-dev/kaylo/commit/b98be22fa675769d425d8aa9fcfe3c187d57f50d) - **skills**: wording fixes from the second live-model trial (Jeio) [#12](https://github.com/jeio-dev/kaylo/pull/12)
- [`334f57417c`](https://github.com/jeio-dev/kaylo/commit/334f57417c575b640e20331dbb88ccc60b56d38f) - **agents**: separate worker report field for ignored embedded instructions (Jeio) [#13](https://github.com/jeio-dev/kaylo/pull/13)
- [`be22009624`](https://github.com/jeio-dev/kaylo/commit/be220096243d94cdee85ab7f2a49ae4ca91faa31) - **skills**: ask workers for embedded instructions when the delegation reference is missing (Jeio) [#14](https://github.com/jeio-dev/kaylo/pull/14)
- [`387844de2f`](https://github.com/jeio-dev/kaylo/commit/387844de2fb318fe367219a0dedbe48656adc0b9) - **skills**: tell reviewers the core rules when review's delegation reference is missing (Jeio) [#15](https://github.com/jeio-dev/kaylo/pull/15)
- [`9ff53cb5ad`](https://github.com/jeio-dev/kaylo/commit/9ff53cb5add74bb079a8d2207260ad8bc6f81dc1) - **skills**: record the fifth live-model trial and clarify define's PRD constraints (Jeio) [#16](https://github.com/jeio-dev/kaylo/pull/16)
- [`9c16a97b80`](https://github.com/jeio-dev/kaylo/commit/9c16a97b80cb3460e71703485faf470d76ae9e3d) - **skills**: limit define's own defaults to minor product details (Jeio) [#17](https://github.com/jeio-dev/kaylo/pull/17)
- [`d1f748301c`](https://github.com/jeio-dev/kaylo/commit/d1f748301cbcfa10afdc3ac775967e6fdd66a77e) - **skills**: ask about framework or service choices the outcome depends on (Jeio) [#18](https://github.com/jeio-dev/kaylo/pull/18)
- [`9f2b2b3f98`](https://github.com/jeio-dev/kaylo/commit/9f2b2b3f981a44bde2207df67fce436c8b6109c8) - **plugins**: set version 0.8.0 and select the v0.8.0 tag (Jeio) [#19](https://github.com/jeio-dev/kaylo/pull/19)

## 2026-09-28, Version 0.7.0

### Notable Changes

- **skills**: **Breaking.** Kaylo's files, fields, and labels now use common
  software-team names. `OBJECTIVE.md` is `PRD.md`, and the `PLAN.md` index is
  `ROADMAP.md`. In phase plans, `## Approach` is `## Design`; task fields
  `Complexity:`, `Depends on:`, `Acceptance:`, and `Verify:` are `Estimate:`,
  `Blocked by:`, `Acceptance criteria:`, and `Test plan:`; and review findings
  are review comments labelled `blocking` or `non-blocking` instead of `blocker`
  or `optional`. Phases, phase plan paths (`.kaylo/phases/NN-slug/NN-PLAN.md`),
  task and review IDs, `Result:`, `Status:`, `Current:`, and the five command
  names are unchanged. Templates, skills, worker briefs, generated Claude
  adapters, and the session reminder use the new names. [#8](https://github.com/jeio-dev/kaylo/pull/8)
- **tools**: **Breaking.** The plan validator and the skills' manual inspection no
  longer accept older formats. They reject `OBJECTIVE.md`, `PLAN.md` without
  `ROADMAP.md`, tasks written inline in the index, a phase plan without
  `Status: Current` or `Status: Needs revision: <reason>` (including `Draft`), a
  task without `Blocked by:`, and the old field names and review labels, alone or
  mixed with new ones. Each diagnostic names the replacement. [#8](https://github.com/jeio-dev/kaylo/pull/8)
- **docs**: Add [INDUSTRY-TERMS.md](GLOSSARY.md), a glossary for readers
  new to software teams. It explains each term, where Kaylo differs from common
  practice, what Kaylo does not cover yet, and the exact format contract. [#8](https://github.com/jeio-dev/kaylo/pull/8)

To convert an existing project, run `/kaylo:plan`. Its instructions convert
`OBJECTIVE.md`, the `PLAN.md` index, and the current phase plan before other
planning, and report each change; whether a model follows them has not been
tested. To convert by hand instead:

1. Rename `OBJECTIVE.md` to `PRD.md` and `PLAN.md` to `ROADMAP.md`.
2. If `ROADMAP.md` lists tasks directly, move its whole phase record, not only
   the tasks, into `.kaylo/phases/01-<slug>/01-PLAN.md`: goal and scope,
   agreement, tasks with their results and repair history, review comments, and
   completion. Keep the content unchanged; `templates/PHASE.md` shows the
   headings. Then replace `ROADMAP.md` with an index:
   `Current: [01 <name>](.kaylo/phases/01-<slug>/01-PLAN.md)` and a matching
   phase entry, checked if the completion is recorded.
3. In the current phase plan, rename `## Approach` to `## Design`. If its status
   is `Draft`, missing, or anything other than `Current` or
   `Needs revision: <reason>`, set `Status: Current` only if the plan still
   matches the intended work; otherwise use `Status: Needs revision: <reason>`.
4. In each task of that plan, rename `Complexity:` to `Estimate:`, `Depends on:` to
   `Blocked by:`, `Acceptance:` to `Acceptance criteria:`, and `Verify:` to
   `Test plan:`. A task without `Depends on:` depended on every task above it:
   list those IDs in `Blocked by:`, or `None` for the first task.
5. Under its `## Review`, change the labels `blocker` to `blocking` and `optional` to
   `non-blocking`.
6. Run `node <kaylo>/scripts/validate-plan.cjs <project>` and fix any reported
   errors.

Closed phase plans can keep their old names; convert one only when a task needs
its history.

### Verification

All 89 Node tests, package consistency checks, strict Claude plugin and marketplace
validation, Codex plugin validation, Antigravity validation, and whitespace
checks passed. Isolated update trials installed the v0.6.0 release tree from local
Git mirrors in Claude, Codex, Gemini, and Antigravity, then updated each to the
prepared 0.7.0; installed copies match all 22 shared resources, and the hook
loader returns the new reminder from each hook host's copy. Fresh Codex
app-server and OpenCode server discovery returned all five skills. Old-format
conversion was checked structurally with fixtures. No live-model trial ran, so
whether models follow the renamed workflow or convert older projects is untested.
Native worker execution, signed-in hook lifecycle/trust, and Antigravity IDE
loading remain untested. Public installation checks follow tag publication.

### Commits

- [`c665fb1946`](https://github.com/jeio-dev/kaylo/commit/c665fb19463d4680828c74bb12d08aa50bbb7a05) - **docs**: add industry terms glossary and format contract (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`61e96b888b`](https://github.com/jeio-dev/kaylo/commit/61e96b888be85049ca67f3a593c16a087b70ebb8) - **docs**: align industry terms contract with validator checks (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`30b041d2ca`](https://github.com/jeio-dev/kaylo/commit/30b041d2ca8f02e594026a496dffe014b55a7d00) - **tools**: enforce industry-terms contract in plan validator (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`ef051b073a`](https://github.com/jeio-dev/kaylo/commit/ef051b073ae85b97ca12005f82932c78b5cdfa45) - **skills**: adopt industry terms in templates and skills (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`6e678b85b3`](https://github.com/jeio-dev/kaylo/commit/6e678b85b316541442250928eea2db966d961596) - **agents**: adopt industry terms in worker briefs and hook (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`0fbcdab1ad`](https://github.com/jeio-dev/kaylo/commit/0fbcdab1ad1ba4570d7ed246e7719fc5a2bd6208) - **docs**: adopt industry terms in active docs and changelog (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`5db8f744bd`](https://github.com/jeio-dev/kaylo/commit/5db8f744bd18119b1800c21c9ad901655b3cf1e2) - **skills**: keep the whole phase record when converting inline plans (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`9297e3adab`](https://github.com/jeio-dev/kaylo/commit/9297e3adabc2f6b90db300f2cb48dbf715048150) - **docs**: remove README link to deleted review handover (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`7fb4197222`](https://github.com/jeio-dev/kaylo/commit/7fb4197222cdb6062265d98b81743aec63287813) - **plugins**: set version 0.7.0 and select the v0.7.0 tag (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)

## 2026-09-27, Version 0.6.0

### Notable Changes

- **plugins**: Add GitHub marketplaces with release tags for Claude and Codex, a
  separate local Codex catalog, and a native Gemini extension manifest.
- **docs**: Document installation, updates, removal, and shared workflow parity for all
  five hosts; share native hook discovery and one reminder script across Claude,
  Codex, and Gemini.
- **plugins**: Generate Claude worker adapters from shared briefs with host-specific read-only
  researcher tool names; reject stale adapters during package validation.
- **tools**: Add package consistency validation and release publication instructions.

### Verification

All 61 Node tests, package consistency checks, strict Claude plugin and marketplace
validation, Antigravity validation, and whitespace checks passed. Isolated fixture
install/update trials covered all five hosts and shared resource parity. Native
worker execution, signed-in hook lifecycle/trust, and Antigravity IDE loading
remain untested. Public installation checks follow tag publication.

### Commits

- [`402812ddbf`](https://github.com/jeio-dev/kaylo/commit/402812ddbf2c5f8887269f2b21c7710fb3e71614) - **plugins**: add release catalogs and Gemini support for v0.6.0 (Jeio) [#7](https://github.com/jeio-dev/kaylo/pull/7)

## 2026-09-27, Version 0.5.2

### Notable Changes

- **docs**: Simplify the README package and scope description.

### Verification

All 52 validator tests passed; `git diff --check` was clean.

### Commits

- [`33eb81c209`](https://github.com/jeio-dev/kaylo/commit/33eb81c2098442e5491426ab1e0055643ae564e9) - **release**: README cleanup (Jeio) [#6](https://github.com/jeio-dev/kaylo/pull/6)

## 2026-09-27, Version 0.5.1

### Notable Changes

- **tools**: Reject closure for indented `Status: Needs revision` records, with regressions
  for linked and legacy plans. Clarify Gemini CLI's unverified native support.

### Verification

All 52 validator tests passed (Node 24.21.0), four new regressions failed before the fix and pass afterward, and `git diff --check` was clean.

### Commits

- [`13dfbab35b`](https://github.com/jeio-dev/kaylo/commit/13dfbab35ba7043c8af677a21346704f222f16d1) - **release**: status indentation hotfix (Jeio) [#5](https://github.com/jeio-dev/kaylo/pull/5)

## 2026-09-27, Version 0.5.0

### Notable Changes

- **skills**: Add portable guardrails to the five skills and worker briefs for untrusted
  content, secrets, consequential-action authorization, and workspace preservation.
- **tools**: Add a read-only Node plan validator, build/close invocation guidance, structural
  fixture tests, and behavioral challenge prompts. Document parser limitations
  and manual fallback; the startup hook and host permissions are unchanged.

### Verification

All 48 validator tests, all five skill validators, strict Claude plugin validation, JSON/version consistency checks, and diff checks passed. Independent focused review accepted the implementation and reported 17 additional fixtures passing.

The startup hook remains a reminder. Guardrail instructions are advisory; structural validation does not prove authorization, truthful evidence, or model compliance. Behavioral compliance trials remain unrun.

### Commits

- [`17b4138e6f`](https://github.com/jeio-dev/kaylo/commit/17b4138e6fcb6c43e4ba5277c1da671901164e10) - **release**: guardrails and structural plan validation (Jeio) [#4](https://github.com/jeio-dev/kaylo/pull/4)

## 2026-09-27, Version 0.4.0

### Notable Changes

- **plan**: Phase-plan tasks record `Depends on:` with tasks listed above in the same
  phase whose output they need to implement or verify, or `None`; required
  packages and tools are listed separately. Build picks the first unblocked
  task whose dependencies are checked, names the blocked tasks it skips,
  reconsiders one once its blocking condition changes, and needs the user's
  go-ahead to start a named task early. Invalid dependency lines return to
  plan. Dependencies set order, not concurrency.

### Verification

Validation passed for plugin packaging, all five skills, and reminder hook behavior. Five single-run Claude Code fixture sessions exercised task selection; the missing-line fallback, other hosts' models, and delegated workers remain unverified.

### Commits

- [`73ee93f40c`](https://github.com/jeio-dev/kaylo/commit/73ee93f40c8cb1cfe374d8f0b251907b3966b7c7) - **release**: task dependencies in phase plans (Jeio) [#3](https://github.com/jeio-dev/kaylo/pull/3)

## 2026-09-27, Version 0.3.0

### Notable Changes

- **build**: Refine delegated builds with workspace baselines, dependency readiness,
  file ownership, compact evidence reports, and resume details in existing
  phase plans. Batch related corrections without resetting repair limits;
  check combined behavior where tasks connect. Model routing and review
  requirements remain unchanged.

- **plugins**: Add Antigravity's root plugin manifest and native installation guidance.
  Document OpenCode 2 loading the shared skills directory; discovery checks
  wait for its catalog to initialize before evaluating the result.

- **plan**: Split plans into phases: `PLAN.md` becomes an index with a `Current:` link and
  an ordered phase checklist; each phase's scope, tasks, findings, results, and
  completion live in `.kaylo/phases/NN-slug/NN-PLAN.md`, created only when the
  phase starts. Close checks off the phase; the next plan moves `Current:`.
- **build**: Restart task and finding IDs per phase, with qualified IDs such as `02-T3`
  routed to plan. Build records `In progress` before editing or delegating and
  resumes interrupted work from the working tree.
- **define**: Define writes a product-level objective; the last close also checks its
  success criteria.
- **plan**: Add a phase template. Older single-file plans keep working as one phase and
  convert only during a relevant plan update.

### Verification

Validation passed for plugin packaging, all five skills, resource links, and reminder hook behavior. Live model workflow behavior and savings remain unverified.

### Commits

- [`674f748826`](https://github.com/jeio-dev/kaylo/commit/674f7488263299cafe51978320907146d73dd274) - **release**: phased plans and delegation refinements (Jeio) [#2](https://github.com/jeio-dev/kaylo/pull/2)

## 2026-09-26, Version 0.2.0

### Notable Changes

- **skills**: Restructure skills into focused actions and grouped rules; load build and
  review delegation details from references only when needed.
- **review**: Add stable review finding IDs, explicit finding selection in build, and
  evidence-backed resolution with blocker rechecks before closure.
- **plan**: Clarify plan validity separately from agreement and completion, preserve
  unaffected results, and allow compact tasks for clear local S changes.
- **build**: Clarify relevant verification inputs and repair resumption while retaining
  attempt history across sessions and workers.
- **tools**: Anchor optional templates and worker briefs to their skill directories.

### Verification

All five skill validators, Codex plugin validation, Claude strict plugin validation, resource links, JSON/version consistency, and whitespace checks passed. See VERIFICATION.md for behavioral trial results and their limits; the latest instruction restructuring did not receive a new behavioral trial.

### Commits

- [`b10f85801f`](https://github.com/jeio-dev/kaylo/commit/b10f85801f2ca65edf2a0478fd28d4f11c83da7f) - **release**: workflow and skill improvements (Jeio) [#1](https://github.com/jeio-dev/kaylo/pull/1)

## 2026-09-26, Version 0.1.0

### Notable Changes

- **plugins**: Initial release: five skills (`define`, `plan`, `build`, `review`, `close`),
  three portable worker briefs, optional objective and plan templates, native
  Claude and Codex plugin manifests, a local Codex marketplace, and an optional
  SessionStart reminder hook.

### Verification

See the [README](https://github.com/jeio-dev/kaylo/blob/v0.1.0/README.md) to load Kaylo in Claude Code or Codex, and [VERIFICATION.md](https://github.com/jeio-dev/kaylo/blob/v0.1.0/VERIFICATION.md) for what has been checked.

### Commits

- [`f67d8cb4d0`](https://github.com/jeio-dev/kaylo/commit/f67d8cb4d08a1292c3a212236cd430d3b075b8a4) - **release**: initial package (Jeio)
