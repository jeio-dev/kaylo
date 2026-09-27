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
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    assert(!entry.isSymbolicLink(), `Package resources must be real files: ${file}`);
    return entry.isDirectory() ? files(file) : [file];
  });
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
    const expected = name === 'researcher'
      ? shared.replace(/^tools: .*$/m, 'tools: Read, Glob, Grep, WebSearch, WebFetch')
      : shared;
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
  // Every installed host must preserve the same source bytes and sibling layout.
  let compared = 0;
  if (args.length) {
    const installed = path.resolve(args[1]);
    for (const folder of payload) {
      for (const source of files(path.join(root, folder))) {
        const relative = path.relative(root, source);
        assert(fs.readFileSync(source).equals(fs.readFileSync(path.join(installed, relative))),
          `Installed resource differs: ${relative}`);
        compared++;
      }
    }
  }
  console.log(`Package ${tag}: five shared skills, matching versions and release catalogs${compared ? `; ${compared} installed resources match` : ''}.`);
} catch (error) {
  console.error(`Package validation failed: ${error.message}`);
  process.exitCode = 1;
}
