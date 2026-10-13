# Secrets and environments

Use this contract for relevant planning, direct/resumed builds, reviews, close,
and every guiding-assistant commit or publication. It changes read and Git
behavior even for legacy plans; optional catalogues/ADRs require no migration or
closed-history backfill. It supplies instructions and a bounded local scanner,
not universal host enforcement, a secret store, or deployment procedures.

## Disclosure boundary

Work from names, descriptions, code/schema and established nonsecret catalogues
or fake fixtures. Keep real values out of tool results, arguments/history,
diagnostics/logs, screenshots, transcripts, worker packets and generated
artifacts. Credentials can live outside environment files. Redacting a final
answer cannot undo an earlier tool-result disclosure. Scope reads/searches,
diff/log inspection and remote tools before executing them; never source an
unknown environment file to discover names. `.env.example`, `.env.test`, a
public prefix, or a provider's sandbox label does not establish fake contents.
Unknown contents remain unknown: establish safety from trusted project evidence,
known generated fake content or a user-controlled check, without opening them
just to classify them. A clean scanner result does not prove every value fake.

Scoped programmatic use/scan outside model context needs a route that keeps
values out of output and artifacts. Prefer isolated fake resources, non-echoing
status/shape checks or user-performed checks. A subprocess holding a value is a
residual exposure surface; this alone is not demonstrated isolation.

Only the guiding assistant may exercise the narrow raw-disclosure exception.
Before access, use existing or new explicit authority naming the credential,
purpose and intended disclosure; explain exposure to the selected model
route/transcript and the lack of a zero-disclosure guarantee. Record value-free
authority before access and the outcome afterward, in existing task `Result:`
or the response/appropriate phase section when no task exists. No invented task
or mandatory event is needed. Permission does not cover rereads or forwarding
to another worker/vendor, or bypassing a technical denial. Prefer non-echoing
checks even with authority. Any actual raw disclosure follows the incident rule
below; never repeat the value or claim unverified retention/deletion behavior.
Workers stop and report a need for raw access to the guiding assistant.

## Actual host and credential boundaries

Assess the actual host/version/OS and active policy, without reading credential
values. Record separately instruction-only restrictions, configured tool/file
denial and scope, demonstrated subprocess isolation and scope, and unsupported
or unverified routes with their next action. Include direct reads/search,
shell children, symlinks/alternate paths, workers, process environments, Git
history, CLI credential stores and remote tools as relevant. Use synthetic
sentinels in isolated profiles to test controls. Shared package bytes do not
establish equivalent Claude Code, Codex, Gemini CLI, Antigravity or OpenCode
protection. Check actual rule precedence/path semantics; a narrow allow may
not override a broad deny. File-tool denial is not process isolation and a
mode-600 file is still accessible to an agent running as its owner.

