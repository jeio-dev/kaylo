# Changelog

## [0.5.1] - 2026-09-27

- Reject closure for indented `Status: Needs revision` records, with regressions
  for linked and legacy plans. Clarify Gemini CLI's unverified native support.

## [0.5.0] - 2026-09-27

- Add portable guardrails to the five skills and worker briefs for untrusted
  content, secrets, consequential-action authorization, and workspace preservation.
- Add a read-only Node plan validator, build/close invocation guidance, structural
  fixture tests, and behavioral challenge prompts. Document parser limitations
  and manual fallback; the startup hook and host permissions are unchanged.

## [0.4.0] - 2026-09-27

- Phase-plan tasks record `Depends on:` with tasks listed above in the same
  phase whose output they need to implement or verify, or `None`; required
  packages and tools are listed separately. Build picks the first unblocked
  task whose dependencies are checked, names the blocked tasks it skips,
  reconsiders one once its blocking condition changes, and needs the user's
  go-ahead to start a named task early. Invalid dependency lines return to
  plan. Dependencies set order, not concurrency.

## [0.3.0] - 2026-09-27

- Refine delegated builds with workspace baselines, dependency readiness,
  file ownership, compact evidence reports, and resume details in existing
  phase plans. Batch related corrections without resetting repair limits;
  check combined behavior where tasks connect. Model routing and review
  requirements remain unchanged.

- Add Antigravity's root plugin manifest and native installation guidance.
  Document OpenCode 2 loading the shared skills directory; discovery checks
  wait for its catalog to initialize before evaluating the result.

- Split plans into phases: `PLAN.md` becomes an index with a `Current:` link and
  an ordered phase checklist; each phase's scope, tasks, findings, results, and
  completion live in `.kaylo/phases/NN-slug/NN-PLAN.md`, created only when the
  phase starts. Close checks off the phase; the next plan moves `Current:`.
- Restart task and finding IDs per phase, with qualified IDs such as `02-T3`
  routed to plan. Build records `In progress` before editing or delegating and
  resumes interrupted work from the working tree.
- Define writes a product-level objective; the last close also checks its
  success criteria.
- Add a phase template. Older single-file plans keep working as one phase and
  convert only during a relevant plan update.

## [0.2.0] - 2026-09-26

- Restructure skills into focused actions and grouped rules; load build and
  review delegation details from references only when needed.
- Add stable review finding IDs, explicit finding selection in build, and
  evidence-backed resolution with blocker rechecks before closure.
- Clarify plan validity separately from agreement and completion, preserve
  unaffected results, and allow compact tasks for clear local S changes.
- Clarify relevant verification inputs and repair resumption while retaining
  attempt history across sessions and workers.
- Anchor optional templates and worker briefs to their skill directories.

## [0.1.0] - 2026-09-25

- Initial release: five skills (`define`, `plan`, `build`, `review`, `close`),
  three portable worker briefs, optional objective and plan templates, native
  Claude and Codex plugin manifests, a local Codex marketplace, and an optional
  SessionStart reminder hook.
