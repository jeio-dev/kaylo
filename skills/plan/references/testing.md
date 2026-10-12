# Testing strategy and acceptance evidence

Plan, direct/resumed build, both review targets, close, and worker packets share
this contract. Read it for the current changed behavior; reuse established
project decisions and unchanged evidence rather than inventing another harness.
It is guidance plus a bounded manual checklist, not a test runner, syntax
parser, hook, access policy, or CI enforcement mechanism.

## Strategy in the current phase

Inspect existing decision documents, runners, harnesses and controls. Record a
proportional strategy in current-phase `## Design` and decision authority in
`## Agreement`. Assess relevant static, unit, component, integration and
end-to-end layers as:

- **used**: name observed checks and their coverage;
- **missing**: needed check/harness does not exist; identify its creation task;
- **not applicable**: give the changed-behavior reason;
- **unavailable**: needed check exists or is required but cannot run; give the
  specific limit and next action.

Record runners, exact existing commands and directories, mock boundaries and
limitations, resources, and applicable critical smoke flows. An integration-heavy
web app is an example, not a requirement for a library, CLI or documentation
project. No database/browser flow is needed when it does not apply. Do not add a
framework solely for a small change. Proposed commands/harness work stay labelled
as needing creation until delivered. A required missing or unavailable check
remains a blocker; removing/deferring it requires an explicit scope decision.

Reuse [project decisions](decisions.md): settled phase-local decisions govern
current work before close promotes consequential final choices under area
`testing`, with source-to-ADR mappings. Final ADRs are never prerequisites for
the same phase's tasks or closure. Ordinary reversible runner choices may stay
concise labelled local defaults. Consequential tooling, services, cost, behavior
and acceptance choices follow existing user agreement rules. Strategy approval
does not authorize external actions. Supply the relevant decisions in actual
direct/resumed workspaces and worker packets; planner memory is insufficient.

## Map acceptance to observed behavior

Every criterion maps to at least one named automated test or manual check in
`Test plan:`, with working directory, exact existing command or manual action,
and expected observation. One check may cover several criteria and one criterion
may need several checks. Use criterion labels in prose when useful; no new task
field is required. Review inspects actual coverage, not names or green output.
Include user-facing observation when automation does not establish usability.

Use these defaults, explaining relevant deviations:

| Changed behavior | Default evidence |
| --- | --- |
| Pure logic, calculations, parsing, validation | Unit checks of required behavior. |
| Database semantics in an endpoint, query or service | Real isolated database integration checks of the claimed semantics. |
| UI behavior, forms, state, conditional rendering | Existing component/browser checks; justified manual checks when appropriate to agreed acceptance. |
| Pure presentation | Named visual observation plus applicable existing checks. |
| Critical user flow | Applicable end-to-end smoke coverage, reused and extended when the flow changes. |
| Bug fix | Reproduction at the lowest useful layer, then passing fixed-behavior verification. |
| Refactor | Behavior-preservation checks; characterization or fixture/import/test-plumbing maintenance when needed. |
| Config, infrastructure, documentation | Changed-contract checks, including consequential configuration and executable examples; existing gates suffice only when they cover acceptance. |
| High-risk behavior | Relevant negative cases derived from changed trust boundaries plus functional coverage. |

Risk follows changed behavior and consequences, not a filename or incidental
mention. Identity enumeration applies to identity flows, not every high-risk
task. Missing legacy Risk metadata does not certify low risk. Allow justified
internal unit isolation and fault injection; record each double's purpose and
what it does not establish. Mocked persistence is never real database integration
evidence. Require real integration evidence for the owned boundary claimed
correct without prohibiting internal doubles for rollback/error paths.

## Meaningful failure proof

For regressions and genuinely new behavior, establish that the named check
detects the specified missing/wrong behavior, then passes with implementation.
Prefer an observed pre-edit run. Inspect whether the intended check ran and why
it failed: nonzero exit, missing dependencies/credentials/services or an unrelated
import error is insufficient. Identify a deliberate missing-interface check for
a new API as such and still verify implemented behavior afterward.

