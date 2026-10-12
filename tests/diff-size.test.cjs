'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { diffSize } = require('../scripts/diff-size.cjs');
const script = path.resolve(__dirname, '../scripts/diff-size.cjs');

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=Kaylo Test', '-c', 'user.email=test@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=' + os.devNull, ...args], { cwd, encoding: 'utf8' });
  if (result.error) assert.fail(`git is required for the size fixtures: ${result.error.message}`);
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}
const lines = n => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n') + '\n';
function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-diff-size-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  fs.writeFileSync(path.join(root, 'app.js'), lines(10));
  fs.writeFileSync(path.join(root, 'old-name.js'), lines(30));
  fs.writeFileSync(path.join(root, '.gitattributes'), 'dist/** linguist-generated\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  return { root, base: git(root, 'rev-parse', 'HEAD') };
}
const write = (root, name, text) => {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), text);
};

test('counts added and deleted lines between commits, listing lockfiles, generated and binary files apart', t => {
  const { root, base } = repo(t);
  write(root, 'app.js', lines(10).replace('line 3\n', 'changed\n') + 'more\n');
  write(root, 'package-lock.json', lines(500));
  write(root, 'apps/web/yarn.lock', lines(20));
  write(root, 'dist/bundle.js', lines(300));
  write(root, 'logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]));
  fs.renameSync(path.join(root, 'old-name.js'), path.join(root, 'new-name.js'));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'phase');
  const result = diffSize(root, base, 'HEAD');
  assert.deepEqual(result.counted, { files: 2, added: 2, deleted: 1, lines: 3 });
  assert.deepEqual(result.lockfiles, [{ path: 'apps/web/yarn.lock', added: 20, deleted: 0 },
    { path: 'package-lock.json', added: 500, deleted: 0 }]);
  assert.deepEqual(result.generated, [{ path: 'dist/bundle.js', added: 300, deleted: 0 }]);
  assert.deepEqual(result.binary, ['logo.png']);
  assert.equal(result.band, 'under-400');
  assert.equal(result.head, 'HEAD');
});

test('without a head, the working tree is compared, including untracked text files and ignoring ignored ones', t => {
  const { root, base } = repo(t);
  write(root, 'app.js', lines(10) + lines(5));
  write(root, 'new.js', 'one\ntwo');
  write(root, '.gitignore', 'secret.env\n');
  write(root, 'secret.env', lines(50));
  write(root, 'blob.bin', Buffer.from([1, 0, 2]));
  const result = diffSize(root, base);
  assert.equal(result.head, 'working tree');
  assert.deepEqual(result.counted, { files: 3, added: 8, deleted: 0, lines: 8 });
  assert.deepEqual(result.binary, ['blob.bin']);
});

test('the advisory band reports under 400, 400 to 600, and over 600 counted lines', t => {
  const { root, base } = repo(t);
  for (const [count, expected] of [[399, 'under-400'], [400, '400-600'], [600, '400-600'], [601, 'over-600']]) {
    write(root, 'big.js', lines(count));
    assert.equal(diffSize(root, base).band, expected, String(count));
  }
});

test('a project in a subdirectory reports the whole repository with top-level paths', t => {
  const { root, base } = repo(t);
  write(root, 'packages/site/index.js', lines(4));
  write(root, 'packages/site/dist/out.js', lines(9));
  // The root pattern dist/** is anchored at the top level, so a nested dist folder still counts.
  const result = diffSize(path.join(root, 'packages/site'), base);
  assert.deepEqual(result.counted, { files: 2, added: 13, deleted: 0, lines: 13 });
  assert.deepEqual(result.generated, []);
  write(root, 'dist/x.js', lines(2));
  assert.deepEqual(diffSize(path.join(root, 'packages'), base).generated, [{ path: 'dist/x.js', added: 2, deleted: 0 }]);
});

test('unknown revisions, option-like arguments and non-repositories are refused without output', t => {
  const { root } = repo(t);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  let result = run(root, 'no-such-ref');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'SIZE_REVISION: Revision does not name a commit: no-such-ref\n');
  for (const args of [[root], [root, '--output=/tmp/x'], [root, 'HEAD', '-p'], [root, 'a b'], ['--help', 'HEAD'],
    [root, 'HEAD', 'HEAD', 'HEAD']]) {
    result = run(...args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.equal(result.stderr, 'SIZE_USAGE: Expected a project directory, a base revision, and an optional head revision\n');
  }
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-diff-size-plain-'));
  t.after(() => fs.rmSync(plain, { recursive: true, force: true }));
  result = run(plain, 'HEAD');
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'SIZE_PROJECT: Project directory is not an available Git work tree\n');
});

test('the report changes nothing in the repository', t => {
  const { root, base } = repo(t);
  write(root, 'app.js', lines(12));
  const before = git(root, 'status', '--porcelain=v1');
  const result = spawnSync(process.execPath, [script, root, base], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).counted.lines, 2);
  assert.equal(git(root, 'status', '--porcelain=v1'), before);
});
