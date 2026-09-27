# Review handover

Paste the following into a fresh reviewer session:

```text
Review and challenge the uncommitted Kaylo guardrail changes in
/home/jeio/src/kaylo. Inspect git status and the complete diff, including
untracked scripts, tests, and documentation. Do not implement fixes, commit,
publish, or change global settings. Do not assume the author's tests or
enforcement claims are correct.

Scope:
- Five skills and three worker briefs: untrusted content, secret handling,
  authorization, workspace preservation, and build/close validator guidance.
- scripts/validate-plan.cjs and tests/validate-plan.test.cjs.
- README.md, CHANGELOG.md, VERIFICATION.md, tests/GUARDRAIL-TRIALS.md,
  and this handover. The startup hook was intended to remain unchanged.

Run the validator tests with an available Node runtime. On this workspace,
Node was found at /home/jeio/.nvm/versions/node/v24.21.0/bin/node, but confirm
availability. Inspect the implementation independently and create additional
temporary fixtures to challenge gaps; do not only repeat existing tests.

Challenge these questions:
1. Recheck the four reported defects: skipped malformed entries and task
   boundaries, fence suffixes hiding/exposing tasks, duplicate Review/Completion
   sections, and symlink aliases sharing phase files. Include hard-link aliases.
   Recheck comment markers in opening fence info strings, including the exact
   reported unfinished-task fixture, and genuine comments containing fences.
   Can malformed or unsupported plans receive a misleading pass? Can normal
   canonical or legacy plans be rejected? Exercise duplicate IDs, dependencies,
   multiline/blank records, Markdown examples, encoded links, symlinks, closed
   phases, and Current links. Verify CLI exit codes and absence of writes.
2. Does close's write-record / --closing / check-index sequence work without
   circular requirements? Does it preserve old plans and optional findings?
   Can the manual fallback become an excuse to ignore a real structural error?
3. Do instructions conflict across skills, workers, or delegation references?
   Can workers gain authority or edit shared plans? Do the new rules create
   redundant approval requests or restrict already-authorized local work?
4. Do documentation and verification accurately distinguish structural checks,
   actual behavioral trials, advisory instructions, and external enforcement?
5. What threats remain despite these changes? Identify concrete bypasses and
   missing protections without expanding Kaylo into a security runtime.

Use tests/GUARDRAIL-TRIALS.md for behavioral challenges when an isolated fresh
model session is available within existing authorization. Otherwise report
those trials as unrun; reasoning about instructions is not observed compliance.
Use dummy credentials and local stubs only. Do not silently start paid calls
or give a trial access to real external systems.

Return findings ordered by severity with file/line, reproduction, practical
consequence, and smallest useful correction. Separate implementation defects,
advisory limitations, and optional design improvements. State checks actually
run and their limits. Conclude ready or needs changes; no findings is valid.
```
