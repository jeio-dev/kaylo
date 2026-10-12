'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkCiEvidence, states } = require('../scripts/check-ci-evidence.cjs');
const script = path.resolve(__dirname, '../scripts/check-ci-evidence.cjs');
const repo = 'github.com/example/project';
const head = '3f1c0de2a9b84c7e5d6f7a8b9c0d1e2f3a4b5c6d';
const merge = '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b';
const observation = (name, state = 'pass', extra = {}) => ({ name, repository: repo, revision: head, state,
  url: `https://ci.example.test/run/${name}`, observedAt: '2026-10-11T17:00:00Z', ...extra });
const snapshot = (extra = {}) => ({ format: 1, repository: repo, targetRevision: head, required: ['full-check'],
  observations: [observation('full-check')], ...extra });
const codes = result => result.diagnostics.map(d => d.code);

function file(t, value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-ci-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const target = path.join(dir, 'snapshot.json');
  fs.writeFileSync(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
  return target;
}
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

test('a complete passing required set for the exact revision passes, with a classified report', t => {
  const target = file(t, snapshot({ required: ['full-check', 'lint'],
    observations: [observation('full-check'), observation('lint'), observation('docs-preview', 'fail')] }));
  const before = fs.readFileSync(target);
  const result = cli(target);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.result, 'pass');
  assert.equal(report.targetRevision, head);
  assert.deepEqual(report.required.map(r => [r.name, r.state]), [['full-check', 'pass'], ['lint', 'pass']]);
  assert.deepEqual(report.advisory.map(r => [r.name, r.state]), [['docs-preview', 'fail']]);
  assert.deepEqual(fs.readFileSync(target), before);
});

test('every non-pass state blocks a required check; only pass satisfies it', () => {
  for (const state of states.filter(state => state !== 'pass')) {
    const url = state === 'missing' || state === 'unavailable' ? null : undefined;
    const result = checkCiEvidence(snapshot({ observations: [observation('full-check', state, url === null ? { url } : {})] }));
    assert.equal(result.ok, false, state);
    assert.deepEqual(codes(result), ['CI_NOT_PASS'], state);
    assert.equal(result.diagnostics[0].message, `Required check is not passing: full-check (${state})`);
    assert.equal(result.report.result, 'blocked');
  }
});

test('an omitted required check is missing, and a green advisory run cannot fill it', () => {
  const result = checkCiEvidence(snapshot({ required: ['full-check', 'e2e'],
    observations: [observation('full-check'), observation('unrelated-green')] }));
  assert.deepEqual(codes(result), ['CI_MISSING']);
  assert.equal(result.diagnostics[0].message, 'Required check has no observation: e2e');
  assert.deepEqual(result.report.required[1], { name: 'e2e', state: 'missing', url: null, observedAt: null });
});

test('a stale or prefix revision and a wrong repository are refused, advisory records included', () => {
  const stale = checkCiEvidence(snapshot({ observations: [observation('full-check', 'pass', { revision: merge })] }));
  assert.deepEqual(codes(stale), ['CI_REVISION', 'CI_MISSING']);
  assert.deepEqual(stale.report.required.map(r => r.state), ['missing']);
  assert.deepEqual(stale.report.rejected, [{ name: 'full-check', repository: repo, revision: merge }]);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ observations: [observation('full-check', 'pass',
    { revision: head.slice(0, 10) })] }))), ['CI_REVISION', 'CI_MISSING']);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ targetRevision: head.slice(0, 10) }))), ['CI_REVISION', 'CI_MISSING']);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ observations: [observation('full-check'),
    observation('advisory', 'pass', { repository: 'github.com/example/fork' })] }))), ['CI_REPOSITORY']);
  const advisory = checkCiEvidence(snapshot({ observations: [observation('full-check'),
    observation('old-run', 'pass', { revision: merge })] }));
  assert.deepEqual(codes(advisory), ['CI_REVISION']);
  assert.deepEqual(advisory.report.advisory, []);
});

test('a PR merge-test revision is checked as its own target, never normalized to the head', () => {
  const mergeRun = observation('full-check', 'pass', { revision: merge });
  assert.equal(checkCiEvidence(snapshot({ observations: [mergeRun] })).ok, false);
  const result = checkCiEvidence(snapshot({ targetRevision: merge, observations: [mergeRun] }));
  assert.equal(result.ok, true);
  assert.equal(result.report.targetRevision, merge);
});

test('duplicate required or observation names are ambiguous and refused', () => {
  assert.deepEqual(codes(checkCiEvidence(snapshot({ required: ['full-check', 'full-check'] }))), ['CI_DUPLICATE']);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ observations: [observation('full-check', 'fail'),
    observation('full-check')] }))), ['CI_DUPLICATE']);
});

test('an empty required set needs a substantive no-CI reason, which is reported but not adjudicated', () => {
  assert.deepEqual(codes(checkCiEvidence(snapshot({ required: [], observations: [] }))), ['CI_NO_REQUIREMENTS']);
  for (const reason of ['', '  ', 'N/A', 'none', 'TBD', '...']) {
    assert.deepEqual(codes(checkCiEvidence(snapshot({ required: [], observations: [], noCiReason: reason }))),
      ['CI_NO_REQUIREMENTS'], reason);
  }
  const result = checkCiEvidence(snapshot({ required: [], observations: [observation('lint', 'fail')],
    noCiReason: 'Repository has no CI provider; agreed in phase 02 Agreement.' }));
  assert.equal(result.ok, true);
  assert.equal(result.report.result, 'no-required-ci');
  assert.deepEqual(result.report.advisory.map(r => r.state), ['fail']);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ noCiReason: 'No CI.' }))), ['CI_SCHEMA']);
});

