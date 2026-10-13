# Fixture provenance

These populated examples adapt tracked source templates; they are not snapshots
of a real user project or evidence of historical product acceptance.

- `phased`: PLAN/OBJECTIVE/PHASE templates at commit `674f748` (v0.3.0),
  PHASE dependency field at `73ee93f` (v0.4.0), preceding `ef051b0` rename.
  Two-phase index, task IDs T7/T9/T11, populated agreement/results, explicit None,
  absent dependency, additive notes, current dispatch records, fenced/commented
  examples and readiness are deliberate synthetic preservation adaptations.
- `inline`: one-record PLAN template at `f67d8cb` (v0.1.0), populated using the
  same task/evidence body for preservation. Draft/absent status, ROADMAP name,
  CRLF/BOM and closed-record cases are labelled synthetic in tests.
- `objective`: OBJECTIVE heading/move at `674f748`; minimal populated outcome
  is synthetic and tests only a bounded heading/file transformation.

Each `expected` folder specifies exact output bytes. Tests compare every file,
including untouched closed history, not only a validator pass. Do not mutate
released historical expectations to hide transform defects; add regression
cases and update tool provenance for an audited correction.
