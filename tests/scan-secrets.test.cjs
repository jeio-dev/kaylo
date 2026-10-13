'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scan, main, acceptsVersion } = require('../scripts/scan-secrets.cjs');
const canary = ['ghp', require('node:crypto').createHash('sha256')
  .update('kaylo-synthetic-sentinel').digest('hex').slice(0, 36)].join('_');
const available = spawnSync('gitleaks', ['version'], { encoding: 'utf8' }).stdout?.trim();
const versionAvailable = acceptsVersion(available || '');
function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-scan-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
      '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, 'Git fixture failed');
    return result.stdout.trim();
  };
  git('init', '-q');
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  return { root, git, write };
}
function baseline(r) {
  r.write('clean.txt', 'safe baseline\n'); r.git('add', '--', 'clean.txt');
  r.git('commit', '-qm', 'baseline'); return r.git('rev-parse', 'HEAD');
}
function safe(result) { assert(!JSON.stringify(result).includes(canary)); return result; }
const real = { skip: !versionAvailable && 'Compatible installed Gitleaks required for detector fixtures' };
test('initial candidate includes .kaylo; clean then finding; reports never escape', real, t => {
  const r = repo(t);
  r.write('.kaylo/plan.md', 'no values\n'); r.git('add', '--', '.kaylo/plan.md');
  const before = r.git('status', '--porcelain');
  const clean = safe(scan(r.root, 'candidate'));
  assert.equal(clean.state, 'clean'); assert.equal(clean.identity.parent, null);
  assert.equal(r.git('status', '--porcelain'), before);
  r.write('.kaylo/plan.md', 'token = ' + canary + '\n'); r.git('add', '--', '.kaylo/plan.md');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
  assert(!fs.existsSync(path.join(r.root, 'report.json')));
});
test('partial staging selects index instead of divergent worktree', real, t => {
  const r = repo(t); baseline(r);
  r.write('clean.txt', 'safe staged\n'); r.git('add', '--', 'clean.txt');
  r.write('clean.txt', 'token = ' + canary + '\n');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'clean');
  r.git('add', '--', 'clean.txt'); r.write('clean.txt', 'safe unstaged\n');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
});
test('alternate index scans and commits its exact tree while preserving unrelated staged work', real, t => {
  const r = repo(t); baseline(r);
  r.write('user.txt', 'token = ' + canary + '\n'); r.git('add', '--', 'user.txt');
  r.write('task.txt', 'safe task\n');
  const original = r.git('write-tree');
  const index = path.join(r.root, '.git', 'trial-index');
  const previous = process.env.GIT_INDEX_FILE;
  try {
    process.env.GIT_INDEX_FILE = index;
    r.git('read-tree', 'HEAD'); r.git('add', '--', 'task.txt');
    const result = safe(scan(r.root, 'candidate')); assert.equal(result.state, 'clean');
    r.git('commit', '-qm', 'task'); assert.equal(r.git('rev-parse', 'HEAD^{tree}'), result.identity.tree);
  } finally {
    if (previous === undefined) delete process.env.GIT_INDEX_FILE; else process.env.GIT_INDEX_FILE = previous;
  }
  assert.equal(r.git('write-tree'), original);
  r.git('reset', '-q', '--', 'task.txt');
  assert.equal(r.git('status', '--porcelain'), 'A  user.txt');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
});
test('renames remain findings; deletion passes; symlink text scanned without reading target', real, t => {
  const r = repo(t); baseline(r);
  r.write('old.txt', 'token = ' + canary + '\n'); r.git('add', '--', 'old.txt'); r.git('commit', '-qm', 'synthetic exposure');
  r.git('mv', 'old.txt', 'new.txt');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
  r.git('rm', '-f', '--', 'new.txt'); assert.equal(safe(scan(r.root, 'candidate')).state, 'clean');
  const clean = repo(t); baseline(clean);
  const outside = path.join(clean.root, '.git', 'outside'); fs.writeFileSync(outside, 'token = ' + canary);
  fs.symlinkSync(outside, path.join(clean.root, 'link')); clean.git('add', '--', 'link');
  assert.equal(safe(scan(clean.root, 'candidate')).state, 'clean');
});
test('history finds add-then-remove while final tree is clean; clean ranges pass', real, t => {
  const r = repo(t); const base = baseline(r);
  r.write('removed.txt', 'token = ' + canary + '\n'); r.git('add', '--', 'removed.txt'); r.git('commit', '-qm', 'add fake');
  r.git('rm', '--', 'removed.txt'); r.git('commit', '-qm', 'remove fake');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'clean');
  const history = safe(scan(r.root, 'history', [base, 'HEAD']));
  assert.equal(history.state, 'finding'); assert.equal(history.identity.commits, 2);
  assert.equal(scan(r.root, 'history', ['HEAD', 'HEAD']).state, 'clean');
});
test('unknown/shallow bases fail closed; reversed ranges and skipped assets are explicit', t => {
  const r = repo(t); const base = baseline(r);
  assert.equal(scan(r.root, 'history', ['missing', 'HEAD']).state, 'incomplete');
  r.write('later', 'later'); r.git('add', '--', 'later'); r.git('commit', '-qm', 'later');
  assert.equal(scan(r.root, 'history', ['HEAD', base]).state, 'clean');
  r.write('binary', Buffer.from([0, 1, 2])); r.git('add', '--', 'binary');
  assert.equal(scan(r.root, 'candidate').state, 'partial');
  r.git('rm', '--cached', '--', 'binary');
  r.git('update-index', '--add', '--cacheinfo', '160000,' + base + ',module');
  const moduleResult = scan(r.root, 'candidate');
  assert.equal(moduleResult.state, 'partial'); assert.equal(moduleResult.skipped.submodule, 1);
  r.git('update-index', '--force-remove', '--', 'module');
  fs.writeFileSync(path.join(r.root, '.git', 'shallow'), base + '\n');
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
});
test('project detector/ignore/environment settings and allow comments cannot weaken scan', real, t => {
  const r = repo(t); baseline(r);
  r.write('.gitleaks.toml', '[allowlist]\npaths = [".*"]\n');
  r.write('.gitleaksignore', '*\n');
  r.write('token.txt', 'token = ' + canary + ' # gitleaks:allow\n'); r.git('add', '--', '.gitleaks.toml', '.gitleaksignore', 'token.txt');
  const previous = process.env.GITLEAKS_CONFIG;
  process.env.GITLEAKS_CONFIG = path.join(r.root, '.gitleaks.toml');
  try { assert.equal(safe(scan(r.root, 'candidate')).state, 'finding'); }
  finally { if (previous === undefined) delete process.env.GITLEAKS_CONFIG; else process.env.GITLEAKS_CONFIG = previous; }
});
function fake(t, code, version = '8.30.1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-fake-scanner-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const binary = path.join(dir, 'scanner');
  fs.writeFileSync(binary, '#!' + process.execPath + '\n' +
    `if (process.argv[2] === 'version') { console.log(${JSON.stringify(version)}); process.exit(0); }\n` + code, { mode: 0o700 });
  return binary;
}
test('missing tool, unsupported version, errors, timeout and incomplete reports are distinct and value-free', t => {
  const r = repo(t); baseline(r);
  assert.equal(scan(r.root, 'candidate', [], { binary: path.join(r.root, 'missing') }).state, 'missing-tool');
  assert.equal(scan(r.root, 'candidate', [], { binary: fake(t, '', '9.0.0') }).state, 'unsupported-version');
  const bad = fake(t, `console.log(${JSON.stringify(canary)}); console.error(${JSON.stringify(canary)}); process.exit(2);`);
  assert.equal(safe(scan(r.root, 'candidate', [], { binary: bad })).state, 'error');
  const hang = fake(t, 'setTimeout(() => {}, 10000);');
  assert.equal(safe(scan(r.root, 'candidate', [], { binary: hang, timeout: 100 })).state, 'timeout');
  assert.equal(safe(scan(r.root, 'candidate', [], { binary: fake(t, 'process.exit(0);') })).state, 'incomplete');
  const mismatch = fake(t, "require('node:fs').writeFileSync('report.json', '[{}]'); process.exit(0);");
  assert.equal(scan(r.root, 'candidate', [], { binary: mismatch }).state, 'incomplete');
});
test('candidate mutation during scan invalidates clean evidence; hooks can alter later commits', real, t => {
  const r = repo(t); baseline(r);
  const mutator = fake(t, `require('node:child_process').spawnSync('git', ['update-index', '--force-remove', '--', 'clean.txt'], {cwd:${JSON.stringify(r.root)}}); require('node:fs').writeFileSync('report.json', '[]');`);
  assert.equal(scan(r.root, 'candidate', [], { binary: mutator }).state, 'changed');
  r.git('add', '--', 'clean.txt'); const result = scan(r.root, 'candidate'); assert.equal(result.state, 'clean');
  fs.writeFileSync(path.join(r.root, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\nprintf changed > hook.txt\ngit add -- hook.txt\n', { mode: 0o700 });
  r.write('clean.txt', 'task edit\n'); r.git('add', '--', 'clean.txt');
  const beforeHook = scan(r.root, 'candidate'); r.git('commit', '-qm', 'hook mutation');
  assert.notEqual(r.git('rev-parse', 'HEAD^{tree}'), beforeHook.identity.tree);
});
test('long lines and non-UTF-8 report skips; invocation errors never echo values', t => {
  const r = repo(t); baseline(r);
  r.write('large', 'a'.repeat(60001)); r.git('add', '--', 'large');
  assert.equal(scan(r.root, 'candidate').state, 'partial'); r.git('rm', '--cached', '--', 'large');
  r.write('bad', Buffer.from([255])); r.git('add', '--', 'bad');
  assert.equal(scan(r.root, 'candidate').state, 'partial');
  let printed = ''; assert.equal(main([], { write: value => { printed += value; } }), 2);
  assert.deepEqual(JSON.parse(printed), { state: 'usage' });
});
test('history includes merge-side trees and commit metadata', real, t => {
  const r = repo(t); const base = baseline(r); const branch = r.git('branch', '--show-current');
  r.git('checkout', '-qb', 'side'); r.write('side.txt', 'token = ' + canary + '\n');
  r.git('add', '--', 'side.txt'); r.git('commit', '-qm', 'side fixture');
  r.git('rm', '--', 'side.txt'); r.git('commit', '-qm', 'remove side fixture');
  r.git('checkout', '-q', branch); r.write('main.txt', 'safe\n');
  r.git('add', '--', 'main.txt'); r.git('commit', '-qm', 'main change');
  r.git('merge', '--no-ff', '-qm', 'merge fixture', 'side');
  assert.equal(safe(scan(r.root, 'history', [base, 'HEAD'])).state, 'finding');
  const m = repo(t); const mbase = baseline(m);
  m.write('clean.txt', 'safe change\n'); m.git('add', '--', 'clean.txt');
  m.git('commit', '-qm', 'synthetic token = ' + canary);
  assert.equal(safe(scan(m.root, 'history', [mbase, 'HEAD'])).state, 'finding');
});
test('unmerged indexes, missing objects and grafts block required coverage', t => {
  const r = repo(t); const base = baseline(r); const blob = r.git('rev-parse', 'HEAD:clean.txt');
  r.git('update-index', '--force-remove', '--', 'clean.txt');
  const input = `100644 ${blob} 1\tclean.txt\n100644 ${blob} 2\tclean.txt\n`;
  assert.equal(spawnSync('git', ['update-index', '--index-info'], { cwd: r.root, input }).status, 0);
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
  r.git('read-tree', 'HEAD');
  fs.mkdirSync(path.join(r.root, '.git', 'info'), { recursive: true });
  fs.writeFileSync(path.join(r.root, '.git', 'info', 'grafts'), base + '\n');
  assert.equal(scan(r.root, 'history', [base, 'HEAD']).state, 'incomplete');
  fs.rmSync(path.join(r.root, '.git', 'info', 'grafts'));
  fs.rmSync(path.join(r.root, '.git', 'objects', blob.slice(0, 2), blob.slice(2)));
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
});
test('CLI never echoes arbitrary invocation data or raw scanner diagnostics', t => {
  const r = repo(t); baseline(r);
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/scan-secrets.cjs'),
    r.root, canary], { encoding: 'utf8' });
  assert.equal(result.status, 2); assert(!result.stdout.includes(canary)); assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { state: 'usage' });
});
test('review: binary and minified assets report skipped coverage without hiding text findings', real, t => {
  const r = repo(t); baseline(r);
  r.write('favicon.png', Buffer.from([137, 80, 78, 71, 0, 1]));
  r.write('minified.js', 'a'.repeat(60001)); r.git('add', '--', 'favicon.png', 'minified.js');
  const result = safe(scan(r.root, 'candidate'));
  assert.equal(result.state, 'partial'); assert.equal(result.skipped.binary, 1); assert.equal(result.skipped.longLine, 1);
  assert(result.skippedObjects.every(item => /^[a-f0-9]{40,64}$/.test(item.object)));
  r.write('clean.txt', 'token = ' + canary); r.git('add', '--', 'clean.txt');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
});
test('review: deleting a known leaked value passes candidate while new outgoing exposure stays detected', real, t => {
  const r = repo(t); const base = baseline(r);
  r.write('leak.txt', 'token = ' + canary); r.git('add', '--', 'leak.txt'); r.git('commit', '-qm', 'synthetic leak');
  r.git('rm', '--', 'leak.txt'); const candidate = safe(scan(r.root, 'candidate'));
  assert.equal(candidate.state, 'clean'); r.git('commit', '-qm', 'remove synthetic leak');
  assert.equal(safe(scan(r.root, 'history', [base, 'HEAD'])).state, 'finding');
});
test('review: findings identify rule, immutable object and local line with a stable fingerprint', real, t => {
  const r = repo(t); baseline(r);
  r.write('fixture.txt', 'first line\ntoken = ' + canary + '\n'); r.git('add', '--', 'fixture.txt');
  const result = safe(scan(r.root, 'candidate')); assert.equal(result.findings, 1);
  const location = result.locations[0];
  assert.equal(location.rule, 'github-pat'); assert.equal(location.object, r.git('rev-parse', ':fixture.txt'));
  assert.equal(location.line, 2); assert.match(location.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert(!JSON.stringify(result).includes('fixture.txt'));
});
test('review: divergent remote bases and explicit root history scan all outgoing commits', real, t => {
  const r = repo(t); baseline(r); const branch = r.git('branch', '--show-current');
  r.git('checkout', '-qb', 'remote'); r.write('remote.txt', 'remote advanced'); r.git('add', '--', 'remote.txt'); r.git('commit', '-qm', 'remote');
  const remote = r.git('rev-parse', 'HEAD'); r.git('checkout', '-q', branch);
  r.write('branch.txt', 'branch change'); r.git('add', '--', 'branch.txt'); r.git('commit', '-qm', 'branch');
  assert.equal(safe(scan(r.root, 'history', [remote, 'HEAD'])).state, 'clean');
  const all = safe(scan(r.root, 'history', ['--root', 'HEAD'])); assert.equal(all.state, 'clean');
  assert.equal(all.identity.base, null); assert.equal(all.identity.commits, 2);
});
test('review: fingerprint dispositions need approval of exact selected-index bytes and stay narrow', real, t => {
  const r = repo(t); baseline(r);
  r.write('old-fixture.txt', 'token = ' + canary + '\n'); r.git('add', '--', 'old-fixture.txt');
  const finding = scan(r.root, 'candidate').locations[0];
  const policy = JSON.stringify({ format: 1, findings: [{ fingerprint: finding.fingerprint, reason: 'Known generated fake fixture; reviewed for this exact blob.' }] });
  r.write('.kaylo/secret-findings.json', policy); r.git('add', '--', '.kaylo/secret-findings.json');
  const unapproved = safe(scan(r.root, 'candidate')); assert.equal(unapproved.state, 'finding');
  const approval = unapproved.dispositions.digest;
  const allowed = safe(scan(r.root, 'candidate', [], { dispositions: approval }));
  assert.equal(allowed.state, 'clean'); assert.equal(allowed.dismissed.length, 1); assert(allowed.dispositions.approved);
  r.write('.kaylo/secret-findings.json', 'unstaged invalid content');
  assert.equal(scan(r.root, 'candidate', [], { dispositions: approval }).state, 'clean');
  r.git('commit', '-qm', 'reviewed fake fixture and disposition');
  assert.equal(scan(r.root, 'history', ['--root', 'HEAD'], { dispositions: approval }).state, 'clean');
  r.write('old-fixture.txt', 'new preceding line\ntoken = ' + canary + '\n'); r.git('add', '--', 'old-fixture.txt');
  assert.equal(safe(scan(r.root, 'candidate', [], { dispositions: approval })).state, 'finding');
  const changedPolicy = JSON.stringify({ format: 1, findings: [] });
  r.write('.kaylo/secret-findings.json', changedPolicy); r.git('add', '--', '.kaylo/secret-findings.json');
  assert.equal(scan(r.root, 'candidate', [], { dispositions: approval }).state, 'changed-dispositions');
});
test('review: malformed disposition files block without echoing rationale or fingerprints', t => {
  const r = repo(t); baseline(r);
  for (const policy of ['broken ' + canary, JSON.stringify({ format: 1, findings: [{ fingerprint: '*', reason: canary }] }),
    JSON.stringify({ format: 1, findings: [], extra: canary })]) {
    r.write('.kaylo/secret-findings.json', policy); r.git('add', '--', '.kaylo/secret-findings.json');
    assert.equal(safe(scan(r.root, 'candidate')).state, 'invalid-dispositions');
  }
});
test('review: compatible versions and missing-tool next steps are explicit; actual 8.30.1 remains detector evidence', t => {
  for (const version of ['8.30.1', '8.30.2', '8.31.0', '8.99.10']) assert(acceptsVersion(version));
  for (const version of ['8.30.0', '8.29.9', '9.0.0', '8.31.0-rc1', canary]) assert(!acceptsVersion(version));
  const r = repo(t); baseline(r);
  const compatible = fake(t, "require('node:fs').writeFileSync('report.json', '[]');", '8.31.0');
  const result = scan(r.root, 'candidate', [], { binary: compatible });
  assert.equal(result.state, 'clean'); assert.equal(result.version, '8.31.0');
  assert.match(scan(r.root, 'candidate', [], { binary: path.join(r.root, 'missing') }).nextAction, /approved project tooling/);
});
test('review: unchanged binary assets are identifiable, first-push leaks are detected, and skips preserve CLI status', real, t => {
  const r = repo(t); baseline(r);
  r.write('asset', Buffer.from([0, 255, 0])); r.git('add', '--', 'asset'); r.git('commit', '-qm', 'synthetic asset');
  r.write('clean.txt', 'text only'); r.git('add', '--', 'clean.txt');
  const result = safe(scan(r.root, 'candidate')); assert.equal(result.state, 'partial'); assert.equal(result.skippedObjects[0].newContent, false);
  let output = ''; assert.equal(main([r.root, 'candidate'], { write: value => { output += value; } }), 2);
  assert.equal(JSON.parse(output).state, 'partial');
  const newRepo = repo(t); newRepo.write('secret', 'token = ' + canary); newRepo.git('add', '--', 'secret'); newRepo.git('commit', '-qm', 'synthetic root leak');
  assert.equal(safe(scan(newRepo.root, 'history', ['--root', 'HEAD'])).state, 'finding');
});
test('review: multiple text objects use one bulk Git read', real, t => {
  const r = repo(t); baseline(r);
  for (let i = 0; i < 200; i++) r.write('file' + i, 'distinct safe text ' + i);
  r.git('add', '--', '.');
  const trace = path.join(r.root, '.git', 'trace'); const previous = process.env.GIT_TRACE;
  try {
    process.env.GIT_TRACE = trace;
    const result = scan(r.root, 'candidate'); assert.equal(result.state, 'clean'); assert.equal(result.blobs, 201);
  } finally { if (previous === undefined) delete process.env.GIT_TRACE; else process.env.GIT_TRACE = previous; }
  const log = fs.readFileSync(trace, 'utf8');
  assert.equal((log.match(/git cat-file --batch(?:\s|$)/gm) || []).length, 1);
});
test('review: finding locations remain object-relative through large multiline input and history', real, t => {
  const r = repo(t); const base = baseline(r);
  const count = 100000;
  r.write('large.txt', 'safe configuration line\n'.repeat(count) + 'token = ' + canary + '\n');
  r.git('add', '--', 'large.txt');
  const candidate = safe(scan(r.root, 'candidate')); assert.equal(candidate.state, 'finding');
  const location = candidate.locations.find(item => item.object === r.git('rev-parse', ':large.txt'));
  assert.equal(location.line, count + 1);
  r.git('commit', '-qm', 'large synthetic fixture');
  const history = safe(scan(r.root, 'history', [base, 'HEAD']));
  assert(history.locations.some(item => item.fingerprint === location.fingerprint));
});
