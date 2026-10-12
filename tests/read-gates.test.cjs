'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readGates } = require('../scripts/read-gates.cjs');
const script = path.resolve(__dirname, '../scripts/read-gates.cjs');
const valid = 'Format: 1\nDirectory: .\nFull check: npm run check\n';

function project(t, gates, dirs = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-gates-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
  if (gates !== undefined) {
    fs.mkdirSync(path.join(root, '.kaylo'), { recursive: true });
    fs.writeFileSync(path.join(root, '.kaylo/gates'), gates);
  }
  return root;
}
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const codes = result => result.state === 'invalid' ? result.diagnostics.map(d => `${d.code}@${d.location}`) : [];
function snapshot(root) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    const stat = fs.lstatSync(file);
    const row = `${path.relative(root, file)}:${stat.mode}:${stat.size}:${stat.mtimeMs}`;
    return entry.isDirectory() && !entry.isSymbolicLink() ? [row, ...walk(file)] : [row];
  });
  return walk(root).sort();
}

test('an absent reference is reported as missing, with exit 0', t => {
  const bare = project(t);
  assert.deepEqual(readGates(bare), { state: 'missing' });
  const withKaylo = project(t, undefined, ['.kaylo']);
  assert.deepEqual(readGates(withKaylo), { state: 'missing' });
  const result = cli(bare);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { state: 'missing' });
});

test('a valid root reference parses exactly and resolves against the supplied root, not the cwd', t => {
  const root = project(t, valid);
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', cwd: os.tmpdir() });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(parsed), ['state', 'format', 'directory', 'resolvedDirectory', 'fullCheck', 'digest']);
  assert.equal(parsed.state, 'present');
  assert.equal(parsed.format, 1);
  assert.equal(parsed.directory, '.');
  assert.equal(parsed.resolvedDirectory, fs.realpathSync(root));
  assert.equal(parsed.fullCheck, 'npm run check');
  assert.match(parsed.digest, /^sha256:[0-9a-f]{64}$/);
});

test('subdirectories with spaces, CRLF, blank lines, any order and exact command whitespace are accepted', t => {
  const command = 'make  check ARGS="a b"  ';
  const root = project(t, `\r\nFull check: ${command}\r\n\r\nDirectory: apps/my site\r\nFormat: 1`, ['apps/my site']);
  const result = readGates(root);
  assert.equal(result.state, 'present', JSON.stringify(result));
  assert.equal(result.directory, 'apps/my site');
  assert.equal(result.resolvedDirectory, path.join(fs.realpathSync(root), 'apps', 'my site'));
  assert.equal(result.fullCheck, command);
});

test('malformed records, separators, BOM, fences and comments are refused with line numbers', t => {
  const cases = [
    ['Format: 1\nDirectory: .\nFull check: x\nNotes: y\n', ['GATES_RECORD@.kaylo/gates:4']],
    ['# gates\n' + valid, ['GATES_RECORD@.kaylo/gates:1']],
    ['```\n' + valid + '```\n', ['GATES_RECORD@.kaylo/gates:1', 'GATES_RECORD@.kaylo/gates:5']],
    ['Format:1\nDirectory: .\nFull check: x\n', ['GATES_RECORD@.kaylo/gates:1', 'GATES_MISSING@.kaylo/gates']],
    ['Format:  1\nDirectory: .\nFull check: x\n', ['GATES_RECORD@.kaylo/gates:1', 'GATES_MISSING@.kaylo/gates']],
    ['format: 1\nDirectory: .\nFull check: x\n', ['GATES_RECORD@.kaylo/gates:1', 'GATES_MISSING@.kaylo/gates']],
    [' Format: 1\nDirectory: .\nFull check: x\n', ['GATES_RECORD@.kaylo/gates:1', 'GATES_MISSING@.kaylo/gates']],
    ['\ufeff' + valid, ['GATES_RECORD@.kaylo/gates:1']]
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(codes(readGates(project(t, text))), expected, JSON.stringify(text));
  }
});

