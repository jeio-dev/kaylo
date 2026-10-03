# Glossary

Kaylo uses the words software teams use, so working with Kaylo also teaches you the vocabulary you'll hear at a job. This page explains each term, what teams call it, and where Kaylo's version is different. Where no team term fits exactly, Kaylo keeps its own word and says so here.

Teams vary. One company says "ticket", another "issue", another "work item". The terms below are common terms, with alternatives. Expect your team to have its own habits.

## The five steps

The command names are unchanged. They are ordinary verbs that teams already use.

| Kaylo step | What a team may do at this point | How Kaylo differs |
| --- | --- | --- |
| `define` | Writes the product requirements, for example as a PRD. At a company, a product manager may lead this. | You and Kaylo write a lean PRD together. |
| `plan` | Writes a technical design, then breaks the work into small tasks with acceptance criteria and estimates. In Scrum (a framework that organizes team work into fixed-length cycles called sprints), backlog refinement clarifies and splits planned product work; developers also break selected work into implementation tasks during Sprint Planning. | Kaylo plans one phase in detail at a time and keeps later phases as one line each. |
| `build` | Implements a task. In a common pull-request workflow, the change is made on a branch (a separate line of changes in the code history) and then proposed in a pull request (a request for teammates to review the change before it is merged into the main code). | Kaylo works in your current workspace. It does not create branches or pull requests (see [Not in Kaylo yet](#not-in-kaylo-yet)). |
| `review` | Reviews a design (design review) or code (code review) and leaves comments. | Kaylo reviews both plans and changes, and records comments in the phase plan instead of on a pull request. |
| `close` | Checks the acceptance criteria and closes the finished work. On GitHub, a team can close the issues and the milestone. | Kaylo checks the phase against its acceptance criteria and records a completion summary. It does not publish a release or hold a retrospective. At most, it may suggest a few standing rules from the phase, with its reasons, for you to add to your project's instruction file for AI assistants. |

## Files and fields

The last column is a summary. The exact rules are in [For contributors: format contract](#for-contributors-format-contract).

| Kaylo name | Formerly | What teams call it | Checked by the validator |
| --- | --- | --- | --- |
| `PRD.md` | `OBJECTIVE.md` | PRD (product requirements document); also product brief or one-pager | `PRD.md` is optional. `OBJECTIVE.md` is rejected. |
| `ROADMAP.md` | `PLAN.md` | Roadmap | Required, with one `Current:` link. `PLAN.md` without `ROADMAP.md` is rejected. |
| Phase plan | — | Phase | Checked. Its file path is instructions only. |
| `Status:` in a phase plan | — | (Kaylo's own word) | Required: `Current` or `Needs revision: <reason>`. |
| `## Design` in a phase plan | `## Approach` | Design; the core of a design doc | Instructions only |
| Task (`T1`) | — | Task; also issue, ticket, or work item | Entry format and unique IDs |
| `Estimate: S/M/L` | `Complexity:` | Estimate; t-shirt sizing | The old field is rejected. Values are instructions only. |
| `Blocked by:` | `Depends on:` | Blocked by (a dependency) | Required (`None` is allowed). The old field is rejected. |
| `Acceptance criteria:` | `Acceptance:` | Acceptance criteria | Required. The old field is rejected. |
| `Test plan:` | `Verify:` | Test plan | Required. The old field is rejected. |
| `Result:` | — | (Kaylo's own word) | Required |
| Review comment (`R1`) | Finding | Review comment | Duplicate IDs are rejected. |
| `blocking` / `non-blocking` | `blocker` / `optional` | Blocking / non-blocking; a nit is one kind of non-blocking comment | The old labels are rejected. |

### PRD (product requirements document)

A PRD describes *what* the product should do and why: the problem, the users, what's included and excluded, and how you'll know it works. It leaves *how* to the design. Atlassian defines it as "a guide that defines the requirements of a particular product or feature, including its purpose, features, and functionality."

Kaylo's PRD is lean. Other PRDs can be much longer. They may include market and stakeholder sections (a stakeholder is anyone affected by the product or with a say in it, such as users, managers, or support staff), and a product manager may own them.

Sources: [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements), [Wikipedia](https://en.wikipedia.org/wiki/Product_requirements_document)

### Roadmap

A roadmap shows the planned order of work. Atlassian's roadmap template suggests plotting ideas as "Now, Next, and Later" before committing to a timeline.

Kaylo's roadmap is an ordered list of phases without dates. Other roadmaps carry dates or quarters, like GitHub's timeline-based roadmap layout.

Sources: [Atlassian roadmap template](https://www.atlassian.com/software/jira/templates/product-roadmap), [GitHub roadmap layout](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout)

### Phase

A phase is a stretch of work toward one goal, as in "we'll do that in phase 2". Kaylo kept this word on purpose.

- **A phase is not a milestone.** A milestone marks a *point* on a timeline, like a checkpoint. A phase is the *work* that reaches it. On GitHub, a team can group a phase's issues under a milestone.
- **A phase is not a sprint.** In Scrum, sprints are "fixed length events of one month or less". A Kaylo phase ends when its scope is done, not when time runs out.

Sources: [Wikipedia: Milestone](https://en.wikipedia.org/wiki/Milestone_(project_management)), [GitHub milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones), [Scrum Guide](https://scrumguides.org/scrum-guide.html)

### Design

A design doc records "the high level implementation strategy and key design decisions with emphasis on the trade-offs". A trade-off is what you give up to get something else, such as simpler code at the cost of speed. Only the `## Design` section of a Kaylo phase plan plays that role. The whole phase plan is not a design doc. Google's design docs also cover goals and non-goals, and alternatives that were considered.

Source: [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)

### Task

A task is one unit of work. Jira's definition: "A task represents work that needs to be done." You'll also hear "ticket" (informal), "issue" (GitHub), and "work item" (newer Jira wording). Kaylo tasks live in the phase plan file, not in an issue tracker.

A **user story** is related but different. Atlassian describes it as "an informal, general description of a software feature written from the end user's or customer's perspective". It says what a user wants and why. One story may need several implementation tasks, and Jira lists Story and Task as separate work types. A Kaylo task is a piece of work to do, not a story.

Sources: [Jira work types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/), [Atlassian: user stories](https://www.atlassian.com/agile/project-management/user-stories)

### Estimate

An estimate is a rough size: S, M, or L, like t-shirt sizes. It is not a promise about time. T-shirt sizes can't be added up. As Mike Cohn puts it: "You cannot tell a boss you'll be done in 3 mediums, 4 larges, and 2 petites." Cohn recommends that a team later shift to using numbers directly.

Some teams estimate with **story points**: numbers that compare pieces of work with each other instead of counting hours. Atlassian says teams assign them "relative to work complexity, the amount of work, and risk or uncertainty." Kaylo uses only S, M, and L.

Kaylo also uses the estimate, together with uncertainty and consequence, to decide whether a smaller AI model can handle the task.

Sources: [GitHub Projects quickstart](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/quickstart-for-projects), [Mountain Goat Software](https://www.mountaingoatsoftware.com/agile/estimating-with-tee-shirt-sizes), [Atlassian: story points](https://www.atlassian.com/agile/project-management/estimation)

### Blocked by

`Blocked by:` lists the tasks that must be finished first, which are its prerequisites. Once they're checked off, those prerequisites are satisfied; other blockers may still remain, such as an unresolved problem recorded in `Result:` or a prerequisite change missing from the workspace. Kaylo only allows earlier tasks in the same phase. GitHub issues use the same wording ("Mark as blocked by").

Source: [GitHub issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)

### Acceptance criteria and the Definition of Done

Acceptance criteria are the conditions *one task* must meet to count as done: "predefined requirements and conditions that a product or task must meet to be marked as complete and accepted by the user."

The Definition of Done is different. It is the *whole team's* quality bar for all work, such as "tests pass and docs are updated". Some articles use the two terms loosely, but in Scrum they are distinct. Kaylo has acceptance criteria per task, but no team-wide Definition of Done.

Sources: [Atlassian: acceptance criteria](https://www.atlassian.com/work-management/project-management/acceptance-criteria), [Scrum Guide](https://scrumguides.org/scrum-guide.html)

### Test plan

A test plan says how you'll prove the change works: the commands to run and what to look for. Some pull request templates require one. React Native's asks you to "Demonstrate the code is solid."

In Kaylo, `Test plan:` holds the *planned* checks, and the actual results go in `Result:`. In a pull request, the plan and its evidence can be written together, as in React Native's template.

Source: [React Native pull request template](https://raw.githubusercontent.com/facebook/react-native/main/.github/PULL_REQUEST_TEMPLATE.md)

### Review comments: blocking and non-blocking

A review comment points out a problem or an improvement. A **blocking** comment "should prevent the subject under review from being accepted" until it is resolved. A **non-blocking** comment is worth considering but doesn't stop the work. A **nit** is a small, non-blocking comment about style or preference. Google's reviewers label comments with prefixes like "Nit:", "Optional (or Consider):", and "FYI:".

Sources: [Conventional Comments](https://conventionalcomments.org/), [Google code review guide](https://google.github.io/eng-practices/review/reviewer/comments.html)

## Kaylo's own words

These have no exact team equivalent, so Kaylo keeps its own name rather than borrowing a term that means something else.

- **`Result:`** holds a task's progress, evidence, and blockers. A team might record this information in a ticket's status and comments.
- **`Status:`** says whether a phase plan is still valid: `Current`, or `Needs revision: <reason>` after something changed. It does not mean agreed or finished. Every phase plan needs it; a missing status or `Draft` is rejected.
- **`Current:`** in `ROADMAP.md` points to the phase being worked on. It picks *which* phase; `Status:` says whether that phase's plan still holds.
- **`## Completion`** records what a phase delivered, how it was checked, and known limitations and follow-ups. A limitation is accepted only with the user's actual recorded decision. It records phase closure; release notes describe changes in a software release.
- **The repair limit:** after two failed attempts to fix the same problem, stop, keep the work, and ask for a different approach, instead of staying stuck. This is not a timebox: a timebox limits *time*, while the repair limit counts *attempts*.
- **Plan check:** a review of a phase plan before building. Plan requests an independent review from a fresh reviewer where the host has one; otherwise `/kaylo:review plan` may review directly and records the lack of fresh context. Plan requests a check for substantial or uncertain plans and always before a phase-wide build. It is separate from the structural plan check, which only validates Markdown structure. The nearest team practice is a design review (see `review` above).
- **Phase mode:** `/kaylo:build phase`. The guiding assistant builds the current phase's unfinished tasks one at a time until all pass or one blocks. It does not review or close the phase.
- **`Phase build readiness:`** a line in a phase plan's `## Agreement` recording your confirmation that the phase may be built in phase mode. Plan writes it only when you confirm, and a later material revision to the plan voids it.

## Not in Kaylo yet

These are practices you may encounter at a job. Kaylo doesn't do them for you.

- **Branches and pull requests.** A branch is a separate line of changes in a repository. A pull request proposes merging a branch's changes (combining them into the main code) and lets teammates review them first. In a common pull-request workflow, each change is made on its own branch and reviewed in a pull request before it is merged. Some teams instead integrate small changes directly into a shared main line. [GitHub: Pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests), [GitHub: Branches](https://docs.github.com/en/pull-requests/reference/branches), [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)
- **Continuous integration (CI).** Each member of the team merges their changes into the shared code often (at least daily, in Martin Fowler's definition), and an automated build with tests checks each one. [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)
- **Retrospectives.** After a sprint or project, the team discusses what went well and what to change. In Scrum, the purpose is "to plan ways to increase quality and effectiveness".
- **Standups.** A short daily check-in. The Scrum version, the Daily Scrum, is "a 15-minute event for the Developers".
- **Time-boxed sprints.** Work planned in fixed periods; in Scrum, one month or less.
- **An issue tracker.** Tasks live in a tool such as GitHub Issues or Jira, not in a Markdown file.
- **A team-wide Definition of Done.**

Source for the Scrum practices: [Scrum Guide](https://scrumguides.org/scrum-guide.html)

## For contributors: format contract

This section is the exact contract for Kaylo's files, for people changing the validator, templates, skills, or worker briefs. You don't need it to use Kaylo.

### Renamed

| Kind | Old | New |
| --- | --- | --- |
| Project file | `OBJECTIVE.md` | `PRD.md` |
| Project file | `PLAN.md` (index) | `ROADMAP.md` |
| Template | `templates/OBJECTIVE.md` | `templates/PRD.md` |
| Template | `templates/PLAN.md` | `templates/ROADMAP.md` |
| Phase plan heading | `## Approach` | `## Design` |
| Task field | `Complexity:` | `Estimate:` (qualitative S/M/L size; also guides model choice) |
| Task field | `Depends on:` | `Blocked by:` (prerequisites; `None` allowed) |
| Task field | `Acceptance:` | `Acceptance criteria:` |
| Task field | `Verify:` | `Test plan:` (planned checks; evidence stays in `Result:`) |
| Review label | `blocker` / `optional` | `blocking` / `non-blocking` |
| Prose | finding(s) | review comment(s); IDs stay `R1` |

### Unchanged

| Item | Reason | Validator |
| --- | --- | --- |
| Commands `define`, `plan`, `build`, `review`, `close` | Already ordinary team verbs; `release` or `ship` would suggest publishing. | — |
| Phase, phase plan | "Phase" is team vocabulary; a milestone is a point, not a period of work. | The phase plan that `Current:` links is checked. |
| `templates/PHASE.md` | Follows "phase". | Not checked by the plan validator. Package tests reference this path. |
| `.kaylo/phases/NN-slug/NN-PLAN.md` | Follows "phase". | Instructions only; the validator follows the linked path. |
| `NN-RESEARCH.md` | Follows "phase". | Instructions only |
| Task | Accurately describes Kaylo's unit of work. | Entry format `- [ ] T1: title`; unique IDs. |
| IDs `T1`, `R1`, `02-T3` | Already short and unambiguous. | `T1` and `R1` must be unique. Qualified IDs such as `02-T3` are instructions only. |
| `Result:` | Kaylo convention; no single team field matches. | Nonempty on every task; substantive on a checked task, with no leading unfinished state marker (see Validation rules). |
| `Status:` (`Current`, `Needs revision: <reason>`) | Kaylo convention for plan validity. | Required; see the rules below. |
| `Current:` | Kaylo convention for index selection. | Required; exactly one, matching one phase entry. |
| `## Review` | Already the plain word. | Checked at closure. |
| `## Next step` | Already the plain word. | Instructions only |
| `## Completion` | Records phase closure, not a release. | Checked at closure. |
| Repair limit | Counts attempts, so it is not a timebox. | Instructions only |

### Validation rules

The validator enforces these rules. The skills' manual inspection applies the same rules when Node or the validator is unavailable.

Older formats removed:

- Reject tasks written inline in the index. `ROADMAP.md` must have a `Current:` link.
- Reject a phase plan without `Status: Current` or `Status: Needs revision: <reason>`. This includes `Draft` and a missing status.
- Reject a task without `Blocked by:`.
- Reject an old name when a new one is expected: `PLAN.md` without `ROADMAP.md`, `OBJECTIVE.md`, and the old task fields and review labels, including mixtures of old and new. Each diagnostic names the replacement.
- Keep: unlinked one-line entries for future phases in `ROADMAP.md`. These are valid, not legacy.
- Instruction-only (not validated): `Estimate:` values, the `## Design` heading, and linked plan paths matching `.kaylo/phases/NN-slug/NN-PLAN.md`. `## Next step` is also instruction-only.

Structural checks:

- `ROADMAP.md` has exactly one `Current:` line in the form `Current: [label](relative-file)`, and it matches exactly one phase entry.
- Phase entries have a checkbox and a two-digit ID. Phase IDs are unique. A checked phase needs a plan link. Two entries cannot link the same file, including through symbolic or hard links.
- Plan links are relative and stay inside the project.
- Tasks use `- [ ] T1: title`, and task IDs are unique. Each task has a substantive title, `Acceptance criteria:`, and `Test plan:`, and a nonempty `Result:`. A checked task needs a substantive `Result:` without a leading unfinished state marker: `Not started`, `In progress`, `Pending`, `TODO`, `TBD`, or `Blocked` (case-insensitive), followed by optional horizontal whitespace and `.`, `!`, `:`, `;`, `,`, an en/em dash (`–`, `—`), or a hyphen (`-`) with whitespace on at least one side, or the end of the record. Notes appended to a marker do not make it complete; historical progress or failures may follow current evidence. Bare whitespace and attached hyphens do not mark a state, so ordinary prose such as `TODO list renders`, `In progress bar renders`, and `Blocked-user filter works` passes. The same structural limit allows `Pending verification.` and `In progress with baseline notes.`; skills must still assess the evidence and leave unresolved work open.
- `Blocked by:` is `None` or comma-separated, distinct IDs of earlier tasks in the same phase.
- `Acceptance criteria:`, `Test plan:`, `Result:`, and `Blocked by:` each appear at most once per task. `## Review` and `## Completion` each appear at most once. Review comment IDs (`R1`) are unique.
- Closure (`--closing`, or a checked current phase) requires every task checked, no `Status: Needs revision`, a record under `## Review` (`None` is allowed), and a substantive record under `## Completion`. A bare `Not complete` (case-insensitive, with an optional period or exclamation mark) is a placeholder; an open phase may retain it before closure.

Parsing:

- Every line starting with `Status:` is checked. Task fields are single-line.
- Horizontal whitespace around list markers and checkboxes, and indentation, are supported. Recognizable but malformed task, phase, and `Current:` records produce errors rather than being skipped.
- Examples in fenced code blocks and HTML comments are ignored.
- Links must resolve inside the project, including symbolic link targets.
- Every linked phase file is checked for readability; task and review comment contents are checked only in the current phase.
- Duplicate `## Review` or `## Completion` sections are errors; keep their history under a single heading. Review comment IDs are recognized across Review records, including duplicate sections.
- Other equivalent Markdown layouts need manual inspection rather than automatic migration.
