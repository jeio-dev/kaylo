# Kaylo

Build software with patient, practical guidance, using the AI tools you already have.

Kaylo is an early `0.11.0` package; see [verification](VERIFICATION.md) for what has actually been checked.

## Five commands

| Command | What it helps you do | What you get |
| --- | --- | --- |
| `/kaylo:define` | Turn an idea into a clear product outcome | `PRD.md` (product requirements document) |
| `/kaylo:plan` | Inspect the project, settle the decisions only you can make, and choose a simple approach | Ordered phases in `ROADMAP.md`; executable tasks in the current phase plan |
| `/kaylo:build` | Implement and verify an agreed task | A working change and recorded evidence |
| `/kaylo:review` | Get a second opinion on a plan or change | Review comments, labelled blocking or non-blocking, in the current phase plan |
| `/kaylo:close` | Check the promised outcome and finish the phase; request `release` for guided preparation | Phase checked off, usage guidance, unreleased summary, or a prepared release with explicit pending actions |

Start with define, then plan. A concrete small change can start with plan. Substantial or uncertain plans, and every plan headed for `/kaylo:build phase`, get a plan check before building. `/kaylo:build phase` builds the current phase's remaining agreed tasks one at a time after plan records phase build readiness; each task is verified and checked off, or it stops with one recorded blocker and resume action. Review implementation before close. Revise through plan and build. Each response should explain what matters and give one clear next step.

After closure, close reconciles reviewed phase release notes and recommends releasing or waiting. Request `/kaylo:close release`, where supported, or select Kaylo close and ask for guided release. It works with a closed current phase and future planned phases; an open current phase must close first. The procedure loads only on request and follows your project's version policy and release mechanics. Confirming a version or entering preparation does not authorize tags, pushes, publication, or deployment. Legacy plans stay valid without release metadata; incomplete classification remains pending. See [release guidance](skills/close/references/release.md) and [metadata/reconciliation](skills/close/references/release-notes.md).

Consequential project choices can be preserved in optional `.kaylo/decisions/`
records: one immutable acceptance snapshot per decision and an index holding
current status. Settled phase decisions govern work before close promotes them;
changes explicitly replace whole records while retaining still-applicable rules.
Plan, build, review, and close load relevant records and cross-area constraints.
Existing projects need no backfill or migration. Consistency checks are manual;
writable Markdown is not technical write protection. See the
[project-decisions contract](skills/plan/references/decisions.md).

The assistant investigates repository facts, recommends an approach, and asks a short numbered round only for consequential decisions. Tasks include acceptance criteria and a test plan with meaningful checks. After two unsuccessful repairs of the same failure, the assistant preserves the work and recommends a different next action. Unverified work stays open, and a known limitation is accepted only with your recorded decision.

Kaylo uses common software-team names for its files and fields: a PRD, a roadmap, acceptance criteria, and blocking or non-blocking review comments. The [glossary](GLOSSARY.md) explains each term, Kaylo's own words such as `Status:`, the plan check, and phase build readiness, where Kaylo differs from common practice, and which team practices Kaylo does not cover yet.

Simplicity means using existing capability, configuration, standard libraries, native features, and installed dependencies where sufficient. Keep requested behavior, readability, security, and accessibility. A short diff is not proof of a correct solution.

## Project files

```text
PRD.md                                    product requirements: problem, users, outcome
ROADMAP.md                                Current link and ordered phase checklist
.kaylo/phases/01-ledger-core/01-PLAN.md   phase plan: scope, tasks, review comments, results, completion
.kaylo/phases/02-sales/02-PLAN.md         created when phase 02 starts
```

Plan details one phase at a time; later phases stay one line in `ROADMAP.md` until they start. Close checks off the phase, and the next plan moves `Current:`. Build and review work only in the current phase plan. Completed phases stay in place as history. Commit `.kaylo/` with your project. Older active Kaylo layouts (`OBJECTIVE.md`, a `PLAN.md` index, and legacy task fields) route to plan for a reviewed conversion. Closed phase files remain unchanged; the [migration reference](skills/plan/references/migration.md) documents supported variants and manual limits.

## Install and use Kaylo

