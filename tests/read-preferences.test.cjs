'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readPreferences } = require('../scripts/read-preferences.cjs');
const script = path.resolve(__dirname, '../scripts/read-preferences.cjs');

function project(t, preferences, dirs = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-preferences-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
  if (preferences !== undefined) {
    fs.mkdirSync(path.join(root, '.kaylo'), { recursive: true });
    fs.writeFileSync(path.join(root, '.kaylo/preferences.md'), preferences);
  }
  return root;
}
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const codes = result => (result.diagnostics || []).map(d => `${d.code}@${d.location}`);
const full = ['Format: 1', 'Worker models: Balanced', 'Review vendor: different', 'Metered: allowed (openrouter)',
  'Git autonomy: pr', 'Branch: phase', 'Commit: task', 'Commit style: conventional',
  'Commit scopes: auth, ledger, ui, db, deps, ci, docs', 'Merge: rebase'].join('\n') + '\n';

test('a missing file, or a .kaylo without one, is reported as missing with exit 0', t => {
  for (const root of [project(t), project(t, undefined, ['.kaylo'])]) {
    assert.deepEqual(readPreferences(root), { state: 'missing' });
    const result = cli(root);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { state: 'missing' });
  }
});

test('an existing worker-only file keeps working without Git keys', t => {
  const result = readPreferences(project(t, 'Format: 1\nWorker models: Inherit\n'));
  assert.deepEqual(result, { state: 'present', format: 1, values: { 'Worker models': 'Inherit' }, diagnostics: [], notes: [] });
});

test('every recognized key and documented value parses; scopes become a list', t => {
  const result = readPreferences(project(t, full));
  assert.equal(result.state, 'present');
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.values, {
    'Worker models': 'Balanced', 'Review vendor': 'different', 'Metered': 'allowed (openrouter)',
    'Git autonomy': 'pr', 'Branch': 'phase', 'Commit': 'task', 'Commit style': 'conventional',
    'Commit scopes': ['auth', 'ledger', 'ui', 'db', 'deps', 'ci', 'docs'], 'Merge': 'rebase'
  });
  const accepted = { 'Git autonomy': ['ask', 'commit', 'push', 'pr'], 'Branch': ['none', 'phase', 'task'],
    'Commit': ['none', 'task', 'phase'], 'Merge': ['squash', 'rebase', 'merge'],
    'Worker models': ['Inherit', 'Quality', 'Balanced', 'Budget'], 'Review vendor': ['same', 'different'] };
  for (const [key, values] of Object.entries(accepted)) {
    for (const value of values) {
      assert.equal(readPreferences(project(t, `Format: 1\n${key}: ${value}\n`)).values[key], value, `${key}: ${value}`);
    }
  }
});

test('surrounding whitespace is trimmed; CRLF, blank lines, prose and fences grant nothing and break nothing', t => {
  const text = '# Project preferences\r\n\r\nWe chose these on 2026-10-12.\r\n```text\r\nFormat:   1  \r\n' +
    'Git autonomy:\tcommit \r\n```\r\n- Branch: task\r\n  Commit: phase\r\n';
  const result = readPreferences(project(t, text));
  assert.equal(result.state, 'present', JSON.stringify(result));
  assert.deepEqual(result.values, { 'Git autonomy': 'commit' });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.notes, [], 'only Key: lines at column 0 are records');
});

test('inline annotations, wrong case and unsupported values make only that key unusable', t => {
  const text = 'Format: 1\nWorker models: Balanced\nGit autonomy: pr   # none | ask\nBranch: Phase\nCommit: tasks\n' +
    'Merge: squash, rebase\nCommit style: Conventional\nCommit scopes: auth,,ui\nReview vendor: other\n' +
    'Metered: allowed\nMerges: x\n';
  const result = readPreferences(project(t, text));
  assert.equal(result.state, 'present');
  assert.deepEqual(result.values, { 'Worker models': 'Balanced' });
  assert.deepEqual(codes(result), ['PREFS_VALUE@.kaylo/preferences.md:3', 'PREFS_VALUE@.kaylo/preferences.md:4',
    'PREFS_VALUE@.kaylo/preferences.md:5', 'PREFS_VALUE@.kaylo/preferences.md:6', 'PREFS_VALUE@.kaylo/preferences.md:7',
    'PREFS_VALUE@.kaylo/preferences.md:8', 'PREFS_VALUE@.kaylo/preferences.md:9', 'PREFS_VALUE@.kaylo/preferences.md:10']);
  assert.deepEqual(result.notes.map(d => d.code), ['PREFS_UNKNOWN']);
});

test('scope lists reject duplicates, uppercase, spaces inside names and empty entries', t => {
  for (const scopes of ['auth, auth', 'Auth', 'user auth', 'auth,', '', '-auth', 'a/b']) {
    const result = readPreferences(project(t, `Format: 1\nCommit scopes: ${scopes}\n`));
    assert.deepEqual(codes(result), ['PREFS_VALUE@.kaylo/preferences.md:2'], JSON.stringify(scopes));
  }
  assert.deepEqual(readPreferences(project(t, 'Format: 1\nCommit scopes: api,ui ,  release.notes, ci_cd\n')).values,
    { 'Commit scopes': ['api', 'ui', 'release.notes', 'ci_cd'] });
});

test('a duplicated recognized key is unusable even when both values agree', t => {
  for (const second of ['Git autonomy: pr', 'Git autonomy: ask']) {
    const result = readPreferences(project(t, `Format: 1\nGit autonomy: pr\nBranch: phase\n${second}\n`));
    assert.deepEqual(result.values, { 'Branch': 'phase' });
    assert.deepEqual(codes(result), ['PREFS_DUPLICATE@.kaylo/preferences.md:4']);
    assert.equal(result.diagnostics[0].message, 'Duplicate preference; neither value is usable: Git autonomy');
  }
});

