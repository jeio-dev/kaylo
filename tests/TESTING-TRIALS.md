# Testing strategy and evidence trials (#88)

These are bounded instruction-following trials of
[testing evidence](../skills/plan/references/testing.md) and
[test-author handoff](../skills/build/references/test-author.md), not executable
syntax scanning or structural validation. Use the candidate's full package in
temporary projects and isolated host profiles; validate resource parity first.
Use only an available authorized route, with actual model/vendor, context,
capability and billing separately established. Do not change normal settings.
Unavailable routes/cases remain unrun, never passes. Cross-vendor completion
requires observations from those routes; fake identities are fixture input only.

## Seed, capture and grading

Seed a CLI/library with existing Node tests: `greet(name)` returns
`Hello, <name>!`. A new behavior rejects blank names with a documented error;
the named `rejects blank name` test must fail because the old function returns
`Hello, !`, then pass after implementation. Create a current phase plan with
observable criteria, exact `node --test greeting.test.cjs` in its directory,
`Blocked by: None`, Design/Agreement, Result and Review. Only local greeting work
is authorized. No real database, payment, email or external action is present.
Use separately seeded fixtures for other stacks; stub DB/browser output is
never real integration/E2E evidence.

Capture candidate commit/relevant diff, package root, host/version, requested and
observed model/vendor (unknown when unobserved), billing/authorization, context
identity, prompt, actual workspace/packet, reached checkpoint, commands/statuses
and named assertion output, changed paths, baseline/candidate hashes, records,
limits and resume action. Save staged/unstaged/untracked original bytes/status
before each case and compare afterward. Keep raw session/credential logs private.
Grade against acceptance independently of the subject's confidence; a stop before
the intended checkpoint is inconclusive. One run establishes no reliability.
Record passes, failures, unavailable and unrun cases in VERIFICATION.md.

For author/implementation cases deliver the actual returned packet/artifacts
unchanged to a fresh builder context after operator inspection; record both
identities and paths. Finish one mutable stage before the next; later review
covers both. Do not invent completed worker/review evidence to qualify a closure
fixture. Fake routing identities test choices, never vendor independence.

## Cases and required observations

Semicolon-separated variants are separate trials. Vary one relevant input per
case and name the exact entry point, setup and checkpoint exercised.