From your project directory, use the `kaylo` npm installer:

```sh
npx kaylo                  # install
npx kaylo@latest update    # update to the latest release
npx kaylo status           # show installed versions and file checks
npx kaylo uninstall        # remove Kaylo
```

These commands need Node.js 24 or newer on `PATH`. In a terminal, install,
update, and uninstall offer a host picker. Use `--claude`, `--codex`, `--agy`,
`--gemini`, or `--opencode` to choose hosts, or `--all` to select every detected
host. `--yes` skips Kaylo's confirmation but still leaves native host prompts
in place; `--dry-run` shows the plan without changing an install.

The installer runs each host's native commands, pinned to its own release. For
OpenCode, it makes one verified package copy and adds one entry to the global
config. After install or update, it checks the installed version and files on
every selected host. Codex `status` reports its listed version without a file
comparison because its read-only listing does not expose the active path.
Start a new host session after installing or updating.

For each release since 0.10.0, fresh installs and an update from the previous
release were checked on one Linux (WSL2) machine against the public npm
registry and GitHub. No Kaylo skill or worker has been run with a Gemini model
in Gemini CLI; its model behavior remains untested. See [verification](VERIFICATION.md).

Every host uses the same five skill files and supporting resources.
Installation includes the full package; copying only `SKILL.md` loses
templates, worker briefs, delegation references, and the plan validator. The
internal skill names remain `define`, `plan`, `build`, `review`, and `close`.

Claude and Codex marketplaces select a tested release tag. The commands below
use `v0.11.0`. The per-host sections give the native operations the installer
runs as manual commands; the installer pins sources to its own release, while
these manual catalog examples use the catalog's released ref. For an
unpublished checkout, use the development instructions below. See [release
maintenance](RELEASING.md) for the publication process.

### Claude Code

Send these as two separate prompts in Claude Code:

```text
/plugin marketplace add jeio-dev/kaylo
/plugin install kaylo@kaylo
```

In your target project, use `/kaylo:define`, `/kaylo:plan`, `/kaylo:build T1`,
`/kaylo:build R2`, `/kaylo:build phase`, `/kaylo:review plan`, `/kaylo:review changes`, or `/kaylo:close`.

Update from your shell:

```sh
claude plugin marketplace update kaylo
claude plugin update kaylo@kaylo
```

Start a new session afterward. Third-party marketplaces have auto-update off
by default; enable it for Kaylo in `/plugin` → Marketplaces if desired.
Remove with `claude plugin uninstall kaylo@kaylo`; optionally remove the
catalog with `claude plugin marketplace remove kaylo`.

### Codex

```sh
codex plugin marketplace add jeio-dev/kaylo
codex plugin add kaylo@kaylo
```

Start a new session in your target project. Use `/skills` or the `$` skill picker
and select `kaylo:define`, `kaylo:plan`, `kaylo:build`, `kaylo:review`, or
`kaylo:close`, then supply your request, such as `Implement T1` or `Build the current phase`. Some app surfaces
use `@` to select skills. Codex does not register Claude-style
`/kaylo:<command>` slash commands through this package. Select the Kaylo entry
to avoid collisions with other skills named `plan` or `build`.

Update the catalog and reinstall the cached package:

```sh
codex plugin marketplace upgrade kaylo
codex plugin add kaylo@kaylo
```

Start a new session afterward. Remove with `codex plugin remove kaylo@kaylo`;
optionally remove the catalog with `codex plugin marketplace remove kaylo`.

### OpenCode 2

Clone the full package at a released tag:

```sh
git clone --branch v0.11.0 https://github.com/jeio-dev/kaylo.git kaylo
```

In your target project's existing `opencode.json` or `opencode.jsonc`, add the
checkout's skills directory to the `skills` array. Preserve existing settings:

```json
{
  "skills": ["/absolute/path/to/kaylo/skills"]
}
```

Start a new session. Ask it to load the `define`, `plan`, `build`, `review`, or
`close` skill, then give your request, such as `Load the Kaylo build skill and
implement T1`. These are bare IDs; avoid another source defining the same IDs.
OpenCode 2 loads the shared directory without a runtime plugin.

