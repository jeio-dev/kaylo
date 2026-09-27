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

## Skills revision checks — 2026-09-26

This revision adds finding selection and resolution, plan-validity rules, compact S tasks, explicit resource anchors, and verification/repair clarifications. Package version remains `0.1.0`; changes are recorded under Unreleased. The earlier results above are historical, not claims about these revised instructions.

### Structural and loading checks

Checked from the repository root on Linux:

| Check | Observed result |
| --- | --- |
| Bundled `skill-creator/scripts/quick_validate.py`, Python 3 with PyYAML 6.0.3 | All five skills passed; build revalidated after its repair wording was shortened |
| Builder and reviewer YAML frontmatter | Parsed; names and inherited model settings retained |
| Define/plan template and build/review brief paths resolved relative to their skill directories | All four target files exist |
| Claude Code 2.1.283: `claude plugin validate . --strict --json` | Passed, no errors or warnings; this validates packaging, not behavioral compliance |
| Codex CLI 0.157.1: local marketplace add and plugin add with temporary `CODEX_HOME` | Installed successfully without modifying normal Codex configuration |
| Isolated Codex app-server `skills/list` | All five `kaylo:*` skills enabled, no loading errors |
| Isolated Codex reinstall after final build/builder wording changes | Cached skills, builder/reviewer briefs, and plan template match the revised checkout |
| `git diff --check` | Passed |

No manifest, hook, invocation policy, or provider/account settings changed. Native Claude behavioral execution and cross-vendor handoffs were not repeated. Codex installation/discovery checks do not establish interactive workflow behavior or implicit trigger reliability.

### Baseline smoke observations

Before package edits, a separate Codex evaluator copied the original skills and briefs and used them in four temporary dependency-free Node projects. It created the fixtures and executed their requests within one shared evaluator context; these were not blind tests or four fresh sessions. It did not read the audit discussions. Historical repair attempts were seeded fixture facts. Recorded passing evidence for the manual-observation and scope cases was actually executed during fixture preparation.

| Request and fixture | Baseline observation |
| --- | --- |
| “Fix the reported count defect, then review the changes and close the task.” `countRead` returned the list length; acceptance required counting only boolean `read: true`, and the existing review contained a blocker plus an optional naming suggestion. | Fixed one implementation line; Node assertions and a CLI observation passed. Rechecked and closed the count task, leaving naming optional. |
| “Continue build.” Same unresolved failure with two unsuccessful repairs recorded, no new information. | No corrective edit or third repair; retained history and left the task open. |
| “Close this task.” Passing count assertions and CLI result, plus an unavailable required manual screen-reader observation. | Kept work open and named the missing observation; no invented pass or repeated automated check. |
| “Revise the objective so the pending export uses CSV with title and read columns, rather than the planned JSON output. Keep the completed book-counting behavior.” Completed T1 count, pending T2 export. | Revised the objective, marked pending export instructions for revision, and preserved completed T1 and its evidence without implementing export. |

Baseline artifacts and report: `/tmp/kaylo-baseline-XBHjGN`. Original instructions are in `instructions/`; each case contains `REQUEST.txt`, before/after plan and objective artifacts, implementation, tests, response, and diff. The baseline establishes observations of existing behavior; it was not graded for new status labels or ID allocation.

### Minimal reproduction fixtures

Use fresh isolated projects, the applicable skill, and the requests above. Keep an agreed task and review record in `PLAN.md`; do not provide the evaluator with audit conclusions or expected answers. The count implementation initially returns `books.length`. An existing CLI imports it and prints `Read: <count>`. A dependency-free Node check asserts counts of 1 for `[{read:true}, {read:false}, {}, {read:'true'}]`, 0 for an empty list, and 2 for two read books. A separate CLI invocation with one read and one unread book should print `Read: 1`.

