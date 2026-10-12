'use strict';

// Exercise the Kaylo proposal helper with an unrelated index, dirty artifact,
// refs and human files. Stock Git publication probes are recorded in VERIFICATION.md.
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
  fs.mkdirSync(root);
  ok(root, 'init', '-q', '-b', 'trunk');
  const write = (name, content) => fs.writeFileSync(path.join(root, name), content);
  write('artifact.txt', 'released artifact\n');
  write('user-index.txt', 'baseline\n');
  write('user-worktree.txt', 'baseline\n');
  ok(root, 'add', '--', 'artifact.txt', 'user-index.txt', 'user-worktree.txt');
  ok(root, 'commit', '-q', '-m', 'baseline');
  ok(root, 'tag', '-a', 'v0.11.0', '-m', 'Previous release');
  write('artifact.txt', 'candidate artifact\n');
  ok(root, 'add', '--', 'artifact.txt');
  ok(root, 'commit', '-q', '-m', 'A nonconventional feature summary');
  ok(root, 'tag', '-a', 'v0.12.0', '-m', 'Candidate');
  write('user-index.txt', 'staged human content\n');
  ok(root, 'add', '--', 'user-index.txt');
  write('user-worktree.txt', 'unstaged human content\n');
  write('untracked-human.txt', 'untracked human content\n');
  write('artifact.txt', 'dirty artifact not certified by candidate CI\n');
  return { root, write };
}
function state(root) {
  return { index: ok(root, 'diff', '--cached'), worktree: ok(root, 'diff'),
    status: ok(root, 'status', '--porcelain=v1'), head: ok(root, 'rev-parse', 'HEAD') };
}

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
