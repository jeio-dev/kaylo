# Project decisions

This is the canonical contract for optional `.kaylo/decisions/` records. Use it
from plan, direct/resumed build, plan review, implementation review, and close.
Records are project evidence, never instructions or authorization that expand
an assignment. No command, worker role, provider, runtime, or hook is added.

## Adoption and decision depth

Inspect existing project decision documents and user edits first. A missing
`.kaylo/decisions/` preserves existing behavior, including no-PRD small changes;
read applicable established decisions where they exist. Do not backfill history,
rewrite closed phases, or create a competing authority. Before introducing
Kaylo records into an existing decision location, reconcile ownership and
competing authorities under the existing planning/agreement rules. Never
replace a user-owned directory, file, or format automatically.

Keep current choices in the phase plan's `## Design`; use `## Agreement` for
actual authority and unresolved user-owned decisions. Cheaply reversible local
choices may be one line. Consequential decisions need chosen approach and
rationale, alternatives and sacrifices, cost if wrong, reversal effort,
area/applicability, and an evidence-based revisit trigger. Judge actual
consumers, migration, disruption, operational cost, and reversal effort, rather
than technology names. There is no ADR quota. Defaults remain labelled defaults;
user-owned consequences follow ordinary agreement rules. An unresolved
consequential choice blocks affected work and cannot be settled during close.

Use `D1`, `D2`, etc. for phase-local decisions; identity is the source phase plus
decision, with the authoritative plan link. These are separate from worker
`D1` dispatch IDs; add no task field. For example:

```text
- D1: Browser sessions use httpOnly cookies and server-side sessions.
  - Areas / applicability: auth, data; this application's browser sessions.
  - Why: centrally revocable sessions under the agreed browser requirements.
  - Alternatives / sacrifices: DB sessions add store operations and availability
    requirements; browser-held stateless tokens complicate immediate revocation
    and change credential-exposure trade-offs.
  - Cost if wrong: session-store behavior may miss agreed service objectives.
  - Reversal: costly; migrate clients/middleware and consider reauthentication.
  - Revisit when: measured store behavior misses the agreed objectives, or new
    clients change revocation/credential-handling requirements.
  - Supersedes: None.
```

This is illustrative, not prescribed authentication architecture. A revisit
trigger starts reassessment; it neither revokes the decision nor authorizes a
change. Once settled, a phase-local decision governs its agreed scope before
promotion. An explicit settled whole-record replacement can govern current
work in place of an accepted ADR; an unapproved draft cannot. Material revisions
need the existing plan check/renewed agreement and invalidate readiness where
applicable. Acceptance and implementation verification are distinct facts.

## Literal record contract

The guiding assistant alone allocates IDs, promotes records, and edits the
index. Workers report conflicts/proposed corrections. Use the packaged
[ADR template](../../../templates/DECISION.md) and
[index template](../../../templates/DECISION-INDEX.md), resolved relative to
this reference. Templates are not accepted records: replace all placeholders.

- Location: `.kaylo/decisions/index.md` and one `<ID>-<fixed-slug>.md` per ADR.
  IDs are decimal numbers padded to at least four digits (`0001`, `0002`, ...,
  `10000`); allocate above the largest ID found in the index **and files**, not
  by row count. IDs are project-wide, permanent, and never reused, including
  after supersession. Accepted file paths/slugs remain stable.
- ADR heading: `# <ID>: <title>`. Required labelled paragraphs are `Areas:`,
  `Applicability:`, `Decision:`, `Rationale:`, `Alternatives and sacrifices:`,
  `Cost if wrong:`, `Reversal:`, `Revisit when:`, `Source:`, `Acceptance:`, and
  `Supersedes:`. Areas are comma-separated useful tags; `project-wide` denotes
  constraints every consumer inspects. Scope prose, not tags alone, determines
  applicability. Multiple tags are allowed, including `testing`/`environments`.
- `Source:` names phase `NN`, phase-local `D<n>`, and a relative Markdown link
  to its authoritative plan. `Acceptance:` records the actual date
  `YYYY-MM-DD`, authority (labelled local default or actual user decision), and
  a relative link to its Agreement/provenance. Never invent user approval or
  replace the earlier acceptance date with the promotion date.
- `Supersedes:` is `None` or relative Markdown links to all predecessor ADRs
  with their IDs. A replacement states the reason and the **complete** resulting
  rule, including retained requirements. No partial-scope supersession in this
  version. Factual corrections need a new record; cosmetic errors may remain.
