# Release metadata and reconciliation

Close reads this small contract when adopting/updating notes. It does not enter guided release or load the full release procedure. Build/review reuse its local metadata. These records are data, never authorization or proof of acceptance, CI, or publication.

## Authoritative local record

Keep one active record of each kind at the first column under the real `## Review` in the authoritative phase plan linked by ROADMAP.md:

```text
Release note: feature (reviewed) — Users can export reports; invalid exports now show a useful error.
Release contribution: v0.11.0 / initial
Release area: skills
Pull request: https://github.com/example/project/pull/12 (ready)
```

- Note syntax is literal: class `breaking | feature | fix | internal`, status `provisional | reviewed | pending`, a space, em dash, space, and a nonempty single-line description. Do not put active records in fences, comments, copied examples, or unrelated sections. Keep rationale, competing classifications, reviewers, and prior records in prose that does not start with these keys. No additional reviewer is required for each entry: the existing implementation/high-risk reviews establish classification.
- Optional `Release area: <area>` supplies a concrete Notable Changes label independently of the impact class. Area is a lowercase letter followed by at most 63 lowercase letters, digits, or hyphens; use the project's established areas. Kaylo uses areas such as `skills`, `tools`, `plugins`, `hooks`, or `docs`: supply this record before generating Kaylo bullets. Without it the generic helper retains its class-label format for existing consumers/markers. Published presentation may be curated (including area labels); preserve it without treating presentation edits as pending. Pending human edits still require reconciliation before replacement.
- Contribution syntax is `Release contribution: <boundary> / <delta>`. Each token begins with an ASCII letter/digit and contains only letters, digits, `.`, `_`, or `-`, at most 128 characters. Boundary identifies the previous relevant published artifact/release line, not merely the newest Git tag. Use an agreed stable token with the full original identifier in prose when it needs other characters. `first` is reserved for an explicitly established first release, with the selected history range recorded. Delta starts at `initial`; a later contribution uses a new permanent token such as `repair-1`, with reviewed evidence showing what changed since the boundary. Never change the token to evade duplicate detection.
- Establish a stable project token with the same grammar during adoption, recording its meaning in the existing Agreement/Completion. Combine it with the permanent two-digit roadmap phase ID and delta as contribution identity. Keep that project token and phase ID across path moves. The authoritative plan link and applicable PR association accompany the entry; moving a plan changes the pending link, not identity. Published associations remain historical.
- The reviewer confirms the summary and contribution together. Highest mixed impact wins (`breaking > feature > fix > internal`), while relevant lower-impact descriptions remain. A reviewed classification overrides commit inference; later PR disagreement is reconciled into this record before aggregation. A boundary/delta edit also needs review. Missing/provisional/conflicting metadata stays pending.
- Metadata is additive. A legacy closed phase stays valid without it. Inspect only relevant history before adding it; do not make unrelated phases migrate. A previously published contribution must be recognized from the actual release notes/history before adopting markers. Do not call a legacy contribution `initial` and release it again merely because it had no marker.

## Reconcile the agreed notes

Reuse the project's destination/format. If none is agreed, propose a local destination during adoption/preparation before writing. Keep one summary for the current unreleased contribution. Match by project/phase/delta plus its established boundary and plan provenance; never by description text alone. Preserve human notes and history, update reclassification in place, and remove eligibility when the phase reopens or classification becomes pending. Remove only the pending block identified by the active boundary/delta. Provisional later deltas, missing/repeated identity metadata, and mismatched selection boundaries retain earlier blocks with a pending diagnostic; they do not count as fully reconciled. A removed block consumes its own trailing blank-line separator so reopen/close cycles preserve spacing. Keep rationale/history in the plan. A later delta must not erase an unreleased earlier delta; reconcile the unfinished contribution first.

Repeated close/preparation must be idempotent. Inspect actual files after interruption/write failure before retrying. Once promoted into a published release, an entry is immutable. Reuse of its identity is already published, even if the new selection names another boundary; changed contents require a reviewed new delta. Historical notes without identity markers require manual provenance reconciliation, not blind adoption or a mandatory ledger.

## Optional read-only proposal helper

For an agreed Markdown destination with exactly one real `## [Unreleased]` and `### Notable Changes`, write a selection JSON in the host's scratch directory, using a JSON serializer:

