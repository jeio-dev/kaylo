# Kaylo

Build software with patient, practical guidance, using the AI tools you already have.

Kaylo is an early `0.5.1` package; see [verification](VERIFICATION.md) for what has actually been checked.

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

## Use Kaylo

Run Kaylo in the project you want to build. The package contains one shared set of skills; their internal names remain `define`, `plan`, `build`, `review`, and `close`.

### Claude Code

From your target project, load this checkout for the current session:

```powershell
claude --plugin-dir '<kaylo-checkout>'
```

Then use `/kaylo:define`, `/kaylo:plan`, `/kaylo:build T1`, `/kaylo:build R2`, `/kaylo:review plan`, `/kaylo:review changes`, or `/kaylo:close`. These are five skills, with arguments selecting a task, finding, or review target. Replace `<kaylo-checkout>` with the path of your clone of this repository. This does not install a global plugin; omit `--plugin-dir` next time to stop loading it.

### Codex

The repository includes a local marketplace so the native CLI can install it without a Kaylo installer:

```powershell
codex plugin marketplace add '<kaylo-checkout>'
codex plugin add kaylo@kaylo-local
```

Start a new Codex session in your target project. Use `/skills` or the `$` skill picker and select the Kaylo skill (`kaylo:define`, `kaylo:plan`, `kaylo:build`, `kaylo:review`, or `kaylo:close`), then supply your request, such as `Implement T1`. Some app surfaces use `@` to select skills. **Codex does not register Claude-style `/kaylo:<command>` slash commands through this package.** That spelling remains Kaylo's workflow notation; use the matching skill in Codex. Selecting the Kaylo entry avoids collisions with other skills named `plan` or `build`.

Codex copies local plugins into its cache. After editing your checkout, reinstall `kaylo@kaylo-local` and start a new session. Remove it with `codex plugin remove kaylo@kaylo-local`; remove the catalog with `codex plugin marketplace remove kaylo-local`. These are host commands, not an installer script shipped by Kaylo.

### OpenCode 2

In your target project's existing `opencode.json` or `opencode.jsonc`, add the checkout's skills directory to the `skills` array. Preserve any existing entries and settings:

```json
{
  "skills": ["/absolute/path/to/kaylo/skills"]
}
```

Start a new OpenCode session in that project. Ask it to load the `define`, `plan`, `build`, `review`, or `close` skill, then give your request, such as `Load the Kaylo build skill and implement T1`. These are bare skill IDs; OpenCode does not use the Claude/Codex `kaylo:` namespace for a directory source. Avoid another source defining the same IDs. Point at the full checkout so relative templates and worker briefs remain available.

OpenCode initializes its skill catalog after server startup. When checking discovery through `GET /api/skill`, wait until the returned IDs include all five skills and confirm their paths point into this checkout; an immediate empty response does not establish a loading failure. This configuration is verified with OpenCode 2.0.18; OpenCode 1 uses a different configuration format. Kaylo does not install an OpenCode runtime plugin or session hook.

### Antigravity

The root `plugin.json` packages the same skills and worker briefs for Antigravity. Install the checkout with its native CLI:

```powershell
agy plugin validate '<kaylo-checkout>'
agy plugin install '<kaylo-checkout>'
agy plugin list
```

Start a new Antigravity CLI session in your target project and select the loaded Kaylo skill, or ask the assistant to load it by name before giving your request. Installation copies the checkout, including templates and delegation references. After editing it, reinstall and start a new session. Remove it with `agy plugin uninstall kaylo`.

For Antigravity 2.0 or the standalone IDE, place the full checkout at `<project>/.agents/plugins/kaylo/` and inspect its skills in Customizations. CLI validation and installation are verified here; IDE loading remains untested. Kaylo's optional session reminder is configured for Claude and Codex.

### Gemini CLI

Gemini CLI is a separate host from Antigravity. Native Gemini installation, skill discovery, and workflow behavior have not been verified; the Antigravity checks above do not establish Gemini compatibility. Use the direct-file method below with the full checkout available so templates, worker briefs, and the validator can still be read. Pasted skills require manual plan inspection when supporting files are unavailable.

### Any tool, without installing

Give the assistant the skill file and your request:

> Read `<kaylo-checkout>/skills/plan/SKILL.md` and follow it in this project. I want to add a reading list.

Paste the skill text if the tool cannot read that path. This works without the plugin or hook.

## Optional session reminder

Both plugin packages discover `hooks/hooks.json`. It runs one small Node.js script on startup or resume, supplying a short reminder to read project instructions and existing objective/plan when Kaylo work is requested. It does not read or write project files, track sessions, run tests, route models, or authorize implementation. There are no per-prompt, compaction, tool, stop, or subagent hooks.

Node must be on the host's PATH for the reminder. If Node is missing, the host may report a hook error; the skills remain usable. The hook has a two-second timeout and never returns a blocking decision. Missing script/load errors are quiet. It is guidance, not enforcement or a guarantee that the assistant read the plan.

Codex requires you to review and trust plugin hooks through its native `/hooks` controls before they run. Leaving the hook untrusted keeps the skills usable. To suppress Kaylo's reminder in either host, launch it from a shell with `KAYLO_SESSION_REMINDER=0`:

```powershell
$env:KAYLO_SESSION_REMINDER = '0'
```

This affects programs started from that shell and still allows the tiny hook process to run. To avoid the hook process entirely, use the direct-file method above; Codex can also leave the hook untrusted. No hook trust or global settings are changed by this repository.

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
- `agents/`: three portable briefs, also discoverable as Claude agents.
- `templates/`: optional objective, plan index, and phase plan starting points.
- `.claude-plugin/`, `.codex-plugin/`, `plugin.json`, `.agents/plugins/`: native packaging for Claude, Codex, and Antigravity, and the local Codex catalog. OpenCode loads the shared skills directory directly.
- `hooks/`: the optional reminder; no workflow runtime or persistent state.
- `scripts/`: read-only plan validator; `tests/`: validator fixtures and behavioral trial prompts.

No custom installer, automatic model router, terminal modifications, or release machinery. Validator fixtures check structure; behavioral trials do not guarantee model compliance. `0.5.1` is an early package version, not a release-readiness claim.

The simplicity guidance was informed by [Ponytail](https://github.com/DietrichGebert/ponytail); Kaylo does not bundle or require it. The instructions are adapted to patient explanations and acceptance criteria rather than line-count targets.

Delegation refinements were informed by [Astra Flash Orchestrator](https://github.com/ethanplusai/astra-flash-orchestrator). Kaylo keeps its own task, repair, and review rules and does not bundle its router or installer.

Native integration references: [Claude plugin layout](https://code.claude.com/docs/en/plugins-reference), [Claude agents](https://code.claude.com/docs/en/sub-agents), [Codex plugin packaging](https://developers.openai.com/plugins/build/plugins), [Codex skill invocation](https://developers.openai.com/codex/skills), [Codex hooks](https://developers.openai.com/codex/hooks), [OpenCode 2 skills](https://opencode.ai/v2/docs/skills), and [Antigravity plugins](https://antigravity.google/docs/plugins). Host behavior and availability can vary by version; the verification record identifies the versions inspected here.