Record criterion, check identity, baseline/candidate identity, directory/command,
expected versus actual failure, and subsequent pass as labelled prose or linked
evidence in the existing single `Result:` line. A bare `fails without change:
yes` is insufficient. Group cases only when output establishes each named case's
coverage; a failing suite alone proves neither that all tests ran nor that each
failed. Red/green proves sensitivity, not correctness of the expectation; the
requirement and review remain the oracle.

Characterization and preserved-behavior checks may pass before edits: record
**not applicable** with rationale for failure proof, or a named agreed controlled
negative case. Distinguish this from **unavailable** proof. Required unavailable
proof stays open until supplied or explicitly revised by the user.

For retrospective proof, the guiding assistant uses an isolated disposable
snapshot with the intended prerequisite changes and new tests but excluding the
relevant implementation, or an agreed controlled negative case. An old commit
alone may omit uncommitted prerequisites. Record included/excluded changes and
snapshot identity. Never reset, stash, clean or revert the user's working tree
to manufacture red. Preserve staged, unstaged and untracked content and worker
ownership. Worker briefs prohibit modified project copies outside the project:
the guiding assistant prepares snapshots in an authorized location and assigns
that workspace explicitly; workers do not evade their write limits. Code
reversal does not reverse database state; isolate resources separately below.

## Existing records and repairs

Expected baseline/negative-control failure is labelled prose outside the
`{kaylo:v1 ...}` grammar, not the initial implementation `verify`, a repair, or
an escalation trigger. The first check of the initial implementation keeps its
one `verify`, tied to its implementing builder, not the earlier test author.
Actual implementation defects and corrective repairs keep same-failure
accounting; defective tests are not excused as intentional red.

Before the initial implementation verify, retain actual authoring defects and
their corrective attempts/counts in labelled Result prose, not premature verify
or repair events (the existing grammar requires verify before repair). Apply the
same-failure repair limit and resolve the authoring blocker before implementation
handoff. The report measures initial implementation outcomes; prose authoring
history is not a report of test-author quality. If authoring needs its own
structured verification/repair sequence, plan the explicit detection-deliverable
task below rather than silently changing event semantics.

Record actual test-only and implementation dispatches with distinct phase-unique
IDs and `role=builder`, describing purpose/coverage in prose. Keep initial
verification attribution and first-try statistics intact. Reviewer records stay
under `## Review` with coverage. Workers report observations; only the guiding
assistant accepts tasks. Completion/pending handoff is not acceptance. Resume
keeps baselines, failures, superseded evidence, dispatches, repairs and history;
add no second initial verify or fresh repair allowance. No new role, event,
mandatory field or report schema is introduced.

A separately planned test-author task must define successful detection as its
deliverable if expected test-process failure satisfies its acceptance; real
corrective failures still use normal repairs. The default is a bounded pre-build
stage within the implementation task, never its independent check-off. Use
[test-author delegation](../../build/references/test-author.md) for high-risk
work before implementation; keep the later focused high-risk review.

## Test integrity and maintenance

Never weaken, skip or delete tests merely to obtain green. Permit maintenance
within agreed scope (obsolete assertions, duplicates, moved fixtures/imports,
snapshots) when governing criteria, old expectation/diff, rationale, and retained
or replacement coverage are available for review. An already-agreed behavior
change needs no new approval solely because its stale test changes. Ambiguous
acceptance or material scope reduction returns for the user's decision.

Use existing runner-native focus rejection and project linting where available,
through [project gates](gates.md) when adopted. Specify the configured check's
supported active syntax, diagnostics and exit behavior. Recognized executable
focus fails that check; matching comments, literals and detector fixtures are
not automatically executable focus. No universal cross-language scan is shipped.
If a concrete helper is needed, plan its bounded syntax/exit contract and fixtures
before use. Unknown syntax or unavailable tools require disclosure and documented
manual inspection when that establishes the result, never silent success or
automatic parser/framework installation.