To update, fetch tags and check out the desired release in that clone:

```sh
git -C /absolute/path/to/kaylo fetch --tags origin
git -C /absolute/path/to/kaylo checkout --detach v0.11.0
```

Replace `v0.11.0` with the newer release tag when updating. Preserve any local
edits; do not force checkout. Restart the OpenCode session/server afterward.
Remove the Kaylo path from the `skills` array to uninstall. These instructions
use OpenCode 2; OpenCode 1 has a different configuration format.

### Antigravity

Clone the same released package as OpenCode above, then install the full checkout:

```sh
agy plugin validate /absolute/path/to/kaylo
agy plugin install /absolute/path/to/kaylo
agy plugin list
```

Start a new CLI session in your target project. Select the loaded Kaylo skill,
or ask the assistant to load it by name before giving your request. Installation
copies the package, including templates, worker briefs, references, and validator.

To update, fetch and check out the newer release tag as shown for OpenCode, then
run `agy plugin install /absolute/path/to/kaylo` again and start a new session.
Remove with `agy plugin uninstall kaylo`.

For Antigravity 2.0 or the standalone IDE, place the full released checkout at
`<project>/.agents/plugins/kaylo/` and inspect its skills in Customizations.
Update that checkout to the newer tag and restart the host. Remove that package
directory to uninstall. CLI loading is checked separately from IDE loading;
see [verification](VERIFICATION.md).

### Gemini CLI

Gemini has its own extension manifest and loads the shared `skills/` directory:

```sh
gemini extensions install https://github.com/jeio-dev/kaylo --ref v0.11.0
gemini extensions list
gemini skills list --all
```

Start a new session in your target project. Ask it to activate the Kaylo
`define`, `plan`, `build`, `review`, or `close` skill, then give your request.
These are bare skill names, so avoid another source defining the same names.
Gemini may ask for consent when activating a skill and reading its resources.

Support on Gemini CLI is checked for installation and loading only. Installing
the extension, listing its skills, loading the worker briefs, and the session
reminder hook firing have been observed, all without a sign-in. No Kaylo skill or worker
has been run with a Gemini model in Gemini CLI, so its model behavior there is
untested. Antigravity uses Gemini models but is a separate host; its results
are not evidence for Gemini CLI.

A tag-pinned installation stays on that tag. To move to a newer release,
uninstall and install again with the new tag:

```sh
gemini extensions uninstall kaylo
gemini extensions install https://github.com/jeio-dev/kaylo --ref v0.11.0
```

Replace `v0.11.0` with the newer tag and restart the session. Reapply any
host-specific enable/disable scope preferences after reinstalling. For a
local-directory install, `gemini extensions update kaylo` refreshes that source;
check out the desired release in the source directory first.

### Development from a checkout

Use these alternatives to test unpublished edits:

| Host | Load the local checkout | After editing |
| --- | --- | --- |
| Claude | `claude --plugin-dir /absolute/path/to/kaylo` | Start a new session with the same argument |
| Codex | Stage the checkout as below, add the `development/` catalog, then add `kaylo@kaylo-local` | Stage again, remove/add `kaylo@kaylo-local`, then start a new session |
| OpenCode 2 | Configure the checkout's `skills/` path as above | Restart the session/server |
| Antigravity | `agy plugin install /absolute/path/to/kaylo` | Reinstall, then start a new session |
| Gemini | `gemini extensions install /absolute/path/to/kaylo` | Uninstall `kaylo`, install the checkout again, then start a new session |

Codex requires local plugin sources to stay inside the catalog root. Stage a
copy of the current checkout before adding the development catalog:

```sh
node /absolute/path/to/kaylo/scripts/stage-development.cjs
codex plugin marketplace add /absolute/path/to/kaylo/development
codex plugin add kaylo@kaylo-local
```

The staging command only replaces generated `development/package/` files;
it does not change host settings. Run it again after each source edit.

Removal before reinstalling refreshes same-version development edits; native
update commands may reuse cached files when the version stays unchanged. For
Codex, use `codex plugin remove kaylo@kaylo-local` followed by
`codex plugin add kaylo@kaylo-local`. For Gemini, use
`gemini extensions uninstall kaylo` followed by the local install command.