test('schema violations are refused without echoing values', () => {
  const secret = 'SECRET-CANARY-VALUE';
  const cases = [
    [[], 'snapshot must be an object'],
    [snapshot({ extra: secret }), 'unexpected top-level property'],
    [(({ repository, ...rest }) => rest)(snapshot()), 'repository is required'],
    [snapshot({ repository: ' ' + repo }), 'repository must be a nonblank exact identifier'],
    [snapshot({ targetRevision: '' }), 'targetRevision must be a nonblank exact identifier'],
    [snapshot({ required: 'full-check' }), 'required must be an array'],
    [snapshot({ required: [''] }), 'required[0] must be a nonblank string'],
    [snapshot({ observations: {} }), 'observations must be an array'],
    [snapshot({ observations: [observation('full-check', 'success')] }), 'observations[0].state must be one of'],
    [snapshot({ observations: [observation('full-check', 'pass', { url: null })] }), 'observations[0].url must be'],
    [snapshot({ observations: [observation('full-check', 'pass', { url: 'http://ci.example.test/1' })] }), 'url must be'],
    [snapshot({ observations: [observation('full-check', 'pass', { url: 'javascript:alert(1)' })] }), 'url must be'],
    [snapshot({ observations: [observation('full-check', 'pass', { observedAt: '2026-10-11 17:00' })] }), 'observedAt'],
    [snapshot({ observations: [observation('full-check', 'pass', { observedAt: '2026-02-30T00:00:00Z' })] }), 'observedAt'],
    [snapshot({ observations: [observation('full-check', 'pass', { observedAt: '2026-10-11T17:00:00+02:00' })] }), 'observedAt'],
    [snapshot({ observations: [{ ...observation('full-check'), note: secret }] }), 'unexpected property'],
    [snapshot({ observations: [{ name: 'full-check' }] }), 'observations[0].repository is required']
  ];
  for (const [value, detail] of cases) {
    const result = checkCiEvidence(value);
    assert.equal(result.ok, false, detail);
    assert(result.diagnostics.every(d => d.code === 'CI_SCHEMA'), detail);
    assert(result.diagnostics.some(d => d.message.includes(detail)), `${detail}: ${JSON.stringify(result.diagnostics)}`);
    assert(result.diagnostics.every(d => !d.message.includes(secret)));
    assert.equal(result.report, undefined);
  }
  assert.equal(checkCiEvidence(snapshot({ observations: [observation('full-check', 'unavailable', { url: null })] }))
    .diagnostics[0].code, 'CI_NOT_PASS');
});

test('unsupported formats are refused before other schema checks', () => {
  assert.deepEqual(codes(checkCiEvidence({ format: 2, anything: true })), ['CI_FORMAT']);
  assert.deepEqual(codes(checkCiEvidence(snapshot({ format: '1' }))), ['CI_FORMAT']);
});

test('the CLI distinguishes read failures, blockers and invocation errors', t => {
  for (const bad of ['{', Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]), Buffer.from([0x7b, 0xff, 0x7d])]) {
    const result = cli(file(t, bad));
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'CI_READ: Cannot read CI snapshot as a regular UTF-8 JSON file\n');
  }
  assert.equal(cli(path.dirname(file(t, '{}'))).stderr, 'CI_READ: Cannot read CI snapshot as a regular UTF-8 JSON file\n');
  assert.equal(cli(path.join(os.tmpdir(), 'kaylo-ci-absent', 'none.json')).status, 1);
  const blocked = cli(file(t, snapshot({ observations: [observation('full-check', 'pending')] })));
  assert.equal(blocked.status, 1);
  assert.equal(blocked.stderr, 'CI_NOT_PASS: Required check is not passing: full-check (pending)\n');
  assert.equal(JSON.parse(blocked.stdout).result, 'blocked');
  for (const args of [[], ['a', 'b'], ['--help']]) {
    const result = cli(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stderr, 'CI_USAGE: Expected exactly one CI snapshot argument\n');
  }
});

test('check names in diagnostics are bounded and printable', () => {
  const name = 'x'.repeat(200);
  const result = checkCiEvidence(snapshot({ required: [name], observations: [] }));
  assert.equal(result.diagnostics[0].message, `Required check has no observation: ${'x'.repeat(80)}...`);
  const control = checkCiEvidence(snapshot({ required: ['bad‮name'], observations: [] }));
  assert.equal(control.diagnostics[0].message, 'Required check has no observation: bad?name');
  assert.deepEqual(codes(checkCiEvidence(snapshot({ required: ['bad\u001b[31m'] }))), ['CI_SCHEMA']);
});

test('the checker reads only its argument and never contacts a provider', () => {
  const source = fs.readFileSync(script, 'utf8');
  assert.doesNotMatch(source, /require\('node:(?:child_process|http|https|net|dns|tls)'\)/);
  assert.doesNotMatch(source, /\bfetch\(|writeFile|appendFile|unlink|rename/);
});

test('the close reference documents every diagnostic and a valid example snapshot', () => {
  const reference = fs.readFileSync(path.resolve(__dirname, '../skills/close/references/ci-evidence.md'), 'utf8');
  for (const code of fs.readFileSync(script, 'utf8').match(/CI_[A-Z_]+(?=:)/g)) {
    assert.match(reference, new RegExp(`\`${code}\``), code);
  }
  const example = reference.match(/```json\n([\s\S]*?)```/);
  assert(example, 'reference needs a JSON example');
  assert.equal(checkCiEvidence(JSON.parse(example[1])).ok, true);
});