For the exhausted-repair case, record two unsuccessful total-count corrections with actual 4 versus expected 1 and no intervening relevant change. For manual verification, supply correct count code and actual passing evidence, but explicitly retain the required observation and absence of an app. For scope revision, start with completed counting and an agreed pending JSON export whose proposed check has not been created.

The default PATH lacked Node in this environment. Trials used the already-installed VS Code runtime at `/home/jeio/.vscode-server/bin/04c0d99f4fb0d8afe6ce4f0c58e31e183ac3e4b1/node` (v24.20.0), without global configuration changes. Temporary artifacts are supplementary evidence, not shipped runtime dependencies. These small artifact-driven trials do not measure reliability across models or projects.

### Revised smoke observations

A fresh evaluator, separate from the baseline evaluator and instruction author, received the revised instructions and restored initial fixtures without the audits or baseline conclusions. It ran the cases within one shared evaluator context; reviews of its trial implementations were performed in that same context, not by another reviewer.

| Revised request | Observed result |
| --- | --- |
| `Build R1`, then review and close the count task | Corrected the named blocker; function and mixed/empty/all-read CLI checks passed. R1 retained its ID, fix evidence, and focused recheck; optional R2 stayed open without a rename or closure blocker. |
| Resume after two recorded unsuccessful repairs | Stopped before corrective edits and preserved the history. The decision was repeated after the build instruction made its pre-edit history check explicit. |
| Close with unavailable manual observation | Left T1 open and reused recorded unchanged counting evidence without claiming a screen-reader observation. |
| Revise objective to CSV, request `Build T2`, then revise plan | Marked export instructions `Needs revision`; build returned to plan without implementation. Plan restored `Current` after revising T2, preserving completed T1 and its evidence. |
| `Build R99` in an untouched fixture | Reported the unknown ID without changing code or selecting a fallback task. |
| `Build R3`, a concrete plan-target finding about missing verification | Returned to plan; no implementation change. |
| Review changes with existing unnumbered findings | Assigned R1/R2 to the existing descriptions without duplicating them; the blocker check actually failed 4 versus 1, and review made no fix. |
| Plan a local greeting-default change | Created one S task with acceptance, exact available checks and expected results, and free-text result; no complexity explanation, new dependency, discovery exercise, or implementation. |
| Supply material producer documentation after exhausted decoding repairs | Stopped initially. Actual producer documentation identified zlib-wrapped DEFLATE; one further correction to `inflateSync` passed the real payload check, preserving both prior attempts and recording the reason. |

For the resumption fixture, the reader, compressed payload, runtime, and assertion were available initially; only upstream producer documentation was absent. Two failed API guesses were seeded, then independently reproduced in separate copies after the first continuation. Those reproductions corroborate fixture history, not newly executed historical repairs. To reproduce: compress `Book shelf\n` with Python's `zlib.compress`, start a Node reader using `inflateRawSync`, record prior failed `gunzipSync` and `inflateRawSync` checks, then supply the actual producer snippet and request continuation. The returned text must equal `Book shelf\n`.

Revised trial artifacts: `/tmp/kaylo-verification-u0upcN/revised-trials/REPORT.md`, `commands.jsonl`, original snapshots, response files, instruction snapshots, and `artifact-diffs.txt`. Native loading receipts are under `/tmp/kaylo-verification-u0upcN`. Case1 preceded the final build/builder repair-list cleanup; the exhausted-history decision was rechecked and the producer-evidence case used the final wording. The changed repair wording did not alter case1's finding behavior.

No material behavioral failure was observed in these cases. The additional-repair-fails-and-stops-again branch, user acceptance of a deferred requirement, native Claude skill execution, and pasted-only resource lookup were not behaviorally exercised. These results support the bounded revision, not a cross-host or small-model reliability claim.

## Skill structure revision — 2026-09-26

The five entrypoints now separate workflow actions from scope, verification,
recordkeeping, and response rules. Optional build/review delegation instructions
live in linked references. A read-through against the pre-edit files checked
selection, agreement, plan validity, finding IDs and resolutions, verification,
repair limits, closure, and external-action boundaries for preservation.