Apply [foundation safe-file/ignore rules](foundation.md#safe-environment-files)
to actual real-secret patterns and explicitly approved nonsecret/fake exceptions;
inspect tracked status without exposing content. Ignore rules neither deny reads
nor remove tracked content. Preserve user files; do not force-add secrets,
untrack/delete them or change ownership automatically. Project-owned controls
are bounded agreed work; preserve existing policy. Do not change global/managed
policy, hook trust or account settings, or weaken controls to pass a test. If
isolation is required, instruction-only fallback leaves acceptance open.

Separate production application runtime credentials from ordinary agent-accessible
development/test context. Prefer an appropriately isolated pipeline/platform/server
route and document actual access and residual exposure. Storage alone proves no
inaccessibility: CLI/MCP identities may retrieve values or alter a workload to
expose them; agents may run on servers/CI too. Define the trust boundary when CI
supplies production values while executing project code. Distinguish runtime,
host model authentication, source-control/publish/deploy, and real test credentials.
Do not require all credentials absent from the machine or a new secret service.

Deployment remains outside this feature. Explicit guiding-assistant action-and-target
authority can permit local deployment; builder workers never deploy. Neither a
storage decision nor Git preferences authorize deployment. Understand deployment
triggered by an authorized push/merge; no mandatory CI path or local-deploy ban.

## Configuration and test resources

Reuse existing schemas/docs/stack mechanisms to catalogue supported project
configuration, not every inherited host/shell variable. For each relevant name
record purpose, required/optional/default behavior, environments, sensitivity,
and build-time versus runtime/client-visible use. Prefer `.env.example` where
appropriate; empty placeholders or established fake values only, sourced from
code/schema, never real-secret files. A runtime-credential CLI/plugin may need a
catalogue; a no-runtime library need not acquire secrets or a server startup.

Validate missing required, malformed, optional/default and environment-specific
inputs at the actual startup, initialization or use boundary. Diagnostics name
variables/rules without values. Harmless builds need not acquire production
secrets. A startup failure is a deployment failure only if actual readiness or
deploy mechanics observe it. Prefer identical promoted artifacts when supported;
document justified build-time differences instead of redesigning the stack.
Check that private values do not reach client bundles, images, generated files
or logs; a public-looking prefix is no safety proof.

A real provider-test credential remains real. Classify `.env.test` by actual
use: approved committed fake fixtures or ignored real local values. Use
[testing resource rules](testing.md#test-resources-and-side-effects) for verified
isolated target, reset/cleanup, ownership, compatibility and external-effect
authority. Unknown/shared/production targets are not made safe by a test label.
Required unavailable resources or validation remain open; use non-echoing or
user-controlled checks for real test credentials.

Assess actual VPS, managed-platform, container/orchestrator, library, CLI, plugin,
mixed, and no-deploy applicability, without a catalogue of every vendor or
platform-specific procedures. Staging, runtime secrets, remote deployment and
publish tokens are optional according to the project, not universal defaults.

## Commit candidate and outgoing history

Before every guiding-assistant commit, including explicit build/review-fix,
close/release/phase-record commits, establish exact candidate index and
relevant candidate-tree scan coverage. Include `.kaylo`, reports, decisions,
documentation and scanner/config/ignore changes. Before any authorized push or
publication scan all outgoing commits/content relative to the intended remote/ref,
including values added then removed. A clean final tree is insufficient.

Use an installed suitable scanner or an evidenced equivalent. Gitleaks is the
default example, not a required vendor. Before consumers use a scanner, specify
supported commands/version, input selection, detection policy, safe output,
exit interpretation, timeout and incomplete coverage behavior. Remote-only
scanning cannot replace a required local pre-commit scan. Missing tools never
authorize installation, account connection or paid fallback.

The bounded [local adapter](../../../scripts/scan-secrets.cjs) supports installed
Git, Node >=24 and stable **Gitleaks >=8.30.1 and <9**. Actual detector trials
use 8.30.1 on Linux; range/version parsing and report checks have deterministic
fixtures, not native testing of every later version. An incompatible CLI/report
still fails. It uses immutable Git objects and Gitleaks `stdin` in a private
empty directory with built-in detectors, no project detector/config/ignore
settings, ignored `gitleaks:allow` comments, decoding depth 5 and full redaction.
The scanner receives only executable/OS temporary-path environment settings,
not inherited application credentials. Both streams and private report contents
are discarded even on errors; temporary files are removed on return. Memory and
private temporary disk remain exposure surfaces, not process isolation; forced
termination may require owner cleanup. Built-in content allowlists and decoding
limits remain detector limits. No hooks/CI/accounts are installed or remote
comments/uploads generated. Trust in the installed executable is required.

```sh
node "<kaylo-root>/scripts/scan-secrets.cjs" "<project-root>" candidate
node "<kaylo-root>/scripts/scan-secrets.cjs" "<project-root>" history <remote-base> <head>
node "<kaylo-root>/scripts/scan-secrets.cjs" "<project-root>" history --root <head>
```

`candidate` uses `git write-tree` from the actual normal or `GIT_INDEX_FILE`
index and scans the selected tree, including names and symlink blob text without
following targets. Partial staging selects the index, not the worktree. It does
not scan removed parent lines: deleting a leak must be committable. New content
is already in the candidate tree; incident/remediation rules still apply to the
old exposure. It does not stage files or change index entries; write-tree can
refresh Git's cache/create objects. Compare the parent/tree again after scanning.

`history` scans `git rev-list <base>..<head>`: every outgoing full tree, names
and commit metadata, deduplicating objects. Values added then removed remain
covered through intermediate commits, including merge-side commits. It does not
rescan deleted values already present only in the remote base. Bases can diverge
from head when a default branch advances; no ancestor relationship is required.
Resolve the actual authorized remote/ref through a permitted read-only route:
use the existing remote branch head, or the agreed remote base for a new branch.
For a first publication with no remote commit, explicitly select `--root`, which
scans all commits reachable from head and records a null base. Do not silently
substitute root or treat an unknown/missing base as empty. Unknown refs, shallow
history, missing objects and grafts still block; replacements and lazy fetching
are disabled. Never push, change remotes or rewrite history to obtain coverage.
A merge-base may be used only when it is the established intended range, not to
hide commits the actual publication would send.

Git blob/commit reads use `cat-file --batch-check` plus bounded `--batch` reads,
instead of one subprocess per file. Native path comparison resolves Git's root
through the filesystem to accommodate slash/case spelling differences; native
Windows remains untested. Each subprocess has a 60-second limit, the scanner
55 seconds. Aggregate scanned input is limited to 64 MiB. Oversized objects,
NUL/non-UTF-8 binary content, lines over 60,000 bytes and submodule content are
**reported skips**, not automatic clean coverage. Names remain scanned even when
their blobs are skipped. Counters describe distinct objects (not path occurrences)
and `skippedObjects` lists opaque kind/object/reason and `newContent` relative to
the candidate parent or selected remote base; root publication marks all new.
Symlink targets outside the tree, annotated tags and release assets need separate
coverage. A pass never guarantees absence of secrets.

## Results, coverage decisions and finding dispositions

Output contains only fixed states, validated built-in rule IDs, opaque Git object
IDs (or hashed path identifiers), local line/column ranges, SHA-256 fingerprints,
counts and coverage/configuration identities. No filenames, source snippets,
values, report rationale or raw scanner diagnostics are emitted. A blob/commit
finding's line is relative to that immutable object; use an already approved
source path's `git ls-files --stage -- <path>` to identify its object safely.
Do not dump unknown matching blobs or paths into model context to investigate.
Use trusted creation/code/schema evidence or a user-controlled diagnostic to
establish fake versus suspected/confirmed real content.

Exit 0 is `clean` with complete selected coverage; exit 1 is `finding` with
undisposed findings. Exit 2 includes `partial` (scan ran, some objects skipped),
`missing-tool`, `unsupported-version`, `error`, `timeout`, `incomplete`,
`changed`, `invalid-dispositions`, `changed-dispositions` or `usage`. Findings
remain blocking even alongside skips. Missing/inconsistent reports remain
incomplete. Missing/unsupported tools provide a specific next action: install a
compatible Gitleaks through approved project tooling or establish an evidenced
equivalent. No automatic installation or paid/remote fallback.

For `partial`, the guiding assistant evaluates the reported skipped objects
against this action's agreed required coverage. Record the object identities,
classification evidence, rationale and remaining coverage in existing Result/
Review/Completion or the response. An unchanged, already reviewed public image
irrelevant to a text change need not block that commit; reuse only established
unchanged-object evidence. A filename or binary label alone is insufficient.
New/unknown/private generated assets, long-line client configuration, commit
metadata or required submodule content need a suitable safe equivalent check
or user-performed evidence. Relevant or unresolved required coverage stays open.
Do not treat exit 2 generally as permission to proceed or broadly exempt all
assets/tests/docs. This is a bounded coverage disposition, not a scanner pass.
No automatic consumer/hook may convert `partial` into success; project-owned
checks need an explicitly reviewed equivalent coverage policy before handling it.

For a narrow established false positive, use optional Kaylo-owned
`.kaylo/secret-findings.json` in the exact candidate tree (or head tree for
history). Its JSON contract is:

```json
{
  "format": 1,
  "findings": [
    { "fingerprint": "sha256:<64 lowercase hex digits>", "reason": "Value-free reviewed rationale and scope" }
  ]
}
```

Use the actual emitted fingerprint, not the placeholder. Each entry requires a
nonblank single-line value-free reason of at most 512 characters. Unknown fields,
duplicate fingerprints, wildcards, malformed records and files over 64 KiB fail.
The scanner reports the exact file digest and entry count, but does not apply
entries until the **user explicitly confirms the listed matches are false
positives and approves the selected list's exact digest and scope**. The guiding
assistant may propose a value-free rationale, but cannot approve its own or a
worker's dismissals, including fake fixtures it generated. Task/Git authorization
alone does not grant dismissal authority. Existing explicit user confirmation
counts only within its unchanged digest/scope; changed list bytes or finding
fingerprints require renewed confirmation. Unknown classification remains open.

Record the actual user confirmation and rationale in existing Result/Review/
Completion prose or the response, then supply
`--dispositions sha256:<file-digest>` as the final CLI arguments. Confirm through
fingerprints, rationale and digest without asking the user to disclose values.
A digest is input identity, not proof or a source of approval. The adapter checks
input identity; it does not authenticate the user or enforce conversational
approval. Do not pass a digest merely because it was printed. No blanket
allowlists or known-real-leak suppressions are allowed.

Fingerprints bind rule, immutable blob/commit (or hashed name), and local line/
column range, never a secret value. Dismissed findings are returned separately
for review. Changed content/location creates a new fingerprint; changed policy
bytes require renewed review and digest. Worktree-only policy changes cannot
alter an index/head scan. The policy file is scanned like other documentation
and cannot dismiss its own findings. Detector/config/ignore and disposition-file
changes are reviewed with the candidate; workers cannot approve dispositions.
Without a policy the old behavior remains, and an evidenced equivalent remains
available. Malformed present policy is a diagnostic, never silent success.
Record all command/directory, version/configuration, candidate/range/digest,
coverage decisions, disposition review and limits without values. Investigate
suppressed errors only through an established non-echoing route.

Follow [Git ownership and candidate assembly](../../build/references/git.md#committing-attributable-changes).
All index/commit/push operations are serialized by the guiding assistant after
workers/shared checks. Changed candidate/hook/concurrent content invalidates
evidence. Compare the committed tree with the scanned identity; if it differs,
stop publication and scan the actual commit/history. Unrelated staged, unstaged
and untracked work stays preserved; ambiguous overlap blocks the Git action.
Authorization never waives required scanning or coverage assessment. Unchanged-input evidence can
reduce repeated broader work but cannot certify a changed candidate.

Applicable project-owned hooks/CI are agreed work, not automatic installation.
A pre-commit hook can invoke `candidate` against its actual `GIT_INDEX_FILE`
after candidate-mutating hooks; these local hooks are bypassable and not shared
by clones. Hooks remain opt-in. An unmodified scanner hook treats exit 2
`partial` as failure on every commit with skipped assets; a conversation coverage
decision does not override that hook. Adopting a separately reviewed bounded
coverage policy/equivalent is agreed project work, never a blanket partial-to-zero
conversion or permission to bypass hooks. Use the same selected revision/range contract in applicable CI as
second-line detection; CI cannot prevent first publication. Establish full
history and actual selected revision, sanitize failures/artifacts, and inspect
integration upload/comment/account defaults before adopting it. Apply
[foundation](foundation.md) and [gates](gates.md) required-check evidence;
distinguish absent/not-applicable CI from missing required CI. The existing
staged-plan hook checks structure only. The session reminder never reads projects,
runs a scanner or enforces this policy.

## Incidents and remediation

Distinguish suspected detector findings, known-fake matches and confirmed exposure.
A real value entering model context, a commit or published history is exposed,
including the authorized raw-read exception. Notify the user in the current
conversation, stop further affected disclosure/publication and recommend prompt
revocation/rotation. Workers report to the guiding assistant and do not publish
incident notifications. Do not test an exposed credential on production to
establish whether it is real.

Use existing Result/phase records or the response when no task exists: minimal
value-free name/identifier (or unknown), source/surface, observed scope and
useful time/revision, containment, rotation recommendation and pending owner/action.
Never include full/partial values, secret-bearing URLs, raw snippets or unnecessary
sensitive metadata. If an existing Result/transcript/history already has a value,
keep a sanitized reference rather than recopying it. A clean scan does not prove
rotation. Remediation remains pending until safe status evidence or attributed
owner confirmation establishes it. Rotation/revocation, history rewriting,
remote-artifact deletion, production changes and third-party notification need
actual action-and-target authority; existing scoped authority counts. Cleanup
can reduce continued exposure but cannot undo prior exposure or replace rotation.

## Governing decisions and compatibility

Reuse settled project decisions before asking. In existing phase `## Design`,
record actual environments, safe storage references (no credential-bearing
connection strings), applicability, rationale, alternatives/trade-offs and access
boundaries. Record authority/consequential unresolved choices in `## Agreement`;
unknown and none are explicit. Ask only consequential missing decisions and
revisit materially changed facts. Value-free reasoning is required, not just
locations. Relevant decisions travel through existing direct/resumed/worker
packets without secret values.

Use the single [decision lifecycle](decisions.md): settled phase-local decisions
govern build/review; close promotes consequential final choices under area
`environments`, preserving rationale/provenance and source-to-ADR mapping with
guiding-assistant ownership and retry-safe promotion. Final ADRs are a close
postcondition, never a prerequisite for the tasks/closure that create them.
Trivial reversible choices need no immutable ADR. Supersession preserves history.
Optional resources/prose preserve legacy/small-change plans without backfill;
relevant present-but-broken required configuration still produces diagnostics.
If this reference/helper is unavailable, standalone guardrails remain in force;
keep affected Git/configuration acceptance open until the full identified contract
or an evidenced equivalent is available. Do not claim enforcement from structure.
