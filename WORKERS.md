# Choose a worker

The files in `agents/` are portable role briefs with Claude-compatible frontmatter. Loading the Claude plugin exposes `kaylo:researcher`, `kaylo:builder`, and `kaylo:reviewer`; their default model is inherited from the guiding session. Other hosts can use the Markdown body as a task brief. This package does not install Codex agent profiles or automatically connect vendors.

From a skill's directory, a brief is at `../../agents/<role>.md`; resolve that path against the directory containing `SKILL.md`, not the project being built. If only pasted instructions are available and the brief is needed, supply its location or body.

| Role | Model choice | Work |
| --- | --- | --- |
| [Researcher](agents/researcher.md) | An available model suited to the sources and context size | Answer a bounded question with evidence |
| [Builder](agents/builder.md), S task | An economical model able to follow an existing pattern | Clear local edits and focused checks |
| [Builder](agents/builder.md), M task | A capable coding model | Bounded features and bugs that need reasoning |
| [Builder](agents/builder.md), L task | A stronger reasoning model, or split the task first | Uncertain or cross-cutting changes |
| [Reviewer](agents/reviewer.md) | A model capable of assessing the task's risk | Independently inspect a plan or implementation |

Claude and Codex can remain the guiding assistants. The user may choose Gemini or Antigravity for research, and OpenCode with an available DeepSeek model for building. These are user preferences, not measured guarantees of model quality or account access. Verify availability in the actual tool; do not substitute paid API calls automatically.

Start with one worker at a time. If native subagents are unavailable, open the chosen tool in the same project and paste the brief and task. Finish that worker before another edits the same files. A manual handoff should include this packet:

```text
Role: researcher / builder / reviewer
Task: [one question, task ID with its phase, or review target]
Brief: [role file path if accessible; otherwise paste its Markdown body]
Project location: [actual path or attached relevant files]
Outcome: [observable result]
Constraints: [applicable user decisions and project rules]
Starting points: [files, sources, dependencies, or diff]
Steps: [concrete implementation steps, when building]
Acceptance: [what must be true]
Verify: [working directory, exact command and expected result, or manual steps]
Previous attempts: [failed repairs and evidence, or None]
Existing findings: [IDs, corrections and recheck evidence relevant to this task, or None]
Workspace baseline: [starting changes and relevant original content, or clean commit; confirm dependencies are present]
Contracts: [relevant interfaces and decisions, or None]
Return: findings or the compact build report below
```

The guiding assistant maintains `PLAN.md` and the phase plans, and checks returned claims against the available files and results. A worker does not approve scope, change model settings, or spawn more workers.

For a build, use this compact report; omit fields that do not apply. Return it to the guiding assistant, who records evidence and resume information in the existing phase plan.

```text
Task and workspace: [phase/task ID, path, starting state]
Changes: [paths and resulting behavior; distinguish pre-existing edits]
Acceptance: [criteria met and criteria still unresolved]
Verification: [commands, working directory, exit status, useful result; artifacts when needed]
Blockers or limits: [failed or unavailable checks, decisions needed, or None]
Resume: [completed work, unfinished steps, last failure, repair attempts, exact next action; thread ID if needed]
```

For delegated builds, see [build delegation](skills/build/references/delegation.md) for workspace ownership and continuation. Keep enough context to execute the task without forwarding unrelated conversation history. Worker completion still requires inspection of the changes and evidence, followed by Kaylo's implementation review before close.

If a model cannot complete the task, diagnose the failure. Narrow the task or recommend a stronger available model. Carry forward failed attempts and evidence; switching tools does not justify restarting the same unsuccessful approach. Ask the user only when the next choice requires their decision or unavailable access.

After two unsuccessful repairs of the same unresolved failure, another correction requires material new evidence, an actual change to the blocking condition, or explicit user authorization. Record the reason and outcome and stop again if unresolved; changing the session, task ID, or worker alone does not permit another attempt.

Select a model through the chosen host's model picker before handing over work. In Claude, `/model` sets the guiding session's model and these agents inherit it. In Codex CLI, `/model` or `--model` selects the main model; a native worker may have separate host-controlled settings. Passing a brief does not change those settings. Do not infer worker availability or model identity from a subscription name. If a cheaper worker is unavailable, continue directly when capable or provide the packet for a manual handoff.

The researcher agent has read/search tools only in Claude. Builder and reviewer instructions constrain their work, but are not a security boundary; the host's permissions still apply. The reviewer can run a focused check, which may create ordinary test artifacts. No account limits, model prices, or automatic cross-vendor routing are assumed.