The local Codex catalog is separate from the released catalog. Keep only one
installation of Kaylo enabled in each host.

### Any tool, without installing

Give the assistant the skill file and your request:

> Read `<kaylo-checkout>/skills/plan/SKILL.md` and follow it in this project. I want to add a reading list.

Use the full released checkout so supporting files remain available. To update,
check out the newer tag and begin a new session. Pasting the skill alone works
with manual plan inspection when the validator and supporting files are absent.

### What stays the same across hosts

| Capability | Claude | Codex | OpenCode 2 | Antigravity CLI | Gemini CLI |
| --- | --- | --- | --- | --- | --- |
| Five shared skills and workflow | Yes | Yes | Yes | Yes | Yes |
| Templates, briefs, references, validator | Full package | Full package | Full checkout | Full package | Full package |
| Worker registration | Observed: `kaylo:<role>` | None (documented) | None (documented) | Observed: bare `<role>` | Observed in agent loader: bare `<role>`; no signed-in start |
| Project state | `PRD.md`, `ROADMAP.md`, `.kaylo/phases/` | Same | Same | Same | Same |
| Optional session reminder | Native hook | Native hook, requires trust | No adapter | No adapter | Native hook |
| Update source | Released catalog | Released catalog | Release checkout | Release checkout + reinstall | Release tag + reinstall |

Skill loading and identical resources establish package parity. They do not
guarantee identical model behavior, invocation UI, permissions, or native
worker delegation. The three worker briefs remain readable in every full
package; native agent registration depends on the host. Gemini CLI's column
records installation and loading only; see the Gemini CLI section above.

## Optional session reminder

Claude, Codex, and Gemini discover `hooks/hooks.json` and run the same
`hooks/session-start.cjs` reminder at session startup and resume. It does not
read or write project files, track sessions, run tests, route models, or
authorize implementation. OpenCode and Antigravity use the same skills without
this optional adapter.

Node must be on the host's PATH. If Node is missing, the host may report a hook
error; the skills remain usable. Missing script/load errors are quiet. The
reminder never returns a blocking decision. It is guidance, not enforcement.

Codex requires you to review and trust plugin hooks through `/hooks` before
they run. Leaving the hook untrusted keeps the skills usable. To suppress the
reminder in any supported hook host, launch it from a shell with
`KAYLO_SESSION_REMINDER=0`. For example, in PowerShell:

```powershell
$env:KAYLO_SESSION_REMINDER = '0'
```

This affects programs started from that shell and still allows the tiny hook
process to run. Use direct-file loading to avoid the hook process entirely;
Codex can also leave the hook untrusted. Kaylo does not change global hook trust
or permissions.

## Secrets and environments

Kaylo works from configuration names/schema and established fake fixtures. File
names never prove safety: unknown `.env.example`/`.env.test` contents stay unknown.
Real values stay out of model-visible tool output and packets. A narrow, explicitly
authorized guiding-assistant raw disclosure needs purpose/credential/disclosure
scope recorded before access and incident notification afterward, with a rotation
recommendation; it is deliberate exposure, not zero disclosure.

Every Kaylo commit scans the actual candidate, including plans/docs, and authorized
publication scans all outgoing history including removed values. The bounded
adapter accepts stable Gitleaks >=8.30.1 and <9. It reports opaque finding
locations and explicit skipped coverage; narrow fingerprint dispositions require
explicit user confirmation of the matches and selected policy digest, including
assistant-generated fakes. Binary/long-line assets need a bounded
coverage decision, rather than automatically blocking every text commit. Missing
tools, undisposed findings, failures and unresolved required coverage block Git. Evidenced
equivalents are supported. No tool, host policy, hook or CI is installed automatically.
Instructions, file-tool restrictions, process isolation and actual required CI are
separate controls. Optional catalogue/decision resources need no legacy migration,
but the stricter read and Git rules apply on adoption. Environment choices reuse
Design/Agreement and close's existing ADR lifecycle; staging and CI deployment
are optional. Authorized guiding-assistant local deployment remains supported.
See [the full contract](skills/plan/references/environments.md) for boundaries,
scanner commands/limits, value-free incidents and configuration validation.

