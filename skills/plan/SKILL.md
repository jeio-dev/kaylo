---
name: plan
description: Inspect a project and turn an agreed Kaylo outcome into small, verifiable tasks, or revise its plan after feedback or a blocker.
---

# Plan a small change

Guide the user toward the simplest approach that meets the outcome. Work in the user's project.

1. Read project instructions, `OBJECTIVE.md` if present, and the existing `PLAN.md`. For a small change, the user's concrete request can supply the objective; do not require a separate discovery exercise. Ask for missing intent only when it changes the work.
2. Inspect relevant code, dependencies, and existing checks. Establish facts yourself. A research worker may answer a bounded factual question; ask for file references or source links and unresolved uncertainties.
3. Trace the relevant user flow before recommending a change. First check whether existing capability or configuration already meets the criteria. Then consider existing helpers, standard libraries, native platform features, and installed dependencies before custom code. Prefer extending an existing pattern over adding an abstraction. Explain why the recommendation is sufficient; mention a more elaborate option only when a concrete requirement justifies it. Preserve requested behavior, readability, security, and accessibility rather than optimizing for fewest lines.
4. Resolve consequential unknowns before implementation. Ask at most three numbered questions per round, each with a recommended answer. If a technical unknown needs investigation, make it a bounded research task with a question and an expected deliverable.
5. Write or revise `PLAN.md`: goal, scope and exclusions, approach, constraints, tasks in dependency order, review findings, and the next step. Keep completed results and unrelated work. Record which scope the user has actually agreed to; never invent approval.
6. For each task include: ID and checkbox, intended result, relevant files or starting points, dependencies, concrete implementation steps, acceptance criteria, exact verification command with working directory and expected result or manual observation, and S/M/L complexity with a reason. Verify that named commands exist; label proposed checks that still need to be created. Research tasks return findings instead of code.
7. Size tasks so a worker can complete one without designing the rest of the project. Split L work where useful. If a task still needs architectural judgment, keep it with a capable guiding model rather than handing ambiguity to a cheaper worker.

Use S for clear local edits following an existing pattern, M for a bounded feature or bug fix with some reasoning, and L for uncertain or cross-cutting work. Account for consequence as well as size: a short sensitive change may require a stronger model.

Checks must establish acceptance, not just repeat the implementation. Use existing project checks where applicable. Do not add a testing framework for a small change. Include a user-facing check when automated tests do not establish that the feature works.

On revision, identify affected tasks and verification results. Reopen only affected work; request agreement again only for a material change to the agreed outcome, scope, or tradeoffs.

Keep implementation detail in `PLAN.md`. Finish with a readable summary of the approach and first task, any remaining decision, and one next step. Recommend `/kaylo:review plan` for substantial or uncertain work; otherwise request any still-needed agreement or hand off to `/kaylo:build`. This command does not begin implementation. In hosts with a skill picker instead of namespaced slash commands, identify the corresponding Kaylo skill.