All five skills passed `skill-creator/scripts/quick_validate.py` with Python 3.
All six Markdown resource links under `skills/` resolve from their containing
files, including both references' worker briefs. `git diff --check` passed.
Entrypoint word counts fell from 3,130 to 2,548; numbered workflow steps are at
most 40 words. These are structural checks, not a new behavioral or native-host
loading trial; earlier trial results describe the instruction versions tested
at the time.

## v0.2.0 release preparation — 2026-09-26

Both plugin manifests and the README were updated to `0.2.0`; Unreleased changes
were assigned to the `0.2.0` changelog entry. All five skill validators, the Codex
plugin validator, and Claude strict plugin validation passed. Claude reported
no errors or warnings. Manifest versions, all four JSON files, skill resource
links, and whitespace checks also passed. This release preparation did not
rerun behavioral trials or native Codex installation/discovery.

## Phased plans — 2026-09-26

`PLAN.md` becomes a phase index; phase details move to
`.kaylo/phases/NN-slug/NN-PLAN.md`. Recorded under Unreleased; manifest versions
unchanged. Checked from the repository root on Linux:

| Check | Observed result |
| --- | --- |
| Claude Code 2.1.283: `claude plugin validate . --strict` | Passed, exit 0 |
| `skill-creator/scripts/quick_validate.py` on each skill | All five valid |
| Relative Markdown links in skills, agents, and root docs | All resolve, including the new phase template |
| `node --check hooks/session-start.cjs`; hook output parsed as JSON; `KAYLO_SESSION_REMINDER=0` | Passed; disabled hook prints nothing |
| `git diff --check` | Passed |
| Numbered workflow steps | All at most 40 words; entrypoints total 3,290 words |
| `grep -rn "PLAN.md" --include=*.md --include=*.cjs .` outside `.local/` | Every hit means the index, an older single-file plan, an `NN-PLAN.md` path, or historical notes above |
| Skills and templates searched for a State column or index `Status:` line | None |

A paper walkthrough traced the revised skill text, not a model run: POS
define → plan (index plus `01-PLAN.md` only) → build `T1` → review changes →
close (phase 01 checked, `Current:` unchanged) → build `T1` (routed to plan,
no phase open) → plan (creates `02-PLAN.md`, moves `Current:`, rechecks 03+).
No step creates a later phase folder early. An interrupted build leaves
`Result: In progress`; the next build selects that unfinished task and treats
working-tree edits as its work. An inline 0.2-style `PLAN.md` is the current
phase plan for define, build, review, and close; only plan converts it, during
a relevant update.

No behavioral trial, native Codex install, or fresh-agent run was performed for
this change.

## Phased-plan parity review — 2026-09-26

Claude strict validation, five skill validators, resource links, four JSON files,
hook syntax, both plugin-root launchers, disabled hook, and git diff --check
passed. Isolated Codex 0.157.1 install and app-server skills/list found five
enabled Kaylo skills without errors; cached instructions/resources match.
Evidence: /tmp/kaylo-parity-z55_y9_z.

Paper POS/legacy/interruption traces found two issues: plan deleted its previous
Approach rules; build permits worker dispatch before Result: In progress.
No implementation fixes or model workflow trials performed.

OpenCode and OpenCode2 both use v2.0.18; the latter is a wrapper. An isolated
/skill probe returned HTML, so discovery was not established. Gemini is absent
from PATH. Antigravity 1.2.11 agy plugin validate . failed: missing root
plugin.json. Official skill docs were checked for format/discovery compatibility;
native plugin and model behavior parity remain unverified. No normal tool
configuration changed.

## Phased-plan review fixes — 2026-09-26

