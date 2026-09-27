# Kaylo

Build software with patient, practical guidance, using the AI tools you already have.

Kaylo is an early `0.6.0` package; see [verification](VERIFICATION.md) for what has actually been checked.

## Five commands

| Command | What it helps you do | What you get |
| --- | --- | --- |
| `/kaylo:define` | Turn an idea into a clear product outcome | `OBJECTIVE.md` |
| `/kaylo:plan` | Inspect the project and choose a simple approach | Ordered phases in `PLAN.md`; executable tasks in the current phase plan |
| `/kaylo:build` | Implement and verify an agreed task | A working change and recorded evidence |
| `/kaylo:review` | Get a second opinion on a plan or change | Concrete findings in the current phase plan |
| `/kaylo:close` | Check the promised outcome and finish the phase | Phase checked off, usage guidance, and remaining limitations |

Start with define, then plan. A concrete small change can start with plan. Review substantial or uncertain plans before building; review implementation before close. Revise through plan and build. Each response should explain what matters and give one clear next step.

The assistant investigates repository facts, recommends an approach, and asks a short numbered round only for consequential decisions. Tasks include acceptance criteria and meaningful verification. Reuse passing checks unless relevant inputs changed. After two unsuccessful repairs of the same failure, preserve the work and recommend a different next action.

Phase plans use `Status: Current` or `Needs revision: <reason>` to describe whether task instructions match the intended work; agreement and completion are separate. Clear local S tasks can use a compact record. Task and finding IDs restart per phase; `02-R1` names another phase's finding. Review findings keep stable IDs such as `R2`: build can select a task or implementation finding, and blocker fixes receive a focused recheck before closure. Optional findings do not block the agreed outcome.

Simplicity means using existing capability, configuration, standard libraries, native features, and installed dependencies where sufficient. Keep requested behavior, readability, security, and accessibility. A short diff is not proof of a correct solution.

## Project files

```text
OBJECTIVE.md                              product objective
PLAN.md                                   Current link and ordered phase checklist
.kaylo/phases/01-ledger-core/01-PLAN.md   phase plan: scope, tasks, findings, results, completion
.kaylo/phases/02-sales/02-PLAN.md         created when phase 02 starts
```

Plan details one phase at a time; later phases stay one line in `PLAN.md` until they start. Close checks off the phase, and the next plan moves `Current:`. Build and review work only in the current phase plan. Completed phases stay in place as history. Commit `.kaylo/` with your project. An older `PLAN.md` with tasks inline keeps working as a single phase until plan next updates it.

## Install and use Kaylo

Run Kaylo in the project you want to build. Every host uses the same five skill
files and supporting resources. Installation includes the full package; copying
only `SKILL.md` loses templates, worker briefs, delegation references, and the
plan validator. The internal skill names remain `define`, `plan`, `build`,
`review`, and `close`.

Claude and Codex marketplaces select a tested release tag. The commands below
use `v0.6.0`. For an
unpublished checkout, use the development instructions below. See
[release maintenance](RELEASING.md) for the publication process.

### Claude Code

Send these as two separate prompts in Claude Code:

```text
/plugin marketplace add jeio-dev/kaylo
/plugin install kaylo@kaylo
```

In your target project, use `/kaylo:define`, `/kaylo:plan`, `/kaylo:build T1`,
`/kaylo:build R2`, `/kaylo:review plan`, `/kaylo:review changes`, or `/kaylo:close`.

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
`kaylo:close`, then supply your request, such as `Implement T1`. Some app surfaces
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
git clone --branch v0.6.0 https://github.com/jeio-dev/kaylo.git kaylo
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
git -C /absolute/path/to/kaylo checkout --detach v0.6.0
```

Replace `v0.6.0` with the newer release tag when updating. Preserve any local
edits; do not force checkout. Restart the OpenCode session/server afterward.
Remove the Kaylo path from the `skills` array to uninstall.

OpenCode initializes its catalog after server startup. For a discovery check,
wait until `GET /api/skill` includes all five IDs with paths into this checkout;
an immediate empty response does not establish a failure. These instructions
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
gemini extensions install https://github.com/jeio-dev/kaylo --ref v0.6.0
gemini extensions list
gemini skills list --all
```

Start a new session in your target project. Ask it to activate the Kaylo
`define`, `plan`, `build`, `review`, or `close` skill, then give your request.
These are bare skill names, so avoid another source defining the same names.
Gemini may ask for consent when activating a skill and reading its resources.

A tag-pinned installation stays on that tag. To move to a newer release,
uninstall and install again with the new tag:

```sh
gemini extensions uninstall kaylo
gemini extensions install https://github.com/jeio-dev/kaylo --ref v0.6.0
```

Replace `v0.6.0` with the newer tag and restart the session. Reapply any
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

The local Codex catalog is separate from the released catalog. When moving
from the old checkout install to the GitHub install, remove
`kaylo@kaylo-local` and its `kaylo-local` marketplace first to avoid duplicate
skills. To keep developing with an old root-based `kaylo-local` catalog, remove
that catalog and add the new `development/` path instead. Keep only one
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
| Project state | `OBJECTIVE.md`, `PLAN.md`, `.kaylo/phases/` | Same | Same | Same | Same |
| Optional session reminder | Native hook | Native hook, requires trust | No adapter | No adapter | Native hook |
| Update source | Released catalog | Released catalog | Release checkout | Release checkout + reinstall | Release tag + reinstall |

Skill loading and identical resources establish package parity. They do not
guarantee identical model behavior, invocation UI, permissions, or native
worker delegation. The three worker briefs remain readable in every full
package; native agent registration depends on the host.

## Optional session reminder

