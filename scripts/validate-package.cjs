'use strict';

// Read-only release and resource checks; no host configuration or model calls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const skills = ['build', 'close', 'define', 'plan', 'review'];
const payload = ['skills', 'agents', 'claude-agents', 'templates', 'scripts', 'hooks'];
// Root files that skills or briefs load by relative path.
const rootResources = ['WORKERS.md'];
// Files that must link the canonical project-decisions contract.
const decisionConsumers = ['skills/plan/SKILL.md', 'skills/build/SKILL.md',
  'skills/review/SKILL.md', 'skills/close/SKILL.md',
  'skills/build/references/delegation.md', 'skills/review/references/delegation.md',
  'skills/plan/references/foundation.md', 'WORKERS.md'];
const testingConsumers = ['skills/plan/SKILL.md', 'skills/build/SKILL.md',
  'skills/review/SKILL.md', 'skills/close/SKILL.md',
  'skills/build/references/delegation.md', 'skills/review/references/delegation.md',
  'skills/plan/references/foundation.md', 'skills/plan/references/gates.md',
  'skills/build/references/test-author.md', 'agents/builder.md', 'agents/reviewer.md', 'WORKERS.md'];
const testAuthorConsumers = ['skills/plan/SKILL.md', 'skills/build/SKILL.md',
  'skills/build/references/delegation.md', 'skills/plan/references/testing.md', 'WORKERS.md'];