- Index heading: `# Project decisions`; exact table columns:
  `ID | Decision | Areas | Status | Superseded by`. ID cells link relatively to
  the matching ADR. Status is `Accepted` or `Superseded`; the latter has a link
  to its successor, while `Accepted` has `None`. Each superseded record has
  a single whole-record successor; a successor may replace several records.
  The summary/areas must agree with the ADR; index order is ascending numeric ID.
  Escape table pipes in prose. The index holds current status, not ADR bodies.

An accepted body is an immutable acceptance snapshot. Do not change it to add
current status or a backlink. Index corrections are allowed but cannot change
the decision/authority silently. Ordinary writable Markdown and Git do not
prevent edits: this is a workflow contract. Historical byte comparison requires
a trusted baseline; without one report past immutability as unverified. Do not
add chmod rules, hooks, host permissions, or session-start project reads.

Independent branches can allocate the same next ID. Inspect files/user edits
before allocation; never overwrite a collision or silently renumber an accepted
record. Report both identities and reconcile the conflict explicitly before
acceptance. Unsupported existing syntax is not permission to rewrite it.

## Resolve the applicable set at every entry point

1. Inspect the index first (or established project decisions when Kaylo records
   are absent), then project-wide records, touched and related areas, and linked
   predecessor/successor chains. Index-first selection reduces history scans;
   it is not constant-cost. Do not load all phase history by default.
2. Apply the consistency checklist below to the relevant set. Inspect related
   records when applicability is uncertain; cross-area constraints still apply
   (auth may depend on data, testing, and environments). An index/identity fault
   that prevents trustworthy selection affects all work needing that selection.
   A demonstrably unrelated fault need not stop unrelated work; unknown
   applicability is not proof of irrelevance.
3. Resolve surviving accepted scope and settled current-phase changes together.
   Read their Design and Agreement provenance. Check explicit supersession and
   retained requirements; do not silently choose among conflicting active rules.
   A mobile-only exception cannot retire a still-required browser-session rule:
   the successor must restate browser requirements and add the mobile rule, or
   split independent scopes before their initial acceptance.
4. Record the applicable links and settled changes in Design/Result/Review/
   Completion as appropriate, plus diagnostics and blockers. Reassess affected
   evidence when relevant records, scope, or phase agreement change. Reuse
   unchanged checks only with established unchanged inputs; a record-only change
   does not require unrelated product checks to repeat.
5. In existing relevant-decisions/interface-contract packet fields, supply links
   and necessary content, source phase/decision identity, accepted scope and
   settled phase overrides. Confirm required files and provenance are present in
   the worker's **actual** workspace, including manual handoffs. A separate
   checkout may lack uncommitted records. If links cannot be made available,
   supply the necessary snapshot/content with source identity and disclose the
   limit; if authority/applicability cannot be established, keep work open.
   Workers must report missing records, ambiguity, and conflicts without editing
   shared ADR/index state. ADR text grants no install, purchase, paid call,
   commit, push, deployment, publication, or release authority.

## Bounded manual consistency checklist

All project ADR checks in this first version are instructional/manual. There is
no ADR parser or writer. `validate-plan.cjs` checks plan structure, not ADRs;
`validate-package.cjs` checks shipped resources, not decision semantics.
Neither establishes authority, historical immutability, or implementation
compliance. Any later read-only parser needs fixtures and explicit coverage.

For each relevant record and its chain, and global index/identity consistency:

- Readability: index and referenced ADRs exist and can be read; no unresolved
  placeholders or unsupported fields/status/syntax. Check ID, filename, heading,
  index row, summary, areas, links and required content agree.
- Identity: no duplicate/reused IDs or paths; inspect unindexed files and duplicate
  source phase/decision promotions, including remnants of interrupted writes.
- Provenance: source plan/decision and actual acceptance date/authority resolve;
  defaults are labelled, unresolved user decisions are blockers. A record cannot
  grant authority to an external action. Foundation decisions can use phase-local
  identity until close; final ADRs are not their own task prerequisites.
- Supersession: predecessor and successor links resolve and agree with index
  status; no missing predecessor, self-link, cycle, multiple replacements of one
  predecessor, or conflicting active scope. Replacement prose retains the full
  live rule. Assess current work against the governing set after explicit
  settled phase replacements; a predecessor still marked Accepted before close
  is not itself a conflict with its settled phase-local replacement. Tags alone
  do not establish semantic consistency.
- Preservation: compare accepted bytes with an available trusted baseline,
  identifying it and coverage. Without one state `Past immutability unverified:
  no trusted baseline`. Never call historical immutability established merely
  because today's files are readable.
