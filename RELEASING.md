# Release maintenance

One release ships the shared `skills/`, `agents/`, `templates/`, `scripts/`, and
`hooks/` directories to every host. Generated `claude-agents/` adapters keep
worker bodies identical and add Claude's tool lists to the researcher and reviewer.
Shared briefs carry no `tools` frontmatter, because tool names differ between
hosts; the package validator rejects one. Keep relative resource paths intact.
Do not publish a skills-only subset or independently edit host copies.

## Prepare a release

1. Set the same semantic version in `.claude-plugin/plugin.json`,
   `.codex-plugin/plugin.json`, `gemini-extension.json`, and the npm
   `package.json`. Antigravity's root manifest has no version field; its
   installed checkout tag identifies the release.
2. Set the plugin source `ref` in both `.claude-plugin/marketplace.json` and
   `.agents/plugins/marketplace.json` to `v<version>`. Catalogs on the default
   branch select released tags rather than development commits. Leave the
   `development/` catalog pointing at its generated `./package`. Run
   `node scripts/stage-development.cjs` before testing local Codex installs.
3. After editing a shared worker brief, run `node scripts/sync-claude-agents.cjs`.
   Update README version/tag examples, the changelog, and verification evidence,
   including the current status table at the top of `VERIFICATION.md`.
   Record unavailable hosts and distinguish file/discovery parity from model behavior.
4. Run `node scripts/validate-package.cjs`,
   `node --test tests/*.test.cjs`,
   `claude plugin validate .claude-plugin/plugin.json --strict`,
   `claude plugin validate .claude-plugin/marketplace.json --strict`,
   `agy plugin validate .`, and `git diff --check`.
5. In temporary profiles, install the previous release in Claude, Codex,
   Antigravity, and Gemini, confirm it, then update each to the prepared release,
   and load the checkout in OpenCode 2. Confirm all five skills are discovered;
   OpenCode builds its catalog after server startup, so wait until
   `GET /api/skill` lists all five IDs with paths into the checkout rather than
   treating an immediate empty response as a failure.
   Run `node scripts/validate-package.cjs --installed <package-root>` against
   each installed package; it compares every shared resource and `WORKERS.md` and
   rejects leftover files in the shared folders. When Git transport is redirected
   to a local mirror, move the mirror's default branch one changed commit past each
   release tag and confirm installs match the tag, not the branch. Check hook
   discovery and startup context separately from skill loading.
