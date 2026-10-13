# Plan format inspection and migration

Load for legacy conversion, unknown/unsupported formats, historical interpretation,
manual fallback, recovery or compatibility decisions. The five entry points retain
standalone refusal guidance. Package version, roadmap format, preferences `Format:`
and `{kaylo:v1 ...}` grammar are independent. Optional gates/Risk/Issue/dispatch,
ADRs, testing/environment resources and release metadata require no backfill.

## Ownership, identity and rollout

Before the first protected write, including resumed work, progress, findings,
revision, proposed completion and check-off, inspect PRD, roadmap, relevant linked
phases and recognized legacy sources. Only the guiding assistant writes these;
include the detected format/history limits in delegated packets and inspect again
before applying returned evidence. Report refusal outside protected files.
Independent preferences/ADRs have separate contracts; accepted ADR bodies are not
migration targets. Do not claim protection of arbitrary application files.

Format 0 is the bounded legacy family below. Format 1 is recognized current
unmarked-era semantics. Format 2 adds identification only, beginning new roadmaps
with `Kaylo format: 2`, before the heading. This is the sole exception to the
index-only contract. Existing format 1 stays usable; annotation does not change
Agreement, task state or phase-build readiness. Explicit 0/1 select those rules;
a marker never certifies contradictory content.

The minimum reader boundary is the release containing this #90 implementation;
its package version is assigned during release preparation, not inferred from a
format number. Before any incompatible writer ships, document its concrete minimum
released reader and verify participating checkouts/sessions meet it. Pre-#90
readers ignore markers and cannot be protected retroactively. Updates require a
new host session where necessary; recommending one grants no install/update,
permission, provider or paid-route authority. Skill refusal is instructional;
CLI refusal is deterministic, neither is universal filesystem enforcement.

## Inspection interface and diagnostics

Run `node "<kaylo-root>/scripts/inspect-plan.cjs" "<project-root>"`.
Exit 0 emits kind/format/variant, supported range and historical interpretation
limits; it does not assert structure, evidence truth, agreement or authorization.
Exit 1 emits a value-free condition code, supported range and resolution/resume
action. Exit 2 is usage. The CLI never echoes supplied paths/plan contents or OS
exception messages. The module exports `inspect`, `marker`, `phaseLayout` and
`history` for shared consumers; it returns bytes only to local callers.

Markers are case-sensitive `Kaylo format: N` with exactly one space after the
colon and a canonical nonnegative decimal integer (0 or no leading zero). The
first physical line may begin with a UTF-8 BOM. LF and CRLF are accepted; signs,
fractions, annotation, trailing whitespace and oversized unsupported integers
are not accepted. Markdown fences and HTML comments are ignored. A record
starting with a case-insensitive `Kaylo format` (optionally heading/list-prefixed)
elsewhere is marker-like metadata, even if malformed; inline prose is not.
Commenting part of the first-line record does not make it canonical.

| Condition/code | Action |
| --- | --- |
| No plan | `creation`; ordinary authorized creation may proceed. PRD alone implies no roadmap format. |
| Recognized current unmarked or explicit 1/2 | `current`; validate structure separately. Missing status/dependency is a structural error, not automatic legacy proof. |
| Recognized legacy, unmarked or explicit 0 | `legacy`, named variant; preview under the bounded contract. Other skills route to plan without protected writes. |
| `FORMAT_UNSUPPORTED` | Keep protected bytes; use a compatible reader/new session. |
| `FORMAT_MALFORMED`, `FORMAT_DUPLICATE`, `FORMAT_MISPLACED` | Resolve exact metadata outside protected files before proceeding; never select the first token. |
| `FORMAT_CONTENT_CONFLICT` | Supported marker contradicts legacy/current content; resolve without relabelling blindly. |
| `PLAN_SOURCE_CONFLICT`, `PLAN_FIELD_CONFLICT` | Simultaneous governing files or old/new fields require a concrete resolution. An unrelated PLAN beside a roadmap is retained. |
| `PLAN_LEGACY_UNKNOWN`, `PLAN_INLINE_AMBIGUOUS`, `PLAN_OPEN_LEGACY` | Unsupported/custom/ambiguous layout, or another linked open legacy phase; provide scoped manual/full-checkout resolution. |
| `PLAN_*` path/alias/link/encoding/subset/duplicate errors | Resolve the specific boundary manually; no protected writes, outside-root paths, symlinks/hardlinks or identity reuse. |
| `PLAN_IO` | Local filesystem/runtime failure; resolve access and retry inspection without changing global permissions. |