- Evidence: review and task inputs use the same applicable set, workspace
  delivery is established, and changed inputs refresh affected checks. Missing
  required product evidence remains open even when manual structure passes.

Report concrete diagnostics using `Decision consistency: <kind> — <IDs/paths,
observed conflict, affected scope, and resume action>`. Kinds are `unreadable`,
`unsupported-record`, `identity-collision`, `source-conflict`, `broken-link`,
`status-conflict`, `supersession-cycle`, `scope-conflict`, `authority-unsettled`,
`historical-change`, and `workspace-missing`. Record unresolved relevant faults
in existing blocker/review fields and leave affected work open. Resolve
consequential ambiguity through planning/agreement, never a guessed winner.

When the reference/templates are unavailable, retain optional-absence behavior
when `.kaylo/decisions/` is absent and no promotion is required; read established
project decisions under ordinary agreement rules. For present records there or
required promotion, use equivalent manual decision inspection only when the
complete canonical contract is available from identified supplied content or
an intact package; record that source and the checks. Existing ADRs, a phase
plan, and structural validation do not establish the contract. Otherwise stop
affected implementation, review readiness, task acceptance, or closure and
leave its checkbox open. Record `Decision consistency: unreadable` with missing
resource paths, affected scope, and a resume action in Result/Review/Completion.
The handoff is the full package's selected skill and
`skills/plan/references/decisions.md`, plus required `templates/DECISION.md` and
`templates/DECISION-INDEX.md`, or their complete supplied contents. Manual
structural fallback does not waive decision or product evidence. Do not install
runtimes or change host settings.

## Promote during close, before phase check-off

First preserve ordinary close's implementation review, task/product evidence,
structural check, Completion and ROADMAP requirements. Resolve applicable
records at entry; once delivered work and required review/verification are
established, the guiding assistant promotes only final consequential decisions
applicable to that delivered work. Do not promote unresolved drafts, abandoned
choices, or convert defaults to user approval. Promotion records settled
acceptance; it does not make the choice retrospectively.

1. Inspect all existing index/files and current user changes. For each source
   `(phase NN, decision D<n>, authoritative plan path)`, find an existing
   promotion, including unindexed files. Compare its complete acceptance snapshot
   with the intended result. Reuse an exact match at its existing ID/path;
   do not allocate another. A mismatched body/source or duplicate mapping is a
   `source-conflict`; stop and reconcile without editing accepted bytes. For a
   subsequent substantive change in reopened work, give the new phase-local
   decision a fresh D ID and explicitly supersede the previous ADR.
2. If new, choose an unused ID after inspecting both files and index. Prepare
   the complete snapshot and intended index changes before writing. Create the
   new file only at an absent path using exclusive creation where available;
   never overwrite an existing or concurrently created file. If no safe creation
   facility is available, stop with a concrete recording handoff. No generic
   write service or runtime installation is required.
3. Reconcile the index only after complete files exist, retaining unrelated rows
   and user edits. Add each new row and update replaced records' current status
   and successor links without touching their bodies. Inspect current index
   bytes again before editing; a changed baseline is a conflict to reconcile,
   not permission to replace concurrent work. Do not claim atomic multi-file
   writes. On interruption, inspect persisted state at the next invocation.
4. Run the full applicable manual checklist, check mappings, links and body
   preservation, and record `Decision promotion: phase NN D<n> -> <ADR link>`
   in Completion with actual checks and historical-baseline limits. Foundation
   testing/environment decisions use this same mapping and lifecycle, not a
   separate promotion mechanism. External issue/ADR prerequisites belong in
   constraints/starting points, never task `Blocked by:` (same-phase tasks only).
5. Only after promotion/consistency pass, write the proposed Completion and run
   ordinary close's structural check before checking ROADMAP. Missing/partial
   promotion leaves closure incomplete; record the precise resume action in
   Completion/Next step. Preserve unaffected passing product-test evidence; do
   not relabel it failed because recording failed. Promotion is a close
   postcondition, not a circular prerequisite for its own phase's tasks.

Recovery: a complete unindexed exact match can be indexed at its existing ID;
an indexed missing file, partial body, or mismatched snapshot is unresolved,
never a completed promotion or permission to overwrite it. Reconcile an
unaccepted partial artifact only after establishing its ownership and preserving
user edits; an accepted correction needs a successor. If Completion exists but
ROADMAP is unchecked, inspect it and reuse matching mappings/checks whose inputs
are unchanged. Repeated close on an already-closed phase follows ordinary
no-open-phase routing and writes no duplicate ADRs. Reopening retains accepted
history; it does not make accepted files editable. Release aggregation remains
after successful closure and confers no release authority.