6. Start all three installed workers on each host covered by the live start
   check. Use a signed-in, isolated trial profile containing the prepared Kaylo
   package and a temporary project with no project or user workers named
   `builder`, `researcher`, or `reviewer`; verify the installed package root with
   step 5 first. Run these commands from that project, substituting the trial
   root used in step 5:

   ```sh
   trial_root=/absolute/path/to/temporary-trial
   for role in builder researcher reviewer; do
     CLAUDE_CONFIG_DIR="$trial_root/claude" claude --agent "kaylo:$role" \
       -p 'Reply with the single word: ok. Do not use tools.' --output-format json \
       --debug-file "$trial_root/claude-$role.debug" \
       >"$trial_root/claude-$role.json" 2>"$trial_root/claude-$role.stderr"
     printf 'Claude %s exit=%s\n' "$role" "$?"
   done
   for role in builder researcher reviewer; do
     bwrap --die-with-parent --ro-bind / / --bind "$trial_root" "$trial_root" \
       --bind "$trial_root/agy-profile" "$HOME/.gemini" \
       agy --agent "$role" -p 'Reply with the single word: ok. Do not use tools.' \
       --print-timeout 120s --output-format json \
       --log-file "$trial_root/agy-$role.log" \
       >"$trial_root/agy-$role.json" 2>"$trial_root/agy-$role.stderr"
     printf 'Antigravity %s exit=%s\n' "$role" "$?"
   done
   rg -c '\[API REQUEST\] /v1/messages' "$trial_root"/claude-*.debug
   rg -c 'streamGenerateContent\?alt=sse' "$trial_root"/agy-*.log
   ```

   The Antigravity trial profile must contain only the Kaylo plugin's workers,
   since `agy --agent` uses an unqualified name. Confirm that `agy agents` in
   this profile lists all three and that the project has no `.agents/agents/`
   definitions. A pass requires the selected worker to reach at least one model
   generation request without an executor-construction error; an answer and
   exit code 0 provide additional evidence. An unknown agent, `failed to
   construct executor`, an unknown tool, or a timeout fails the check. An empty
   headless answer alone is inconclusive: a working Antigravity researcher
   previously stopped at a file permission prompt without printing an answer.
   The final two commands count request entries in Claude Code 2.1.286 debug
   logs and Antigravity CLI 1.2.14 logs; if a host changes its log format,
   inspect its new request records instead of treating zero matches as proof of
   zero requests. Keep trial logs private because they may contain session
   details. Inspect the session log and retry interactively if necessary. Record the
   host and version, each worker, exit status, request count, output or error,
   and whether the worker came from the installed package in `VERIFICATION.md`.
   Each successful start makes at least one model request on the signed-in
   account; six starts across these two hosts cost at least six requests, and
   retries or tool use can increase the total. `--print-timeout` limits wait
   time, not model charges. This checks startup as the main agent, not answer
   quality or delegation through a parent. Gemini CLI documents extension
   subagents, but its Kaylo worker selection and same-name collisions remain
   unverified (#32), so record it as uncovered until an installed-extension
   start check is established. Codex and OpenCode have no Kaylo-native worker
   registration to start.

All three hook-capable hosts discover `hooks/hooks.json`. Use exact startup
and resume matchers and keep the shared loader's two root-resolution mechanisms.
Leave timeout unset: Claude/Codex use seconds, while Gemini uses milliseconds.
The reminder itself performs no project reads or writes; it reads only the host's hook payload on stdin, for at most 500 ms.

## Publish the prepared release

Publication requires the maintainer's authorization. Commit the reviewed package,
create the immutable `v<version>` tag at that commit, and push the tag **before**
advancing the public marketplace on the default branch. For example, after
committing the prepared 0.9.2 package:

```sh
git tag -a v0.9.2 -m "Kaylo v0.9.2: <summary>"
git push origin v0.9.2
git push origin HEAD:main
```

Use the repository's normal pull request/merge process if the default branch is
protected. Make the tag reachable before merging the catalog change. Never move
an existing release tag. Publish a GitHub release with its changelog and verification
limits, then test both marketplace installs against the public repository in
fresh temporary profiles. These steps are maintainer commands, not a Kaylo installer.

Publish the npm package `kaylo` only after the tag is pushed, so `kaylo@<version>`
never exists without tag `v<version>`. npm packs whatever folder it runs in, so
publish from a `git archive` export of the tag, never from the working tree.
With `HEAD` at the tag and a clean working tree:

```sh
tag=v0.10.0  # the release tag just pushed
KAYLO_INVENTORY_REF="$tag" node --test tests/package-inventory.test.cjs
export_dir="$(mktemp -d)"
git archive "$tag" | tar -x -C "$export_dir"
(cd "$export_dir" && npm publish)
```

The inventory test refuses when `HEAD` is not at the tag or the tree is dirty,
then proves the packed tarball holds exactly the tag's files and passes package
validation. Publishing to npm requires the maintainer's authorization and their
own `npm login`.

Record public installation results and verification limits with each release.
Keep historical fixture checks distinct from checks against the published tag.

## How users update

- Claude: refresh the `kaylo` catalog, then update `kaylo@kaylo`. Auto-update is
  optional and host-managed.
- Codex: upgrade the `kaylo` catalog, then add `kaylo@kaylo` again to refresh its
  cached install. Changed versions prevent reuse of an older cache.
- OpenCode: fetch tags, check out the newer release in the full clone, and restart
  the session/server. No supporting files are copied separately.
- Antigravity: update the full release clone and reinstall it; for manual IDE
  placement, update the package checkout and restart.
- Gemini: uninstall the tag-pinned extension and install the newer tag. A native
  update of a pinned source does not select a different release tag. Local installs
  can refresh with `gemini extensions update kaylo` after changing their source.

Start a new session after updating. Existing PRDs, roadmaps, and phase plans
remain in the user's project. After the industry-terms rename, `/kaylo:plan`
converts older project files; the changelog lists the manual steps. Preserve
local modifications and host scope preferences; do not force checkout or
silently reset user settings.
