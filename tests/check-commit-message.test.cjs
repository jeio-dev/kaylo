'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const script = path.resolve(__dirname, '../scripts/check-commit-message.cjs');
const adopted = 'Format: 1\nCommit style: conventional\nCommit scopes: auth, ledger, ui, docs, release, kaylo\n';

function project(t, preferences = adopted) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-commit-message-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  if (preferences !== null) {
    fs.mkdirSync(path.join(root, '.kaylo'));
    fs.writeFileSync(path.join(root, '.kaylo/preferences.md'), preferences);
  }
  return root;
}
const check = (root, message, ...args) =>
  spawnSync(process.execPath, [script, root, '-', ...args], { encoding: 'utf8', input: message });
const codes = result => result.stderr.split('\n').filter(Boolean).map(line => line.split(':')[0]);

test('each documented message case passes with its identity', t => {
  const root = project(t);
  const cases = [
    ['feat(auth): validate login form (03-T2)', ['--require', '03-T2'], { type: 'feat', scope: 'auth', ids: ['03-T2'] }],
    ['feat(auth): add password reset (03, 03-T1, 03-T2)', ['--require', '03', '--require', '03-T1'], { ids: ['03', '03-T1', '03-T2'] }],
    ['fix(auth): reject expired reset links (03-R2, 03-T1)', ['--require', '03-R2'], { type: 'fix', ids: ['03-R2', '03-T1'] }],
    ['docs(kaylo): record phase 03 review (03)', ['--require', '03'], { scope: 'kaylo', ids: ['03'] }],
    ['chore(release): 1.4.0', [], { scope: 'release', ids: [] }],
    ['chore(kaylo): migrate plans to format 2', [], { ids: [] }],
    ['refactor: simplify the ledger query (04-T3)', [], { scope: null, ids: ['04-T3'] }]
  ];
  for (const [message, args, expected] of cases) {
    const result = check(root, message + '\n', ...args);
    assert.equal(result.status, 0, `${message}\n${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(parsed[key], value, `${message}: ${key}`);
  }
});

test('breaking changes use ! or a BREAKING CHANGE footer', t => {
  const root = project(t);
  assert.equal(JSON.parse(check(root, 'feat(ledger)!: drop the v1 export (05-T1)\n').stdout).breaking, true);
  const footer = check(root, 'feat(ledger): change export columns (05-T2)\n\nWhy.\n\nBREAKING CHANGE: column order changed\n');
  assert.equal(JSON.parse(footer.stdout).breaking, true);
  assert.equal(JSON.parse(check(root, 'feat(ledger): add CSV export (05-T3)\n').stdout).breaking, false);
});

test('unlisted scopes, unknown types, malformed headers, long headers and missing blank lines fail', t => {
  const root = project(t);
  const cases = [
    ['feat(payments): add refunds (03-T4)', ['COMMIT_SCOPE']],
    ['feature(auth): add login (03-T1)', ['COMMIT_TYPE']],
    ['Feat(auth): add login', ['COMMIT_HEADER']],
    ['feat(auth) add login', ['COMMIT_HEADER']],
    ['feat(auth):  add login', ['COMMIT_HEADER']],
    ['feat(auth):', ['COMMIT_HEADER']],
    ['feat(): add login', ['COMMIT_HEADER']],
    ['', ['COMMIT_HEADER']],
    [`feat(auth): ${'x'.repeat(90)}`, ['COMMIT_LENGTH']],
    ['feat(auth): add login (03-T1)\nbody without a blank line', ['COMMIT_BODY']]
  ];
  for (const [message, expected] of cases) {
    const result = check(root, message);
    assert.equal(result.status, 1, message);
    assert.deepEqual(codes(result), expected, message);
    assert.equal(result.stdout, '');
  }
});

test('--require finds the identity only in the trailing ID list', t => {
  const root = project(t);
  for (const message of ['feat(auth): add login for 03-T1', 'feat(auth): add login (03-T1,03-T2)',
    'feat(auth): add login (03-T2)', 'feat(auth): add login (beta)']) {
    const result = check(root, message, '--require', '03-T1');
    assert.deepEqual(codes(result), ['COMMIT_IDENTITY'], message);
    assert.match(result.stderr, /required identity: 03-T1$/m);
  }
  assert.equal(JSON.parse(check(root, 'feat(auth): add login (beta)').stdout).description, 'add login (beta)');
});

test('without a confirmed scope list, only scopeless messages pass', t => {
  const root = project(t, 'Format: 1\nCommit style: conventional\n');
  assert.equal(check(root, 'feat: add login (03-T1)').status, 0);
  assert.deepEqual(codes(check(root, 'feat(auth): add login (03-T1)')), ['COMMIT_SCOPE']);
});

test('the policy applies only when adopted and usable', t => {
  for (const preferences of [null, 'Format: 1\nWorker models: Inherit\n', 'Format: 2\nCommit style: conventional\n',
    'Format: 1\nCommit style: conventional\nCommit style: conventional\n',
    'Format: 1\nCommit style: conventional\nCommit scopes: Auth\n']) {
    const result = check(project(t, preferences), 'feat: add login (03-T1)');
    assert.equal(result.status, 1, String(preferences));
    assert.deepEqual(codes(result), ['COMMIT_POLICY'], String(preferences));
  }
});

test('messages are read from a file or stdin, CRLF is accepted, and nothing is written', t => {
  const root = project(t);
  const file = path.join(root, 'message.txt');
  fs.writeFileSync(file, 'feat(ui): add dark mode (02-T1)\r\n\r\nBody.\r\n');
  const before = fs.readdirSync(root).sort();
  const result = spawnSync(process.execPath, [script, root, file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(root).sort(), before);
  const unreadable = spawnSync(process.execPath, [script, root, path.join(root, 'absent.txt')], { encoding: 'utf8' });
  assert.equal(unreadable.status, 1);
  assert.equal(unreadable.stderr, 'COMMIT_READ: Cannot read the commit message as UTF-8 text\n');
});

test('invocation errors exit 2', t => {
  const root = project(t);
  for (const args of [[], [root], [root, '-', '--require'], [root, '-', '--require', 'T1'], [root, '-', '--other', '03'],
    ['--help', '-'], [root, '--require']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', input: 'feat: x' });
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.match(result.stderr, /^COMMIT_USAGE: /);
  }
});
