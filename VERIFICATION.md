# Verification

What has actually been checked for each release, and the limits of those checks.
Package checks establish structure, loading, and resource parity; they do not show
how a model behaves. Records from the first draft through 0.5.2 (2026-09-25 to
2026-09-27) describe earlier package revisions and are kept in Git history:
`git show v0.6.0:VERIFICATION.md`.

## Release installation and update parity — 2026-09-27

Prepared the 0.6.0 package with GitHub marketplace catalogs selecting `v0.6.0`,
a native Gemini extension, a contained development catalog, and install/update/
removal instructions for all five hosts. No production release or public tag was
created. Earlier records describe earlier package revisions; see Git history.

| Check | Observed result |
| --- | --- |
| Claude Code 2.1.283, temporary `CLAUDE_CONFIG_DIR` | Git catalog install succeeded; native update moved fixture 0.6.0 to 0.6.1 and installed the changed build instructions |
| Codex CLI 0.157.1, temporary `CODEX_HOME` | Git catalog install, marketplace upgrade, and reinstall succeeded; fresh app-server discovery returned five enabled Kaylo skills without errors |
| Gemini CLI 0.61.0, installed only under `/tmp`, temporary `GEMINI_CLI_HOME` | Git source install at a tag, uninstall/reinstall at a newer tag, local install, and local update commands succeeded; skill listing found all five shared skills |
| Antigravity CLI 1.2.11, private profile mounted with Bubblewrap | Install/reinstall succeeded with five skills and three worker definitions; network disabled during Antigravity operations |
| OpenCode 2.0.18, temporary XDG directories and project | Loopback API discovery returned all five skills from the updated fixture checkout with exact instruction bodies |
| Installed resource comparison | All 22 shared skill, worker, adapter, template, script, and hook files match source bytes in Claude, Codex, Gemini, and Antigravity packages before and after update |
| Local Codex development catalog | A parent-directory source was rejected; staging under `development/package/` fixed containment, and native install succeeded |
| Claude manifests, Codex plugin-creator validator, Antigravity validator | Passed; Claude manifest/catalog validation used `--strict` |
| Node 24.21.0 fixture checks | All 61 tests passed: 52 plan tests and nine package/loader/staging tests |
| Source JSON, relative resource links, repository diff whitespace | Passed |

The native Git trials use two temporary fixture releases with a changed build
skill. Claude and Codex Git transport was redirected to an isolated bare mirror;
Gemini used a loopback smart HTTP Git mirror because its Git process did not
honor the test's global URL rewrite. These establish native catalog/tag/update
behavior without publishing test releases. Public GitHub transport against a
published 0.6.0 remains to be checked after publication.

Gemini rejected Claude's researcher tool frontmatter. Shared briefs now use
Gemini tool names; generated Claude adapters preserve the Markdown instruction
bodies and restore Claude's read-only researcher tool names. The final Gemini
extension install/list checks contain no agent-definition errors. Package
validation rejects stale adapters. Native worker execution was not tested.

The default hook configuration works across Claude, Codex, and Gemini: exact
startup/resume groups, shared script, plugin-root environment variables or Gemini
extension-path substitution, and each host's native timeout default. Loader tests
exercise all three path-resolution cases, JSON context output, and suppression.
No signed-in session lifecycle or native hook trust interaction was exercised.
The skills and shared resources establish package parity, not identical model
behavior, worker execution, permissions, or UI behavior. Antigravity IDE loading
remains untested.

Evidence: `/tmp/kaylo-release-parity-6po9qybr`,
`/tmp/kaylo-install-parity.log`, `/tmp/kaylo-package-tests.log`, and
`/tmp/kaylo-local-catalog-ql4aopo4`. Temporary profiles contain no copied account
credentials. Normal host profiles, trust settings, and repository Git history
were unchanged.

## Industry-terms rename — 2026-09-28

Renamed Kaylo's project files, task fields, and review labels to common
software-team names and removed older-format support (see the changelog's
0.7.0 entry and [glossary](GLOSSARY.md)). Checks ran on
branch `industry-terms` with Node 24.21.0. No release was prepared.

