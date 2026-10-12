# High-risk test-author stage

Read before starting high-risk implementation or resuming work to which this
stage already applied. This is a bounded pre-build stage using a fresh invocation
of the existing **builder**, constrained to tests, fixtures and explicitly agreed
test-support paths. It adds no registered role and never uses the read-only
reviewer to write tests.

## Adoption and resume

Establish when the task's implementation started and when these requirements
became applicable from the recorded baseline, plan/agreement and available
history; no new adoption marker is required. Tasks whose implementation already
started before adoption keep their existing agreed evidence requirements and
later focused high-risk review. Do not impose a retrospective test-author stage
or new failure proof solely for the upgrade, reopen completed work, or claim an
independent pre-build stage occurred. Record the adoption boundary and actual
coverage/limits in existing Result prose. A newly started task or separately
agreed new scope follows the new stage before its implementation.

For work to which authoring was already required, resume retains actually
completed stages, pending handoffs, scoped exceptions and corrective history;
missing completion remains unresolved rather than being waived as adoption.
If the timing cannot be established, disclose that uncertainty and obtain the
user's scope decision instead of guessing an exemption or inventing a stage.

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

Native worker registration is not required: an actually available generic fresh
worker or a separate fresh conversation consuming the builder brief/packet may
qualify. A prepared manual packet remains pending until its evidence returns.
If no qualifying independent context/route is available, the new high-risk stage
intentionally requires a qualifying handoff, a specific user-authorized exception,
or pause; ordinary direct builds still use their existing path. Reuse an already
recorded route/exception within its actual task/phase/constraint scope when its
inputs remain valid, rather than asking again. Native registration absence alone
is not proof that all qualifying routes are unavailable.

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