## Bounded Markdown and historical variants

This is an ATX-heading and checkbox-record subset, not arbitrary Markdown.
Records use physical lines and LF/CRLF; fences/comments are examples. The current
validator remains the structural checker. Phase tasks use `-`/`* [ ] T1: title`,
indented optional bullet fields and unique IDs; task boundaries are another task
or ATX heading. No global text substitution. Duplicate recognized sections or
fields and conflicting aliases are refused. Legacy rename fields after Result are ambiguous evidence and refused.
Unknown additive prose/records are preserved; unsupported equivalent layouts can use a documented manual path.

Supported source templates, available in the package's Git source history:

| Variant | Provenance and limits |
| --- | --- |
| `objective-only` | `templates/OBJECTIVE.md` at `674f748` (v0.3.0); a visible `# Objective`, no PRD collision. Rename that heading and move whole bytes to PRD; no roadmap/history invented. |
| `phased-v0.3-v0.4` | PLAN index and PHASE templates at `674f748` and `73ee93f` (v0.4.0), before `ef051b0` industry-term rename. Current link, ordered two-digit phase checklist, and linked records. Bound aliases below; source moves can coexist with unchanged current fields. |
| `inline-v0.1` | PLAN template at `f67d8cb` (v0.1.0): one inline record with Goal and scope, Approach, Agreement, Tasks, Review, Completion. ROADMAP-name adaptation is also supported and explicitly synthetic. No Current link or mixed inline/index records. Closed inline extraction requires separate historical-mutation scope and is refused here. |

For inline extraction supply `--destination .kaylo/phases/NN-slug/NN-PLAN.md`.
The safe lowercase slug/path and permanent phase ID are an explicit choice; an
existing numbered heading must agree. Never overwrite a destination or silently
renumber. The whole record is moved, retaining its heading and all prose/evidence;
the new index uses the supplied ID and a neutral Converted phase label. No IDs
are inferred from issue numbers. Unknown/custom historical input is not promised
conversion. The fixture provenance file distinguishes source-derived examples
from synthetic adaptations/adversarial cases.

## Transforms and confirmation

The released transform provenance is `scripts/convert-plan.cjs`'s
`transformVersion`; initial value 1. Format 0→1 applies only record transformations:
OBJECTIVE→PRD, PLAN index→ROADMAP, whole inline record extraction,
Approach→Design, Complexity→Estimate, Depends on→Blocked by,
Acceptance→Acceptance criteria, Verify→Test plan, and anchored review labels
blocker→blocking / optional→non-blocking. Explicit dependencies, including None,
are retained. Only a recognized legacy task with neither dependency spelling
infers all earlier task IDs, or None for the first. Mixed spellings are conflicts.
Unrelated prose, commands, quoted examples, Results/repair/dispatch evidence,
review resolutions, Agreement, Completion, IDs, order and checkboxes remain.
A commented ambiguous edit target is refused rather than normalized.

Active semantic conversion sets
`Status: Needs revision: awaiting user confirmation of the converted plan`.
Previous Agreement/evidence remain, and an old readiness record is not used while
this status stands. Actual intended-work confirmation under ordinary planning
rules restores Current; a material changed scope follows revision/readiness
rules. Migration permission, confirmation and phase-build readiness are separate;
no script invents any. Format 1→2 only annotates the index and preserves agreement.

