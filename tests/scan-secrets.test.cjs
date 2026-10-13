'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scan, main } = require('../scripts/scan-secrets.cjs');
const canary = ['ghp', require('node:crypto').createHash('sha256')
  .update('kaylo-synthetic-sentinel').digest('hex').slice(0, 36)].join('_');
const available = spawnSync('gitleaks', ['version'], { encoding: 'utf8' }).stdout?.trim() === '8.30.1';
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
const real = { skip: !available && 'Installed Gitleaks 8.30.1 required for detector fixtures' };
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
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
});
test('renames/deletions include delta; symlink text scanned without reading target', real, t => {
  const r = repo(t); baseline(r);
  r.write('old.txt', 'token = ' + canary + '\n'); r.git('add', '--', 'old.txt'); r.git('commit', '-qm', 'synthetic exposure');
  r.git('mv', 'old.txt', 'new.txt');
  assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
  r.git('rm', '-f', '--', 'new.txt'); assert.equal(safe(scan(r.root, 'candidate')).state, 'finding');
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
test('unknown/nonancestor/shallow bases and binary/submodule content fail closed', t => {
  const r = repo(t); const base = baseline(r);
  assert.equal(scan(r.root, 'history', ['missing', 'HEAD']).state, 'incomplete');
  r.write('later', 'later'); r.git('add', '--', 'later'); r.git('commit', '-qm', 'later');
  assert.equal(scan(r.root, 'history', ['HEAD', base]).state, 'incomplete');
  r.write('binary', Buffer.from([0, 1, 2])); r.git('add', '--', 'binary');
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
  r.git('rm', '--cached', '--', 'binary');
  r.git('update-index', '--add', '--cacheinfo', '160000,' + base + ',module');
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
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
test('oversized lines, invalid UTF-8 and invocation errors block without values', t => {
  const r = repo(t); baseline(r);
  r.write('large', 'a'.repeat(60001)); r.git('add', '--', 'large');
  assert.equal(scan(r.root, 'candidate').state, 'incomplete'); r.git('rm', '--cached', '--', 'large');
  r.write('bad', Buffer.from([255])); r.git('add', '--', 'bad');
  assert.equal(scan(r.root, 'candidate').state, 'incomplete');
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