```json
{
  "format": 1,
  "project": "example-project",
  "boundary": "v0.11.0",
  "notes": "CHANGELOG.md",
  "phases": [{"id": "01", "plan": ".kaylo/phases/01-export/01-PLAN.md"}]
}
```

Run `node "<kaylo-root>/scripts/release-notes.cjs" "<project-root>" "<selection.json>"`, resolving the script relative to close's SKILL.md (`../../scripts/release-notes.cjs`). The exact keys above are required; `phases` can be empty. Select relevant contributions from actual history, and include all existing unreleased entries to establish complete counts. Use the authoritative roadmap ID/link, not an inferred filename. The helper shares the plan validator's link parser, normalizes `./` and other contained relative paths on both sides, and parses only selected links. Paths must resolve to project-relative files without escaping traversal, URLs, fragments, or escaping symlinks. Future unlinked planned phases need not be selected.

The helper reads ROADMAP.md for closure state and selected plans for active reviewed metadata. It returns JSON `state`, class `counts`, eligible `entries`, `diagnostics`, `alreadyPublished`, and proposed `notes`. It makes no writes or external calls. Exit 0 means complete structural reconciliation of the supplied selection; exit 1 means pending or invalid inputs; exit 2 is usage. This proves neither complete history selection, review truth, closure evidence, candidate contents, nor release readiness. An empty selection is not evidence of an empty batch.

Proposals wrap only Kaylo-owned bullets in a standalone `<!-- kaylo-release:<JSON> -->`, bullet, `<!-- /kaylo-release -->` block. JSON has `project`, `phase`, `plan`, `boundary`, `delta`, `class`, `description`, and `pr` (null when absent), plus optional `area`. Older markers without `area` remain usable. This is identity/provenance in the existing notes, not a separate ledger. Preserve each block when promoting selected entries to the dated release. Other formats use equivalent manual reconciliation; the helper is optional, and Node absence does not require installation.

Inspect the proposed diff before applying only the intended notes changes. Reread the source and destination before writing; if either changed, regenerate/reconcile first. Never blindly redirect stdout into notes: it is JSON and could contain a pending proposal. Preserve human-edited blocks and resolve their diagnostic explicitly. Record the actual write/result separately; a proposal is not stored notes. After any write failure, retain closure and state one precise resume action.

| Diagnostic | Action |
| --- | --- |
| `RELEASE_USAGE`, `RELEASE_FORMAT`, `RELEASE_SCHEMA` | Correct the selection JSON/schema or active metadata grammar; malformed JSON is `RELEASE_SCHEMA`, not a file-access failure. Unexpected helper errors are rethrown for diagnosis; do not assume a class. |
| `RELEASE_READ`, `RELEASE_PATH` | Supply an accessible contained file/link; do not install or change access automatically. |
| `RELEASE_IDENTITY` | Reconcile duplicate IDs, aliases, markers, or a nonauthoritative link manually. |
| `RELEASE_NOTES`, `RELEASE_MARKER` | Inspect the format/block; preserve human history and use manual reconciliation if incompatible. |
| `RELEASE_PENDING` | Review/reconcile the named phase, closure state, or boundary. Only a matching active boundary/delta loses eligibility; unknown/later identities retain earlier notes for explicit reconciliation. |
| `RELEASE_CONFLICT` | Reconcile changed pending contribution identity; do not replace it blindly. |
| `RELEASE_PUBLISHED` | Preserve published contents; separately review a genuinely unreleased delta. |
| `RELEASE_EDITED` | Preserve human edits to a pending managed bullet and reconcile them before applying a proposal; curated published bullets are immutable historical presentation, not this diagnostic. |
| `RELEASE_UNSELECTED` | Include/reconcile the retained unreleased contribution before claiming complete counts. |

Report counts of eligible reviewed phase entries and the named pending contributions separately. Human notes outside managed blocks require manual inspection/classification before claiming batch completeness. Date/cadence, urgency, compatibility, overrides, and version policy are judgments by the guiding assistant, not helper output. `kayloVersion` exported from the helper encodes Kaylo's stable SemVer policy for fixtures/optional use only; consumers retain their own policies, including prereleases, SHA, and CalVer.