| Check | Observed result |
| --- | --- |
| `node --test tests/*.test.cjs` | 89 tests passed: 80 plan tests, including rejection of each old file, field, and label, mixed old and new names, `Draft` or missing status, and a missing `Blocked by:`; and nine package/loader/staging tests |
| `node scripts/validate-package.cjs` | Passed |
| `git diff --check` | Clean |
| Fixtures from the actual templates (run while updating templates and skills earlier the same day; not rerun) | An open phase passes; a closed phase passes `--closing`; a phase with a linked next phase and an unlinked later phase passes. Controls fail: the open phase with `--closing`, `Status: Delivered`, `R1: optional`, and `Depends on:` |
| Changelog conversion steps, applied to five old-format projects | A linked old project (`OBJECTIVE.md`, `PLAN.md`, `Status: Draft`, old fields, `optional` label, one task without `Depends on:`) and a legacy project with tasks inline in `PLAN.md` each failed with diagnostics naming the replacements, then passed after steps 1–5. A completed legacy inline project passes, including closure checks, only when step 2 moves its whole phase record; a phase plan with `Status: Delivered` fails until step 3. A project with a closed old-format phase 01 and a converted current phase 02 passes, as the changelog states |
| Search for old names across the package, including hidden manifest directories | Remaining matches are allowed: `NN-PLAN.md` paths, generic "blocker", "optional", and "approach" prose, the skills' older-format lists and conversion steps, and the validator's old-name diagnostics and their tests |
| Relative links in changed Markdown | All resolve except README's `REVIEW-HANDOVER.md`, which was already missing and is out of scope |

These checks cover structure and wording only. They do not show that a model
creates `PRD.md` and `ROADMAP.md`, follows `Current:`, keeps repair history,
labels review comments correctly, routes review and closure correctly, or
converts an older project through `/kaylo:plan`; no live-model trial was run.
Native host validators and isolated install/update checks from
[release maintenance](RELEASING.md) were not rerun, so release readiness is not
established.

Follow-up the same day: `/kaylo:plan`'s older-format conversion now moves the
whole phase record of a plan with inline tasks, including completion, matching
the changelog's step 2. Afterwards 89 tests passed, package validation passed, and
`git diff --check` was clean. This is an instruction change; whether a model
follows it remains untested.

## Release preparation 0.7.0 — 2026-09-28

Prepared 0.7.0 at `7fb4197`: manifests set to 0.7.0 and both release catalogs
select `v0.7.0`. No tag was created and nothing was published. Commits after
`7fb4197` change only `CHANGELOG.md`, `VERIFICATION.md`, and the `RELEASING.md`
tag example; the shipped package files checked here are unchanged.

| Check | Observed result |
| --- | --- |
| Node 24.21.0: `node --test tests/*.test.cjs` | 89 tests passed |
| `node scripts/validate-package.cjs` | Package v0.7.0: versions and release catalogs match |
| Claude Code 2.1.283: `claude plugin validate` on the plugin and marketplace manifests with `--strict` | Both passed |
| Antigravity CLI 1.2.11: `agy plugin validate .` | Passed: five skills and three agents |
| Codex plugin-creator `validate_plugin.py`, PyYAML from a temporary `uv` environment | Passed |
| `git diff --check` | Clean |
| Claude Code 2.1.283, temporary `CLAUDE_CONFIG_DIR` | Git catalog install of the real v0.6.0, then native marketplace update and plugin update to 0.7.0 |
| Codex CLI 0.157.1, temporary `CODEX_HOME` | Git catalog install of v0.6.0, then marketplace upgrade and reinstall to 0.7.0; fresh app-server discovery returned five enabled Kaylo skills without errors |
| Gemini CLI 0.61.0, temporary `GEMINI_CLI_HOME` | Git install at `v0.6.0`, then uninstall and install at `v0.7.0`; skill listing shows all five skills enabled |
| Antigravity CLI 1.2.11, private profile mounted with Bubblewrap, network disabled | Install of the v0.6.0 checkout, then reinstall from 0.7.0: five skills, three agents |
| OpenCode 2.0.18, temporary XDG directories | Loopback API discovery returned all five skills from the 0.7.0 checkout with exact instruction bodies |
| Installed resource comparison after update | Every 0.7.0 install root in Claude, Codex, Gemini, and Antigravity matches all 22 shared resources and the 0.7.0 build skill bytes |
| Hook loader run from each installed copy (Claude and Codex plugin-root variables, Gemini extension path) | Returns SessionStart context naming `PRD.md` and `ROADMAP.md` |

The fixture releases were built with `git archive` from the real `v0.6.0` tag
and from `7fb4197`, so they contain only tracked files. Git transport was
redirected to a local bare mirror for Claude and Codex and to a loopback smart
HTTP mirror for Gemini, as in the 0.6.0 trial. Public GitHub transport against
a published `v0.7.0` remains to be checked after publication. The fixture
`main` and release tag point at the same commit, so this trial does not show
that the catalogs select the tag rather than the default branch.

The resource comparison is one-directional: it checks that each shared source
file matches its installed copy, not that no extra files remain. An independent
review listed the active install roots and found no leftover `templates/OBJECTIVE.md`
or `templates/PLAN.md`, and a matching `WORKERS.md`, which the comparison omits.
The trial log truncates Gemini's skill listing; a separate listing of a copy of the
same profile shows all five skills enabled.

The hook check runs the configured loader command directly; it does not
exercise signed-in session lifecycle or Codex hook trust. Native worker
execution, Antigravity IDE loading, and model behavior were not tested. No
model requests were made, so whether models follow the renamed workflow or
convert older projects remains unverified.

