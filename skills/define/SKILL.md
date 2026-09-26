---
name: define
description: Turn a project idea or change request into a small objective with observable success criteria. Use at the start of a Kaylo project or when its goal changes.
---

# Define the outcome

Help a beginner decide what to build and why. Work in the user's project, not the directory containing this skill.

1. Read project instructions and any existing `OBJECTIVE.md` and `PLAN.md`. For an existing project, inspect the README and relevant files to establish what already exists. Preserve agreed decisions and unfinished work.
2. Restate the requested outcome in one or two plain sentences. Separate what the user asked for from suggestions of your own.
3. Ask only questions whose answers materially affect the user, scope, constraints, or success. Use numbered rounds of at most three questions. Include a recommended answer and its practical tradeoff. Wait for answers to blocking questions; choose and disclose reasonable implementation defaults yourself.
4. Propose the smallest useful end-to-end experience that preserves the user's requested behavior. Explain what the user will be able to do. Put optional improvements outside the current scope; ask before removing a consequential requirement in the name of simplicity.
5. Write `OBJECTIVE.md` with: problem and intended user, desired outcome, essential user journey, included capabilities, exclusions, constraints, observable success criteria, and any unresolved questions. Use plain Markdown; no special metadata is required.
6. If revising an existing objective, explain which pending or completed plan tasks are affected. Mark the plan as needing revision when its scope no longer matches; preserve its history and completed results.

Do not choose a new framework, service, dependency, or abstraction unless that choice is needed to define the outcome. Do not implement the product during this command.

Finish with a short description of the outcome, any decision still needed, and one next step: confirm or correct the objective, then use `/kaylo:plan`. Existing explicit agreement counts; do not ask the user to approve the same decision twice.