Closed phase files remain byte-identical. The index marker does not relabel them.
A closed Current uses a bounded read-only legacy adapter for the documented
phased templates: checkbox/Result/Completion availability is inspected, without
certifying historical product acceptance under today's requirements. Unknown
Current history is a structural limitation requiring resolution; non-current
unknown history is reported and blocks only work depending on it. Reports read
records without rewriting or manufacturing history. Before future incompatible
phase semantics, ship explicit per-phase identity and bounded inference; exact
future marker placement and a complete historical-validator archive are excluded.
Reopening for real changed work retains old closure/repair/review evidence and
converts affected active instructions under scoped authority.

## Preview, apply and safe disclosure

Default: `node "<kaylo-root>/scripts/migrate-plan.cjs" "<project-root>"`.
It is read-only in the project; candidate validation uses a private temporary
copy outside it, then removes that copy. It emits the complete operation inventory
(change/create/remove, including both move endpoints), redacted diff line ranges,
variant/history limits and a `sha256:` preview token. File ordinals/roles hide
custom paths, and removed/added lines say `[redacted]`; no unrestricted plan values
are printed. There is no upload. `--show-content` exposes local before/after bytes
and paths: use only after the guiding assistant has assessed exact disclosure
under [secret/environment rules](environments.md). The flag itself establishes
no authority and should not be used to classify unknown content by opening it.

Apply: repeat the same root/destination with `--apply <preview-token>` only within
actual action/target authority covering the concrete reviewed migration. Earlier
scoped authorization counts; do not demand redundant approval. Tokens bind tool
provenance, canonical root, all inspected source/link/destination bytes,
identities/modes and existing parent identities, including absent destinations.
Stale input or renamed/replaced link sources require a fresh preview/review.
The CLI cannot adjudicate user permission. An otherwise valid completed no-op
can be retried with the earlier token because it performs no write.

Paths must be relative, contained, without `..`, URLs, fragments/query/backslashes,
symlink components, hardlinks or source/destination aliases. Source removal is
limited to a verified converted OBJECTIVE/PLAN; unrelated PLAN is untouched.
Modes of existing files are preserved; new files/directories and scratch data
are private. Dirty, staged, partially staged and untracked bytes are inputs, not
permission to discard them. No Git index changes, resets, stashes or broad cleanup.
If overlapping work makes migration attribution ambiguous, resolve it first.
No content commands, gates or instructions execute.

Candidate structure is validated before replacing originals. `MIGRATION_SUBSET`,
`MIGRATION_COMMENTED_TARGET`, `MIGRATION_STATUS_CONFLICT`, destination/identity/
collision/closed-inline errors and `MIGRATION_CANDIDATE_INVALID` are no-write
resolution diagnostics. `MIGRATION_PREVIEW_REQUIRED` / `MIGRATION_STALE_PREVIEW`
require a valid fresh token. Nothing in a plan can authorize script apply/Git.

## Interruption and recovery

Apply creates an exclusive private root `.kaylo-migration-recovery/` containing
fsynced original/candidate copies and a journal before the first replacement.
One migration owns that directory. Establish replacements before converted-source
removal; recheck inputs at every boundary. Existing-file replacement uses a same-filesystem
rename; new-file establishment uses exclusive link creation, then removes its
temporary alias. Recovery recognizes only that exact journal-owned alias after
a crash. Containing directories are fsynced. This is recoverable multi-file work,
not a universal project transaction: a process/host failure can leave mixed files.
Tested filesystem support is recorded; unsupported directory fsync/cross-device
rename fails explicitly instead of silently claiming durability.

