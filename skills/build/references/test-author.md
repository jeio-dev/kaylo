# High-risk test-author stage

Read before implementing high-risk work, including resumed tasks whose required
authoring stage is not established. This is a bounded pre-build stage using a
fresh invocation of the existing **builder**, constrained to tests, fixtures and
explicitly agreed test-support paths. It adds no registered role and never uses
the read-only reviewer to write tests. Legacy adoption requires no retrospective
stage for completed work; an interrupted task retains actually completed stages.

Apply [testing evidence](../../plan/references/testing.md) and
[build delegation](delegation.md). Independence means fresh context and
acceptance-derived expectations; source/interface inspection needed for executable
tests is allowed. Do not supply implementation-author advocacy. A direct fallback
is never called independent. A later focused high-risk implementation review,
blocking-finding rechecks and phase integration review remain required.

## Establish the route before dispatch

Read actual preferences and [worker guidance](../../../WORKERS.md). Select the
builder estimate/preference row, raising capability for consequence/uncertainty
with the reason recorded. The high-risk **reviewer** Strong row does not
automatically select the test author. Establish tier/capability, fresh context,
observed vendor identity and billing independently; tool/account names do not
prove vendor, quota, availability or completion.

`Review vendor: different` also applies to this stage: the author's known model
vendor must differ from every intended implementation builder vendor, established
before dispatch. Reassess when actual builders change or use mixed vendors.
Missing/`same` adds no vendor constraint; fresh context still applies. Unknown
preference values use the existing disclosed default. Later different-vendor
review must differ from **every** covered builder, including the test author;
two-vendor author/implementation work may require a third vendor or an explicit
exception. Never exclude test changes from review merely to satisfy routing.

If tier, freshness, vendor or an authorized route cannot be established, disclose
the exact unmet constraints and obtain the user's choice: qualifying available
route, manual handoff with evidence pending, explicit exception naming the unmet
constraint(s), or pause. State required tier and proposed observed model in the
choice. A vendor waiver does not waive freshness, tier, later review or acceptance.
Record choice/authority in existing Result prose with the existing fallback
values; for multiple exceptions record `tier-exception` when applicable and name
all exceptions in prose. A pause records no dispatch. Prepared packets do not
complete a stage. Reuse prior scoped authority; never connect accounts, change
global settings or silently choose paid routes. Unknown billing is not presumed
subscription-covered; metered routes need actual route/account authorization.

## Packet, ownership and handoff

Supply the existing builder brief and a packet containing:

- Task/phase, criteria and relevant decisions/interfaces with Design/Agreement
  provenance available in the actual workspace or identified supplied snapshots.
- Risk rationale, required negative cases, existing harness and exact commands
  with expected observations; baseline and prior failure/repair history.
- Explicit allowed test/fixture/test-support paths, excluded implementation paths,
  resource ownership, safe targets, setup/cleanup and side-effect boundaries.
- Detection deliverable: named intended baseline failures, applicability exception
  or agreed controlled negative case; report expected versus observed cause and
  unresolved checks. Authoring does not independently accept the implementation.

Missing harness/interface prerequisites are explicitly planned before dispatch;
the author must not invent product interfaces, tooling or scope. No simultaneous
writes to shared tests or mutable resources. Record actual dispatches using
phase-unique IDs with `role=builder` and test-only purpose in prose. Expected red
is outside event grammar and consumes no initial implementation verify or repairs;
actual defective tests and their corrections retain ordinary failure accounting.
Keep pre-implementation defects/corrective counts in Result prose under the
testing contract; unresolved authoring failures block handoff. Do not emit a
premature implementation verify or a repair before verify just to encode that
history. An explicitly separate detection-deliverable task can use its own
ordinary verify/repair sequence.

After the author finishes, the guiding assistant inspects actual changes against
the baseline, allowed paths, criteria and intended failure/applicability evidence.
Resolve disagreements against acceptance; never silently rewrite expectations to
fit implementation. Hand the **same** artifacts and actual workspace prerequisites
to the implementation builder, with explicit ownership and retained failure
history. Append its distinct builder dispatch; tie the one initial implementation
`verify` to that builder. Retain earlier author records on resume. Later reviewers
receive both builders' actual identities and test/implementation changes. Worker
completion is an observation, not task acceptance.