test('duplicate, missing and unsupported-format fields are refused, never resolved by choosing one', t => {
  assert.deepEqual(codes(readGates(project(t, valid + 'Directory: .\n'))), ['GATES_DUPLICATE@.kaylo/gates:4']);
  const duplicate = readGates(project(t, valid + 'Full check: other\n'));
  assert.equal(duplicate.diagnostics[0].message, 'Duplicate gate field: Full check');
  const missing = readGates(project(t, 'Format: 1\n'));
  assert.deepEqual(missing.diagnostics.map(d => d.message),
    ['Missing gate field: Directory', 'Missing gate field: Full check']);
  assert.deepEqual(codes(readGates(project(t, ''))), ['GATES_MISSING@.kaylo/gates', 'GATES_MISSING@.kaylo/gates',
    'GATES_MISSING@.kaylo/gates']);
  assert.deepEqual(codes(readGates(project(t, valid.replace('Format: 1', 'Format: 2')))), ['GATES_FORMAT@.kaylo/gates:1']);
  assert.deepEqual(codes(readGates(project(t, valid.replace('Format: 1', 'Format: 1.0')))), ['GATES_FORMAT@.kaylo/gates:1']);
});

test('directories must be project-relative slash paths without dot components', t => {
  for (const directory of ['/srv/app', '../app', 'apps/../x', './apps', 'apps/./x', 'apps\\web', 'apps//web', 'apps/',
    'C:/app', 'c:app', 'file:///srv/app', 'https://example.test/x', 'apps ', ' ', 'apps/\u0007x', '']) {
    const result = readGates(project(t, valid.replace('Directory: .', `Directory: ${directory}`)));
    assert.deepEqual(codes(result), ['GATES_DIRECTORY@.kaylo/gates:2'], JSON.stringify(directory));
  }
  // A second leading space is a malformed separator, not part of the path.
  assert.deepEqual(codes(readGates(project(t, valid.replace('Directory: .', 'Directory:  apps')))),
    ['GATES_RECORD@.kaylo/gates:2', 'GATES_MISSING@.kaylo/gates']);
});

test('blank, multiline-looking and control-containing commands are refused', t => {
  for (const command of ['', '   ', 'npm\u0000test', 'npm\ttest', 'npm test\rrm -rf x', 'npm\u001btest']) {
    const result = readGates(project(t, valid.replace('Full check: npm run check', `Full check: ${command}`)));
    assert.deepEqual(codes(result), ['GATES_COMMAND@.kaylo/gates:3'], JSON.stringify(command));
  }
});

test('invalid encoding, oversized files, directories and dangling links are read failures, not absence', t => {
  assert.deepEqual(codes(readGates(project(t, Buffer.from([0x46, 0xff, 0x0a])))), ['GATES_READ@.kaylo/gates']);
  assert.deepEqual(codes(readGates(project(t, valid + '\n'.repeat(70 * 1024)))), ['GATES_READ@.kaylo/gates']);
  const directory = project(t, undefined, ['.kaylo/gates']);
  assert.deepEqual(codes(readGates(directory)), ['GATES_READ@.kaylo/gates']);
  const dangling = project(t, undefined, ['.kaylo']);
  fs.symlinkSync(path.join(dangling, 'nowhere'), path.join(dangling, '.kaylo/gates'));
  assert.deepEqual(codes(readGates(dangling)), ['GATES_READ@.kaylo/gates']);
  const danglingKaylo = project(t);
  fs.symlinkSync(path.join(danglingKaylo, 'nowhere'), path.join(danglingKaylo, '.kaylo'));
  assert.deepEqual(codes(readGates(danglingKaylo)), ['GATES_READ@.kaylo/gates']);
  const fileKaylo = project(t);
  fs.writeFileSync(path.join(fileKaylo, '.kaylo'), valid);
  assert.deepEqual(codes(readGates(fileKaylo)), ['GATES_READ@.kaylo/gates']);
});

