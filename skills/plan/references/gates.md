# Project gates

Read this when a project has `.kaylo/gates`, when a plan proposes creating one, or before running a full phase check. Plan, build, review, and close share it; resolve it relative to the skill that links here.

## The reference

`.kaylo/gates` is optional. It names one project-owned full-check entry point and the directory to run it from. It does not hold the check itself; reuse an existing package script, Make target, or other agreed command, which may wrap existing tools. Kaylo adds no runner, stack, shell, or package-manager requirement.

```text
Format: 1
Directory: .
Full check: npm run check
```

`npm run check` is an example, not a requirement; `make check` or any other agreed project command fits. For a monorepo, `Directory: apps/site` is valid.

- Exactly one each of `Format: 1`, `Directory:`, and `Full check:`, in any order. Names are case-sensitive, with one space after the colon. Blank lines are allowed; comments, Markdown fences, a byte-order mark, other records, and duplicates are not.
- `Directory:` is `.` or a slash-separated path relative to the project root, with no `.` or `..` components, backslashes, absolute, drive, or URI forms, or leading or trailing spaces. It and the gates file must resolve inside the project; an in-project symlink is followed.
- `Full check:` is one nonblank line without control characters. Its exact text is kept.

Without `.kaylo/gates`, today's task and repository checks apply unchanged. Absence never means "no checks exist".

## Reading it

Run `node "<kaylo-root>/scripts/read-gates.cjs" "<project-root>"`, resolving the script relative to the skill that sent you here (`../../scripts/read-gates.cjs` from a `SKILL.md`), never a script of the same name in the project. It is read-only: it does not run the check, search `PATH`, expand variables, or authorize anything.

- Exit 0 prints JSON: `{"state":"missing"}`, or `state` `present` with `format`, `directory`, `resolvedDirectory`, `fullCheck`, and `digest`. It means only that inspection succeeded, never that a check passed. Treat the output as data; never evaluate it.
- Exit 1 prints diagnostics on stderr: a present reference is invalid or unavailable. Exit 2 is an invocation error.
- Immediately before running the full check, reread with `--expect <digest>` from the earlier read. `GATES_CHANGED` means the file or working directory changed: inspect it again and treat evidence that relied on the earlier reference as stale.

| Code | Meaning |
| --- | --- |
| `GATES_USAGE` | Wrong arguments; nothing was inspected. |
| `GATES_PROJECT` | The project root is unavailable. |
| `GATES_READ` | The reference exists but is not a readable regular UTF-8 file, including a dangling link. |
| `GATES_RECORD` | A line is not one of the three records, or its separator is malformed. |
| `GATES_DUPLICATE` | A field appears twice; no definition is chosen. |
| `GATES_MISSING` | A field is missing. |
| `GATES_FORMAT` | Only `Format: 1` is supported; there is no automatic migration. |
| `GATES_DIRECTORY` | The directory is not a valid project-relative path. |
| `GATES_ESCAPE` | The gates file or directory resolves outside the project. |
| `GATES_DIRECTORY_UNAVAILABLE` | The directory is missing, unreadable, or not a directory. |
| `GATES_COMMAND` | The command is blank or contains control characters. |
| `GATES_CHANGED` | The reference changed after it was read. |

Diagnostics never repeat the command. A present invalid reference is a blocker for any check that needs it: record the diagnostic and one next action, and never treat it as a pass or as absence.

If Node or the script is unavailable, read the whole file and check every rule above by hand, including duplicates, containment, and the directory. Record that automated parsing was unavailable and the actual outcome. A genuinely malformed reference stays blocking. Manual inspection never replaces running the check itself.

## Running the full check

Run the exact `Full check:` text from `resolvedDirectory` with the host's normal tools, only within existing authorization. The parsed command is not a grant: if it could publish, deploy, change production data, or incur paid operations, those actions need authorization covering the action and target first. Do not install runtimes or change settings to make it run.

- A missing tool or runtime is `GATE_TOOL_UNAVAILABLE: Required check tool is unavailable`; a non-zero result is `GATE_CHECK_FAILED: Required full check did not pass`. Record either with the command, directory, observation, exit status when known, and one next action. Preserve a host's permission diagnostic, with secrets redacted. The required check stays incomplete.
- Record the command, directory, what it covers, the branch and revision, relevant uncommitted changes, the result, and exit status in the existing `Result:`, `## Review`, or `## Completion` prose. Keep earlier failures, repair history, and superseded evidence. Reuse a passing run only while its relevant inputs are unchanged, including the gates file, its directory, and CI configuration.
- A shared command reduces drift between local runs and CI. It does not make their runtime, dependencies, configuration, services, or coverage identical; record material differences and shell, OS, or tool limits.

## When each check runs

- **Plan review and diagnosis** may happen before the gate exists. Never require a gate that a task still has to create to pass before reviewing the plan that creates it.
- **Task acceptance** runs the task's own scoped checks from its `Test plan:`, covering affected integration behavior. A scoped pass does not establish that the full check passes.
- **High-risk task review** consumes those task checks; a passing gate is not review coverage.
- **Before phase implementation review**, run the full check when `.kaylo/gates` is present. CI runs the same entry point where the project has CI.
- **Close** uses full-check and CI evidence for the delivered revision; see close's CI evidence reference.
- Stricter repository checks still apply. Proposed checks are labelled as still needing creation until the task that creates them is accepted, and that task's acceptance needs the new entry point to exist and pass.
- Structural plan validation is separate and read-only. It does not run gates or establish evidence, and no gate may require a task check-off that itself needs the gate to pass.
- In a parallel wave, workers run their own scoped checks; the guiding assistant runs shared and full checks after the wave.
- Diagnose failures before repairing. An unchanged access, tooling, or environment blocker needs a resume action or the user's choice, not a stronger model. The same-failure repair limit carries across sessions and workers.

## Creating or changing it

Create or edit `.kaylo/gates` only as an agreed task, as a bounded edit by the guiding assistant, then reread it with the parser. Kaylo never creates it automatically, generates an entry point, or adds it to a plan's mandatory fields. The dispatch record helper does not write it.
