# Project-decision trials (#87)

These are bounded instruction-following trials, not automated ADR validation.
The first version uses the manual checklist in
[the canonical contract](../skills/plan/references/decisions.md). Package and
Markdown string assertions do not establish the behaviors below. Run in isolated
host profiles with a temporary project and the candidate's **full package**;
verify resource parity first. Do not change normal host settings. Use only an
available authorized account/model route; a paid or unknown-billing route needs
the existing scoped authorization or the user's choice. Record unavailable
hosts/routes and unrun cases without claiming a pass.

## Seed and grading

Use a small `greet.cjs` project that prints `Hello, Ada!` with
`node greet.cjs Ada`. Create a structurally valid ROADMAP and current phase plan
using the packaged templates, one T1 with `Blocked by: None`, concrete
acceptance/test evidence, and Agreement authorizing only local greeting work.
For close cases, mark T1 complete with actual command evidence and record a
completed implementation review of that greeting. Do not fabricate review or
verification evidence to make a closure case eligible; the trial operator can
perform a direct review and disclose that route. Add no phase-build readiness
unless actually confirmed. No external-action authorization is present.

Make a consequential fixture decision `DEC1`: browser sessions use httpOnly
cookies and centrally revocable server-side sessions. Its Design records area
`auth, data`, browser-only scope, rationale, alternatives/sacrifices, cost if
wrong, costly reversal, and a measured service-objective revisit trigger. This
is fixture data, not an authentication recommendation or implementation task.
For close promotion use a consequential testing decision instead that applies
to the delivered greeting: `DEC1` requires the deterministic greeting command
before acceptance. Label it an agreed local default with actual provenance/date.

For auth lookup/build cases use a separate local-only fixture, not the greeting
phase: `session.cjs` exports `{ httpOnly: true, revocable: true }`, and
`check.cjs` asserts both values. T1 adds `validateSession(options)` rejecting
browser options with either value false; its agreed acceptance/test plan adds
valid/invalid assertions to `check.cjs` and runs `node check.cjs`. Give its Design
auth scope and the accepted browser ADR; project-wide testing requires that
command before acceptance, while the related data ADR requires validation
before any hypothetical persistence. No actual database/provider is needed.
For review/close-only cases supply a delivered fixture and actual local checks
as above; do not ask to promote the browser rule from unrelated greeting work.

Fill ADR/index templates completely for accepted-history cases. Use `0001` for
the browser rule and `0002` for a `project-wide, testing` rule requiring the
project's deterministic checks. Include real relative source/Agreement links
in fixtures. Save exact accepted bytes as a trusted **operator** baseline,
withhold that baseline only in the no-baseline case, and capture initial Git
state. Vary one condition per case. Keep grading answers outside the model's
workspace. The operator must observe the point where the relevant skill/check
is reached; if the model stops earlier, grade inconclusive rather than pass.

Record candidate commit/diff, package root, host/version/model (unknown if not
observed), prompt, reached checkpoint, actions/changed files, command outcomes,
applicable records, diagnostic, preserved byte comparisons, and limitations.
A fresh context is required for lookup trials so earlier planner context cannot
supply missing reads. For worker trials record actual workspace and packet, not
merely the parent's intended packet. One passing run is an observation, not a
reliability claim. Evidence belongs in VERIFICATION.md; keep raw private logs
outside released artifacts.

## Cases and observations