Perform this bounded diff review, recording coverage/rationale under existing
Result/Review prose:

1. Identify task starting state for attributable task changes, phase baseline
   for phase review, or intended candidate/base for CI. Include relevant staged,
   unstaged and untracked content. Preserve unrelated edits; disclose missing
   baselines and attribution limits, retaining relevant original content.
2. Inspect active focus and new skips/conditional exclusions, moved/deleted
   suites, and assertions, snapshots, helpers, fixtures, discovery and runner/CI
   configuration. Check whether intended tests still run and assert acceptance.
3. Explain flagged changes and retained/replacement coverage against governing
   criteria. A flag is not proof of tampering; no flags is not proof of integrity.
4. State which controls are instructions, observed local checks, manual review
   or actual required CI enforcement. Structural plan validation and the startup
   reminder establish none of test integrity or product behavior. Install no hook
   or host policy automatically.

For quarantine, name the test, observed flakiness, lost coverage, replacement
check if any, and next action. Skipped required coverage remains missing evidence
until replacement verification or explicit scope revision. Keep a traceable
local follow-up; link an existing issue when useful, or publish only with actual
issue-action authority and access. Git/PR autonomy, strategy or worker completion
does not authorize a quarantine issue. Workers report the need; the guiding
assistant owns external actions. Offline projects need no remote issue unless a
separate agreed project requirement demands one; then it stays pending.

## Test resources and side effects

Where database/external-flow checks apply, record the actual isolated target,
relevant production-semantics compatibility, fake fixtures, creation/reset/cleanup
commands, ownership and side-effect boundaries without secrets. A test-like name
or `.env.test` is not isolation. Verify the actual target before destructive
reset; unknown/shared/production targets do not proceed automatically. Record
interrupted cleanup. Serialize shared databases, ports and caches under existing
wave ownership, or establish independent resources. A substitute engine proves
only exercised semantics.

Provider test modes or doubles can establish an agreed external contract; state
untested behavior. Real payments/email, production data changes, paid provisioning
and other reserved actions need authorization for the actual action/target.
Reuse already-agreed ordinary local setup authority without repeated questions.
Missing containers, browsers, services, permissions, credentials or network leave
required checks open with a specific next action, never an automatic paid fallback
or claimed E2E pass. Consume the project's actual environment/secret contract
when available; no environment feature or deployment prohibition is implied here.
Respect existing safe-file exceptions; records contain locations and fake values.

## Scoped/full checks and adoption

Task checks cover changed behavior and integration. E2E need not run every task
but is required when it supplies necessary changed-flow evidence or stricter
repository policy demands it. Before phase implementation review run the declared
relevant full phase/project suite, including applicable E2E, whether or not an
optional `.kaylo/gates` reference exists. Applicable CI uses the adopted full-check
entry point, recording material environment/coverage differences. A scoped pass
is not a full-suite pass; plan review and diagnosis can precede harness creation.
The guiding assistant runs shared mutable checks after a wave.

Reuse evidence only with established unchanged implementation, dependencies,
configuration, runtime, data and criteria; refresh affected evidence after changes.
Failed/unavailable required checks or observations keep affected work open.
Manual structure checks and limitations cannot substitute for product verification.

Absence of optional strategy, gates, ADR or Risk records preserves existing
checks/plans. No migration, new marker, Risk backfill, retrospective proof or
closed-history rewrite is required for adoption. Implementation already started
before adoption keeps its prior agreed evidence requirements; the new test-author
stage applies to newly started high-risk work, as defined in
[test-author adoption](../../build/references/test-author.md#adoption-and-resume).
A missing stage already required before interruption stays unresolved. Record
actual adoption timing/coverage without claiming retrospective independence.
Diagnose relevant present-but-broken resources. If this reference is unavailable,
preserve existing checks and agreement; disclose unavailable testing guidance and resume with the full package
or its complete contract before adopting new strategy/authoring requirements.
Never guess the missing contract or claim enforcement/acceptance from structure.
