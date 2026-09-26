# First draft verification

Date: 2026-09-25. This records a bounded implementation trial, not a release certification or a conformance suite.

These checks ran while the package lived in a `v5/` subfolder; it has since moved to the repository root unchanged. Paths below are as run. The [relocation check](#relocation-check) at the end records what was rerun at the root.

## Packaging and hook

| Check | Result |
| --- | --- |
| Claude Code 2.1.282: `claude plugin validate v5 --strict --json` | Passed, with no warnings after moving the worker guide out of native agent discovery |
| Bundled skill-creator validator | All five skills passed |
| Bundled plugin-creator validator | Codex manifest passed after adding required starter-prompt metadata |
| Claude native session, using `--plugin-dir` | Loaded all five `kaylo:*` skills/slash commands and all three `kaylo:*` agents |
| Claude native startup and resume | SessionStart hook responses both succeeded with exit 0; the smoke project remained empty |
| Codex CLI 0.157.0: isolated local marketplace install | Add, install, list, and reinstall succeeded; updated metadata reached the cache |
| Codex native `skills/list` | Discovered five enabled `kaylo:*` skills with no loading errors |
| Hook command through Windows PowerShell | Valid non-blocking JSON using either host's plugin-root environment variable, including a package path with spaces |
| Hook disabled, missing script, or missing root | Exit 0 with no output; no project state created |

The hook does not consume event input, so malformed input cannot make it parse or execute project data. Its code has no file access, child process, or network operations. The launcher uses Node's environment lookup rather than interpolating a project path into shell source.

PyYAML was missing from system Python. The bundled Python validators ran in a temporary virtual environment with PyYAML, without installing into system Python. Native package checks used the plugin-creator schema guidance. The existing `v5/` package location takes precedence over the scaffold's default directory layout.

Codex installation used a temporary home with no account credentials; it did not install Kaylo into the user's normal Codex configuration. Its temporary-home PATH-helper warning did not prevent package loading. Claude trials used the existing signed-in subscription and default model, with user settings excluded from the test session and no automatic switch to API credentials.

## Workflow trial

A fresh Codex agent received the five skill files and this approved request: build a dependency-free Node CLI accepting a JSON array of books with nonempty string titles and boolean read flags, printing read/total counts, and returning clear nonzero errors for missing or invalid input.

1. Define and plan created actual `OBJECTIVE.md` and `PLAN.md` in an isolated sample directory, then returned a bounded builder packet.
2. That packet was manually supplied to Claude's native `kaylo:builder`. The worker created the CLI and process-level tests without editing shared plan state.
3. The syntax check passed. The first test run passed 26/27; one fixture-encoding repair brought it to 27/27 with exit 0. Checks covered valid counts, empty input arrays, paths with spaces, schema errors, read/parse errors, input preservation, stdout/stderr, and exit status.
4. The guiding context read returned files and recorded evidence and the repair in `PLAN.md` without rerunning passing checks.
5. A fresh reviewer inspected the objective, plan, implementation, tests, and file inventory and found no acceptance blockers. The guiding context recorded the review, matched each criterion to the existing evidence, and closed the sample without rerunning checks.

The package also received an independent read-only review. No functional defects were found. Its one documentation finding (the missing link target for this verification record while it was being written) was resolved and rechecked.

Observed friction: the worker initially combined checks with shell formatting, encountered headless permission denials, and later repeated a passing test to confirm its exit status. The builder brief now explicitly says to run checks directly, retain their results, and not repeat unchanged passing checks. This narrow instruction revision has structural validation, not a second full behavioral trial.

The worker also disclosed BOM tolerance as a small implementation detail with no dedicated test; the original acceptance criteria did not require that behavior. Permission-denied file access was not separately exercised. These limitations were carried into the plan rather than silently counted as covered.

## Limits and reproduction

- This is one small real workflow trial. It does not establish reliability across projects, smaller models, or vendors.
- Native Codex hook execution after the user trusts it remains untested. The shared hook command and JSON output were exercised directly; trust was not bypassed.
- Native Codex skill discovery was tested, not a full interactive Codex CLI command sequence. Codex uses its skill picker rather than Claude's slash-command registration.
- Gemini/Antigravity, OpenCode/DeepSeek, desktop UI installation, and non-Windows environments were not tested.
- No old installer, old conformance tests, terminal modifications, commits, pushes, or releases were performed.

Local trial artifacts are under `C:/Users/Jeio/AppData/Local/Temp/kaylo-trial-yb7j66t3`: `sample/`, native Claude session logs, `codex-skills.json`, and `hook-checks.txt`. They are temporary evidence, not part of the package or a required runtime.

To reproduce a useful trial, use a fresh small project, invoke the five skills with a concrete approved scope, hand one task to a separate worker, and inspect the resulting files and recorded checks. Use the setup in [README.md](README.md). Do not rerun the old project's release checks for this draft.

## Relocation check

After moving the package from `v5/` to the repository root (2026-09-25), only packaging was rechecked:

| Check | Result |
| --- | --- |
| All four JSON manifests parse; `node --check hooks/session-start.cjs` | Passed |
| Hook launcher with `CLAUDE_PLUGIN_ROOT` set to the root | Valid SessionStart JSON |
| Claude Code 2.1.282: `claude plugin validate . --strict --json` | Passed, no errors or warnings |
| Codex CLI 0.157.0, throwaway `CODEX_HOME`: marketplace add and plugin add from the root | Installed and enabled; five skill files in the cache |

Codex now copies the whole checkout into its plugin cache, including `.git/` and any local untracked folders, because the plugin root is the repository root. A native Claude session and the workflow trial were not rerun; skill and agent content is unchanged.
