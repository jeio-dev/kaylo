# Release maintenance

One release ships the shared `skills/`, `agents/`, `templates/`, `scripts/`, and
`hooks/` directories to every host. Generated `claude-agents/` adapters keep
worker bodies identical while translating Claude researcher tool names. Keep relative resource paths intact. Do not
publish a skills-only subset or independently edit host copies.

## Prepare a release

1. Set the same semantic version in `.claude-plugin/plugin.json`,
   `.codex-plugin/plugin.json`, and `gemini-extension.json`. Antigravity's root
   manifest has no version field; its installed checkout tag identifies the release.
2. Set the plugin source `ref` in both `.claude-plugin/marketplace.json` and
   `.agents/plugins/marketplace.json` to `v<version>`. Catalogs on the default
   branch select released tags rather than development commits. Leave the
   `development/` catalog pointing at its generated `./package`. Run
   `node scripts/stage-development.cjs` before testing local Codex installs.
3. After editing a shared worker brief, run `node scripts/sync-claude-agents.cjs`.
   Update README version/tag examples, the changelog, and verification evidence.
   Record unavailable hosts and distinguish file/discovery parity from model behavior.
4. Run `node scripts/validate-package.cjs`,
   `node --test tests/*.test.cjs`,
   `claude plugin validate .claude-plugin/plugin.json --strict`,
   `claude plugin validate .claude-plugin/marketplace.json --strict`,
   `agy plugin validate .`, and `git diff --check`.
5. In temporary profiles, install/reinstall Claude, Codex, Antigravity, and Gemini,
   and load the checkout in OpenCode 2. Confirm all five skills are discovered.
   Run `node scripts/validate-package.cjs --installed <package-root>` against
   copied packages to compare every shared resource. Check hook discovery and
   startup context separately from skill loading.

All three hook-capable hosts discover `hooks/hooks.json`. Use exact startup
and resume matchers and keep the shared loader's two root-resolution mechanisms.
Leave timeout unset: Claude/Codex use seconds, while Gemini uses milliseconds.
The reminder itself performs no project reads, writes, or asynchronous work.

## Publish the prepared release

Publication requires the maintainer's authorization. Commit the reviewed package,
create the immutable `v<version>` tag at that commit, and push the tag **before**
advancing the public marketplace on the default branch. For example, after
committing the prepared 0.6.0 package:

```sh
git tag v0.6.0
git push origin v0.6.0
git push origin HEAD:main
```

Use the repository's normal pull request/merge process if the default branch is
protected. Make the tag reachable before merging the catalog change. Never move
an existing release tag. Publish a GitHub release with its changelog and verification
limits, then test both marketplace installs against the public repository in
fresh temporary profiles. These steps are maintainer commands, not a Kaylo installer.

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
