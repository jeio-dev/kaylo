'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-package-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(repo, dir, {
    recursive: true,
    filter: source => !['.git', '.local'].includes(path.relative(repo, source).split(path.sep)[0]) &&
      !path.relative(repo, source).startsWith(`development${path.sep}package`)
  });
  return dir;
}
function check(dir, args = []) {
  return spawnSync(process.execPath, [path.join(dir, 'scripts/validate-package.cjs'), ...args], { encoding: 'utf8' });
}
function edit(dir, file, update) {
  const target = path.join(dir, file);
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  update(value);
  fs.writeFileSync(target, JSON.stringify(value));
}
test('current release has consistent catalogs and all shared skills', () => {
  assert.equal(check(repo).status, 0);
});
test('version drift between hosts is rejected', t => {
  const dir = fixture(t);
  edit(dir, 'gemini-extension.json', value => { value.version = '99.0.0'; });
  assert.equal(check(dir).status, 1);
});
test('npm package version drift from the plugin manifests is rejected', t => {
  const dir = fixture(t);
  edit(dir, 'package.json', value => { value.version = '99.0.0'; });
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /package\.json version must match the plugin manifests/);
});
test('a missing npm bin target is rejected', t => {
  const dir = fixture(t);
  fs.rmSync(path.join(dir, 'bin/kaylo.cjs'));
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /package\.json bin "kaylo" target is missing: bin\/kaylo\.cjs/);
});
test('development branch cannot accidentally become a published plugin source', t => {
  const dir = fixture(t);
  edit(dir, '.agents/plugins/marketplace.json', value => { value.plugins[0].source.ref = 'main'; });
  assert.equal(check(dir).status, 1);
});
test('ambiguous cross-host timeout units are rejected', t => {
  const dir = fixture(t);
  edit(dir, 'hooks/hooks.json', value => { value.hooks.SessionStart[0].hooks[0].timeout = 2; });
  assert.equal(check(dir).status, 1);
});
test('installed package preserves supporting files and detects missing or altered resources', t => {
  const dir = fixture(t);
  assert.equal(check(repo, ['--installed', dir]).status, 0);
  const target = path.join(dir, 'templates/PHASE.md');
  const original = fs.readFileSync(target);
  fs.appendFileSync(target, '\nChanged template\n');
  assert.equal(check(repo, ['--installed', dir]).status, 1);
  fs.writeFileSync(target, original);
  fs.unlinkSync(path.join(dir, 'scripts/validate-plan.cjs'));
  assert.equal(check(repo, ['--installed', dir]).status, 1);
});
test('installed package rejects leftover files and checks root resources', t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, 'templates/OBJECTIVE.md'), '# Objective\n');
  const leftover = check(repo, ['--installed', dir]);
  assert.equal(leftover.status, 1);
  assert.match(leftover.stderr, /unexpected file: templates[\\/]OBJECTIVE\.md/);
  fs.unlinkSync(path.join(dir, 'templates/OBJECTIVE.md'));
  assert.equal(check(repo, ['--installed', dir]).status, 0);
  fs.appendFileSync(path.join(dir, 'WORKERS.md'), '\nChanged guide\n');
  assert.match(check(repo, ['--installed', dir]).stderr, /differs: WORKERS\.md/);
  fs.unlinkSync(path.join(dir, 'WORKERS.md'));
  assert.match(check(repo, ['--installed', dir]).stderr, /missing: WORKERS\.md/);
});
test('stale generated worker instructions are rejected', t => {
  const dir = fixture(t);
  fs.appendFileSync(path.join(dir, 'agents/reviewer.md'), '\nUpdated reviewer instructions\n');
  assert.equal(check(dir).status, 1);
  const generation = spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')]);
  assert.equal(generation.status, 0);
  assert.equal(check(dir).status, 0);
});
test('generated Claude adapters have their assigned tool lists and preserve shared bodies', t => {
  const dir = fixture(t);
  fs.rmSync(path.join(dir, 'claude-agents'), { recursive: true });
  const generation = spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')]);
  assert.equal(generation.status, 0);
  const lists = {
    researcher: 'Read, Glob, Grep, WebSearch, WebFetch',
    reviewer: 'Read, Glob, Grep, Bash, WebFetch, WebSearch'
  };
  for (const name of ['builder', 'researcher', 'reviewer']) {
    const shared = fs.readFileSync(path.join(dir, 'agents', `${name}.md`), 'utf8');
    const adapter = fs.readFileSync(path.join(dir, 'claude-agents', `${name}.md`), 'utf8');
    assert.doesNotMatch(shared.split('\n---\n')[0], /^tools\s*:/m);
    if (lists[name]) {
      assert.match(adapter, new RegExp(`^---\\nname: ${name}\\ndescription: [^\\n]+\\nmodel: inherit\\ntools: ${lists[name]}\\n---\\n`));
      assert.equal(adapter.replace(`tools: ${lists[name]}\n`, ''), shared);
    } else {
      assert.equal(adapter, shared);
    }
    assert.equal(adapter, fs.readFileSync(path.join(repo, 'claude-agents', `${name}.md`), 'utf8'));
  }
  assert.equal(check(dir).status, 0);
});
test('a tools line in any shared brief frontmatter is rejected', t => {
  for (const name of ['builder', 'researcher', 'reviewer']) {
    const dir = fixture(t);
    const target = path.join(dir, 'agents', `${name}.md`);
    const original = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target, original.replace('model: inherit\n', 'model: inherit\ntools: [read_file, grep_search]\n'));
    // Mirror the edit so only the tools rule, not adapter staleness, can fail.
    if (name !== 'researcher') fs.copyFileSync(target, path.join(dir, 'claude-agents', `${name}.md`));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`agents/${name}\\.md must not set tools in its frontmatter`));
    assert.match(result.stderr, /Gemini CLI, Antigravity, Claude/);
    assert.match(result.stderr, /generated adapters/);
  }
});
test('a quoted, indented, or capitalised tools key in shared frontmatter is rejected', t => {
  for (const line of ['"tools": [read_file]', "'tools': [read_file]", '  tools: [read_file]', '\ttools: [read_file]', 'Tools: [read_file]', 'tools : [read_file]']) {
    const dir = fixture(t);
    const target = path.join(dir, 'agents/builder.md');
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('model: inherit\n', `model: inherit\n${line}\n`));
    fs.copyFileSync(target, path.join(dir, 'claude-agents/builder.md'));
    const result = check(dir);
    assert.equal(result.status, 1, line);
    assert.match(result.stderr, /agents\/builder\.md must not set tools in its frontmatter/, line);
  }
});
test('a tools mention in a shared brief body is allowed', t => {
  const dir = fixture(t);
  fs.appendFileSync(path.join(dir, 'agents/reviewer.md'), '\ntools: mentioned in the body only\n');
  assert.equal(spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')]).status, 0);
  assert.equal(check(dir).status, 0);
});
test('a stale or unrestricted Claude researcher adapter is rejected', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'claude-agents/researcher.md');
  const original = fs.readFileSync(target, 'utf8');
  const variants = [
    fs.readFileSync(path.join(dir, 'agents/researcher.md'), 'utf8'),
    original.replace('tools: Read, Glob, Grep, WebSearch, WebFetch', 'tools: Read, Glob, Grep, WebSearch, WebFetch, Edit'),
    original.replace('tools: Read, Glob, Grep, WebSearch, WebFetch',
      'tools: [read_file, list_directory, glob, grep_search, google_web_search, web_fetch]')
  ];
  for (const variant of variants) {
    assert.notEqual(variant, original);
    fs.writeFileSync(target, variant);
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Claude agent adapter is stale: researcher/);
  }
  fs.writeFileSync(target, original);
  assert.equal(check(dir).status, 0);
});
test('a stale or differently restricted Claude reviewer adapter is rejected', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'claude-agents/reviewer.md');
  const original = fs.readFileSync(target, 'utf8');
  const variants = [
    fs.readFileSync(path.join(dir, 'agents/reviewer.md'), 'utf8'),
    original.replace('tools: Read, Glob, Grep, Bash, WebFetch, WebSearch', 'tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Edit'),
    original.replace('tools: Read, Glob, Grep, Bash, WebFetch, WebSearch', 'tools: Read, Glob, Grep, WebFetch, WebSearch')
  ];
  for (const variant of variants) {
    assert.notEqual(variant, original);
    fs.writeFileSync(target, variant);
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Claude agent adapter is stale: reviewer/);
  }
  fs.writeFileSync(target, original);
  assert.equal(check(dir).status, 0);
});
test('adapter generation fails loudly instead of dropping Claude tool lists', t => {
  for (const name of ['researcher', 'reviewer']) {
    const dir = fixture(t);
    const source = path.join(dir, 'agents', `${name}.md`);
    const target = path.join(dir, 'claude-agents', `${name}.md`);
    const original = fs.readFileSync(source, 'utf8');
    const adapter = fs.readFileSync(target, 'utf8');
    const sync = () => spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')], { encoding: 'utf8' });
    fs.writeFileSync(source, original.replace('model: inherit\n', 'model: inherit\ntools: [read_file]\n'));
    const carried = sync();
    assert.notEqual(carried.status, 0);
    assert.match(carried.stderr, /must not carry a tools line/);
    fs.writeFileSync(source, original.replace('model: inherit\n', ''));
    const missing = sync();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /no "model: inherit" line/);
    const invalid = check(dir);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /no "model: inherit" line/);
    assert.equal(fs.readFileSync(target, 'utf8'), adapter);
  }
});
test('skill descriptions must be single-line, present, short, tag-free, and name Kaylo', t => {
  const cases = [
    ['missing', text => text.replace(/^description:.*\n/m, ''), /skills\/plan\/SKILL\.md needs a non-empty description: line/],
    ['empty', text => text.replace(/^description:.*$/m, 'description:   '), /skills\/plan\/SKILL\.md needs a non-empty description: line/],
    ['folded block', text => text.replace(/^description: (.*)$/m, 'description: >\n  $1'), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['quoted', text => text.replace(/^description: (.*)$/m, 'description: "$1"'), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['comment names Kaylo', text => text.replace(/^description:.*$/m, 'description: Plan unrelated work. # Kaylo'), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['continuation line', text => text.replace(/^(description:.*)$/m, `$1\n  ${'x'.repeat(1100)} Use <phase>.`), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['continuation after a blank line', text => text.replace(/^(description:.*)$/m, '$1\n\n  more text'), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['mapping colon', text => text.replace(/^(description:.*)$/m, '$1 Note: ask first.'), /skills\/plan\/SKILL\.md description must be a plain single-line YAML value/],
    ['too long', text => text.replace(/^(description:.*)$/m, `$1 ${'x'.repeat(1024)}`), /skills\/plan\/SKILL\.md description exceeds 1,024 characters/],
    ['angle bracket', text => text.replace(/^(description:.*)$/m, '$1 Use <phase>.'), /skills\/plan\/SKILL\.md description must not contain < or >/],
    ['no Kaylo', text => text.replace(/^(description:.*)$/m, m => m.replaceAll('Kaylo', 'project')), /skills\/plan\/SKILL\.md description must name Kaylo/]
  ];
  for (const [label, update, message] of cases) {
    const dir = fixture(t);
    const target = path.join(dir, 'skills/plan/SKILL.md');
    const original = fs.readFileSync(target, 'utf8');
    const changed = update(original);
    assert.notEqual(changed, original, label);
    fs.writeFileSync(target, changed);
    const result = check(dir);
    assert.equal(result.status, 1, label);
    assert.match(result.stderr, message, label);
  }
});
test('a drifted or missing copy of shared skill text names the skill and block', t => {
  const fallback = /^If Node or the script is unavailable.*$/m;
  const cases = [
    ['skills/review/SKILL.md', 'Read only necessary sensitive data', 'Read only needed sensitive data',
      /credentials guardrail in skills\/review\/SKILL\.md differs from the majority copy/],
    ['skills/review/SKILL.md', /^(- Do not copy credentials.*)$/m, '$1\n  Also share them with reviewers.',
      /credentials guardrail in skills\/review\/SKILL\.md differs from the majority copy/],
    ['skills/review/SKILL.md', /^(- Do not copy credentials.*)$/m, '$1\nAlso share them with reviewers.',
      /credentials guardrail in skills\/review\/SKILL\.md differs from the majority copy/],
    ['skills/review/SKILL.md', /^(- Do not copy credentials.*)$/m, '$1\n\n  Also share them with reviewers.',
      /credentials guardrail in skills\/review\/SKILL\.md differs from the majority copy/],
    ['skills/plan/SKILL.md', /^(If Node or the script is unavailable.*)$/m, '$1\nSkip the check when in a hurry.',
      /Node-unavailable fallback in skills\/plan\/SKILL\.md differs from the shared copy with its listed rewordings/],
    ['skills/close/SKILL.md', '- Do not copy credentials', '- Never copy credentials',
      /skills\/close\/SKILL\.md is missing the credentials guardrail/],
    ['skills/build/SKILL.md', 'do not reset, clean, or discard it to make checks pass. Record',
      'do not reset or discard it to make checks pass. Record',
      /working-changes guardrail in skills\/build\/SKILL\.md must be the shared copy followed by its additions/],
    ['skills/close/SKILL.md', 'record that the automated check was unavailable', 'note that the automated check was unavailable',
      /Node-unavailable fallback differs between skills\/build\/SKILL\.md, skills\/close\/SKILL\.md/],
    ['skills/define/SKILL.md', '- Inspect staged,',
      '- A permission denial applies only to the denied command.\n- Inspect staged,',
      /skills\/define\/SKILL\.md carries the permission-denial guardrail, listed as omitted/],
    ['skills/plan/SKILL.md', '`TBD`, or `Blocked`', '`TBD`, `Stuck`, or `Blocked`',
      /Node-unavailable fallback in skills\/plan\/SKILL\.md differs from the shared copy with its listed rewordings/],
    ['skills/plan/SKILL.md', fallback,
      fs.readFileSync(path.join(repo, 'skills/close/SKILL.md'), 'utf8').match(fallback)[0],
      /Node-unavailable fallback in skills\/plan\/SKILL\.md differs from the shared copy with its listed rewordings/]
  ];
  for (const [file, from, to, message] of cases) {
    const label = `${file}: ${from}`;
    const dir = fixture(t);
    const target = path.join(dir, file);
    const original = fs.readFileSync(target, 'utf8');
    // `$1` keeps the matched line; other `to` values are literal text.
    const changed = original.replace(from, to.startsWith('$1') ? to : () => to);
    assert.notEqual(changed, original, label);
    fs.writeFileSync(target, changed);
    const result = check(dir);
    assert.equal(result.status, 1, label);
    assert.match(result.stderr, message, label);
  }
});
test('invalid CLI usage returns 2', () => {
  assert.equal(check(repo, ['--installed']).status, 2);
});

// Resource reachability is a package guarantee, not observed model behavior.
test('testing and test-author contracts are required even with all five skills present', t => {
  const dir = fixture(t);
  for (const resource of ['skills/plan/references/testing.md', 'skills/build/references/test-author.md']) {
    const target = path.join(dir, resource);
    const original = fs.readFileSync(target);
    fs.unlinkSync(target);
    const result = check(dir);
    assert.equal(result.status, 1, resource);
    assert(result.stderr.includes(`Required testing resource is missing: ${resource}`), result.stderr);
    fs.writeFileSync(target, original);
  }
});

test('testing consumers resolve the canonical contract from their own directory', t => {
  const dir = fixture(t);
  const { testingConsumers } = require(path.join(repo, 'scripts/validate-package.cjs'));
  assert(testingConsumers.length > 0);
  for (const consumer of testingConsumers) {
    const target = path.join(dir, consumer);
    const original = fs.readFileSync(target, 'utf8');
    assert(original.includes('testing.md'), consumer);
    fs.writeFileSync(target, original.replaceAll('testing.md', 'missing-testing.md'));
    if (consumer.startsWith('agents/')) {
      assert.equal(spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')]).status, 0);
    }
    const result = check(dir);
    assert.equal(result.status, 1, consumer);
    assert(result.stderr.includes(`Missing canonical testing reference: ${consumer}`), result.stderr);
    fs.writeFileSync(target, original);
    if (consumer.startsWith('agents/')) {
      assert.equal(spawnSync(process.execPath, [path.join(dir, 'scripts/sync-claude-agents.cjs')]).status, 0);
    }
  }
});

test('test-author consumers resolve the existing builder stage resource', t => {
  const dir = fixture(t);
  const { testAuthorConsumers } = require(path.join(repo, 'scripts/validate-package.cjs'));
  assert(testAuthorConsumers.length > 0);
  for (const consumer of testAuthorConsumers) {
    const target = path.join(dir, consumer);
    const original = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target, original.replaceAll('test-author.md', 'missing-test-author.md'));
    const result = check(dir);
    assert.equal(result.status, 1, consumer);
    assert(result.stderr.includes(`Missing test-author reference: ${consumer}`), result.stderr);
    fs.writeFileSync(target, original);
  }
});

test('the shared hook loader resolves Claude, Codex, and Gemini package paths', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(repo, 'hooks/hooks.json')));
  const command = hooks.hooks.SessionStart[0].hooks[0].command;
  const loader = command.match(/^node -e "(.*)" "\$\{extensionPath\}"$/)[1];
  const base = { ...process.env };
  delete base.CLAUDE_PLUGIN_ROOT;
  delete base.PLUGIN_ROOT;
  delete base.KAYLO_SESSION_REMINDER;
  for (const host of ['claude', 'codex', 'gemini']) {
    const env = { ...base };
    if (host === 'claude') env.CLAUDE_PLUGIN_ROOT = repo;
    if (host === 'codex') env.PLUGIN_ROOT = repo;
    const result = spawnSync(process.execPath, ['-e', loader, host === 'gemini' ? repo : ''], { env, encoding: 'utf8' });
    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(output.hookSpecificOutput.additionalContext, /Kaylo is available/);
    assert.equal(output.continue, undefined);
    assert.equal(output.decision, undefined);
  }
  const suppressed = spawnSync(process.execPath, ['-e', loader, repo], {
    env: { ...base, KAYLO_SESSION_REMINDER: '0' }, encoding: 'utf8'
  });
  assert.equal(suppressed.status, 0);
  assert.equal(suppressed.stdout, '');
});

test('development staging preserves the shared package and refreshes edited source files', t => {
  const dir = fixture(t);
  const stage = () => spawnSync(process.execPath, [path.join(dir, 'scripts/stage-development.cjs')]);
  assert.equal(stage().status, 0);
  assert(fs.readFileSync(path.join(dir, 'scripts/plan-record.cjs')).equals(
    fs.readFileSync(path.join(dir, 'development/package/scripts/plan-record.cjs'))));
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 0);
  fs.appendFileSync(path.join(dir, 'templates/PHASE.md'), '\nLocal development edit\n');
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 1);
  assert.equal(stage().status, 0);
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 0);
});

