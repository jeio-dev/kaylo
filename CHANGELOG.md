# Changelog

## [Unreleased]

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