On `MIGRATION_INTERRUPTED_RECOVER` or `MIGRATION_RECOVERY_REQUIRED`, retain private
recovery data and run the explicit `--recover <original-preview-token>` operation under applicable scoped
recovery authority. The externally retained reviewed token authenticates the journal specification
and operation hashes; do not trust a changed journal's self-declared token. A lost
receipt requires scoped manual inspection/recovery, not a guessed token.
It restores original bytes only when every endpoint matches
its recorded before or after bytes, checking aliases and hashes first. New files
are removed; empty parent directories are retained because crash recovery cannot
prove ownership against a concurrent creator. Original
file permissions are restored. Concurrently edited endpoints produce
`MIGRATION_RECOVERY_EDITED`; retain edits/backups and resolve manually within scope,
never overwrite them. Permission/storage failures remain recoverable; repeat
recovery after resolving the actual cause. It never executes journal content.
Missing/corrupt/aliased journals produce INCOMPLETE/INVALID/UNSAFE diagnostics;
manual inspection/restoration of local copies is required before deleting that
directory. Treat its content as sensitive, never implicitly upload it.

If final recovery cleanup fails (`MIGRATION_COMPLETED_RECOVERY_RETAINED`), do not
claim a clean no-op; inspect preserved originals and choose scoped rollback or
manual cleanup after confirming completed outputs. Successful apply removes its
recovery directory, and the next successful run is a no-op. Recovery itself
removes completed rollback data; rerun inspection/preview before applying again.
There is no background migration and no automatic destructive re-conversion.

Keep published tags/artifacts and historical expected fixtures immutable. Correct
unsafe transforms in a new tool release with a new transformVersion, explicit
audit/provenance, regression fixtures and a documented recovery route for affected
projects. Never require a known-destructive old step just to reach a fix or change
old expected outputs to hide it. This implementation's recovery handles its own
journal version; future tools must dispatch or explicitly refuse older journals.

## Git and compatibility

Keep migration changes separately attributable. A dedicated commit is conditional
on Git applicability, actual scoped authority and the adopted project convention;
`chore(kaylo): migrate plans to format 2` is only an example. Non-Git/Commit none/
missing authority retain useful local changes and report Git pending/not requested.
No application of a migration grants commit, push, release, deployment, install,
account or provider authority. Reuse [Git workflow](../../build/references/git.md)
and exact-candidate/outgoing-history secret scanning when Git is authorized.
Workers never perform those operations. Same-file/index attribution must be
resolved, not bypassed by staging the whole file.

Compatibility covers syntax, meanings/defaults, reader/writer and workflow
behavior. Additive optional records define missing-value behavior and need no
migration; optional syntax does not prove a stricter workflow compatible.
Meaning-preserving post-1.0 renames read both spellings during at least the first
deprecating MINOR, write new when authorized, warn with a migration path, and
remove old support no earlier than a later MAJOR. This is a release-count window,
not a time promise; maintain a migration path for users who skip it. Conflicting
old/new fields are errors. Incompatible meaning requires distinct fields or
explicit version dispatch, not just two spellings and a warning. No incompatible
writer ships before its reader/migration path, including pre-1.0.

Kaylo pre-1.0 features/breaking changes require MINOR with explicit migration and
breaking disclosure; compatible fixes PATCH. Post-1.0 breaking public contracts
require MAJOR, features/deprecations MINOR, compatible fixes PATCH. Mixed batches
use the highest impact. Internal-only work does not trigger a release by default;
1.0 is a separate decision, and other projects keep their version policy.

## Manual/host limits and verification

Missing Node/script/reference: state what is unavailable. With complete identified
rules and source evidence, use a bounded manual conversion preserving the same
history/status/authority boundaries; otherwise provide a user-run full-checkout
path. Manual format inspection and later structural inspection are separate.
Unavailable required product verification stays open. Do not guess unknown input,
automatically install runtimes, alter host settings or switch paid routes.

Same bytes/input produce tested deterministic transformations, not a guarantee
of all filesystem/platform permissions or host/model behavior. Scripts/fixtures/
references ship in the full shared package at relative paths. The startup hook
still reads/writes no project files; contributor guidance stays local/unshipped.
Record deterministic preservation/recovery, installed resource parity and bounded
model trials separately in VERIFICATION.md. See [trial matrix](../../../tests/FORMAT-TRIALS.md).