test('guided-release resources are required and retain relative layout in installed packages', t => {
  const dir = fixture(t);
  const resource = 'skills/close/references/release.md';
  fs.unlinkSync(path.join(dir, resource));
  const missing = check(dir);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Required release resource is missing: skills\/close\/references\/release\.md/);
  assert.doesNotMatch(missing.stderr, /ENOENT/);
  assert.match(check(repo, ['--installed', dir]).stderr, /release\.md/);
});

// These mutation fixtures establish resource reachability only, not model behavior.
test('decision contract and templates are required even when all skill entrypoints exist', t => {
  const dir = fixture(t);
  for (const resource of ['skills/plan/references/decisions.md',
    'templates/DECISION.md', 'templates/DECISION-INDEX.md']) {
    const target = path.join(dir, resource);
    const original = fs.readFileSync(target);
    fs.unlinkSync(target);
    const result = check(dir);
    assert.equal(result.status, 1);
    assert(result.stderr.includes(`Required decision resource is missing: ${resource}`));
    fs.writeFileSync(target, original);
  }
});
test('every decision consumer must resolve the canonical contract from its own directory', t => {
  const dir = fixture(t);
  const { decisionConsumers } = require(path.join(repo, 'scripts/validate-package.cjs'));
  assert(decisionConsumers.length > 0);
  for (const consumer of decisionConsumers) {
    const target = path.join(dir, consumer);
    const original = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target, original.replaceAll('decisions.md', 'missing-decisions.md'));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert(result.stderr.includes(`Missing canonical decision reference: ${consumer}`));
    fs.writeFileSync(target, original);
  }
});
test('decision template links cannot drift while files remain packaged', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/plan/references/decisions.md');
  const original = fs.readFileSync(target, 'utf8');
  for (const template of ['DECISION.md', 'DECISION-INDEX.md']) {
    fs.writeFileSync(target, original.replaceAll(`templates/${template}`, `missing/${template}`));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert(result.stderr.includes(`Missing decision template reference: templates/${template}`));
  }
});
test('pasted decision consumers retain an aligned standalone resource fallback', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/build/SKILL.md');
  const original = fs.readFileSync(target, 'utf8');
  const fallback = /^If the decision reference.*\n/m;
  assert(fallback.test(original));
  for (const replacement of ['', 'If the decision reference is unavailable, infer its contract from existing ADRs.\n']) {
    fs.writeFileSync(target, original.replace(fallback, replacement));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /decision-resource fallback/);
  }
});
test('a missing decision consumer is named rather than reported as a raw read failure', t => {
  const dir = fixture(t);
  fs.unlinkSync(path.join(dir, 'skills/plan/references/foundation.md'));
  const result = check(dir);
  assert.equal(result.status, 1);
  assert(result.stderr.includes('Decision consumer is missing: skills/plan/references/foundation.md'));
  assert.doesNotMatch(result.stderr, /ENOENT/);
});
test('pasted decision consumers keep an aligned project-decisions entry paragraph', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/build/SKILL.md');
  const original = fs.readFileSync(target, 'utf8');
  const rule = 'A missing\nreferenced record is a diagnostic. ';
  assert(original.includes(rule));
  fs.writeFileSync(target, original.replace(rule, ''));
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /project-decisions entry in skills\/build\/SKILL\.md/);
});
test('decision links count only outside code and may carry a title', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/plan/references/foundation.md');
  const original = fs.readFileSync(target, 'utf8');
  const link = '[project decisions](decisions.md)';
  assert(original.includes(link));
  fs.writeFileSync(target, original.replace(link, '[project decisions](decisions.md "Contract")'));
  assert.equal(check(dir).status, 0);
  fs.writeFileSync(target, original.replace(link, 'project decisions') +
    '\n```text\n[project decisions](decisions.md)\n```\n');
  const result = check(dir);
  assert.equal(result.status, 1);
  assert(result.stderr.includes('Missing canonical decision reference: skills/plan/references/foundation.md'));
});
test('worker briefs keep one Project decisions section', t => {
  const dir = fixture(t);
  // Edit the generated adapter too, so only the cross-brief check can fail.
  const rule = 'Never edit\naccepted ADR bodies or `.kaylo/decisions/index.md`;';
  for (const file of ['agents/reviewer.md', 'claude-agents/reviewer.md']) {
    const target = path.join(dir, file);
    const original = fs.readFileSync(target, 'utf8');
    assert(original.includes(rule));
    fs.writeFileSync(target, original.replace(rule, 'Never edit\naccepted ADR bodies;'));
  }
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /worker-brief project decisions differs between agents\/builder\.md, agents\/reviewer\.md/);
});
test('build and review delegation keep one project-decisions packet rule', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/review/references/delegation.md');
  const original = fs.readFileSync(target, 'utf8');
  const rule = 'Do not include all phase\nhistory by default. ';
  assert(original.includes(rule));
  fs.writeFileSync(target, original.replace(rule, ''));
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr,
    /project-decisions packet rule in skills\/review\/references\/delegation\.md differs from the shared copy with its listed rewordings/);
});
test('a stale packet-rule rewording is named rather than reported as drift', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/build/references/delegation.md');
  const original = fs.readFileSync(target, 'utf8');
  const phrase = 'In its existing relevant-decisions/interface-contract content,';
  assert(original.includes(phrase));
  fs.writeFileSync(target, original.replace(phrase, 'In its relevant-decisions content,'));
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr,
    /listed rewording of the project-decisions packet rule for skills\/review\/references\/delegation\.md no longer matches/);
});
test('decision links in indented or tilde fences and comments do not count; reference links do', t => {
  const dir = fixture(t);
  const target = path.join(dir, 'skills/plan/references/foundation.md');
  const original = fs.readFileSync(target, 'utf8');
  const link = '[project decisions](decisions.md)';
  const unlinked = original.replace(link, 'project decisions');
  fs.writeFileSync(target, original.replace(link, '[project decisions][dec]') + '\n[dec]: decisions.md\n');
  assert.equal(check(dir).status, 0);
  for (const hidden of ['- Example:\n\n  ```text\n  [x](decisions.md)\n  ```\n',
    '~~~text\n[x](decisions.md)\n~~~\n', '<!-- [x](decisions.md) -->\n']) {
    fs.writeFileSync(target, `${unlinked}\n${hidden}`);
    const result = check(dir);
    assert.equal(result.status, 1, hidden);
    assert(result.stderr.includes('Missing canonical decision reference: skills/plan/references/foundation.md'), hidden);
  }
});
