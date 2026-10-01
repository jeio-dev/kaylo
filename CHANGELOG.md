# Changelog

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
or on any host; the last two wording corrections (`cfdc277`, `c2a673c`) have
had no recheck. The define changes from 0.8.0 remain unrun as well. On a
host without a fresh reviewer, the plan check before a phase-wide build is a
direct review by the same assistant. `VERIFICATION.md` records each review and
its limits. Other models and hosts, native worker execution outside Claude
Code, signed-in hook lifecycle and trust, and Antigravity IDE loading remain
untested. Public installation checks follow tag publication.

### Commits

- [`9030961410`](https://github.com/jeio-dev/kaylo/commit/9030961410f44f555b5bf052e856d7c2d912e2a7) - **docs**: record v0.8.0 public installation checks (Jeio) [#20](https://github.com/jeio-dev/kaylo/pull/20)
- [`5a0974fd21`](https://github.com/jeio-dev/kaylo/commit/5a0974fd215130c5af6a74ba9fded6f2dceee6c0) - **skills**: add phase mode to build, planning readiness, and close rule suggestions (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`cfdc277496`](https://github.com/jeio-dev/kaylo/commit/cfdc27749671642ef35005837d2d6f10d1684e61) - **skills**: tighten plan-check routing and readiness wording after recheck (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`c2a673c1dc`](https://github.com/jeio-dev/kaylo/commit/c2a673c1dcd1abf4051e334e12499f0daa2a9bfd) - **skills**: describe the direct plan review fallback accurately (Jeio) [#21](https://github.com/jeio-dev/kaylo/pull/21)
- [`a5f8d9bd5a`](https://github.com/jeio-dev/kaylo/commit/a5f8d9bd5a7b4990c61f09403a87b66803b8057b) - **plugins**: set version 0.9.0 and select the v0.9.0 tag (Jeio) [#22](https://github.com/jeio-dev/kaylo/pull/22)

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
`claude-opus-5-5` during this cycle, the last against `9cf7059`; the define
changes in [#16](https://github.com/jeio-dev/kaylo/pull/16)–[#18](https://github.com/jeio-dev/kaylo/pull/18) came after it and have not run with a model. `VERIFICATION.md`
records what each trial exercised. Other models and hosts, native worker
execution outside Claude Code, signed-in hook lifecycle and trust, and
Antigravity IDE loading remain untested. Public installation checks follow tag
publication.

### Commits

- [`2d76fd3b33`](https://github.com/jeio-dev/kaylo/commit/2d76fd3b331bd7f1b66337c42349d6f3db7d514e) - **docs**: record v0.7.0 public installation checks (Jeio) [#9](https://github.com/jeio-dev/kaylo/pull/9)
- [`5f9a40866a`](https://github.com/jeio-dev/kaylo/commit/5f9a40866a619874f4640c61bf3d59bcf1c83722) - **tools**: stricter installed-package checks, glossary rename, and verification trim (Jeio) [#10](https://github.com/jeio-dev/kaylo/pull/10)
- [`daf5200e48`](https://github.com/jeio-dev/kaylo/commit/daf5200e48324925d61714e7379ebbdb45e3a57c) - **skills**: fix gaps found in the first live-model trials (Jeio) [#11](https://github.com/jeio-dev/kaylo/pull/11)
- [`73faa8782c`](https://github.com/jeio-dev/kaylo/commit/73faa8782c6b6ab8bdfde08686356e89274e8047) - **skills**: wording fixes from the second live-model trial (Jeio) [#12](https://github.com/jeio-dev/kaylo/pull/12)
- [`ad9d60a0c0`](https://github.com/jeio-dev/kaylo/commit/ad9d60a0c03ceafd4c3683fcee7301ee329714a6) - **agents**: separate worker report field for ignored embedded instructions (Jeio) [#13](https://github.com/jeio-dev/kaylo/pull/13)
- [`36211073b5`](https://github.com/jeio-dev/kaylo/commit/36211073b5a6b2269fd31b577864bea23494132f) - **skills**: ask workers for embedded instructions when the delegation reference is missing (Jeio) [#14](https://github.com/jeio-dev/kaylo/pull/14)
- [`9cf7059223`](https://github.com/jeio-dev/kaylo/commit/9cf70592230f10c6eb8476d2923da3b586344ce9) - **skills**: tell reviewers the core rules when review's delegation reference is missing (Jeio) [#15](https://github.com/jeio-dev/kaylo/pull/15)
- [`f1354c3b20`](https://github.com/jeio-dev/kaylo/commit/f1354c3b200a0edfe7a56be6484070fafb876530) - **skills**: record the fifth live-model trial and clarify define's PRD constraints (Jeio) [#16](https://github.com/jeio-dev/kaylo/pull/16)
- [`5e1a12c631`](https://github.com/jeio-dev/kaylo/commit/5e1a12c63111d9195dac5f32d9474329cfcf501c) - **skills**: limit define's own defaults to minor product details (Jeio) [#17](https://github.com/jeio-dev/kaylo/pull/17)
- [`b03f673c2c`](https://github.com/jeio-dev/kaylo/commit/b03f673c2c2b5c9f55aa87c046738310ed7c7742) - **skills**: ask about framework or service choices the outcome depends on (Jeio) [#18](https://github.com/jeio-dev/kaylo/pull/18)
- [`32250263b4`](https://github.com/jeio-dev/kaylo/commit/32250263b459e251195db24f86058e920c68aa15) - **plugins**: set version 0.8.0 and select the v0.8.0 tag (Jeio) [#19](https://github.com/jeio-dev/kaylo/pull/19)

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

- [`60bd5dce30`](https://github.com/jeio-dev/kaylo/commit/60bd5dce308723e0365b4ae94fe09271b97afcef) - **docs**: add industry terms glossary and format contract (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`be339976ac`](https://github.com/jeio-dev/kaylo/commit/be339976ac76df900a96acc42ee3c42afda2c8cd) - **docs**: align industry terms contract with validator checks (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`279194a7cd`](https://github.com/jeio-dev/kaylo/commit/279194a7cd9af0561cc846f057a25509d3dfc295) - **tools**: enforce industry-terms contract in plan validator (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`fd6e0b2cab`](https://github.com/jeio-dev/kaylo/commit/fd6e0b2cab54e25c9c722d5be85ffabfe65b840f) - **skills**: adopt industry terms in templates and skills (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`3e03cf8688`](https://github.com/jeio-dev/kaylo/commit/3e03cf86886e3ab2b4c32da4ff5c243425fac6ce) - **agents**: adopt industry terms in worker briefs and hook (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`d0d2477075`](https://github.com/jeio-dev/kaylo/commit/d0d2477075025401f3a4c2245e1c7d8e45e7b687) - **docs**: adopt industry terms in active docs and changelog (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`a5f78580bf`](https://github.com/jeio-dev/kaylo/commit/a5f78580bf9470cbb21b4f21f022bbe5bf4aedc1) - **skills**: keep the whole phase record when converting inline plans (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`a7ebd64217`](https://github.com/jeio-dev/kaylo/commit/a7ebd642171cfa50ad36846b05d1bc395385d0da) - **docs**: remove README link to deleted review handover (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)
- [`56a0288c70`](https://github.com/jeio-dev/kaylo/commit/56a0288c705e9fdecf187e7b917a32e112d46abd) - **plugins**: set version 0.7.0 and select the v0.7.0 tag (Jeio) [#8](https://github.com/jeio-dev/kaylo/pull/8)

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

- [`a1f0e337cd`](https://github.com/jeio-dev/kaylo/commit/a1f0e337cdf88bf59feee494cdaa5a6da6024b09) - **plugins**: add release catalogs and Gemini support for v0.6.0 (Jeio) [#7](https://github.com/jeio-dev/kaylo/pull/7)

## 2026-09-27, Version 0.5.2

### Notable Changes

- **docs**: Simplify the README package and scope description.

### Verification

All 52 validator tests passed; `git diff --check` was clean.

### Commits

- [`1029d5be67`](https://github.com/jeio-dev/kaylo/commit/1029d5be675f3ba4dd24c31b1d6a5af4efaf7f71) - **release**: README cleanup (Jeio) [#6](https://github.com/jeio-dev/kaylo/pull/6)

## 2026-09-27, Version 0.5.1

### Notable Changes

- **tools**: Reject closure for indented `Status: Needs revision` records, with regressions
  for linked and legacy plans. Clarify Gemini CLI's unverified native support.

### Verification

All 52 validator tests passed (Node 24.21.0), four new regressions failed before the fix and pass afterward, and `git diff --check` was clean.

### Commits

- [`821ddf275d`](https://github.com/jeio-dev/kaylo/commit/821ddf275d579d2f10dff18ad3ce62c582532cae) - **release**: status indentation hotfix (Jeio) [#5](https://github.com/jeio-dev/kaylo/pull/5)

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

- [`ca6e6c0dcb`](https://github.com/jeio-dev/kaylo/commit/ca6e6c0dcbb20ed2e42b885ba0196c0010d5b01c) - **release**: guardrails and structural plan validation (Jeio) [#4](https://github.com/jeio-dev/kaylo/pull/4)

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

- [`a30659c0f0`](https://github.com/jeio-dev/kaylo/commit/a30659c0f031e919dc9fd1651ba97ead8182ba5f) - **release**: task dependencies in phase plans (Jeio) [#3](https://github.com/jeio-dev/kaylo/pull/3)

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

- [`d33153552a`](https://github.com/jeio-dev/kaylo/commit/d33153552a52d0f093927fd4f49cc9bd0b36d7b3) - **release**: phased plans and delegation refinements (Jeio) [#2](https://github.com/jeio-dev/kaylo/pull/2)

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

- [`37df1d5a53`](https://github.com/jeio-dev/kaylo/commit/37df1d5a530d9826840aff5397dc65dcbc8e37f2) - **release**: workflow and skill improvements (Jeio) [#1](https://github.com/jeio-dev/kaylo/pull/1)

## 2026-09-26, Version 0.1.0

### Notable Changes

- **plugins**: Initial release: five skills (`define`, `plan`, `build`, `review`, `close`),
  three portable worker briefs, optional objective and plan templates, native
  Claude and Codex plugin manifests, a local Codex marketplace, and an optional
  SessionStart reminder hook.

### Verification

See the [README](https://github.com/jeio-dev/kaylo/blob/v0.1.0/README.md) to load Kaylo in Claude Code or Codex, and [VERIFICATION.md](https://github.com/jeio-dev/kaylo/blob/v0.1.0/VERIFICATION.md) for what has been checked.

### Commits

- [`2a725f7f6d`](https://github.com/jeio-dev/kaylo/commit/2a725f7f6dc50ec1d576e21194b79b609c7d1b34) - **release**: initial package (Jeio)
