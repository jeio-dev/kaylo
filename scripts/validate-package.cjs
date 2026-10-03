'use strict';

// Read-only release and resource checks; no host configuration or model calls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--installed')) {
  console.error('Usage: node scripts/validate-package.cjs [--installed /path/to/package]');
  process.exit(2);
}
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const skills = ['build', 'close', 'define', 'plan', 'review'];
const payload = ['skills', 'agents', 'claude-agents', 'templates', 'scripts', 'hooks'];
// Root files that skills or briefs load by relative path.
const rootResources = ['WORKERS.md'];
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    assert(!entry.isSymbolicLink(), `Package resources must be real files: ${file}`);
    return entry.isDirectory() ? files(file) : [file];
  });
}
// Same adapter rule as scripts/sync-claude-agents.cjs; keep the two in step.
// Host tool names differ, so shared briefs carry no tools line.
// Insert Claude's tool lists after the model line; never fall through silently.
const claudeTools = {
  researcher: 'Read, Glob, Grep, WebSearch, WebFetch',
  reviewer: 'Read, Glob, Grep, Bash, WebFetch, WebSearch'
};
function claudeAdapter(text, name) {
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!frontmatter) throw new Error(`agents/${name}.md has no frontmatter`);
  if (/^[ \t]*["']?tools["']?[ \t]*:/mi.test(frontmatter[0])) {
    throw new Error(`agents/${name}.md must not carry a tools line; the Claude adapter adds its own`);
  }
  if (!claudeTools[name]) return text;
  const anchor = /^model: inherit(\r?\n)/m;
  if (!anchor.test(frontmatter[0])) {
    throw new Error(`agents/${name}.md frontmatter has no "model: inherit" line to place the Claude tools line after`);
  }
  return frontmatter[0].replace(anchor, `model: inherit$1tools: ${claudeTools[name]}$1`) +
    text.slice(frontmatter[0].length);
}
try {
  const claude = read('.claude-plugin/plugin.json');
  const codex = read('.codex-plugin/plugin.json');
  const gemini = read('gemini-extension.json');
  const antigravity = read('plugin.json');
  assert(/^\d+\.\d+\.\d+$/.test(claude.version), 'Expected a release version');
  for (const manifest of [claude, codex, gemini, antigravity]) {
    assert.equal(manifest.name, 'kaylo');
    assert.equal(manifest.description, claude.description);
  }
  // Antigravity's schema has no version field; its checkout tag is the version.
  for (const manifest of [codex, gemini]) assert.equal(manifest.version, claude.version);
  // The npm package carries the same release as the host manifests.
  const npm = read('package.json');
  assert.equal(npm.name, 'kaylo', 'package.json name must be kaylo');
  assert.equal(npm.version, claude.version, 'package.json version must match the plugin manifests');
  const tag = `v${claude.version}`;
  const cc = read('.claude-plugin/marketplace.json');
  const cx = read('.agents/plugins/marketplace.json');
  for (const catalog of [cc, cx]) {
    assert.equal(catalog.name, 'kaylo');
    assert.equal(catalog.plugins.length, 1);
    assert.equal(catalog.plugins[0].name, 'kaylo');
    assert.equal(catalog.plugins[0].source.ref, tag, 'Catalog must select the package release');
  }
  assert.equal(cc.plugins[0].source.source, 'url');
  assert.equal(cc.plugins[0].source.url, 'https://github.com/jeio-dev/kaylo.git');
  assert.equal(cx.plugins[0].source.source, 'url');
  assert.equal(cx.plugins[0].source.url, 'https://github.com/jeio-dev/kaylo.git');
  const local = read('development/.agents/plugins/marketplace.json');
  assert.equal(local.name, 'kaylo-local');
  assert.equal(local.plugins.length, 1);
  assert.equal(local.plugins[0].name, 'kaylo');
  assert.equal(local.plugins[0].source.source, 'local');
  assert.equal(local.plugins[0].source.path, './package');
  assert.equal(codex.skills, './skills/');
  assert.deepEqual(claude.agents, ['builder', 'researcher', 'reviewer'].map(name => `./claude-agents/${name}.md`));
  for (const name of ['builder', 'researcher', 'reviewer']) {
    const shared = fs.readFileSync(path.join(root, 'agents', `${name}.md`), 'utf8');
    // Frontmatter only: a brief's body may mention tools.
    const frontmatter = shared.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    assert(frontmatter, `Shared brief has no frontmatter: agents/${name}.md`);
    assert(!/^[ \t]*["']?tools["']?[ \t]*:/mi.test(frontmatter[0]),
      `Shared brief agents/${name}.md must not set tools in its frontmatter: host tool names differ ` +
      '(Gemini CLI, Antigravity, Claude), and a name one host does not know can stop the brief from starting. ' +
      'Host-specific tool lists belong in generated adapters such as claude-agents/.');
    const expected = claudeAdapter(shared, name);
    assert.equal(fs.readFileSync(path.join(root, 'claude-agents', `${name}.md`), 'utf8'), expected,
      `Claude agent adapter is stale: ${name}`);
  }
  assert.deepEqual(fs.readdirSync(path.join(root, 'skills')).sort(), skills);
  for (const name of skills) {
    const body = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(body, new RegExp(`^---\\r?\\nname: ${name}\\r?\\n`));
  }
  // One native default hook config: lifecycle matchers work in all three hosts.
  // Leave timeout unset because host APIs use different units.
  const groups = read('hooks/hooks.json').hooks.SessionStart;
  assert.deepEqual(groups.map(group => group.matcher), ['startup', 'resume']);
  for (const group of groups) {
    assert.equal(group.hooks.length, 1);
    assert.equal(group.hooks[0].type, 'command');
    assert.equal(group.hooks[0].timeout, undefined);
    assert.match(group.hooks[0].command, /CLAUDE_PLUGIN_ROOT/);
    assert.match(group.hooks[0].command, /PLUGIN_ROOT/);
    assert.match(group.hooks[0].command, /\$\{extensionPath\}/);
    assert.match(group.hooks[0].command, /session-start\.cjs/);
  }
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert(readme.includes(`\`${claude.version}\``), 'README version must match');
  assert(readme.includes(tag), 'README must name the release tag');
  // Every installed host must preserve the same source bytes and sibling layout,
  // with no leftover files from an earlier release in the shared folders.
  let compared = 0;
  if (args.length) {
    const installed = path.resolve(args[1]);
    const expected = [...payload.flatMap(folder => files(path.join(root, folder))
      .map(source => path.relative(root, source))), ...rootResources];
    for (const relative of expected) {
      const target = path.join(installed, relative);
      assert(fs.existsSync(target), `Installed resource is missing: ${relative}`);
      assert(fs.readFileSync(path.join(root, relative)).equals(fs.readFileSync(target)),
        `Installed resource differs: ${relative}`);
      compared++;
    }
    const known = new Set(expected);
    for (const folder of payload) {
      for (const file of files(path.join(installed, folder))) {
        const relative = path.relative(installed, file);
        assert(known.has(relative), `Installed package has an unexpected file: ${relative}`);
      }
    }
  }
  console.log(`Package ${tag}: five shared skills, matching versions and release catalogs${compared ? `; ${compared} installed resources match` : ''}.`);
} catch (error) {
  console.error(`Package validation failed: ${error.message}`);
  process.exitCode = 1;
}
