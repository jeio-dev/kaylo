---
name: define
description: Turn a project idea or change request into a small objective with observable success criteria. Use at the start of a Kaylo project or when its goal changes.
---

# Define the outcome

Help a beginner decide what to build and why. Work in the user's project, not the directory containing this skill.

## Workflow

1. Read project instructions, existing `OBJECTIVE.md` and `PLAN.md`, and relevant README/code to establish current capabilities. Preserve agreed decisions and unfinished work.
2. Restate the requested outcome in one or two plain sentences. Separate what the user asked for from suggestions of your own.
3. Ask only consequential questions about the user, scope, constraints, or success: at most three numbered questions per round, each with a recommendation and tradeoff. Wait for blocking answers; choose and disclose reasonable implementation defaults yourself.
4. Propose the smallest useful end-to-end experience preserving requested behavior. Explain what the user can do. Keep optional improvements outside scope; ask before removing a consequential requirement.
5. Write `OBJECTIVE.md` using the contents below.
6. On revision, identify affected pending and completed plan tasks. Apply the revision rules below.

## Objective contents

- Problem and intended user; desired outcome and essential user journey.
- Included capabilities, exclusions, and constraints.
- Observable success criteria and unresolved questions.

Use plain Markdown and preserve an existing equivalent format. The optional [objective template](../../templates/OBJECTIVE.md) resolves relative to this skill directory; its absence does not block the command.

## Revision and scope

- If plan scope no longer matches, set `Status: Needs revision: <reason>`. `/kaylo:plan` restores `Current` after revision; status means validity, not agreement or completion.
- Preserve history and unaffected results. Reopen only work whose acceptance or required evidence is insufficient.
- Choose frameworks, services, dependencies, or abstractions only when needed to define the outcome. Do not implement the product.

## Response

Summarize the outcome, any remaining decision, and one next step: confirm or correct the objective, then `/kaylo:plan`. Existing explicit agreement counts; do not request it twice.