Evidence: `/tmp/claude-1000/-home-jeio-src-kaylo/2cf32f63-d53f-4752-b884-e2b495a04c4a/scratchpad/release-0.7.0/parity.py`, `/tmp/claude-1000/-home-jeio-src-kaylo/2cf32f63-d53f-4752-b884-e2b495a04c4a/scratchpad/release-0.7.0/parity.log`, and
`/tmp/claude-1000/-home-jeio-src-kaylo/2cf32f63-d53f-4752-b884-e2b495a04c4a/scratchpad/release-0.7.0/parity-9psigcb6`. Temporary profiles contain no copied account
credentials. Normal host profiles and trust settings were not changed.

## Public installation 0.7.0 — 2026-09-28

After the `v0.7.0` tag (`10020db`) was pushed, PR #8 was merged with a merge
commit (`0e6e8a1`) and the GitHub release was published. Fresh temporary
profiles then installed Kaylo from public GitHub with no Git URL rewriting.

| Host | Command path | Observed result |
| --- | --- | --- |
| Claude Code 2.1.283, temporary `CLAUDE_CONFIG_DIR` | `claude plugin marketplace add jeio-dev/kaylo`, `claude plugin install kaylo@kaylo` | Installed 0.7.0 |
| Codex CLI 0.157.1, temporary `CODEX_HOME` | `codex plugin marketplace add jeio-dev/kaylo`, `codex plugin add kaylo@kaylo` | Installed 0.7.0 |
| Gemini CLI 0.61.0, temporary `GEMINI_CLI_HOME` | `gemini extensions install https://github.com/jeio-dev/kaylo --ref v0.7.0` | Installed; skill listing shows all five skills enabled |
| Antigravity CLI 1.2.11, private profile mounted with Bubblewrap | `git clone --branch v0.7.0` from GitHub, then `agy plugin install` with the network disabled | Installed five skills and three agents |

Each installed package matches all 22 shared resources, reports version 0.7.0
in its manifests, has the tag's exact build skill, and contains no
`templates/OBJECTIVE.md`, `templates/PLAN.md`, or contributor `AGENTS.md`.
The merge commit's tree is identical to the tag, and all nine commits listed in
the changelog are reachable from `main`.

Because `main` and `v0.7.0` have the same tree, these installs do not show
that the catalogs select the tag rather than the default branch. OpenCode loads
a checkout directly and was not reinstalled. No model requests, hook trust,
signed-in session lifecycle, or native worker execution were exercised. Normal
host profiles were not changed.

Evidence: `/tmp/claude-1000/-home-jeio-src-kaylo/2cf32f63-d53f-4752-b884-e2b495a04c4a/scratchpad/release-0.7.0/public-check.py` and `/tmp/claude-1000/-home-jeio-src-kaylo/2cf32f63-d53f-4752-b884-e2b495a04c4a/scratchpad/release-0.7.0/public-zdlb68qf`.

## Installed-package checks and update trial — 2026-09-28

Follow-up to the 0.7.0 release review (R46). `validate-package.cjs --installed`
now compares `WORKERS.md` and rejects unexpected files in the shared folders.
Checks ran on branch `tools/installed-package-checks` at `653a957` (PR #10,
squash-merged into `main`) with Node 24.21.0.

| Check | Observed result |
| --- | --- |
| `node --test tests/*.test.cjs` | 90 tests passed, including a new case: a leftover `templates/OBJECTIVE.md` is rejected, and a changed or missing `WORKERS.md` is reported |
| `node scripts/validate-package.cjs`, `git diff --check` | Passed; clean |
| New validator against copies of the nine real 0.7.0 install roots from the release trials (Claude, Codex, Gemini, Antigravity; mirrored and public) | All pass with 23 resources; no host adds files to the shared folders |
| A real 0.7.0 install copy with 0.6.0's `templates/OBJECTIVE.md` and `templates/PLAN.md` added | Rejected: "unexpected file: templates/OBJECTIVE.md" |
| Local update trial, `v0.6.0` → `653a957` (as 0.7.0), all five hosts in temporary profiles | Passed. After each tag, the mirror's `main` moved one commit ahead with a changed build skill. The Claude and Codex catalog clones received that commit, while their installed plugins matched the tag, so the catalogs select the tag. The v0.6.0 install was confirmed on every host before updating. Gemini listed all five skills at both steps; each 0.7.0 install passed the new validator with 23 resources |

The trial script is a local contributor tool in the excluded `.local/release/`
folder, not a shipped resource. The trial used local Git mirrors; public
transport was last checked for the published `v0.7.0`. No model requests, hook
trust, signed-in session lifecycle, or native worker execution were exercised.
Evidence: `/tmp/kaylo-parity-q3_0yoe4`.
