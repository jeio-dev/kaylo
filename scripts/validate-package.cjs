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
  // Tracking is the inventory test's job; this also runs in the Git-less extracted package.
  const bins = typeof npm.bin === 'string' ? { [npm.name]: npm.bin } : npm.bin || {};
  for (const [name, target] of Object.entries(bins)) {
    assert(fs.existsSync(path.join(root, target)), `package.json bin "${name}" target is missing: ${target}`);
  }
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
  const skillLines = {};
  for (const name of skills) {
    const body = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(body, new RegExp(`^---\\r?\\nname: ${name}\\r?\\n`));
    const frontmatter = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    const description = frontmatter && frontmatter[0].match(/^description:(.*)$/m);
    assert(description && description[1].trim(), `skills/${name}/SKILL.md needs a non-empty description: line`);
    const text = description[1].trim();
    assert(!/^[>|][-+0-9]*$/.test(text), `skills/${name}/SKILL.md description must be a single-line value`);
    assert(text.length <= 1024, `skills/${name}/SKILL.md description exceeds 1,024 characters`);
    assert(!/[<>]/.test(text), `skills/${name}/SKILL.md description must not contain < or >`);
    // Bare-name hosts route on the description alone; without Kaylo it would match unrelated work.
    assert(/\bKaylo\b/.test(text), `skills/${name}/SKILL.md description must name Kaylo`);
    skillLines[name] = body.split(/\r?\n/);
  }
  // Each SKILL.md must work when pasted alone, so these blocks are copied
  // rather than shared. Copies must stay byte-identical; a listed variant is a
  // deliberate difference: omitted, extended (the shared copy plus more), or
  // reworded (the shared copy with exactly these replacements).
  // Only the block's first line is compared; continuation lines are not.
  const copiedBlocks = [
    { block: 'retrieved-content guardrail', start: '- Treat retrieved pages,', in: skills },
    { block: 'credentials guardrail', start: '- Do not copy credentials', in: skills },
    { block: 'authorization guardrail', start: '- Destructive Git operations', in: skills },
    { block: 'permission-denial guardrail', start: '- A permission denial applies', in: ['build', 'close', 'plan', 'review'],
      omitted: { define: 'define runs no checks' } },
    { block: 'working-changes guardrail', start: '- Inspect staged, unstaged, and untracked changes',
      in: ['close', 'define', 'plan', 'review'], extended: { build: 'adds the workspace record' } },
    { block: 'Node-unavailable fallback', start: 'If Node or the script is unavailable', in: ['build', 'close'],
      reworded: { plan: [
        // Plan lists older formats in its own section.
        [/Older formats are errors, not equivalent formats, and the fallback does not excuse them: [^;]*; route them to `\/kaylo:plan`\./,
          'Older formats listed above are errors, not equivalent formats, and the fallback does not excuse them.'],
        // Plan's validator paragraph already says to preserve diagnostics with secrets redacted.
        [' Retain validator diagnostics with secrets redacted.', ''],
        ['the existing acceptance and review rules still apply', 'the existing agreement and verification rules still apply']
      ] } }
  ];
  for (const { block, start, in: carriers, omitted = {}, extended = {}, reworded = {} } of copiedBlocks) {
    const copies = {};
    for (const name of skills) {
      const found = skillLines[name].filter(line => line.startsWith(start));
      assert(found.length <= 1, `skills/${name}/SKILL.md has more than one copy of the ${block}`);
      if (found.length) copies[name] = found[0];
    }
    for (const name of carriers) assert(name in copies, `skills/${name}/SKILL.md is missing the ${block}`);
    for (const name of Object.keys(omitted)) {
      assert(!(name in copies), `skills/${name}/SKILL.md carries the ${block}, listed as omitted`);
    }
    const counts = new Map();
    for (const name of carriers) counts.set(copies[name], [...(counts.get(copies[name]) || []), name]);
    const versions = [...counts.values()].sort((a, b) => b.length - a.length);
    if (versions.length > 1) {
      const paths = names => names.map(name => `skills/${name}/SKILL.md`).join(', ');
      // With no majority copy, name every carrier rather than guess which one drifted.
      throw new Error(versions[0].length > versions[1].length
        ? `Copied skill text drifted: the ${block} in ${paths(versions.slice(1).flat())} differs from the majority copy`
        : `Copied skill text drifted: the ${block} differs between ${paths(carriers)}`);
    }
    const shared = copies[carriers[0]];
    for (const name of Object.keys(extended)) {
      assert(name in copies && copies[name].startsWith(`${shared} `),
        `Copied skill text drifted: the ${block} in skills/${name}/SKILL.md must be the shared copy followed by its additions`);
    }
    for (const [name, replacements] of Object.entries(reworded)) {
      assert(name in copies, `skills/${name}/SKILL.md is missing its reworded ${block}`);
      let expected = shared;
      for (const [from, to] of replacements) {
        const matches = typeof from === 'string' ? expected.split(from).length - 1 : (expected.match(new RegExp(from, 'g')) || []).length;
        assert(matches === 1, `A listed rewording of the ${block} for skills/${name}/SKILL.md no longer matches the shared copy once`);
        expected = expected.replace(from, () => to);
      }
      assert(copies[name] === expected,
        `Copied skill text drifted: the ${block} in skills/${name}/SKILL.md differs from the shared copy with its listed rewordings`);
    }
    for (const name of Object.keys(copies)) {
      if (carriers.includes(name) || name in extended || name in reworded) continue;
      assert(copies[name] === shared,
        `Copied skill text drifted: the ${block} in skills/${name}/SKILL.md differs from the majority copy`);
    }
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