Claude, Codex, and Gemini discover `hooks/hooks.json`. Its exact startup/resume
matchers work in all three hosts. The loader uses Claude/Codex's plugin-root
environment variables or Gemini's extension-path substitution to run the same
`hooks/session-start.cjs`. It does not read or write project files, track sessions,
run tests, route models, or authorize implementation. OpenCode and Antigravity
use the same skills without this optional adapter.

Node must be on the host's PATH. If Node is missing, the host may report a hook
error; the skills remain usable. Missing script/load errors are quiet. The
reminder never returns a blocking decision. Timeout is left at each host's native
default because their APIs use different units. It is guidance, not enforcement.

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

## Guardrails and plan validation

All five skills and the worker briefs include rules for untrusted source content,
secret handling, consequential actions, and preserving existing edits. These are
assistant instructions, not security boundaries. Existing user authorization
counts; ordinary agreed edits and checks need no additional approval. The startup
hook remains a reminder and does not enforce these rules.

With Node.js available, run the read-only structural validator from any directory:

```sh
node /absolute/path/to/kaylo/scripts/validate-plan.cjs /absolute/path/to/project
node /absolute/path/to/kaylo/scripts/validate-plan.cjs /absolute/path/to/project --closing
```

Exit codes: `0` means supported structural checks passed; `1` means plan errors;
`2` means invalid command usage. The validator does not edit files or execute
Markdown, verification commands, hooks, or model calls. Build runs it before
marking tasks complete; close writes the proposed completion record and runs
`--closing` before checking the phase in the index. If the script/runtime is
unavailable, the skills require manual inspection and disclosure of that limit.

Supported Markdown uses `Current: [label](relative-file)`, phase checklist entries
with two-digit IDs, task entries such as `- [ ] T1: title`, and single-line
`Acceptance:`, `Verify:`, `Result:`, and optional `Depends on:` fields. Dependencies
are `None` or comma-separated earlier task IDs. Horizontal whitespace around
list markers and checkboxes and indentation are supported; recognizable malformed
task, phase, and Current records produce errors rather than being skipped.
Legacy inline tasks without a `Current:` link or dependency field remain
supported. Examples in fenced code
blocks and HTML comments are ignored. Links must resolve inside the project,
including symlink targets. Linked phases cannot share the same file identity
through symlink or hard-link aliases. All linked phase files are checked for
readability; task and finding contents are checked only in the current phase.

It checks duplicate phase/task/finding IDs, phase links, dependency references,
task titles and acceptance/verification fields, and Result record presence.
Checked tasks additionally need a substantive Result. Closure additionally requires
all current tasks checked, no `Needs revision` status, and `## Review` and
`## Completion` records. Duplicate Review or Completion sections are errors;
retain their history under a single heading. Finding IDs are recognized across
Review records, including duplicate sections. Other equivalent
Markdown layouts need manual inspection rather than automatic migration.

A pass does **not** establish authorization, truthful evidence, passing tests,
resolved review findings, or correct software. Host permissions and required CI
checks can provide enforcement outside the assistant; Kaylo installs none.
Run the validator's fixture tests with `node --test tests/validate-plan.test.cjs`.
See [guardrail trials](tests/GUARDRAIL-TRIALS.md) for behavioral scenarios and
[the review handover](REVIEW-HANDOVER.md) for an independent challenge pass.

## Workers and budgets

Claude and Codex can guide a project. Gemini/Antigravity can receive research work, and OpenCode with an available DeepSeek model can receive implementation work. Read [working with a worker](WORKERS.md) for a copyable handoff and model-selection guidance.

Work directly when that is sufficient; use one worker at a time when helpful. The guiding assistant maintains `PLAN.md` and the phase plans; workers return results. Native delegation is optional and never implies cross-vendor subscription access. Narrow uncertain work before giving it to a smaller model; no prompt guarantees every model can complete every task.

Delegated builds record the starting workspace state, confirm dependencies are present, and keep one owner for assigned implementation files. Workers return compact acceptance and verification evidence with resume details when needed. The guiding assistant records those details in the existing phase plan and checks combined behavior when tasks connect.

## Package and scope

- `skills/`: five command entrypoints with optional build/review delegation references.
- `agents/`: three shared worker briefs; `claude-agents/`: generated native Claude adapters with identical instruction bodies.
- `templates/`: optional objective, plan index, and phase plan starting points.
- `.claude-plugin/`, `.codex-plugin/`, `plugin.json`, `.agents/plugins/`: native packaging for Claude, Codex, and Antigravity, and the released Codex catalog. OpenCode loads the shared skills directory directly.
- `gemini-extension.json`: native Gemini packaging of the shared skills.
- `development/`: the separate local Codex catalog and ignored generated package.
- `hooks/`: the optional reminder; no workflow runtime or persistent state.
- `scripts/`: plan/package validators, the Claude agent adapter generator, and local development staging; `tests/`: validator fixtures and behavioral trial prompts.

No custom installer, automatic model router, or terminal modifications. Releases use Git tags and native host commands; see [release maintenance](RELEASING.md). Validator fixtures check structure; behavioral trials do not guarantee model compliance. `0.6.0` is an early package version, not a release-readiness claim.

Native integration references: [Claude plugin layout](https://code.claude.com/docs/en/plugins-reference), [Claude agents](https://code.claude.com/docs/en/sub-agents), [Codex plugin packaging](https://developers.openai.com/plugins/build/plugins), [Codex skill invocation](https://developers.openai.com/codex/skills), [Codex hooks](https://developers.openai.com/codex/hooks), [OpenCode 2 skills](https://opencode.ai/v2/docs/skills), [Antigravity plugins](https://antigravity.google/docs/plugins), and [Gemini extensions](https://geminicli.com/docs/extensions/reference/). Host behavior and availability can vary by version; the verification record identifies the versions inspected here.