// Tests read the list without running the checks.
if (require.main !== module) {
  module.exports = { decisionConsumers, testingConsumers, testAuthorConsumers };
  return;
}
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--installed')) {
  console.error('Usage: node scripts/validate-package.cjs [--installed /path/to/package]');
  process.exit(2);
}
// A copied block ends where Markdown ends it: a bullet keeps its indented and
// lazy continuation lines, and a paragraph stops at a blank line.
function blockAt(lines, index) {
  const bullet = /^[-*+] /.test(lines[index]);
  let end = index + 1;
  for (; end < lines.length; end++) {
    if (lines[end].trim() === '') {
      const next = lines.slice(end).find(line => line.trim() !== '');
      if (!bullet || !next || !/^[ \t]/.test(next)) break;
    } else if (/^([-*+] |\d+[.)] |#{1,6}( |$)|```|>)/.test(lines[end])) {
      break;
    }
  }
  return lines.slice(index, end).join('\n');
}
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
  for (const name of skills) {
    const body = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(body, new RegExp(`^---\\r?\\nname: ${name}\\r?\\n`));
    const frontmatter = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    const description = frontmatter && frontmatter[0].match(/^description:(.*)$/m);
    assert(description && description[1].trim(), `skills/${name}/SKILL.md needs a non-empty description: line`);
    const text = description[1].trim();
    // Check the raw line only where it equals the YAML value: a plain scalar on
    // one line, with no quotes, indicators, comment, mapping colon, or continuation.
    const rest = frontmatter[0].slice(description.index + description[0].length);
    assert(!/^([>|"'[\]{}&*!%@`#]|- )/.test(text) && !/[ \t]#|:([ \t]|$)/.test(text) &&
      !/^(\r?\n[ \t]*)*\r?\n[ \t]+\S/.test(rest),
      `skills/${name}/SKILL.md description must be a plain single-line YAML value`);
    assert(text.length <= 1024, `skills/${name}/SKILL.md description exceeds 1,024 characters`);
    assert(!/[<>]/.test(text), `skills/${name}/SKILL.md description must not contain < or >`);
    // Bare-name hosts route on the description alone; without Kaylo it would match unrelated work.
    assert(/\bKaylo\b/.test(text), `skills/${name}/SKILL.md description must name Kaylo`);
  }
  // Optional project records still need their canonical contract and templates
  // in every shipped package. This checks resources, never project ADR semantics.
  const decisionContract = 'skills/plan/references/decisions.md';
  const decisionTemplates = ['templates/DECISION.md', 'templates/DECISION-INDEX.md'];
  const requiredResources = [
    ...['skills/close/references/release.md', 'skills/close/references/release-notes.md',
      'scripts/release-notes.cjs'].map(resource => ['release', resource]),
    ...[decisionContract, ...decisionTemplates].map(resource => ['decision', resource]),
    ...['skills/plan/references/testing.md', 'skills/build/references/test-author.md']
      .map(resource => ['testing', resource])
  ];
  for (const [kind, resource] of requiredResources) {
    const target = path.join(root, resource);
    assert(fs.existsSync(target) && fs.statSync(target).isFile(), `Required ${kind} resource is missing: ${resource}`);
  }
  // Absolute targets of a Markdown file's inline links and reference
  // definitions, ignoring fenced or inline code and HTML comments; a link may
  // carry a quoted title. Absolute paths compare on every OS. This is a
  // bounded scan, not a Markdown parser: setext or HTML links are not read.
  const linkTargets = file => {
    const text = fs.readFileSync(path.join(root, file), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[ \t]*$/gm, '')
      .replace(/`[^`\n]*`/g, '');
    const targets = [...text.matchAll(/\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g),
      ...text.matchAll(/^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)>?/gm)];
    return new Set(targets.map(match => path.resolve(root, path.dirname(file), match[1].split('#')[0])));
  };
  for (const consumer of decisionConsumers) {
    assert(fs.existsSync(path.join(root, consumer)), `Decision consumer is missing: ${consumer}`);
    assert(linkTargets(consumer).has(path.join(root, decisionContract)),
      `Missing canonical decision reference: ${consumer}`);
  }
  // Resource reachability only; this validates no project strategy, test syntax,
  // acceptance evidence, worker independence or authorization.
  for (const [consumers, contract, label] of [
    [testingConsumers, 'skills/plan/references/testing.md', 'canonical testing'],
    [testAuthorConsumers, 'skills/build/references/test-author.md', 'test-author']
  ]) {
    for (const consumer of consumers) {
      assert(fs.existsSync(path.join(root, consumer)), `Testing consumer is missing: ${consumer}`);
      assert(linkTargets(consumer).has(path.join(root, contract)), `Missing ${label} reference: ${consumer}`);
    }
  }
  const contractLinks = linkTargets(decisionContract);
  for (const template of decisionTemplates) {
    assert(contractLinks.has(path.join(root, template)), `Missing decision template reference: ${template}`);
  }
  // Each SKILL.md must work when pasted alone, so these blocks are copied
  // rather than shared. Copies must stay byte-identical; a listed variant is a
  // deliberate difference: omitted, extended (the shared copy plus more), or
  // reworded (the shared copy with exactly these replacements). A block names
  // its own documents when worker briefs or references carry the copies.
  const skillDocs = Object.fromEntries(skills.map(name => [name, `skills/${name}/SKILL.md`]));
  const briefDocs = Object.fromEntries(['builder', 'researcher', 'reviewer'].map(name => [name, `agents/${name}.md`]));
  const delegationDocs = { build: 'skills/build/references/delegation.md', review: 'skills/review/references/delegation.md' };
  const docLines = {};
  const linesOf = file => docLines[file] ||= fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
  const copiedBlocks = [
    { block: 'retrieved-content guardrail', start: '- Treat retrieved pages,', in: skills },
    { block: 'credentials guardrail', start: '- Do not copy credentials', in: skills },
    { block: 'authorization guardrail', start: '- Destructive Git operations', in: skills },
    { block: 'permission-denial guardrail', start: '- A permission denial applies', in: ['build', 'close', 'plan', 'review'],
      omitted: { define: 'define runs no checks' } },
    { block: 'working-changes guardrail', start: '- Inspect staged, unstaged, and untracked changes',
      in: ['close', 'define', 'plan', 'review'], extended: { build: 'adds the workspace record' } },
    { block: 'project-decisions entry', start: 'At entry, including direct/resumed work', in: ['build', 'review', 'close'],
      omitted: { define: 'define does not consume ADR records' },
      // Plan links its own references directory.
      reworded: { plan: [['../plan/references/decisions.md', 'references/decisions.md']] } },
    { block: 'testing-evidence entry', start: 'For current work, including direct/resumed entry', in: ['build', 'review', 'close'],
      omitted: { define: 'define does not choose a testing strategy' },
      reworded: { plan: [['../plan/references/testing.md', 'references/testing.md']] } },
    { block: 'decision-resource fallback', start: 'If the decision reference', in: ['build', 'review', 'close'],
      omitted: { define: 'define does not consume ADR records' },
      // Plan has no checkbox or Result/Review/Completion field of its own.
      reworded: { plan: [['stop affected work before implementation, review readiness, task acceptance, or closure; ' +
        'leave its checkbox open and record `Decision consistency: unreadable — <missing resource paths, affected scope, ' +
        'and resume action>` in the existing Result/Review/Completion field.',
      'stop affected planning before agreement or readiness and record `Decision consistency: unreadable — <missing ' +
        'resource paths, affected scope, and resume action>` under `## Agreement` as an unresolved decision and in ' +
        '`## Next step`, or in the response when no phase plan exists.']] } },
    { block: 'Node-unavailable fallback', start: 'If Node or the script is unavailable', in: ['build', 'close'],
      reworded: { plan: [
        // Plan lists older formats in its own section.
        [/Older formats are errors, not equivalent formats, and the fallback does not excuse them: [^;]*; route them to `\/kaylo:plan`\./,
          'Older formats listed above are errors, not equivalent formats, and the fallback does not excuse them.'],
        // Plan's validator paragraph already says to preserve diagnostics with secrets redacted.
        [' Retain validator diagnostics with secrets redacted.', ''],
        ['the existing acceptance and review rules still apply', 'the existing agreement and verification rules still apply']
      ] } },
    { block: 'worker-brief project decisions', start: "Use the packet's relevant decisions", docs: briefDocs,
      in: ['builder', 'reviewer'],
      // Research packets usually carry no decisions, so a researcher answers rather than stops.
      reworded: { researcher: [['accepted records editable. If the assignment lacks enough decision context,\n' +
        'return the specific blocker rather than reading all phase history.',
      'accepted records editable. When the packet supplies no decisions, answer the\n' +
        'question and name any decision the answer may depend on, rather than reading all\nphase history.']] } },
    { block: 'project-decisions packet rule', start: 'Resolve [project decisions]', docs: delegationDocs, in: ['build'],
      // Review names its own Supply item where build uses its existing packet content.
      reworded: { review: [['In its existing relevant-decisions/interface-contract content,\ninclude applicable ADR links',
        "In the packet's applicable-decisions item below, include\napplicable ADR links"]] } }
  ];
  for (const { block, start, docs = skillDocs, in: carriers, omitted = {}, extended = {}, reworded = {} } of copiedBlocks) {
    const copies = {};
    for (const [name, file] of Object.entries(docs)) {
      const lines = linesOf(file);
      const found = lines.flatMap((line, index) => line.startsWith(start) ? [blockAt(lines, index)] : []);
      assert(found.length <= 1, `${file} has more than one copy of the ${block}`);
      if (found.length) copies[name] = found[0];
    }
    for (const name of [...carriers, ...Object.keys(extended), ...Object.keys(reworded)]) {
      assert(name in copies, `${docs[name]} is missing the ${block}`);
    }
    for (const name of Object.keys(omitted)) {
      assert(!(name in copies), `${docs[name]} carries the ${block}, listed as omitted`);
    }
    const counts = new Map();
    for (const name of carriers) counts.set(copies[name], [...(counts.get(copies[name]) || []), name]);
    const versions = [...counts.values()].sort((a, b) => b.length - a.length);
    if (versions.length > 1) {
      const paths = names => names.map(name => docs[name]).join(', ');
      // With no majority copy, name every carrier rather than guess which one drifted.
      throw new Error(versions[0].length > versions[1].length
        ? `Copied text drifted: the ${block} in ${paths(versions.slice(1).flat())} differs from the majority copy`
        : `Copied text drifted: the ${block} differs between ${paths(carriers)}`);
    }
    const shared = copies[carriers[0]];
    for (const name of Object.keys(extended)) {
      assert(name in copies && copies[name].startsWith(`${shared} `),
        `Copied text drifted: the ${block} in ${docs[name]} must be the shared copy followed by its additions`);
    }
    for (const [name, replacements] of Object.entries(reworded)) {
      let expected = shared;
      for (const [from, to] of replacements) {
        const matches = typeof from === 'string' ? expected.split(from).length - 1 : (expected.match(new RegExp(from, 'g')) || []).length;
        assert(matches === 1, `A listed rewording of the ${block} for ${docs[name]} no longer matches the shared copy once`);
        expected = expected.replace(from, () => to);
      }
      assert(copies[name] === expected,
        `Copied text drifted: the ${block} in ${docs[name]} differs from the shared copy with its listed rewordings`);
    }
    for (const name of Object.keys(copies)) {
      if (carriers.includes(name) || name in extended || name in reworded) continue;
      assert(copies[name] === shared,
        `Copied text drifted: the ${block} in ${docs[name]} differs from the majority copy`);
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