test('unknown keys are notes that grant nothing and keep exit 0', t => {
  const root = project(t, 'Format: 1\nGit Autonomy: pr\ngit autonomy: pr\nDeploy: allowed\nGit autonomy: commit\n');
  const result = readPreferences(root);
  assert.deepEqual(result.values, { 'Git autonomy': 'commit' });
  assert.deepEqual(result.notes.map(d => d.message), ['Unrecognized preference key; it grants nothing: Git Autonomy',
    'Unrecognized preference key; it grants nothing: git autonomy', 'Unrecognized preference key; it grants nothing: Deploy']);
  const run = cli(root);
  assert.equal(run.status, 0);
  assert.match(run.stderr, /^PREFS_UNKNOWN: \.kaylo\/preferences\.md:2: /);
});

test('a missing, duplicated or unsupported Format makes the whole file unusable', t => {
  const cases = [['Git autonomy: pr\n', 'PREFS_FORMAT@.kaylo/preferences.md'],
    ['Format: 2\nGit autonomy: pr\n', 'PREFS_FORMAT@.kaylo/preferences.md:1'],
    ['Format: 1.0\nGit autonomy: pr\n', 'PREFS_FORMAT@.kaylo/preferences.md:1'],
    ['Format: 1\nFormat: 1\nGit autonomy: pr\n', 'PREFS_FORMAT@.kaylo/preferences.md:1'],
    ['', 'PREFS_FORMAT@.kaylo/preferences.md']];
  for (const [text, expected] of cases) {
    const result = readPreferences(project(t, text));
    assert.equal(result.state, 'invalid', JSON.stringify(text));
    assert.equal(result.values, undefined);
    assert.deepEqual(codes(result), [expected], JSON.stringify(text));
  }
});

test('the CLI prints usable values on stdout and exits 1 when any key is unusable', t => {
  const root = project(t, 'Format: 1\nWorker models: Quality\nGit autonomy: everything\n');
  const result = cli(root);
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stdout).values, { 'Worker models': 'Quality' });
  assert.equal(result.stderr, 'PREFS_VALUE: .kaylo/preferences.md:3: Unsupported value; this preference is unusable: Git autonomy\n');
  const broken = cli(project(t, 'Format: 3\n'));
  assert.equal(broken.status, 1);
  assert.equal(JSON.parse(broken.stdout).state, 'invalid');
});

test('diagnostics never echo values', t => {
  const canary = 'SECRET-CANARY-VALUE';
  const root = project(t, `Format: 1\nMetered: allowed (${canary}\nMetered: allowed (${canary})\nGit autonomy: ${canary}\n` +
    `${canary}: x\n`);
  const result = cli(root);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /SECRET-CANARY-VALUE: /);
  assert.doesNotMatch(result.stderr.replace(/it grants nothing: SECRET-CANARY-VALUE/, ''), /SECRET-CANARY-VALUE/);
  assert.doesNotMatch(JSON.stringify(JSON.parse(result.stdout).diagnostics), /SECRET-CANARY-VALUE/);
});

test('a byte-order mark is tolerated; invalid encoding, oversized files, directories and dangling links are read failures', t => {
  assert.deepEqual(readPreferences(project(t, '﻿Format: 1\nGit autonomy: ask\n')).values, { 'Git autonomy': 'ask' });
  const failures = [project(t, Buffer.from([0x46, 0xff, 0x0a])), project(t, 'Format: 1\n' + 'x\n'.repeat(40 * 1024)),
    project(t, undefined, ['.kaylo/preferences.md'])];
  const dangling = project(t, undefined, ['.kaylo']);
  fs.symlinkSync(path.join(dangling, 'nowhere'), path.join(dangling, '.kaylo/preferences.md'));
  const fileKaylo = project(t);
  fs.writeFileSync(path.join(fileKaylo, '.kaylo'), 'Format: 1\n');
  const outside = project(t, 'Format: 1\nGit autonomy: pr\n');
  const escaping = project(t, undefined, ['.kaylo']);
  fs.symlinkSync(path.join(outside, '.kaylo/preferences.md'), path.join(escaping, '.kaylo/preferences.md'));
  for (const root of [...failures, dangling, fileKaylo, escaping]) {
    assert.deepEqual(codes(readPreferences(root)), ['PREFS_READ@.kaylo/preferences.md'], root);
  }
});

test('a FIFO preference file is refused promptly as a read failure', t => {
  if (process.platform === 'win32') return t.skip('no FIFOs');
  const root = project(t, undefined, ['.kaylo']);
  if (spawnSync('mkfifo', [path.join(root, '.kaylo/preferences.md')]).status !== 0) return t.skip('mkfifo is unavailable');
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.signal, null, 'reader blocked on the FIFO');
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'PREFS_READ: .kaylo/preferences.md: Cannot read .kaylo/preferences.md as a regular UTF-8 file\n');
});

test('the reader writes nothing, and invocation errors exit 2', t => {
  const root = project(t, full);
  const before = fs.readFileSync(path.join(root, '.kaylo/preferences.md'));
  assert.equal(cli(root).status, 0);
  assert(fs.readFileSync(path.join(root, '.kaylo/preferences.md')).equals(before));
  assert.deepEqual(fs.readdirSync(path.join(root, '.kaylo')), ['preferences.md']);
  for (const args of [[], [root, 'extra'], ['--help']]) {
    const result = cli(...args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'PREFS_USAGE: Expected exactly one project directory argument\n');
  }
  const absent = cli(path.join(root, 'absent'));
  assert.equal(absent.status, 1);
  assert.equal(absent.stderr, 'PREFS_PROJECT: Project directory is unavailable\n');
});
