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
test('skill descriptions must be present, short, tag-free, and name Kaylo', t => {
  const cases = [
    ['missing', line => line.replace(/^description:.*\n/m, ''), /skills\/plan\/SKILL\.md needs a non-empty description: line/],
    ['empty', line => line.replace(/^description:.*$/m, 'description:   '), /skills\/plan\/SKILL\.md needs a non-empty description: line/],
    ['too long', line => line.replace(/^(description:.*)$/m, `$1 ${'x'.repeat(1024)}`), /skills\/plan\/SKILL\.md description exceeds 1,024 characters/],
    ['angle bracket', line => line.replace(/^(description:.*)$/m, '$1 Use <phase>.'), /skills\/plan\/SKILL\.md description must not contain < or >/],
    ['no Kaylo', line => line.replace(/^(description:.*)$/m, m => m.replaceAll('Kaylo', 'project')), /skills\/plan\/SKILL\.md description must name Kaylo/]
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
test('a drifted copy of shared skill text names the skill and block', t => {
  const cases = [
    ['skills/review/SKILL.md', 'Read only necessary sensitive data', 'Read only needed sensitive data',
      /credentials guardrail in skills\/review\/SKILL\.md differs from the other copies/],
    ['skills/build/SKILL.md', 'do not reset, clean, or discard it to make checks pass. Record',
      'do not reset or discard it to make checks pass. Record',
      /working-changes guardrail in skills\/build\/SKILL\.md must be the shared copy followed by its additions/],
    ['skills/close/SKILL.md', 'record that the automated check was unavailable', 'note that the automated check was unavailable',
      /Node-unavailable fallback differs between skills\/build\/SKILL\.md, skills\/close\/SKILL\.md/],
    ['skills/define/SKILL.md', '- Inspect staged,',
      '- A permission denial applies only to the denied command.\n- Inspect staged,',
      /skills\/define\/SKILL\.md carries the permission-denial guardrail, listed as omitted/],
    ['skills/plan/SKILL.md', /^If Node or the script is unavailable.*$/m,
      fs.readFileSync(path.join(repo, 'skills/close/SKILL.md'), 'utf8').match(/^If Node or the script is unavailable.*$/m)[0],
      /skills\/plan\/SKILL\.md now matches the shared Node-unavailable fallback/]
  ];
  for (const [file, from, to, message] of cases) {
    const dir = fixture(t);
    const target = path.join(dir, file);
    const original = fs.readFileSync(target, 'utf8');
    const changed = original.replace(from, () => to);
    assert.notEqual(changed, original, file);
    fs.writeFileSync(target, changed);
    const result = check(dir);
    assert.equal(result.status, 1, file);
    assert.match(result.stderr, message, file);
  }
});
test('invalid CLI usage returns 2', () => {
  assert.equal(check(repo, ['--installed']).status, 2);
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
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 0);
  fs.appendFileSync(path.join(dir, 'templates/PHASE.md'), '\nLocal development edit\n');
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 1);
  assert.equal(stage().status, 0);
  assert.equal(check(dir, ['--installed', path.join(dir, 'development/package')]).status, 0);
});
