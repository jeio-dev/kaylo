'use strict';

// The foundation reference's ignore example must keep approved nonsecret files
// addable while ignoring secret-named files, and must not untrack committed files.
// Disposable Git roots only; file contents are fake canaries.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const reference = fs.readFileSync(path.resolve(__dirname, '../skills/plan/references/foundation.md'), 'utf8');
const example = reference.match(/```gitignore\n([\s\S]*?)```/);

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=Kaylo Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false',
    '-c', 'core.hooksPath=' + os.devNull, ...args],
    { cwd, encoding: 'utf8' });
  if (result.error) assert.fail(`git is required for the ignore fixtures: ${result.error.message}`);
  return result;
}
function repo(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-foundation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(git(root, 'init', '-q').status, 0);
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}
const ignored = (root, name) => git(root, 'check-ignore', '-q', '--no-index', name).status === 0;

test('the reference ships one gitignore example with explicit safe-file exceptions', () => {
  assert(example, 'foundation.md needs a gitignore example');
  assert.deepEqual(example[1].trim().split('\n'), ['.env*', '!.env.example', '!.env.test']);
  assert.equal(reference.match(/```gitignore/g).length, 1);
});

test('safe example and fake test files stay addable; secret-named files are ignored at any depth', t => {
  const fake = 'API_TOKEN=fake-canary-not-a-secret\n';
  const root = repo(t, { '.gitignore': example[1], '.env.example': 'API_TOKEN=\n', '.env.test': fake,
    'apps/web/.env.example': 'API_TOKEN=\n', '.env': fake, '.env.local': fake, '.env.production': fake,
    'apps/web/.env': fake, 'apps/web/.env.development.local': fake });
  for (const name of ['.env.example', '.env.test', 'apps/web/.env.example']) assert.equal(ignored(root, name), false, name);
  for (const name of ['.env', '.env.local', '.env.production', 'apps/web/.env', 'apps/web/.env.development.local']) {
    assert.equal(ignored(root, name), true, name);
  }
  assert.equal(git(root, 'add', '-A').status, 0);
  const staged = git(root, 'diff', '--cached', '--name-only').stdout.trim().split('\n').sort();
  assert.deepEqual(staged, ['.env.example', '.env.test', '.gitignore', 'apps/web/.env.example']);
});

test('a blanket .env* without exceptions would hide the example file', t => {
  const root = repo(t, { '.gitignore': '.env*\n', '.env.example': 'API_TOKEN=\n' });
  assert.equal(ignored(root, '.env.example'), true);
});

test('ignore rules do not untrack an already committed secret-named file or delete it', t => {
  const fake = 'API_TOKEN=fake-canary-not-a-secret\n';
  const root = repo(t, { '.env': fake });
  assert.equal(git(root, 'add', '.env').status, 0);
  assert.equal(git(root, 'commit', '-q', '-m', 'fixture').status, 0);
  fs.writeFileSync(path.join(root, '.gitignore'), example[1]);
  assert.equal(git(root, 'ls-files', '--error-unmatch', '.env').status, 0, 'still tracked');
  assert.equal(git(root, 'check-ignore', '-q', '.env').status, 1, 'tracked files are not reported as ignored');
  assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), fake);
});
