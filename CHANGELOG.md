# Changelog

## [Unreleased]

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
  other earlier Result records remain intact.
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
- **docs**: Completion uses known limitations; calling a limitation accepted
  requires the user's actual recorded decision. Record the first live-model
  workflow, conversion, and nine guardrail trials with their defects and limits,
  separately from the structural checks of these fixes.
- **tools**: `validate-package.cjs --installed` now also compares `WORKERS.md`
  and rejects files in the shared folders that the source does not have, such
  as templates left behind by an in-place update. The release update trial
  installs the previous release first and checks that catalogs select the
  release tag rather than the default branch.
- **docs**: Rename `INDUSTRY-TERMS.md` to [GLOSSARY.md](GLOSSARY.md), the usual
  name for this kind of page. `VERIFICATION.md` now keeps records from 0.6.0
  onward; earlier records remain in Git history.

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
