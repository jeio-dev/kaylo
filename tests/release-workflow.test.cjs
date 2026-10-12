'use strict';

// Disposable Git repositories pin the release procedure's actual ref, ancestry
// and artifact behavior. These do not exercise live publication or model judgment.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { propose } = require('../scripts/release-notes.cjs');
function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=Kaylo Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=' + os.devNull, ...args], { cwd, encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}
function ok(cwd, ...args) {
  const result = git(cwd, ...args);
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function fixture(t) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-release-git-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const root = path.join(scratch, 'project');
  const remote = path.join(scratch, 'remote.git');
  fs.mkdirSync(root);
  ok(root, 'init', '-q', '-b', 'trunk');
  ok(root, 'init', '-q', '--bare', remote);
  ok(root, 'remote', 'add', 'publication', remote);
  const write = (name, content) => fs.writeFileSync(path.join(root, name), content);
  write('artifact.txt', 'released artifact\n');
  write('user-index.txt', 'baseline\n');
  write('user-worktree.txt', 'baseline\n');
  ok(root, 'add', '--', 'artifact.txt', 'user-index.txt', 'user-worktree.txt');
  ok(root, 'commit', '-q', '-m', 'baseline');
  ok(root, 'tag', '-a', 'v0.11.0', '-m', 'Previous release');
  const baseline = ok(root, 'rev-parse', 'HEAD').trim();
  write('artifact.txt', 'candidate artifact\n');
  ok(root, 'add', '--', 'artifact.txt');
  ok(root, 'commit', '-q', '-m', 'A nonconventional feature summary');
  const candidate = ok(root, 'rev-parse', 'HEAD').trim();
  ok(root, 'tag', '-a', 'v0.12.0', '-m', 'Candidate');
  write('user-index.txt', 'staged human content\n');
  ok(root, 'add', '--', 'user-index.txt');
  write('user-worktree.txt', 'unstaged human content\n');
  write('untracked-human.txt', 'untracked human content\n');
  write('artifact.txt', 'dirty artifact not certified by candidate CI\n');
  return { root, remote, write, candidate, baseline };
}
function state(root) {
  return { index: ok(root, 'diff', '--cached'), worktree: ok(root, 'diff'),
    status: ok(root, 'status', '--porcelain=v1'), head: ok(root, 'rev-parse', 'HEAD') };
}

test('single-tag ref push selects exactly the candidate with an unrelated tag present and leaves branch/index/tree unchanged', t => {
  const f = fixture(t);
  ok(f.root, 'tag', 'unrelated-private-tag', f.baseline);
  const before = state(f.root);
  const blanket = git(f.root, 'push', '--dry-run', 'publication', '--tags');
  assert.equal(blanket.status, 0);
  assert.match(blanket.stderr, /unrelated-private-tag/);
  ok(f.root, 'push', 'publication', 'refs/tags/v0.12.0:refs/tags/v0.12.0');
  const refs = ok(f.root, 'ls-remote', '--refs', 'publication').trim().split('\n');
  assert.equal(refs.length, 1);
  assert.match(refs[0], /refs\/tags\/v0\.12\.0$/);
  assert.equal(ok(f.remote, 'rev-parse', 'v0.12.0^{commit}').trim(), f.candidate);
  assert.deepEqual(state(f.root), before);
});

test('archive and released history cover the immutable candidate, not dirty contents or branch-only commits', t => {
  const f = fixture(t);
  const before = state(f.root);
  assert.equal(ok(f.root, 'show', 'v0.12.0:artifact.txt'), 'candidate artifact\n');
  assert.equal(fs.readFileSync(path.join(f.root, 'artifact.txt'), 'utf8'), 'dirty artifact not certified by candidate CI\n');
  const range = ok(f.root, 'log', '--format=%H|%an|%s', 'v0.11.0..v0.12.0').trim();
  assert.equal(range, `${f.candidate}|Kaylo Fixture|A nonconventional feature summary`);
  const archive = path.join(f.root, 'candidate.tar');
  ok(f.root, 'archive', '--format=tar', '-o', archive, 'v0.12.0');
  const listing = spawnSync('tar', ['-tf', archive], { encoding: 'utf8' });
  assert.equal(listing.status, 0);
  assert.doesNotMatch(listing.stdout, /untracked-human/);
  const content = spawnSync('tar', ['-xOf', archive, 'artifact.txt'], { encoding: 'utf8' });
  assert.equal(content.status, 0);
  assert.equal(content.stdout, 'candidate artifact\n');
  fs.unlinkSync(archive);
  assert.deepEqual(state(f.root), before);
  // Commit a separate branch with unrelated changes; they are absent from release ancestry.
  const otherTree = ok(f.root, 'rev-parse', `${f.baseline}^{tree}`).trim();
  const branchOnly = ok(f.root, 'commit-tree', otherTree, '-p', f.baseline, '-m', 'Branch-only work').trim();
  ok(f.root, 'update-ref', 'refs/heads/unrelated', branchOnly);
  assert.doesNotMatch(ok(f.root, 'log', '--format=%H', 'v0.11.0..v0.12.0'), new RegExp(branchOnly));
});

test('an existing mismatched immutable remote tag is rejected rather than silently moved', t => {
  const f = fixture(t);
  ok(f.root, 'push', 'publication', `${f.baseline}:refs/tags/v0.12.0`);
  const result = git(f.root, 'push', 'publication', 'refs/tags/v0.12.0:refs/tags/v0.12.0');
  assert.notEqual(result.status, 0);
  assert.equal(ok(f.remote, 'rev-parse', 'v0.12.0^{commit}').trim(), f.baseline);
});

test('notes proposal in a dirty repository does not alter index, artifact, refs or human contents', t => {
  const f = fixture(t);
  f.write('ROADMAP.md', 'Current: [01](phase.md)\n- [x] [01](phase.md) — Export\n- [ ] 02 Future\n');
  f.write('phase.md', '## Review\nRelease note: feature (reviewed) — Export.\nRelease contribution: v0.11.0 / initial\n');
  f.write('CHANGELOG.md', '## [Unreleased]\n### Notable Changes\n\nHuman note.\n');
  const before = state(f.root);
  const refs = ok(f.root, 'show-ref');
  const result = propose(f.root, { format: 1, project: 'fixture', boundary: 'v0.11.0', notes: 'CHANGELOG.md',
    phases: [{ id: '01', plan: 'phase.md' }] });
  assert.equal(result.counts.feature, 1);
  assert.deepEqual(state(f.root), before);
  assert.equal(ok(f.root, 'show-ref'), refs);
  assert.match(fs.readFileSync(path.join(f.root, 'artifact.txt'), 'utf8'), /dirty artifact/);
});
