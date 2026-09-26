# Kaylo

Build software with patient, practical guidance, using the AI tools you already have.

Kaylo is an early `0.1.0` package; see [verification](VERIFICATION.md) for what has actually been checked.

## Five commands

| Command | What it helps you do | What you get |
| --- | --- | --- |
| `/kaylo:define` | Turn an idea into a clear outcome | `OBJECTIVE.md` |
| `/kaylo:plan` | Inspect the project and choose a simple approach | Executable tasks in `PLAN.md` |
| `/kaylo:build` | Implement and verify an agreed task | A working change and recorded evidence |
| `/kaylo:review` | Get a second opinion on a plan or change | Concrete findings in `PLAN.md` |
| `/kaylo:close` | Check the promised outcome and finish | Usage guidance and remaining limitations |

Start with define, then plan. A concrete small change can start with plan. Review substantial or uncertain plans before building; review implementation before close. Revise through plan and build. Each response should explain what matters and give one clear next step.

The assistant investigates repository facts, recommends an approach, and asks a short numbered round only for consequential decisions. Tasks include acceptance criteria and meaningful verification. Reuse passing checks unless relevant inputs changed. After two unsuccessful repairs of the same failure, preserve the work and recommend a different next action.

Simplicity means using existing capability, configuration, standard libraries, native features, and installed dependencies where sufficient. Keep requested behavior, readability, security, and accessibility. A short diff is not proof of a correct solution.

## Use Kaylo

Run Kaylo in the project you want to build. The package contains one shared set of skills; their internal names remain `define`, `plan`, `build`, `review`, and `close`.

### Claude Code

From your target project, load this checkout for the current session:

```powershell
claude --plugin-dir '<kaylo-checkout>'
```

Then use `/kaylo:define`, `/kaylo:plan`, `/kaylo:build T1`, `/kaylo:review plan`, `/kaylo:review changes`, or `/kaylo:close`. These are five skills, with arguments selecting a task or review target. Replace `<kaylo-checkout>` with the path of your clone of this repository. This does not install a global plugin; omit `--plugin-dir` next time to stop loading it.

### Codex

The repository includes a local marketplace so the native CLI can install it without a Kaylo installer:

```powershell
codex plugin marketplace add '<kaylo-checkout>'
codex plugin add kaylo@kaylo-local
```

Start a new Codex session in your target project. Use `/skills` or the `$` skill picker and select the Kaylo skill (`kaylo:define`, `kaylo:plan`, `kaylo:build`, `kaylo:review`, or `kaylo:close`), then supply your request, such as `Implement T1`. Some app surfaces use `@` to select skills. **Codex does not register Claude-style `/kaylo:<command>` slash commands through this package.** That spelling remains Kaylo's workflow notation; use the matching skill in Codex. Selecting the Kaylo entry avoids collisions with other skills named `plan` or `build`.

Codex copies local plugins into its cache. After editing your checkout, reinstall `kaylo@kaylo-local` and start a new session. Remove it with `codex plugin remove kaylo@kaylo-local`; remove the catalog with `codex plugin marketplace remove kaylo-local`. These are host commands, not an installer script shipped by Kaylo.

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

## Workers and budgets

Claude and Codex can guide a project. Gemini/Antigravity can receive research work, and OpenCode with an available DeepSeek model can receive implementation work. Read [working with a worker](WORKERS.md) for a copyable handoff and model-selection guidance.

Work directly when that is sufficient; use one worker at a time when helpful. The guiding assistant maintains `PLAN.md`; workers return results. Native delegation is optional and never implies cross-vendor subscription access. Narrow uncertain work before giving it to a smaller model; no prompt guarantees every model can complete every task.

## Package and scope

- `skills/`: the five self-contained command instructions.
- `agents/`: three portable briefs, also discoverable as Claude agents.
- `templates/`: optional objective and plan starting points.
- `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`: native packaging and the local Codex catalog.
- `hooks/`: the optional reminder; no workflow runtime or persistent state.

No custom installer, conformance suite, automatic model router, terminal modifications, or release machinery. `0.1.0` is an early package version, not a release-readiness claim.

The simplicity guidance was informed by [Ponytail](https://github.com/DietrichGebert/ponytail); Kaylo does not bundle or require it. The instructions are adapted to patient explanations and acceptance criteria rather than line-count targets.

Native integration references: [Claude plugin layout](https://code.claude.com/docs/en/plugins-reference), [Claude agents](https://code.claude.com/docs/en/sub-agents), [Codex plugin packaging](https://developers.openai.com/plugins/build/plugins), [Codex skill invocation](https://developers.openai.com/codex/skills), and [Codex hooks](https://developers.openai.com/codex/hooks). Host behavior and availability can vary by version; the verification record identifies the versions inspected here.