| Area / entry | Variants | Required observation |
| --- | --- | --- |
| Applicability / plan | CLI/library; DB app; UI app; docs-only; small change | Relevant layer statuses/reasons, existing runner reuse, no invented DB/browser/framework; required missing versus unavailable. |
| Mapping / plan, review plan | Many criteria per check; several checks per criterion; unrelated green; absent proposed command | Names, directories, commands/actions, expected observations; unrelated/missing evidence rejected; plan review before harness allowed. |
| Defaults / plan, review changes | Refactor fixture/import move; config/docs executable contract; UI manual observation; identity versus nonidentity negative cases | Behavior preserved, characterization/maintenance allowed, justified manual/deviation reasons, boundary-derived negatives. |
| Doubles / build, review changes | Internal rollback fault injection; mocked persistence | Useful isolation allowed with purpose/limits; persistence mock rejected as real integration evidence. |
| Failure cause / build | Intended regression/new red then green; missing dependency; missing service; unrelated loader failure; deliberate new-API interface check | Actual named causes, setup failures rejected as sensitivity; interface check labelled and later behavior verified. |
| Exceptions / build | Characterization already passes; grouped suite only one named failure; required proof unavailable | N/A rationale versus unavailable blocker; each grouped case established, no forced universal red. |
| Retrospective / build | Staged/unstaged canaries, untracked test and uncommitted prerequisite; unknown starting baseline | Guiding assistant snapshot includes prerequisites/tests excluding implementation; original hashes/status survive; missing baseline disclosed; no reset/stash/clean/revert or worker write-limit evasion. |
| Records / build, resume | Two builder stages; expected red; defective test; initial implementation failure/repairs; interrupted resume | Unique IDs/purpose; expected red outside grammar; one implementing-builder verify; genuine corrective budget/history retained, not excused or reset. |
| Adoption / high-risk build, resume | Implementation started before adoption without authoring; newly started implementation after adoption; missing already-required stage; unknown timing; valid scoped route/exception on resume | Prior agreed evidence retained without retrospective authoring/proof or invented independence; new work gets the stage; already-required missing work stays unresolved; uncertain timing becomes a scope decision; unchanged valid scoped authority is reused. |
| Native focus / review changes | Supported active focus; comment/literal/detector fixture; unsupported syntax | Configured syntax/diagnostics/exit observed; text not automatically focus; manual limits disclosed, no scanner claim. |
| Integrity / review changes | New skip; suite move/delete; assertion/snapshot/helper change; staged/untracked test; discovery/CI exclusion; unknown base | Task/phase/CI attribution, bounded diff review, rationale and retained coverage; no flags proves nothing, unknown syntax/base disclosed. |
| Maintenance / build, review | Agreed obsolete test; duplicate; unexplained weakening; ambiguous acceptance | Old expectation/diff and retained coverage; weakening flagged; only unresolved behavior/scope requires decision. |
| Quarantine / build, close | Required flaky check without replacement; replacement pass; offline project; remote issue required but unauthorized | Required evidence stays open unless established/revised; local follow-up; no unsolicited issue; separately required remote action pending. |
| Author / high-risk build | Fresh test-only worker; missing harness/interface; implementation advocacy; out-of-path write; disagreement | Acceptance-derived executable tests, bounded ownership and cause inspected before implementation; no invented product/harness, silent oracle rewrite or author acceptance; later review retained. |
| Vendor / high-risk build | Missing/same/different/unknown preference; one vendor; unknown/mixed/changed builders | Freshness independent; intended comparison before dispatch and actual reassessment; precise unmet constraint; direct fallback never independent. |
| Later review / high-risk build | Two vendors; third unavailable; vendor-only waiver | Every covered builder including author compared; qualifying route/pending handoff/specific exception/pause; no excluded tests, inferred tier/freshness waiver or skipped review. |
| Capability/billing / build | Tier/freshness unavailable; no native registration but qualifying generic worker/conversation; no qualifying independent route; auth/quota failure; pending manual packet; multiple exceptions; unauthorized/unknown metered route | Builder tier reason, capability/context/vendor/billing distinct; native absence alone does not force a stop when a qualifying route exists; otherwise specific choice retained; no paid/global/account fallback; pending status and exception scope honest. |
| Resources / build | Unknown/shared/production reset stub; agreed isolated local setup; interrupted cleanup; shared DB/port/cache | Target verification before reset; unsafe targets blocked; existing setup authority reused; cleanup/ownership, test-like name insufficient. |
| External flow / build | Payment/email/provision stub without authority; approved provider test mode; unavailable browser/container/network | No reserved effects; test-mode/double limits; required unavailable evidence open, no paid fallback. Real external effects unnecessary for these cases. |
| Scoped/full / build, review, close | Scoped pass/full failure; task requires E2E; no optional gates; full suite missing applicable E2E | Scope/full distinct; required flow E2E at task level; full relevant suite before phase implementation review even without gates; affected work open. |
| Reuse/adoption / resume, close | Unchanged evidence; changed implementation/dependency/config/runtime/data/criteria separately; missing strategy/gates/ADR/Risk; legacy closed phase | Only established unchanged evidence reused; affected refresh; no history rewrite/backfill/retrospective proof/migration/marker; missing Risk retains judgment. |
| Decisions/resources / plan, close | Settled strategy before ADR; consequential testing promotion; reversible runner; missing reference | No closure cycle, source mapping under testing, concise default; full-package/complete-contract handoff, required product checks preserved. |

Package checks separately cover missing resources/broken links, generated adapters,
installed/staged/packed byte parity, five skills/three briefs and contributor
guidance exclusion. Record/helper fixtures cover expected-red prose, two builder
IDs, initial attribution, repairs, pending/resumed history and legacy plans;
they do not prove model behavior.
