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
