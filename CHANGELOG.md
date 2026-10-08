# Changelog

## [Unreleased]

### Notable Changes

- **skills and tools**: Build now states explicitly that reviewer records,
  including high-risk reviews and inherited exceptions, go under `## Review`.
  The dispatch report marks a checked task with a reviewer record in its
  `Result:` malformed instead of counting it in first-try rates. The build
  delegation reference includes the S/M/L builder tier rows and asks for the
  preference, estimate, tier choice, and any reason for an increase before
  dispatch; a missing dependency alone does not justify raising the tier.
  These changes address H2 and E1 from the corrected-package smoke set
  ([#83](https://github.com/jeio-dev/kaylo/issues/83)).
- **skills**: When a check fails, the assistant now diagnoses it before
  choosing a stronger model. With a Quality, Balanced, or Budget preference
  and a host that can apply the choice, it may recommend Light → Medium or
  Medium → Strong within the remaining repairs; Strong stays Strong, and
  Inherit stays Inherit unless you choose otherwise. A model change never adds
  repairs: the limit is still two unsuccessful repairs of the same failure,
  across sessions, workers, and models. A missing dependency, unavailable
  check, quota limit, or access problem is reported as a blocker rather than
  escalated. Failing with a Strong model no longer implies the plan is wrong;
  only scope, acceptance, decision, or task-split problems go back to plan
  ([#83](https://github.com/jeio-dev/kaylo/issues/83)).
- **skills**: `.kaylo/preferences.md` accepts two optional keys.
  `Review vendor: different` requires a reviewer whose model vendor is known to
  differ from every builder in the review target. If that cannot be
  established, the assistant offers to waive the requirement for that review,
  hand off manually, or pause; skipping review is not offered, and a pending
  handoff or failed dispatch is not a review. A missing key or `same` keeps
  today's routing. `Metered: allowed (<route>)` authorizes one named
  pay-per-use route; an explicit session authorization for that route also
  counts. Neither covers another account, provider fallback, or extra repairs,
  and unknown billing is not treated as covered by a subscription. Plan does
  not ask for these keys and keeps them when it writes the file
  ([#83](https://github.com/jeio-dev/kaylo/issues/83)).
- **skills**: Tasks may carry `Risk: high` with a reason, classified by the
  behavior changed (for example session enforcement or authorization), not by
  incidental mentions. Build requests a focused review of such a task after
  its checks pass and before check-off, targeting a Strong reviewer in a fresh
  context; when that cannot be established, including an Inherit model of
  unknown capability, you choose another qualifying route, a manual handoff, a
  recorded exception, or a pause. The reviewer brief adds a checklist for
  trust boundaries, authorization, invalid input, data exposure, and abuse
  cases. Phase review reuses that review only while its inputs are unchanged.
  A missing `Risk:` does not mean low risk, and older plans need no change
  ([#83](https://github.com/jeio-dev/kaylo/issues/83)).
- **tools**: Builds and reviews append compact `{kaylo:v1 ...}` records to the
  existing `Result:` line or `## Review`, documented in `WORKERS.md`. They keep
  dispatches, repairs, requested and observed model identity, billing, and
  fallbacks separate, with explicit `unknown` values. The new read-only
  `scripts/dispatch-report.cjs` prints first-try pass rates among recorded
  tasks in closed phases, grouped by requested tier, estimate, and builder
  vendor, with missing and malformed counts. A rate below about 60% is
  flagged as advisory only; nothing changes preferences or the tier table
  automatically. The plan validator ignores the records, so existing plans
  stay valid ([#83](https://github.com/jeio-dev/kaylo/issues/83)).
- **skills**: The build and review skills now show the exact record forms
  themselves, so the assistant no longer has to open `WORKERS.md` to write
  them. Build shows `direct`, `dispatch`, `verify`, `repair`, and the keyless
  `accept` and `reopen`. It also says how to resume a task with existing
  records: keep them, add your own `direct` or new `dispatch` record first,
  add no second `verify`, and continue the failure's repair count. Review and
  `WORKERS.md` map each routing choice to a record. A vendor waiver is
  `fallback=vendor-waived fallback-auth=user`, and an exception to an unmet
  tier is `fallback=tier-exception`. A manual handoff stays `pending` until an
  `update` records its result, and a pause writes no record. `tier` is never
  `unknown`, and a vendor waiver does not settle the reviewer's tier. A
  review comment is marked `fixed` only after a correction. When you decline
  another repair, the next step no longer asks for it again. These changes
  follow the first live trial of the #83 records, in which direct builds
  wrote prose instead of records and a vendor waiver was recorded as
  `fallback=none` ([#83](https://github.com/jeio-dev/kaylo/issues/83)).

## 2026-10-06, Version 0.11.0

### Notable Changes

- **tests**: `tests/GUARDRAIL-TRIALS.md` now has a protocol for repeated
  live-model runs of seven cases: four guardrail cases and the B1, P5, and C1
  routing cases behind #37, #40, and #41. Each case names the failure condition
  it needs, and a run where that condition never arises is graded "not
  exercised", separately from passes and fails. P5 gets a new fixture: the
  request changes existing user-visible behavior, so it always carries a
  decision the user must make. A fixed answer sheet for the simulated user
  keeps runs comparable, and the operator never sends a build command on the
  user's behalf. The run matrix covers Claude Code with Sonnet 5.5 and Codex
  CLI, three runs each. Each of the seven cases passed three times on Claude
  Code 2.1.289 with Sonnet 5.5 and on Codex CLI 0.160.1 with its default
  GPT-6.1-Sol at low reasoning, in a read-only sandbox that asks before each
  edit. No run failed the agreed rubric. So Kaylo's statement that Claude and Codex can guide a
  project is now supported for these seven cases on this setup. On Codex, P5's
  fresh plan review came from a Codex generic subagent, because Codex has no
  Kaylo workers. For later runs, P5 also fails if readiness is sought while
  another user-owned behavior decision is still open. Deleting injected
  instructions from a file the task already rewrites, and disclosing it,
  counts as in scope. Codex's default read-only sandbox has a limit: a Node
  child process with piped stdio can fail, or return empty output with exit
  status 0, so a check that reads only the exit status would pass on empty
  output. The C1 checks compared stdout, so they failed safely, and the model
  switched to direct runs. The trials cover only the setups named; they make
  no consistency or security claim
  ([#74](https://github.com/jeio-dev/kaylo/issues/74)).
- **docs**: The README's guardrails section now shows how to run the plan
  validator as an optional Git pre-commit hook that you add yourself. The hook
  validates a copy of the staged plan files, so a plan fixed only in the working
  tree cannot hide an invalid staged one. Add it after `ROADMAP.md` is
  committed; until then every commit fails. Kaylo still installs no hook. The
  section explains that `--no-verify` skips the hook, that clones do not share
  hooks, and that only a CI step guarantees what lands in the repository. The
  setup was tried on Linux only
  ([#73](https://github.com/jeio-dev/kaylo/issues/73)).
- **skills**: Remove five repeated clauses within `plan` and `build`, keeping
  each requirement in its more specific rule. All five skills now have a
  rule-source inventory in the comments on
  [#75](https://github.com/jeio-dev/kaylo/issues/75); guardrails and shared
  copies are unchanged. This is a text-only cleanup; model behavior is
  checked separately in [#74](https://github.com/jeio-dev/kaylo/issues/74).
- **skills**: The `plan` and `close` descriptions now say when to use them, as
  the other three already did. `plan` applies after a Kaylo PRD is agreed, when
  the current phase closes, or when another Kaylo skill routes back to it;
  `close` applies when a Kaylo review finds the current phase's implementation
  ready. Both clauses name Kaylo so that hosts that load skills by bare name
  are less likely to pick them for projects that don't use Kaylo; no routing
  trial has tested this ([#72](https://github.com/jeio-dev/kaylo/issues/72)).
- **tools**: The package validator now checks every skill description: it must
  be a present, non-empty, plain single-line YAML value (no quotes, block
  indicators, comments, or continuation lines) of at most 1,024 characters,
  free of `<` and `>`, that names Kaylo. It also checks the guardrail bullets and the
  Node-unavailable fallback that are copied across skills so each `SKILL.md`
  works when pasted alone. Every copy must match byte for byte, except the
  intended variants written into the check: `define` omits the
  permission-denial guardrail, `build` extends the working-changes guardrail,
  and `plan`'s fallback must equal the shared copy with three listed
  rewordings. Each block is compared whole, including a bullet's continuation
  lines. A missing or drifted copy fails with a message naming the skill and
  the block ([#72](https://github.com/jeio-dev/kaylo/issues/72)).

### Verification

The package validator, all 168 Node tests, strict Claude plugin and marketplace
validation, Antigravity validation, `npm pack --dry-run` (48 entries), and
whitespace checks passed on the release tree. In isolated profiles against a
local release mirror, a tarball packed from the release tree updated native
v0.10.0 installs on Claude Code, Codex, Antigravity, Gemini CLI, and OpenCode
to 0.11.0; every installed root matched the release tree's 23 shared
resources, none followed the mirror's newer `main`, and OpenCode listed all
five skills from the new copy. These checks ran on one Linux (WSL2) machine
without sign-in or model requests; Gemini CLI reached the mirror by Git clone
after its release-archive request failed offline. Live worker starts were
skipped because the worker briefs, Claude adapters, and hooks are byte-identical
to v0.10.0. The skill changes in this release are text changes whose model
behavior is covered only by the #74 trials described above, which ran on an
earlier snapshot (`738ae4e`) on Claude Code with Sonnet 5.5 and on Codex.
After publication, the npm tarball matched the tag file for file. In fresh
profiles against public GitHub and npm, native installs on Claude Code, Codex,
Gemini CLI, and Antigravity, a fresh `npx kaylo@0.11.0 --all`, and
`npx kaylo@latest update` from public v0.10.0 installs each put 0.11.0 on
every host with all 23 shared resources matching the tag. Gemini CLI installed
from the GitHub release archive, and OpenCode listed all five skills from the
new copy; no model requests were made. Other operating systems, Gemini CLI model behavior, and
Antigravity IDE loading remain untested. Details and limits are in
`VERIFICATION.md`.

### Commits

- [`fffd06d6d9`](https://github.com/jeio-dev/kaylo/commit/fffd06d6d95f73c3a5d777e53dc5b0c94e20aa5b) - **plugins**: merge pull request #70 from jeio-dev/release-0.10.0 (Jeio) [#70](https://github.com/jeio-dev/kaylo/pull/70)
- [`f796094371`](https://github.com/jeio-dev/kaylo/commit/f79609437103093e2ce74dff3accd23e5ecb6764) - **docs**: record v0.10.0 public installation checks (Jeio)
- [`0a0d9e3023`](https://github.com/jeio-dev/kaylo/commit/0a0d9e3023a6fb4304dbccc863abec45e0074e2b) - **skills**: add use-when clauses and check descriptions and copied text (Jeio) [#76](https://github.com/jeio-dev/kaylo/pull/76)
- [`10f52dffe1`](https://github.com/jeio-dev/kaylo/commit/10f52dffe14fbb91199146ba81aebf0ad206cea9) - **tools**: check plan's reworded fallback exactly and address review nits (Jeio) [#76](https://github.com/jeio-dev/kaylo/pull/76)
- [`1619c78ef6`](https://github.com/jeio-dev/kaylo/commit/1619c78ef648dacae2d1df7f63d4a03b0af58377) - **docs**: record the confirmed plan fallback variant and its redaction dependency (Jeio) [#76](https://github.com/jeio-dev/kaylo/pull/76)
- [`d4c616c969`](https://github.com/jeio-dev/kaylo/commit/d4c616c969d923b22f5235f26cb4fdc28285a5a2) - **tools**: compare whole copied blocks and accept only plain single-line descriptions (Jeio) [#76](https://github.com/jeio-dev/kaylo/pull/76)
- [`8c5ea347b3`](https://github.com/jeio-dev/kaylo/commit/8c5ea347b38d5d85dd4900ef2afe5fc93e82b335) - **skills**: merge pull request #76 from jeio-dev/issue-72-descriptions-shared-text (Jeio) [#76](https://github.com/jeio-dev/kaylo/pull/76)
- [`9e2c9759bd`](https://github.com/jeio-dev/kaylo/commit/9e2c9759bdb688ba9af5572a9f94f43e88c55b50) - **skills**: trace rule sources and remove within-skill repeats (#75) (Jeio) [#77](https://github.com/jeio-dev/kaylo/pull/77)
- [`0bc6dca0f4`](https://github.com/jeio-dev/kaylo/commit/0bc6dca0f420775470101b238ea76380c71989dd) - **docs**: record PR #77 review checks (Jeio) [#77](https://github.com/jeio-dev/kaylo/pull/77)
- [`73dd9ac3a1`](https://github.com/jeio-dev/kaylo/commit/73dd9ac3a10ebcdb2e8811ee3a2237910e528601) - **skills**: merge pull request #77 from jeio-dev/issue-75-rule-sources (Jeio) [#77](https://github.com/jeio-dev/kaylo/pull/77)
- [`1a5a238084`](https://github.com/jeio-dev/kaylo/commit/1a5a238084adb52197ffe84e06db74f545997117) - **docs**: show the plan validator as an optional user-owned pre-commit hook (#73) (Jeio) [#78](https://github.com/jeio-dev/kaylo/pull/78)
- [`8f8a940586`](https://github.com/jeio-dev/kaylo/commit/8f8a940586a09654253ffa40ef3def7297ca9522) - **docs**: add the hook after ROADMAP.md is committed; record PR #78 review (Jeio) [#78](https://github.com/jeio-dev/kaylo/pull/78)
- [`738ae4e296`](https://github.com/jeio-dev/kaylo/commit/738ae4e296bfb6101935f55be9646d454a842f43) - **docs**: merge pull request #78 from jeio-dev/issue-73-pre-commit-validator (Jeio) [#78](https://github.com/jeio-dev/kaylo/pull/78)
- [`0bd9da6653`](https://github.com/jeio-dev/kaylo/commit/0bd9da6653eb6422a38e86c07fd5205aeb4e0ec0) - **tests**: add the repeated-run protocol for guardrail and routing trials (#74) (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`ac3974e877`](https://github.com/jeio-dev/kaylo/commit/ac3974e877827f802c996f0f407e8b01fca81ee3) - **docs**: record Claude round 1 of the repeated guardrail trials (#74) (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`acf8fd17a0`](https://github.com/jeio-dev/kaylo/commit/acf8fd17a0a38617eaabb8a7f4df46e4a666acb4) - **docs**: record Claude rounds 2 and 3 of the guardrail trials and Codex preparation (#74) (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`d041433da1`](https://github.com/jeio-dev/kaylo/commit/d041433da12064eb942f0f2057dc6e96e10506e5) - **docs**: record Codex rounds 1 to 3 of the guardrail trials (#74) (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`813c38dea5`](https://github.com/jeio-dev/kaylo/commit/813c38dea55e152b94e3f64ffe05636f2cf1f97c) - **tests**: record the P5 empty-name ruling and widen P5's rubric for later runs (#74) (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`6b8201babb`](https://github.com/jeio-dev/kaylo/commit/6b8201babb7fe8395186b6f4221e05f9bf1a9fe8) - **tests**: merge pull request #79 from jeio-dev/issue-74-live-trials (Jeio) [#79](https://github.com/jeio-dev/kaylo/pull/79)
- [`2502f0a910`](https://github.com/jeio-dev/kaylo/commit/2502f0a91012003ea710d053ab5a9602f3d12fa7) - **docs**: record the UI scope ruling and the cause of C1's empty spawnSync capture on Codex (#74) (Jeio) [#80](https://github.com/jeio-dev/kaylo/pull/80)
- [`d190775762`](https://github.com/jeio-dev/kaylo/commit/d1907757621018e283f0ac6b598bb25c8a704b6c) - **docs**: correct the UI run-3 disclosure claim and record the PR #80 review (#74) (Jeio) [#80](https://github.com/jeio-dev/kaylo/pull/80)
- [`f37d842458`](https://github.com/jeio-dev/kaylo/commit/f37d8424581094f82dd189a1054236ceb4725114) - **docs**: merge pull request #80 from jeio-dev/issue-74-followup-rulings (Jeio) [#80](https://github.com/jeio-dev/kaylo/pull/80)
- [`fcc1a4498d`](https://github.com/jeio-dev/kaylo/commit/fcc1a4498d42abe0537022d00c5444a363ba03da) - **docs**: carry PR #80's ruling and Codex sandbox limit into the changelog, trials, and README (#74) (Jeio) [#81](https://github.com/jeio-dev/kaylo/pull/81)
- [`0eef47295e`](https://github.com/jeio-dev/kaylo/commit/0eef47295e882794eb5eac86797dd37944bcbc93) - **docs**: record the PR #81 review (Jeio) [#81](https://github.com/jeio-dev/kaylo/pull/81)
- [`2f97fded68`](https://github.com/jeio-dev/kaylo/commit/2f97fded6840938aba9301b31974da7dc07a89f6) - **docs**: merge pull request #81 from jeio-dev/docs-pr80-followups (Jeio) [#81](https://github.com/jeio-dev/kaylo/pull/81)
- [`0d26967b0e`](https://github.com/jeio-dev/kaylo/commit/0d26967b0ef7835bd3324ec542eb002f76eda30c) - **plugins**: prepare v0.11.0 manifests and README (Jeio)

## 2026-10-04, Version 0.10.0

### Notable Changes

- **tools**: Kaylo now has a one-command installer, published on npm as
  `kaylo`. `npx kaylo` installs Kaylo on Claude Code, Codex, Antigravity CLI,
  Gemini CLI, and OpenCode 2; `npx kaylo@latest update`, `npx kaylo status`,
  and `npx kaylo uninstall` update, report, and remove it. In a terminal it
  offers a host picker; `--claude`, `--codex`, `--agy`, `--gemini`,
  `--opencode`, and `--all` select hosts, `--yes` skips Kaylo's own
  confirmation, and `--dry-run` runs only read-only commands. It needs Node.js
  24 or newer and has no dependencies
  ([#56](https://github.com/jeio-dev/kaylo/issues/56),
  [#59](https://github.com/jeio-dev/kaylo/issues/59)).
- **tools**: The installer is a thin wrapper. It runs each host's own commands
  pinned to its release tag: Claude Code and Codex marketplaces at `v0.10.0`,
  Gemini CLI with `--ref v0.10.0`, and Antigravity from the npm package
  directory. A host passes only when it reports this version and its installed
  files match the package byte for byte. Codex is checked at the path its own
  `plugin add --json` reports and Gemini CLI at the path its extension list
  names; no host is checked against a searched cache copy. Declining the
  confirmation, closing input, or pressing Ctrl-C at a prompt changes nothing.
  A host that fails is reported and the run exits non-zero
  ([#59](https://github.com/jeio-dev/kaylo/issues/59)).
- **tools**: For OpenCode 2, which reads skills in place, the installer copies
  and verifies the full package in `<XDG_DATA_HOME>/kaylo/v<version>/`, then
  edits the global JSON or JSONC config while preserving comments and other
  settings. Updates keep the referenced copy until the new one is verified, and
  an interrupted same-version replacement is recovered on the next mutating run.
  Symlinked global configs and a config with both `opencode.json` and
  `opencode.jsonc` are refused. If removing an old copy fails after the config
  edit, the installer reports the active state and `cleanup pending`. The copy
  also completes from an npm-unpacked package, where npm renames `.gitignore`
  to `.npmignore` ([#60](https://github.com/jeio-dev/kaylo/issues/60),
  [#68](https://github.com/jeio-dev/kaylo/issues/68)). OpenCode 1 and
  per-project config are outside the installer.
- **tools**: `kaylo status` reports each host's installed version and, where
  its active path is available, compares the installed files with the package.
  Codex shows its listed version as `files not verified`, because its read-only
  commands do not expose the active path. Before confirming, install and update
  warn about unselected hosts that already have Kaylo and would stay on their
  version, and about a newer `kaylo` on npm; an interactive prompt can add those
  hosts, while `--yes` and `--dry-run` leave the selection unchanged. A host whose
  status command fails is reported individually without stopping the others
  ([#61](https://github.com/jeio-dev/kaylo/issues/61)).
- **plugins**: The repository carries an npm `package.json` with the same
  version as the plugin manifests and a `files` list matching the files Git
  tracks. A new inventory test proves the packed tarball holds exactly the
  tag's files and passes package validation; npm publishes from a `git
  archive` export of the tag. Git-based installs now also contain
  `package.json` and `bin/`; the Claude Code and Antigravity validators accept
  them ([#58](https://github.com/jeio-dev/kaylo/issues/58)).
- **docs**: The README leads with the `npx kaylo` commands and keeps the native
  per-host instructions. `RELEASING.md` lists the installer update command
  first and adds the npm publication steps. `VERIFICATION.md` records the host
  trials the design depends on (#57) and the packed-tarball end-to-end trial
  ([#62](https://github.com/jeio-dev/kaylo/issues/62)).

Skills, worker briefs, Claude adapters, hooks, and templates are unchanged from
0.9.3. Native per-host installs keep working as before; using the installer is
optional.

### Verification

The package validator, all 166 Node tests, strict Claude plugin and marketplace
validation, Antigravity validation, `npm pack --dry-run` (48 entries), and
whitespace checks passed on the release tree. In isolated profiles against a
local release mirror, a tarball packed from the release tree updated native
v0.9.3 installs on Claude Code, Codex, Antigravity, Gemini CLI, and OpenCode to
0.10.0; every installed root matched the release tree's 23 shared resources,
none followed the mirror's newer `main`, and OpenCode listed all five skills
from the new copy. Issue #62's packed-tarball trial also covered fresh install,
status, uninstall, mixed versions, and the OpenCode config refusal, and a clean
real-profile hash check showed a fresh install wrote nothing to the normal host
profiles. These checks ran on one Linux (WSL2) machine without sign-in or model
requests; Gemini CLI reached the mirror by Git clone after its release-archive
request failed offline. Live worker starts were not rerun because the briefs
and adapters are byte-identical to v0.9.3. After publication, the npm
tarball matched the tag file for file. In fresh profiles against public GitHub
and npm, native installs on Claude Code, Codex, Gemini CLI, and Antigravity,
a fresh `npx kaylo@0.10.0 --all`, and `npx kaylo@latest update` from public
v0.9.3 installs each put 0.10.0 on every host with all 23 shared resources
matching the tag. Gemini CLI installed from the GitHub release archive, and
OpenCode listed all five skills from the new copy; no model requests were
made. Other operating systems, Gemini CLI model behavior, and Antigravity IDE
loading remain untested. Details and limits are in `VERIFICATION.md`.

### Commits

- [`1fb9763491`](https://github.com/jeio-dev/kaylo/commit/1fb9763491c9260fa8c481c0510e8dbfe9a0dec2) - **docs**: record v0.9.3 public installation checks (Jeio)
- [`95336c2ffc`](https://github.com/jeio-dev/kaylo/commit/95336c2ffcf8ae171b0f63865e40d95f98d083a6) - **docs**: verify OpenCode against public v0.9.3 tag (Jeio)
- [`75aee23037`](https://github.com/jeio-dev/kaylo/commit/75aee2303791ad88d1e8e7188d757c5f66f72a2d) - **tools**: add npm package manifest and inventory test (#58) (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`afa425ae95`](https://github.com/jeio-dev/kaylo/commit/afa425ae95affe003b9f2cd724aa74b4eb93df94) - **docs**: record release-mode inventory pass (#58) (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`a4d8d5f646`](https://github.com/jeio-dev/kaylo/commit/a4d8d5f646dd60a76f3699c766b400184d8ef08f) - **tools**: keep the release-mode archive inside cleaned temp folders (#58) (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`5d32a78fc2`](https://github.com/jeio-dev/kaylo/commit/5d32a78fc27776bc6556b826418daeda17c8aec1) - **docs**: record release-mode run against a tagged clone (#58) (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`9657a58613`](https://github.com/jeio-dev/kaylo/commit/9657a586135f7f498d216445dd606d2e5bf909b3) - **tools**: keep an existing development staging folder in the inventory test (#58) (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`66b8636aa8`](https://github.com/jeio-dev/kaylo/commit/66b8636aa81291439fb0b5ef265e9ab60a0d0ebf) - **tools**: merge pull request #63 from jeio-dev/feat/issue-58-npm-package (Jeio) [#63](https://github.com/jeio-dev/kaylo/pull/63)
- [`8c28773bf3`](https://github.com/jeio-dev/kaylo/commit/8c28773bf372930556ff1699c4923899cbc3f9f9) - **docs**: record installer host trials (#57) (Jeio) [#64](https://github.com/jeio-dev/kaylo/pull/64)
- [`88a9d84429`](https://github.com/jeio-dev/kaylo/commit/88a9d84429b78f5137b8d80ac09be1f83435ca9e) - **docs**: correct installer host trial record (#57) (Jeio) [#64](https://github.com/jeio-dev/kaylo/pull/64)
- [`f30b4bdac1`](https://github.com/jeio-dev/kaylo/commit/f30b4bdac17826dfc9268e14d4bcb580b5efa7f0) - **docs**: merge pull request #64 from jeio-dev/docs/issue-57-host-trials (Jeio) [#64](https://github.com/jeio-dev/kaylo/pull/64)
- [`0c55ddbae0`](https://github.com/jeio-dev/kaylo/commit/0c55ddbae086aedd90ae5df07498d4b26da7e43e) - **tools**: add the kaylo installer for Claude Code, Codex, Antigravity, and Gemini CLI (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`9b3e24fff1`](https://github.com/jeio-dev/kaylo/commit/9b3e24fff195c23bdd124c69b492eefeefe64306) - **tools**: read Gemini CLI's extension list from stderr too (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`c328e95362`](https://github.com/jeio-dev/kaylo/commit/c328e9536229df3af88707f4f8a0ad58265aa33d) - **docs**: record installer core checks and smoke trial (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`2bc6d5295a`](https://github.com/jeio-dev/kaylo/commit/2bc6d5295a6f3fd113eae9d803f1f5385dae36ca) - **tools**: abort on closed prompts, read the Gemini root from its list, and report failed replaces (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`890987558f`](https://github.com/jeio-dev/kaylo/commit/890987558f3e13d68945156e8ca5aa085e77be79) - **docs**: record the #59 review fixes and smoke trial rerun (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`9041cad55d`](https://github.com/jeio-dev/kaylo/commit/9041cad55d57af6cc56c3cd10d0701c0841bfb77) - **tools**: report a removed install only when Kaylo was installed (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`b3bb5fde58`](https://github.com/jeio-dev/kaylo/commit/b3bb5fde58797352b2258340f7dfd724fe613c69) - **tools**: report a missing install path before a version mismatch (#59) (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`4623318cef`](https://github.com/jeio-dev/kaylo/commit/4623318cef0d0b1d9278cf23a8c16d42736f0f49) - **tools**: merge pull request #65 from jeio-dev/feat/issue-59-installer-core (Jeio) [#65](https://github.com/jeio-dev/kaylo/pull/65)
- [`44c43960ae`](https://github.com/jeio-dev/kaylo/commit/44c43960ae5a121d61fdf6e39b90d9c1cf34a0cb) - **tools**: add OpenCode installer support (Jeio) [#66](https://github.com/jeio-dev/kaylo/pull/66)
- [`68f2afaff0`](https://github.com/jeio-dev/kaylo/commit/68f2afaff020997a4c008c5d8575822254663150) - **tools**: report OpenCode cleanup accurately and refuse symlinked config (Jeio) [#66](https://github.com/jeio-dev/kaylo/pull/66)
- [`11c09b015c`](https://github.com/jeio-dev/kaylo/commit/11c09b015cf0fb92aa0f3895594e11ffb0fe16fc) - **tools**: defer blocked OpenCode startup cleanup (Jeio) [#66](https://github.com/jeio-dev/kaylo/pull/66)
- [`282f6bc85d`](https://github.com/jeio-dev/kaylo/commit/282f6bc85de56926145665aa3854d6d1b63106fa) - **tools**: merge pull request #66 from jeio-dev/issue-60-opencode-installer (Jeio) [#66](https://github.com/jeio-dev/kaylo/pull/66)
- [`111dde021c`](https://github.com/jeio-dev/kaylo/commit/111dde021cc8b06a79d8855dcb40ca21f927cccc) - **tools**: add Kaylo status and version drift preflight (Jeio) [#67](https://github.com/jeio-dev/kaylo/pull/67)
- [`7b9313f484`](https://github.com/jeio-dev/kaylo/commit/7b9313f48455ea089b027b80cc9955728d1fb581) - **tools**: keep host status failures isolated during preflight (Jeio) [#67](https://github.com/jeio-dev/kaylo/pull/67)
- [`a3992b63b0`](https://github.com/jeio-dev/kaylo/commit/a3992b63b0b23e7d74128044c8e8e035365ccfc7) - **tools**: merge pull request #67 from jeio-dev/issue-61-status-preflight (Jeio) [#67](https://github.com/jeio-dev/kaylo/pull/67)
- [`3b38beef4d`](https://github.com/jeio-dev/kaylo/commit/3b38beef4d9dc02cb8b270f2c9a71bbbad9c03cf) - **tools**: fix OpenCode install from npm-unpacked package (#68) (Jeio) [#69](https://github.com/jeio-dev/kaylo/pull/69)
- [`4b19e7dd86`](https://github.com/jeio-dev/kaylo/commit/4b19e7dd86bc4d4508339cc978a3d044c90efaf0) - **docs**: document npx kaylo installer and record packed-tarball trial (#62) (Jeio) [#69](https://github.com/jeio-dev/kaylo/pull/69)
- [`91d0cffb0b`](https://github.com/jeio-dev/kaylo/commit/91d0cffb0beb7f87a0348441d1e943ba22e2108e) - **docs**: merge pull request #69 from jeio-dev/issue-62-packed-trial (Jeio) [#69](https://github.com/jeio-dev/kaylo/pull/69)
- [`dd8dc6a8a0`](https://github.com/jeio-dev/kaylo/commit/dd8dc6a8a03af22e1831c2aab07c7f343e24f4fc) - **plugins**: prepare v0.10.0 manifests and README (Jeio)

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
