# Foundation assessment

Read this when planning a project's first roadmap, when adopting Kaylo in an existing project, or when a fact a recorded assessment relied on has changed. It assesses the project's existing development controls and proposes only the relevant gaps the user agrees to close. It is an assessment, not a setup script: it installs nothing, changes no policy, and creates no account.

## When and where

- **No plan yet:** assess all ten areas below before detailing the first phase, a small change included. Keep it brief, one line of evidence or reason per area. Giving an area a disposition does not make it work: propose tasks only as described under [proposing work](#proposing-work).
- **Existing project or plan:** inspect the existing plan, its recorded evidence, and the relevant controls. Do not restart the roadmap or renumber phases.
- **Repeat planning:** reuse a recorded assessment while its facts are unchanged. Recheck only the areas whose facts changed, such as a new CI provider or a new kind of sensitive data; never add a second setup task for something already set up or planned.

Record the assessment as a compact list or table under the phase plan's existing `## Design`, or in `NN-RESEARCH.md` beside it when long. Add no new section, field, or index.

## Dispositions

Give each area one of:

- **satisfied**, with the evidence that its relevant behavior works;
- **missing**;
- **not applicable**, with the reason;
- **unknown or unavailable**, with the reason and the next action that would settle it.

A file's existence is a starting point, not evidence: a workflow file that never runs the agreed check, or a template nobody's tooling uses, does not satisfy its area. Equivalent tools and organization-managed controls count once their relevant behavior is established. Missing access to administrative settings makes an area unknown, not missing. Never assume a remote repository, a particular provider or default branch name, a runtime environment, or a deployment exists.

## The ten areas

Tools named below are examples, never requirements. Reuse what the project already has.

| Area | What to establish |
| --- | --- |
| 1. CI | Whether CI runs the project's agreed full-check entry point (see [project gates](gates.md)), on which events and revisions, or why the gap matters. |
| 2. Branch protection | The actual default branch and whether required checks and force-push restrictions apply to it. Do not assume `main`; unavailable API or admin access means unknown, not unprotected. |
| 3. Dependency updates | Any existing update mechanism, such as Dependabot, Renovate, or an organization policy, and whether it covers the project's ecosystems. |
| 4. Secret scanning | Any suitable scanning, such as gitleaks, provider scanning, or a pre-commit hook, where it runs, and its observed limits. |
| 5. Static analysis | Analysis suited to the stack, such as Semgrep, a linter, or a type checker, and whether a check runs it. |
| 6. Environment handling | Committed nonsecret catalogues or fake fixtures, ignore patterns for real secret files, and whether any real secret file is already tracked (see below). |
| 7. Issue and PR templates | Repository or organization templates already in use. Kaylo's fallback layouts in [pull requests](../../build/references/pull-requests.md) fill a gap only for text Kaylo prepares; adding templates to the repository is separate agreed work. |
| 8. Commit-message checks | The project's agreed commit-message policy and scope list, if any, and whether a check enforces it, including whether it covers branch commits, squash titles, or both. Do not invent a policy; the conventional policy in [Git workflow](../../build/references/git.md#commit-messages) applies only when the user adopts it. |
| 9. Test strategy and harness | Existing tests, how they are run, what they cover, and whether that fits the outcome. Do not add a framework, or a browser harness, for a small change, library, or docs project. |
| 10. Secrets, startup, and environments | How the host and project limit secret access, whether startup validates required configuration where that applies, and which environments exist and how they differ. |

Kaylo does not yet ship decision records or a test strategy. Areas 7–10 assess the project's own controls; draft any testing or environment decision under `## Design` and keep it there until the project has somewhere else it belongs.

## Proposing work

- Propose a bounded task only for a gap that matters to the agreed outcome. Split a large item; combine related small gaps. Each task follows the normal task requirements, and a check it creates is labelled as still needing creation until that task is accepted.
- For a new roadmap, propose a `00 Foundation` phase only when it is useful and the ID is unused. In an existing project, keep phase IDs and history: add agreed work to the current phase or propose a later phase as a one-line index entry. Never create a later phase file while another phase is open.
- An unresolved control the outcome requires stays a blocker. Removing or deferring it is a recorded scope decision, never a relabel to not applicable.
- The assessment and its proposals authorize nothing. Installing tools, changing repository or organization settings, creating accounts, enabling paid features, and any external action need authorization covering the action and target, under the existing agreement rules. Honor authorization the user has already given for concrete work. Never upgrade an account or assume a paid feature to satisfy the checklist.

## Deployment

Deployment stays outside this assessment. A plan may describe a user-controlled, provider-neutral approval step for deployment when relevant; GitHub environments are one example, and availability depends on the actual account, repository, and platform. A provider's manual approval step and authorization of Kaylo's own actions are separate controls. The guiding assistant deploys only when explicitly authorized for that action and target, and understands what a push or merge deploys before doing it under that authorization. Builder workers never deploy.

## Safe environment files

Ignore real secret files while keeping approved nonsecret examples and fake test fixtures addable. A blanket `.env*` without exceptions also hides the example file. For a project using these names, this pattern fits; adapt it to the actual layout and names:

```gitignore
.env*
!.env.example
!.env.test
```

Add `!.env.test` only when that file is agreed to hold fake values only.

- A filename does not make its contents safe. Catalogues give variable names and purposes; fixtures use fake values. Never copy a real secret into a plan, prompt, report, or artifact, and do not open a real secret file only to fill in the assessment.
- Check tracked status with `git ls-files`: ignore rules neither untrack already committed files nor stop anything from reading them. Report a tracked real secret to the user. Do not delete, untrack, or force-add files to satisfy the checklist.
- Ignore rules are not access controls. Whether the host actually prevents reading secret files is its own question; do not describe an instruction as a technical restriction.