// Bounded: a regression that blocks on open fails by timeout instead of hanging the suite.
test('a FIFO reference is refused promptly as a read failure', t => {
  if (process.platform === 'win32') return t.skip('no FIFOs');
  const root = project(t, undefined, ['.kaylo']);
  if (spawnSync('mkfifo', [path.join(root, '.kaylo/gates')]).status !== 0) return t.skip('mkfifo is unavailable');
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.signal, null, 'reader blocked on the FIFO');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'GATES_READ: .kaylo/gates: Cannot read .kaylo/gates as a regular UTF-8 file\n');
});

test('a reference replaced between inspection and open is a read failure', t => {
  const root = project(t, valid);
  const gates = path.join(root, '.kaylo/gates');
  const io = Object.create(fs);
  io.openSync = (target, flags) => {
    fs.writeFileSync(gates + '.new', valid);
    fs.renameSync(gates + '.new', gates);
    return fs.openSync(target, flags);
  };
  assert.deepEqual(codes(readGates(root, io)), ['GATES_READ@.kaylo/gates']);
});

test('an unreadable reference is a read failure', t => {
  if (process.getuid && process.getuid() === 0) return t.skip('root can read mode 000 files');
  const root = project(t, valid);
  fs.chmodSync(path.join(root, '.kaylo/gates'), 0o000);
  assert.deepEqual(codes(readGates(root)), ['GATES_READ@.kaylo/gates']);
});

test('in-project symlinks are followed; escaping links are refused', t => {
  const outside = project(t, undefined, ['elsewhere']);
  fs.writeFileSync(path.join(outside, 'gates'), valid);
  const linkedIn = project(t, undefined, ['.kaylo', 'config']);
  fs.writeFileSync(path.join(linkedIn, 'config/gates'), valid);
  fs.symlinkSync('../config/gates', path.join(linkedIn, '.kaylo/gates'));
  assert.equal(readGates(linkedIn).state, 'present');
  const escaping = project(t, undefined, ['.kaylo']);
  fs.symlinkSync(path.join(outside, 'gates'), path.join(escaping, '.kaylo/gates'));
  assert.deepEqual(codes(readGates(escaping)), ['GATES_ESCAPE@.kaylo/gates']);
  const escapingKaylo = project(t);
  fs.mkdirSync(path.join(outside, 'kaylo'));
  fs.writeFileSync(path.join(outside, 'kaylo/gates'), valid);
  fs.symlinkSync(path.join(outside, 'kaylo'), path.join(escapingKaylo, '.kaylo'));
  assert.deepEqual(codes(readGates(escapingKaylo)), ['GATES_ESCAPE@.kaylo/gates']);
  const dirOut = project(t, valid.replace('Directory: .', 'Directory: app'));
  fs.symlinkSync(path.join(outside, 'elsewhere'), path.join(dirOut, 'app'));
  assert.deepEqual(codes(readGates(dirOut)), ['GATES_ESCAPE@.kaylo/gates:2']);
  const dirIn = project(t, valid.replace('Directory: .', 'Directory: app'), ['packages/app']);
  fs.symlinkSync('packages/app', path.join(dirIn, 'app'));
  assert.equal(readGates(dirIn).resolvedDirectory, path.join(fs.realpathSync(dirIn), 'packages', 'app'));
});

test('a missing, dangling or nondirectory working directory is unavailable', t => {
  const missing = project(t, valid.replace('Directory: .', 'Directory: apps/web'));
  assert.deepEqual(codes(readGates(missing)), ['GATES_DIRECTORY_UNAVAILABLE@.kaylo/gates:2']);
  const file = project(t, valid.replace('Directory: .', 'Directory: README'));
  fs.writeFileSync(path.join(file, 'README'), 'x');
  assert.deepEqual(codes(readGates(file)), ['GATES_DIRECTORY_UNAVAILABLE@.kaylo/gates:2']);
  const dangling = project(t, valid.replace('Directory: .', 'Directory: app'));
  fs.symlinkSync(path.join(dangling, 'gone'), path.join(dangling, 'app'));
  assert.deepEqual(codes(readGates(dangling)), ['GATES_DIRECTORY_UNAVAILABLE@.kaylo/gates:2']);
});

