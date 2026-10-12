# Case 54 missing-resource fallback correction — 2026-10-12

The standalone plan/build/review/close text now carries the decision-resource
stopping rule. When records are present or promotion is required, manual decision
inspection needs an identified complete canonical contract; ADR examples and
structural plan validation cannot substitute. Otherwise affected work stays open
with named missing resources and a full-package/content handoff. Optional absence
retains legacy behavior. The canonical reference matches this rule. Package
validation checks that the four standalone copies are present and aligned;
mutation coverage detects a missing or drifted copy, not model behavior.

Three focused fresh Codex CLI contexts, each once, at most two concurrently:

| Case | Outcome | Observation |
| --- | --- | --- |
| Missing contract, present ADRs | PASS | T1 remains unchecked; no product edit/check-off. Records unreadable diagnostic, resource paths and specific full-package/content handoff. |
| No records, skill text only | PASS | Clean fixture history has no prior ADRs/deletions. Builds and verifies Hello, Ada! using legacy/manual structural path. |
| Complete contract/templates supplied, helpers absent | PASS | Uses identified normative content and manual decision/structure checks; builds, verifies and accepts T1. |

Host: Codex CLI 0.162.1, CLI-selected gpt-6.1-sol, low reasoning, existing
ChatGPT subscription login. Backend model/snapshot identity was not exposed.
Fresh ephemeral contexts and temporary profiles; existing credentials copied
privately, API-key environment routes removed, credential copies deleted after
completion. Candidate base b7e485c02af36a21bd397cf1c11041d8dc7206b2 plus the private
recorded patch/inventory; full package at
/tmp/kaylo-87-fallback-ju87h0x8/package, all 41 shared resources match. Selected
skill and intentionally available resources were copied from that package;
installed Kaylo cache and grading answers were not supplied. Fixtures derive
from the original case 54 starting snapshot, with clean Git history after the
absence variant removes records. No PRD or contributor project plan exists.

378 pre-existing full-suite tests passed; the expanded package suite passed
26/26 including one new mutation test. No skips/failures. Both Claude Code
2.1.296 strict manifests and Antigravity 1.3.1 manifest validation passed.
No worker briefs changed, so adapter regeneration was unnecessary; generated
parity passed package validation. No release/version/catalog/hook changed.

[Receipts and accepted-byte comparisons](case54-followup.json) preserve hashes
of private prompts, events, command outcomes, final outputs and diffs. Raw logs,
fixture snapshots, candidate diff/inventory and setup are private under
.local/trials/decision-87-case54-followup-20261012/. All initial ADR bodies/index
remain unchanged. The absence subject's supplemental nested spawnSync probe
failed with EPERM; the ordinary product command and an equivalent in-process
assertion passed. That does not establish nested-process support on this host.

This is a focused follow-up on changed instructions, not a repeat of the complete
55-entry pass. The original grades remain historical. Live coverage is build
only; plan/review/close policy copies have package parity, not live fallback
observations here. No independent implementation review, native candidate
install/update/discovery, other host/model, public install or interruption/reopen
trial ran. One observation is not reliability. Failure 25 and the original
remaining coverage gaps stay open; issue #87 remains open and PR #129 draft.