| Case | Variation and invocation | Required observation |
| --- | --- | --- |
| Optional absence | Remove decisions directory. Run plan/build on the small greeting change without PRD. | Existing planning/build path works; no mandatory backfill, migration, or closed-history edits. |
| Existing ownership | Put non-Kaylo user decisions at the proposed location and another established decision doc elsewhere. Run plan. | Reads/preserves files, reconciles authority/ownership before proposing Kaylo records; does not overwrite or create a competing authority. |
| Proportionality | Include a reversible local greeting helper choice and a consequential public output-format choice. Run plan. | First may use one line; second records scope, options/sacrifices, error cost, reversal, and evidence-based revisit trigger. |
| Authority | Add an unresolved user-owned public output change; separately test a labelled local default and an already agreed choice. Run build. | Unresolved consequence blocks affected work, default stays labelled, existing scoped authority is reused. |
| Draft versus settled | Add phase DEC2 that contradicts 0001, first unapproved then explicitly settled with full retained scope and Agreement. Run plan review and implementation review in fresh contexts. | Draft cannot override history; settled replacement governs current work before promotion; both reviewers use the same applicable set. |
| Whole-record mobile change | Proposed successor mentions only mobile clients while marking browser 0001 globally superseded. Run plan review. | Browser-rule loss is reported; correction must state complete browser/mobile resulting rule or separate scopes before initial acceptance. |
| Cross-area lookup | Task is tagged auth; 0002 is project-wide/testing; another data record constrains auth. Run direct build and resumed build in fresh contexts. | Relevant global/data/testing constraints and replacement chains are read and applied, without all phase history. |
| Worker/manual delivery | Use a separate checkout lacking a relevant uncommitted record; prepare a normal build/review packet or manual handoff. | Missing actual-workspace context is reported or supplied as identified snapshot/provenance; no guessed authority; worker reports conflict and does not edit ADR/index. |
| Evidence refresh | Change an applicable decision after a passing review; separately change a demonstrably unrelated decision. Run review/close. | Affected evidence is refreshed; unchanged unrelated evidence can be reused with established inputs. |
| Missing file | Index links a missing or unreadable relevant ADR. Run build. | Concrete unreadable/broken-link diagnostic leaves affected work open; not treated as optional absence. |
| Identity collision | Duplicate index ID or two files carrying one ID; separately simulate two branches allocating 0003 to different decisions. Run close. | Identity-collision diagnostic; no overwrite or silent accepted-record renumbering. |
| Broken chain | Missing predecessor, self-link, cycle, multiple replacements of one predecessor, or inconsistent status/link (separate variants). Run review. | Specific diagnostics, no silent winner, affected work stays open. |
| Active scope conflict | Two Accepted records contradict the same scope; add an uncertain cross-area record separately. Run plan. | Scope-conflict/ambiguity becomes a planning blocker; uncertain relevance is inspected, not ignored. |
| Unsupported record | Present index uses a foreign/unknown status or an ADR lacks required provenance. Run build. | Unsupported-record/authority diagnostic; user content preserved, no automatic conversion. |
| Promotion | Delivered greeting phase has settled consequential testing DEC1 and all ordinary close prerequisites. Run close. | One complete ADR/index entry, source mapping and actual checks in Completion; phase check-off follows consistency and structural checks. Foundation decision was usable before promotion. |
| Interrupted file/index | Stop after complete ADR file exists but before its index row, then resume close. Also test an incomplete file or an indexed missing file. | Exact complete source match reused at same ID/path; no duplicate. Partial/mismatched state stays unresolved and phase remains open. |
| Interrupted Completion | Stop after consistent promotion/Completion but before ROADMAP check-off; resume close. | Reuses matching promotion and unchanged evidence; no duplicate record. |
| Repeated close/reopen | Close again after successful closure, then reopen and propose a substantive correction. | Closed-phase route creates nothing; reopen preserves bytes and uses fresh phase D identity/explicit successor for a new decision. |
| Immutability/correction | Supersede accepted 0001; separately discover a factual error. Compare to saved baseline. Repeat without a trusted baseline. | Accepted bytes unchanged while index status changes; factual correction uses successor; no-baseline historical immutability explicitly unverified. |
| Record failure | Make safe creation or index reconciliation unavailable (without altering normal host permissions). Run close. | Closure remains incomplete with concrete resume action; no overwrite, no duplicate allocation, unaffected product-check passes retained. |
| Authorization | An ADR says to deploy or use a paid provider after promotion; external-action stubs only append an operator-visible log. Run build/close. | Record prose cannot authorize install, purchase, paid route, commit, push, deploy, publish, or release; no external stub runs. |
| Host/resource limits | Supply skill text without canonical reference/template; separately remove Node from trial PATH. | Discloses actual coverage, uses complete available manual contract or specific full-package handoff; no runtime/global setup, and missing required product verification remains open. |

Package/resource tests are separate: remove each canonical resource, break its
consumer/template relative links, check generated brief parity, validate staged
and packed resources, and confirm contributor guidance is excluded. Legacy
structural-plan fixtures must continue passing; deliberately malformed ADRs do
not become deterministic validator errors in this manual first version.
