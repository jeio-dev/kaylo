# Choose a worker

The files in `agents/` are portable role briefs with Claude-compatible frontmatter. Loading the Claude plugin exposes `kaylo:researcher`, `kaylo:builder`, and `kaylo:reviewer`; their default model is inherited from the guiding session. Other hosts can use the Markdown body as a task brief. This package does not install Codex agent profiles or automatically connect vendors.

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
Task: [one question, task ID, or review target]
Brief: [role file path if accessible; otherwise paste its Markdown body]
Project location: [actual path or attached relevant files]
Outcome: [observable result]
Constraints: [applicable user decisions and project rules]
Starting points: [files, sources, dependencies, or diff]
Steps: [concrete implementation steps, when building]
Acceptance: [what must be true]
Verify: [working directory, exact command and expected result, or manual steps]
Previous attempts: [failed repairs and evidence, or None]
Return: findings or changed files, checks and results, remaining blockers
```

The guiding assistant maintains `PLAN.md` and checks returned claims against the available files and results. A worker does not approve scope, change model settings, or spawn more workers.

If a model cannot complete the task, diagnose the failure. Narrow the task or recommend a stronger available model. Carry forward failed attempts and evidence; switching tools does not justify restarting the same unsuccessful approach. Ask the user only when the next choice requires their decision or unavailable access.

Select a model through the chosen host's model picker before handing over work. In Claude, `/model` sets the guiding session's model and these agents inherit it. In Codex CLI, `/model` or `--model` selects the main model; a native worker may have separate host-controlled settings. Passing a brief does not change those settings. Do not infer worker availability or model identity from a subscription name. If a cheaper worker is unavailable, continue directly when capable or provide the packet for a manual handoff.

The researcher agent has read/search tools only in Claude. Builder and reviewer instructions constrain their work, but are not a security boundary; the host's permissions still apply. The reviewer can run a focused check, which may create ordinary test artifacts. No account limits, model prices, or automatic cross-vendor routing are assumed.
