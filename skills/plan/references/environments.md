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
close/release/phase-record commits, establish exact candidate index/delta and
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
Git and **Gitleaks 8.30.1**, Node >=24, on tested Linux. Its need: native staged
scans do not certify the alternate/temporary index that `commit --only` uses,
and project detector/ignore discovery can weaken a scan of its own changes.
It uses immutable Git objects and Gitleaks `stdin` in a private empty directory,
built-in detectors, no project config/baseline/ignore discovery, ignores
`gitleaks:allow` comments, decoding depth 5, full redaction and a private JSON
report. Both process streams and report contents are discarded even on errors;
only fixed states, counts, hashes and coverage labels are printed. Built-in
content allowlists remain detector limits; project suppressions are disabled.
The scanner receives only executable/OS temporary-path environment settings,
not inherited application credentials. No filenames,
source lines, rule text, credentials or scanner diagnostics are forwarded. The
report is removed on return; process memory/private temporary disk remain
residual exposure surfaces and forced termination may require owner cleanup.
The installed executable and default detector are trusted local components.
No hook/CI/account integration is automatically installed; no remote artifacts,
comments or uploads are generated.

```sh
node "<kaylo-root>/scripts/scan-secrets.cjs" "<project-root>" candidate
node "<kaylo-root>/scripts/scan-secrets.cjs" "<project-root>" history <base-commit> <head-commit>
```

`candidate` uses `git write-tree` on the actual `GIT_INDEX_FILE` or normal index,
plus the HEAD-to-tree delta (no delta for an unborn initial branch). Partial
staging therefore selects the index, not the working tree. It covers renames,
deletions and symlink *blob text* without following targets. It does not stage
files or change index entries; write-tree can refresh Git's index cache/create
objects. `history` requires an ancestor base, enumerates every outgoing tree
and commit metadata/merge-parent patch, covering add-then-remove and deletions from the base.
Resolve the intended remote/ref separately using an available permitted read-only
route; a new branch uses its established remote base, an existing branch its
established remote head. Ref names resolve to immutable commit hashes in evidence.
Never push, change remotes or rewrite history to obtain a base. Reject shallow,
unknown/nonancestor bases, missing objects, Git grafts, unsupported binaries or
submodules, invalid UTF-8/NUL content, lines over 60,000 bytes, or aggregate input
over 64 MiB. No partial scan is certified. Each subprocess has a 60-second
limit and the scanner 55 seconds. Annotated tags, release assets and content outside Git trees need separate
evidenced coverage. Opaque archives/binary/generated formats need
an equivalent whose coverage is established; symlink targets outside Git trees
are not certified. Detection is limited to the selected built-in rules and
bounded decoding; a pass is never an absence-of-secrets guarantee.

Exit 0 is `clean`, 1 is `finding`; exit 2 blocks the action with `missing-tool`,
`unsupported-version`, `error` (configuration/runtime failure), `timeout`,
`incomplete`, `changed` (candidate mutated during scan) or `usage`. Missing or inconsistent scanner reports are incomplete.
Record JSON evidence plus command/directory, intended remote/ref, configuration,
authority and limits in existing Result/Review/Completion or response. Use a
non-echoing separately controlled diagnostic to investigate suppressed errors;
never print a raw report to debug the adapter. Narrow false-positive disposition
requires value-free rationale and reviewed scope with an equivalent vetted
scanner/configuration; this adapter has no broad suppression switch. Unknown
classification stays unresolved without demanding a raw model read. Detector,
ignore/baseline/config changes require review; never broadly exempt `.kaylo`,
examples/tests or existing real leaks to get green.

Follow [Git ownership and candidate assembly](../../build/references/git.md#committing-attributable-changes).
All index/commit/push operations are serialized by the guiding assistant after
workers/shared checks. Changed candidate/hook/concurrent content invalidates
evidence. Compare the committed tree with the scanned identity; if it differs,
stop publication and scan the actual commit/history. Unrelated staged, unstaged
and untracked work stays preserved; ambiguous overlap blocks the Git action.
Authorization never waives required scanning. Unchanged-input evidence can
reduce repeated broader work but cannot certify a changed candidate.

Applicable project-owned hooks/CI are agreed work, not automatic installation.
A pre-commit hook can invoke `candidate` against its actual `GIT_INDEX_FILE`
after candidate-mutating hooks; these local hooks are bypassable and not shared
by clones. Use the same selected revision/range contract in applicable CI as
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
