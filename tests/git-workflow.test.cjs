'use strict';

// The Git workflow reference tells the assistant how to commit only a task's changes.
// These fixtures pin the Git behavior that guidance relies on, in disposable
// repositories with hooks disabled, and keep the reference in step with its parsers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readPreferences } = require('../scripts/read-preferences.cjs');
const { types } = require('../scripts/check-commit-message.cjs');
const referencePath = path.resolve(__dirname, '../skills/build/references/git.md');
const reference = fs.readFileSync(referencePath, 'utf8');

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=Kaylo Test', '-c', 'user.email=test@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=' + os.devNull, ...args], { cwd, encoding: 'utf8' });
  if (result.error) assert.fail(`git is required for the workflow fixtures: ${result.error.message}`);
  return result;
}
function ok(cwd, ...args) {
  const result = git(cwd, ...args);
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stderr}`);
  return result.stdout;
}
// A committed baseline with the user's own work in every state the reference names.
function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-git-workflow-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  ok(root, 'init', '-q');
  const write = (name, text) => fs.writeFileSync(path.join(root, name), text);
  for (const name of ['user-staged.txt', 'user-unstaged.txt', 'task.txt', 'removed.txt', 'moved.txt']) write(name, `${name}\n`);
  ok(root, 'add', '-A');
  ok(root, 'commit', '-q', '-m', 'baseline');
  write('user-staged.txt', 'user-staged.txt\nuser staged edit\n');
  ok(root, 'add', '--', 'user-staged.txt');
  write('user-unstaged.txt', 'user-unstaged.txt\nuser unstaged edit\n');
  write('user-untracked.txt', 'user untracked\n');
  // The task's own changes: an edit, a new file, a deletion and a rename.
  write('task.txt', 'task.txt\ntask edit\n');
  write('task-new.txt', 'task new\n');
  fs.rmSync(path.join(root, 'removed.txt'));
  fs.renameSync(path.join(root, 'moved.txt'), path.join(root, 'renamed.txt'));
  return root;
}
const status = root => ok(root, 'status', '--porcelain=v1').split('\n').filter(Boolean).sort();

test('git commit --only commits exactly the task paths and leaves the user index, worktree and untracked files', t => {
  const root = workspace(t);
  ok(root, 'add', '--', 'task-new.txt', 'renamed.txt');
  ok(root, 'commit', '-q', '--only', '-m', 'feat: task (01-T1)', '--', 'task.txt', 'task-new.txt', 'removed.txt',
    'moved.txt', 'renamed.txt');
  const committed = ok(root, 'show', '--name-status', '--format=', '-M', 'HEAD').trim().split('\n').sort();
  assert.deepEqual(committed, ['A\ttask-new.txt', 'D\tremoved.txt', 'M\ttask.txt', 'R100\tmoved.txt\trenamed.txt']);
  assert.deepEqual(status(root), [' M user-unstaged.txt', '?? user-untracked.txt', 'M  user-staged.txt']);
  assert.equal(ok(root, 'diff', '--cached', '--', 'user-staged.txt').includes('+user staged edit'), true);
  assert.equal(fs.readFileSync(path.join(root, 'user-unstaged.txt'), 'utf8'), 'user-unstaged.txt\nuser unstaged edit\n');
});

test('a plain commit after staging the task paths would also take the user staged file', t => {
  const root = workspace(t);
  ok(root, 'add', '--', 'task.txt');
  ok(root, 'commit', '-q', '-m', 'feat: task (01-T1)');
  assert.match(ok(root, 'show', '--name-only', '--format=', 'HEAD'), /user-staged\.txt/);
});

test('committing a path the user had also edited takes the user edit, so overlap must stop the step', t => {
  const root = workspace(t);
  fs.appendFileSync(path.join(root, 'user-unstaged.txt'), 'task edit in the same file\n');
  ok(root, 'commit', '-q', '--only', '-m', 'feat: task (01-T1)', '--', 'user-unstaged.txt');
  assert.match(ok(root, 'show', 'HEAD'), /\+user unstaged edit/);
});

test('an untracked task file must be added before an --only commit can name it', t => {
  const root = workspace(t);
  const result = git(root, 'commit', '-q', '--only', '-m', 'feat: task (01-T1)', '--', 'task-new.txt');
  assert.notEqual(result.status, 0);
  assert.equal(ok(root, 'rev-list', '--count', 'HEAD').trim(), '1');
});

test('the reference documents every preference diagnostic, its example parses, and its types match the checker', t => {
  const source = fs.readFileSync(path.resolve(__dirname, '../scripts/read-preferences.cjs'), 'utf8');
  for (const code of new Set(source.match(/PREFS_[A-Z_]+(?=:)/g))) assert.match(reference, new RegExp(`\`${code}\``), code);
  const example = reference.match(/```text\n(Format: 1\n[\s\S]*?)```/);
  assert(example, 'git.md needs a literal preferences example');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-git-doc-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.kaylo'));
  fs.writeFileSync(path.join(root, '.kaylo/preferences.md'), example[1]);
  const parsed = readPreferences(root);
  assert.equal(parsed.state, 'present');
  assert.deepEqual(parsed.diagnostics, []);
  assert.deepEqual(parsed.notes, []);
  assert.equal(Object.keys(parsed.values).length, 7);
  const documented = reference.match(/`type` is one of ([^.]*)\./)[1].match(/`([a-z]+)`/g).map(value => value.slice(1, -1));
  assert.deepEqual(documented, types);
});

test('the pull request reference keeps its fallback layout, Issue example and release note form usable', t => {
  const pulls = fs.readFileSync(path.resolve(__dirname, '../skills/build/references/pull-requests.md'), 'utf8');
  const layout = pulls.match(/```markdown\n([\s\S]*?)```/)[1];
  assert.deepEqual(layout.match(/^## .*/gm), ['## Summary', '## Phase', '## Changes', '## Verification', '## Risk', '## Release note']);
  assert.match(layout, /\]\(\.kaylo\/phases\/03-login\/03-PLAN\.md\)/, 'links the ROADMAP-style phase plan path');
  const note = /^Release note: (?:feature|fix|breaking|internal) \((?:provisional|reviewed|pending)\) — \S/m;
  assert.match(pulls, note);
  assert.match(layout.split('## Release note\n')[1], /^(?:feature|fix|breaking|internal) \(provisional\) — \S/);
  const issue = pulls.match(/```text\n( {2}- Issue: .*)\n```/)[1];
  const { validate } = require('../scripts/validate-plan.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-issue-doc-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plan = '.kaylo/phases/01-a/01-PLAN.md';
  fs.mkdirSync(path.join(root, path.dirname(plan)), { recursive: true });
  fs.writeFileSync(path.join(root, 'ROADMAP.md'), `Current: [01 A](${plan})\n\n- [ ] [01 A](${plan}) — A\n`);
  fs.writeFileSync(path.join(root, plan), '# 01 A\nStatus: Current\n\n## Tasks\n- [ ] T1: Do A\n  - Blocked by: None\n' +
    `  - Acceptance criteria: A works\n  - Test plan: run a\n${issue}\n  - Result: Not started\n\n## Review\nNone.\n`);
  assert.deepEqual(validate(root), []);
});