## Guardrails and plan validation

All five skills and the worker briefs include rules for untrusted source content,
secret handling, consequential actions, and preserving existing edits. These are
assistant instructions, not security boundaries. Existing user authorization
counts; ordinary agreed edits and checks need no additional approval. The startup
hook remains a reminder and does not enforce these rules.

All five skills inspect plan formats before protected writes. New roadmaps start
with `Kaylo format: 2`; this adds identification only, and existing recognized
unmarked format 1 remains usable. Unsupported or invalid governing formats leave
PRD, roadmap and linked phase records unchanged. This starts with #90 readers;
earlier releases ignore markers, and the instruction is not host filesystem
enforcement. Start a new session after updating to a compatible reader.

For a local read-only inspection and migration preview:

```sh
node /absolute/path/to/kaylo/scripts/inspect-plan.cjs /absolute/path/to/project
node /absolute/path/to/kaylo/scripts/migrate-plan.cjs /absolute/path/to/project
```

The preview inventories all operations with redacted diff lines and an input-bound
`sha256:` token. Within actual scoped migration authority, repeat the command
with `--apply <token>`; inline extraction also needs an explicit safe destination.
Stale inputs are refused. Candidate validation precedes replacement; interrupted
multi-file work retains private local originals for explicit `--recover <preview-token>` rollback.
Converted active work awaits actual intended-work confirmation; annotation alone
does not invalidate agreement, and closed history is preserved byte-for-byte.
See [migration and recovery](skills/plan/references/migration.md) for supported
historical inputs, disclosure options, filesystem limits and manual fallback.
Migration performs no Git operations or project commands.

With Node.js available, run the read-only structural validator from any directory:

```sh
node /absolute/path/to/kaylo/scripts/validate-plan.cjs /absolute/path/to/project
node /absolute/path/to/kaylo/scripts/validate-plan.cjs /absolute/path/to/project --closing
```

Exit codes: `0` means supported structural checks passed; `1` means plan errors;
`2` means invalid command usage. The validator does not edit files or execute
Markdown, verification commands, hooks, or model calls. Plan runs it after writing
or converting plans, and you confirm an actively converted legacy plan before it gets
`Status: Current`. Build runs it after checking a task off and unchecks the task
on failure. Close runs `--closing` before checking the phase off in
`ROADMAP.md`. If the script/runtime is unavailable, the skills require manual
inspection and disclosure of that limit.