Resolved both review blockers. Plan restores its four Approach rules unchanged,
beside the phase rules. Build step 4 now writes `Result: In progress` in the
current phase plan before any edit or worker dispatch, so a delegated
interruption leaves the marker. Claude strict validation, all five skill
validators, and `git diff --check` passed; every numbered workflow step stays at
most 40 words. No model workflow trial was performed.

## OpenCode and Antigravity loading — 2026-09-26

Added Antigravity's root `plugin.json` and documented native Antigravity
installation and OpenCode 2's shared-directory source. The five skill names,
contents, resources, and existing manifest versions are unchanged by this fix.

| Check | Observed result |
| --- | --- |
| OpenCode 2.0.18, isolated project with `skills: ["<checkout>/skills"]`, persistent loopback server, authenticated `GET /api/skill` | Discovered `define`, `plan`, `build`, `review`, and `close`; paths and instruction bodies match the checkout |
| OpenCode initialization | Initial response was empty, then contained built-ins, then all five Kaylo skills; earlier immediate probes did not wait for initialization |
| Antigravity CLI 1.2.11: `agy plugin validate .` | Passed: five skills and three agents processed |
| `agy plugin install <checkout>` and `agy plugin list`, sandboxed profile | Installed and listed components `skills` and `agents`; installed skills, references, templates, and briefs match byte-for-byte; relative resource links resolve |
| Codex 0.157.1, fresh isolated marketplace install and app-server `skills/list` with the new root manifest | Five enabled Kaylo skills, no discovery errors; cached skills and supporting resources match |
| Claude strict plugin validation; plugin-creator validator | Both passed |
| Five skill validators; five JSON files; relative skill/agent resource links; `git diff --check` | Passed |

OpenCode used temporary XDG directories. Antigravity ran in a Bubblewrap
namespace with an empty profile mounted over `.gemini`, unchanged `HOME`, and
network disabled. Normal host configuration was not changed. Evidence:
`/tmp/kaylo-host-parity-3zxencih`.

This establishes native skill loading and resource preservation. No model
workflow trial, OpenCode 1 runtime, Gemini CLI, Antigravity IDE loading, or
Antigravity session hook was tested. Antigravity uses the new root manifest;
OpenCode uses its native skill source, not a runtime plugin. The optional
reminder remains configured for Claude and Codex.

## Delegation refinements — 2026-09-27

Added workspace starting-state records and file ownership, dependency readiness
in the actual workspace, compact build reports, and continuation details in the
existing phase plan. Related corrections can be batched; failed repair history
and the two-unsuccessful-repair limit remain authoritative. Build and close now
explicitly check combined behavior where tasks connect.

| Check | Observed result |
| --- | --- |
| Skill-creator validator for build, review, and close | All three passed |
| Relative Markdown links in README, WORKERS, skills, and agents | All 16 resolve |
| `git diff --check` | Passed |
| Direct instruction review | Task scope, one worker at a time, guiding-assistant ownership of plans, fresh-review preference, and blocker rechecks remain intact |

Instruction walkthroughs covered a dirty shared workspace, a separate workspace
missing uncommitted prerequisites, interrupted work, correction requests carrying
previous failures, and connected tasks with only isolated checks. These were
direct checks of the written rules, not model workflow trials. No native host
installation, live worker execution, routing change, or measured savings was
tested for this change.

## v0.3.0 release preparation — 2026-09-27

Updated Claude and Codex manifest versions and README to `0.3.0`, and moved
Unreleased changes into the dated release entry. Claude strict plugin validation
passed without warnings; Antigravity validation processed five skills and three
agents. All five skill validators, five JSON files, 16 relative resource links,
manifest version consistency, and `git diff --check` passed. Node 24.21.0 checked
hook syntax, the phase reminder output, and the disabled mode. Node was invoked
from its installed NVM path because it was not on this shell's PATH.

Local audit notes under `.local/` are excluded from the release commit. Earlier
host-loading results remain historical; no new native installation or live model
workflow trial was performed for this release preparation.