test('an unavailable project root is a project diagnostic', t => {
  const root = project(t);
  const result = cli(path.join(root, 'absent'));
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'GATES_PROJECT: Project directory is unavailable\n');
});

test('the parser never executes the command, writes files or echoes command text in diagnostics', t => {
  const canary = 'touch kaylo-gates-canary && echo SECRET-CANARY-VALUE';
  const root = project(t, `Format: 1\nDirectory: .\nFull check: ${canary}\nFull check: ${canary}\n`);
  const before = snapshot(root);
  const result = spawnSync(process.execPath, [script, root], { encoding: 'utf8', cwd: root });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'GATES_DUPLICATE: .kaylo/gates:4: Duplicate gate field: Full check\n');
  assert.doesNotMatch(result.stderr, /SECRET-CANARY-VALUE|touch/);
  fs.writeFileSync(path.join(root, '.kaylo/gates'), `Format: 1\nDirectory: .\nFull check: ${canary}\n`);
  const after = snapshot(root);
  const ok = spawnSync(process.execPath, [script, root], { encoding: 'utf8', cwd: root });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).fullCheck, canary);
  assert.equal(fs.existsSync(path.join(root, 'kaylo-gates-canary')), false);
  assert.deepEqual(snapshot(root), after);
  assert.notDeepEqual(before, after);
});

test('--expect detects a changed reference or working directory before use', t => {
  const root = project(t, valid.replace('Directory: .', 'Directory: app'), ['app']);
  const first = JSON.parse(cli(root).stdout);
  let result = cli(root, '--expect', first.digest);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), first);
  fs.appendFileSync(path.join(root, '.kaylo/gates'), '\n');
  result = cli(root, '--expect', first.digest);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'GATES_CHANGED: .kaylo/gates: Gate reference changed before use; inspect it again\n');
  const second = JSON.parse(cli(root).stdout);
  fs.renameSync(path.join(root, 'app'), path.join(root, 'old-app'));
  fs.mkdirSync(path.join(root, 'app'));
  assert.equal(cli(root, '--expect', second.digest).status, 1);
  fs.rmSync(path.join(root, '.kaylo'), { recursive: true });
  assert.equal(cli(root, '--expect', second.digest).status, 1);
});

test('invocation errors exit 2 with a usage diagnostic', t => {
  const root = project(t, valid);
  for (const args of [[], [root, 'extra'], ['--help'], [root, '--expect'], [root, '--expect', 'abc'],
    [root, '--other', 'sha256:' + '0'.repeat(64)]]) {
    const result = cli(...args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr,
      'GATES_USAGE: Expected one project directory argument, optionally followed by --expect <digest>\n');
  }
});

test('the shared gates reference documents the parser format and every diagnostic', () => {
  const reference = fs.readFileSync(path.resolve(__dirname, '../skills/plan/references/gates.md'), 'utf8');
  const source = fs.readFileSync(script, 'utf8');
  for (const code of source.match(/GATES_[A-Z_]+(?=:)/g)) assert.match(reference, new RegExp(`\`${code}\``), code);
  const example = reference.match(/```text\n(Format: 1\n[\s\S]*?)```/);
  assert(example, 'reference needs a literal example');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-gates-doc-'));
  try {
    fs.mkdirSync(path.join(root, '.kaylo'));
    fs.writeFileSync(path.join(root, '.kaylo/gates'), example[1]);
    assert.equal(readGates(root).state, 'present');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