It checks the `Current:` link in `ROADMAP.md`, phase and task entries, required
task fields, unique IDs, and `Blocked by:` references. A checked task needs a
substantive `Result:`, not an unfinished marker such as `TODO` or `Blocked`.
The current phase plan needs a `## Review` section (`None` before a review).
Review comments use the form `- R1: blocking — open`, and an `accepted by user`
resolution must cite your decision. `{kaylo:v1 ...}` records belong on a task's
`Result:` line, and a checked `Risk: high` task needs a completed reviewer
record covering it. Closure checks run with `--closing` or when the current
phase is checked; they require every task checked, no `Needs revision` status,
and `## Review` and `## Completion` records. Older active Kaylo formats are rejected with a diagnostic
naming the replacement. When Current points at recognized closed legacy history,
a bounded read-only adapter checks recorded completion availability without
imposing today's active schema or certifying historical acceptance; unknown
Current history remains a diagnostic. The glossary's
[validation rules](GLOSSARY.md#validation-rules) give the exact contract.

A pass does **not** establish authorization, truthful evidence, passing tests,
resolved review comments, or correct software. Host permissions and required CI
checks can provide enforcement outside the assistant; Kaylo installs none.
Run the validator's fixture tests with `node --test tests/validate-plan.test.cjs`.
See [guardrail trials](tests/GUARDRAIL-TRIALS.md) for behavioral scenarios.

To run the validator outside the assistant, you can add an optional Git
pre-commit hook yourself. It checks the staged plan files, not the working tree.
Add it after `ROADMAP.md` is committed; until then, every commit fails with
`Missing ROADMAP.md`. Save this as `.git/hooks/pre-commit` in your project:

```sh
#!/bin/sh
# Validate the staged plan files, not the working tree.
tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT
git ls-files -z -- ROADMAP.md OBJECTIVE.md PLAN.md .kaylo | git checkout-index -z --stdin --prefix="$tmp/"
node /absolute/path/to/kaylo/scripts/validate-plan.cjs "$tmp"
```

Then make it executable. Without this step, Git ignores the hook and commits anyway:

```sh
chmod +x .git/hooks/pre-commit
```

Exit code `1` refuses the commit and shows the validator's diagnostics; the
validator stays read-only. The hook copies `ROADMAP.md`, the older-format files
the validator checks for, and `.kaylo/`. A phase plan linked from outside
`.kaylo/` is missing from the copy, so the validator reports `Cannot read plan`
and refuses the commit. Use plain mode, not `--closing`; closure checks already
run when the current phase is checked. The hook runs only in your local clone:
`git commit --no-verify` skips it, and clones do not share hooks. Only a CI step
that validates the committed checkout guarantees what lands in the repository.
The Kaylo path differs by host and can change when Kaylo updates; OpenCode's copy,
for example, sits in a version-named folder. Point the hook at a Kaylo checkout
you control, or update the path after each Kaylo update. The hook has been tried
on Linux only; macOS and Windows (Git for Windows' `sh`) are untested.

## Workers and budgets

The [testing contract](skills/plan/references/testing.md) reuses project runners
and assesses only relevant layers. Criteria map to named checks and expected
observations; regression/new-behavior proof records the intended failure then
pass while preserving the working tree. Test maintenance needs rationale and
retained coverage, and unavailable required evidence stays open. Native focus
checks plus manual diff review establish only the controls actually exercised.
Before high-risk implementation, a fresh test-only builder precedes the existing
focused implementation review. With `Review vendor: different`, author and
implementation vendors must differ, and a reviewer covering both may need a third
vendor or explicit exception. Tier, freshness, billing and availability remain
separate constraints. An available generic fresh worker or separate conversation
can qualify without native registration; otherwise authoring needs a handoff,
specific exception or pause. Implementation started before adoption keeps its
prior evidence requirements without retrospective authoring or proof. These are
instruction contracts; see [verification](VERIFICATION.md)
for observed behavior and unrun [trials](tests/TESTING-TRIALS.md).

Claude and Codex can guide a project. Seven guardrail and routing cases each passed three runs on Claude Code with Sonnet 5.5 and on Codex CLI with its default model. That result covers only those setups; see [verification](VERIFICATION.md). Antigravity can receive research work; Gemini CLI loads the same briefs, but no worker has been run there, and OpenCode with an available DeepSeek model can receive implementation work. Read [working with a worker](WORKERS.md) for a copyable handoff and model-selection guidance. When a plan expects workers for which Kaylo can choose a model at dispatch, plan asks once for a project preference and writes `Format: 1` and a `Worker models:` choice of Inherit, Quality, Balanced, or Budget to `.kaylo/preferences.md`. The user can edit that file later. A missing or unknown preference uses Inherit; build never asks for a preference. Gemini CLI and Antigravity use Inherit for their packaged workers, so plan does not ask for their model preference. When a requested tier is unavailable, dispatch waits for a user choice rather than silently using a weaker model.

The same file accepts two optional keys, `Review vendor: different` and `Metered: allowed (<route>)`; see [review vendor and metered routes](WORKERS.md#review-vendor-and-metered-routes). A task marked `Risk: high` gets a focused review, requested in the same build run, after its checks pass and before it is checked off. When a check fails, the assistant diagnoses it first and recommends a stronger tier only when capability matters; a model change never adds repairs. Builds and reviews append compact `{kaylo:v1 ...}` records to the phase plan, through `scripts/plan-record.cjs` when Node is available, and `node /absolute/path/to/kaylo/scripts/dispatch-report.cjs /absolute/path/to/project` prints first-try pass rates from closed phases. The report is read-only and advisory. Earlier versions of these instructions ran in single-run and three-run trials on Claude Code with Sonnet 5.5; the current instructions and the record helper have not been run with a model. See [verification](VERIFICATION.md).

The file can also record Git preferences: `Git autonomy` (`ask`, `commit`, `push`, or `pr`), `Branch`, `Commit`, `Commit style`, `Commit scopes`, and `Merge`. Plan raises them only when you want Kaylo to commit, push, or open pull requests, and records only your choices. Authorized preferences can drive those steps after attributable verification and exact candidate/outgoing-history secret scans. Explicitly requested Git actions require the same scans; missing/failing scanning and unresolved required coverage block the affected Git step; reported asset skips need an evidenced coverage decision. When it does, it commits only the work's own changes, leaves your staged, unstaged, and untracked work alone, and uses one pull request per phase. See [Git workflow](skills/build/references/git.md) and [pull requests and issues](skills/build/references/pull-requests.md).

Work directly when that is sufficient; use one worker at a time when helpful. Plain `/kaylo:build phase` stays sequential. On Claude Code, an explicit request to build the phase in parallel may run up to two ready tasks together when their files and mutable check resources are disjoint; uncertain or overlapping work stays sequential. Other hosts keep the sequential loop. The guiding assistant maintains `ROADMAP.md` and the phase plans, inspects each worker's actual changes, and runs shared checks after a parallel wave. Native delegation is optional and never implies cross-vendor subscription access. Narrow uncertain work before giving it to a smaller model; no prompt guarantees every model can complete every task.

Delegated builds record the starting workspace state, confirm dependencies are present, and keep one owner for assigned implementation files. Workers return compact acceptance and verification evidence, embedded instructions not followed, and resume details when needed. The guiding assistant records those details in the existing phase plan and checks combined behavior when tasks connect.

## Package and scope

- `skills/`: five command entrypoints with references: build/review delegation and the high-risk test-author stage, build's Git workflow and pull request guidance, plan's project gates, foundation assessment, project-decisions and testing contracts, and close's CI evidence, release metadata, and lazily loaded guided-release procedure.
- `agents/`: three shared worker briefs; `claude-agents/`: generated native Claude adapters with identical instruction bodies.
- `templates/`: optional PRD, roadmap, and phase plan starting points, plus the ADR and decision-index templates close uses when promoting project decisions.
- `.claude-plugin/`, `.codex-plugin/`, `plugin.json`, `.agents/plugins/`: native packaging for Claude, Codex, and Antigravity, and the released Codex catalog. OpenCode loads the shared skills directory directly.
- `gemini-extension.json`: native Gemini packaging of the shared skills.
- `development/`: the separate local Codex catalog and ignored generated package.
- `hooks/`: the optional reminder; no workflow runtime or persistent state.
- `scripts/`: plan/package validators, the plan record helper, the read-only dispatch report, the read-only `.kaylo/gates` and `.kaylo/preferences.md` readers, the CI evidence and commit message checkers, the phase size report, the Claude agent adapter generator, and local development staging; `tests/`: validator fixtures and behavioral trial prompts.

The installer runs native host commands, with one verified package copy and one
global config entry for OpenCode. It adds no model router or terminal
modification. Releases use Git tags; see [release maintenance](RELEASING.md).
Validator fixtures check structure; behavioral trials do not guarantee model
compliance. `0.11.0` is an early package version, not a release-readiness claim.

Native integration references: [Claude plugin layout](https://code.claude.com/docs/en/plugins-reference), [Claude agents](https://code.claude.com/docs/en/sub-agents), [Codex plugin packaging](https://developers.openai.com/plugins/build/plugins), [Codex skill invocation](https://developers.openai.com/codex/skills), [Codex hooks](https://developers.openai.com/codex/hooks), [OpenCode 2 skills](https://opencode.ai/v2/docs/skills), [Antigravity plugins](https://antigravity.google/docs/plugins), and [Gemini extensions](https://geminicli.com/docs/extensions/reference/). Host behavior and availability can vary by version; the verification record identifies the versions inspected here.

## Citation

```bibtex
@software{jeio-dev2026kaylo,
  author = {Dela Cruz, R-John},
  title  = {Kaylo: Build software with patient, practical guidance, using the AI tools you already have},
  year   = {2026},
  url    = {https://github.com/jeio-dev/kaylo}
}
```
