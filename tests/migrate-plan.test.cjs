'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { inspect, marker } = require('../scripts/inspect-plan.cjs');
const { preview: migrationPreview, apply, recover: migrationRecover } = require('../scripts/migrate-plan.cjs');
const receipts = new Map();
const preview = (root, options) => { const result = migrationPreview(root, options); receipts.set(root, result.token); return result; };
const recover = (root, options = {}) => migrationRecover(root, { expected: receipts.get(root), ...options });
const { applyOperation } = require('../scripts/plan-record.cjs');
const { validate } = require('../scripts/validate-plan.cjs');
const script = path.resolve(__dirname, '../scripts/migrate-plan.cjs');
const fixtures = path.join(__dirname, 'fixtures/plan-formats');
const active = '.kaylo/phases/02-greeting/02-PLAN.md';
const closed = '.kaylo/phases/01-history/01-PLAN.md';
const pending = 'Status: Needs revision: awaiting user confirmation of the converted plan';
function temp(t, variant = 'phased') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-format-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  if (variant) fs.cpSync(path.join(fixtures, variant, 'input'), root, { recursive: true });
  return root;
}
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const write = (root, relative, text) => fs.writeFileSync(path.join(root, relative), text);
const edit = (root, relative, fn) => write(root, relative, fn(read(root, relative)));
function tree(root) {
  const entries = {};
  function walk(directory, prefix = '') {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + item.name;
      if (item.isDirectory()) walk(path.join(directory, item.name), relative + '/');
      else if (!item.isSymbolicLink()) entries[relative] = fs.readFileSync(path.join(directory, item.name)).toString('hex');
      else entries[relative] = 'link:' + fs.readlinkSync(path.join(directory, item.name));
    }
  }
  walk(root);
  return entries;
}
function current(t) {
  const root = temp(t);
  const p = preview(root);
  apply(root, p.token);
  edit(root, active, text => text.replace(pending, 'Status: Current'));
  return root;
}
function refusesUnchanged(root, fn, code) {
  const before = tree(root);
  assert.throws(fn, code);
  assert.deepEqual(tree(root), before);
}
const cli = (root, ...args) => spawnSync(process.execPath, [script, root, ...args], { encoding: 'utf8' });

for (const [variant, options] of [['phased', {}], ['inline', { destination: '.kaylo/phases/05-inline/05-PLAN.md' }], ['objective', {}]]) {
  test(`${variant}: read-only preview, exact outputs, preservation, successful rerun no-op`, t => {
    const root = temp(t, variant);
    const original = tree(root);
    const p = preview(root, options);
    assert.deepEqual(tree(root), original);
    assert.equal(inspect(root).format, 0);
    assert.equal(apply(root, p.token, options).changed, p.operations.length);
    assert.deepEqual(tree(root), tree(path.join(fixtures, variant, 'expected')));
    assert.equal(preview(root).operations.length, 0);
    assert.equal(apply(root, p.token).changed, 0);
    if (variant !== 'objective') assert.deepEqual(validate(root), []);
  });
}
test('explicit legacy markers 0, CRLF/BOM and ROADMAP inline synthetic variants preserve physical lines', t => {
  for (const source of ['PLAN.md', 'ROADMAP.md']) {
    const root = temp(t, 'inline');
    let text = read(root, 'PLAN.md');
    text = '\uFEFFKaylo format: 0\r\n' + text.replace(/\n/g, '\r\n');
    fs.unlinkSync(path.join(root, 'PLAN.md'));
    write(root, source, text);
    const options = { destination: '.kaylo/phases/05-inline/05-PLAN.md' };
    const p = preview(root, options);
    assert.equal(inspect(root).format, 0);
    apply(root, p.token, options);
    assert(!read(root, options.destination).includes('\n') || !/(?<!\r)\n/.test(read(root, options.destination)));
    assert.match(read(root, options.destination), /Status: Needs revision:/);
    assert.deepEqual(validate(root), []);
  }
});
test('format 1 annotation preserves Agreement/readiness and closed history; explicit 1 is usable', t => {
  const root = current(t);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2\n', ''));
  write(root, 'PLAN.md', '# Unrelated notes\nKeep this file.\n');
  const original = tree(root);
  assert.equal(inspect(root).format, 1);
  const p = preview(root);
  assert.deepEqual(p.operations.map(op => op.relative), ['ROADMAP.md']);
  apply(root, p.token);
  const next = tree(root);
  for (const relative of [active, closed, 'PLAN.md', 'PRD.md']) assert.equal(next[relative], original[relative]);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2', 'Kaylo format: 1'));
  assert.equal(inspect(root).format, 1);
  assert.deepEqual(validate(root), []);
});
test('creation and PRD-only have no invented schema/history; unrelated PLAN without roadmap is unknown', t => {
  const root = temp(t, null);
  assert.equal(inspect(root).kind, 'creation');
  write(root, 'PRD.md', '# PRD\nExisting intent.\n');
  assert.equal(inspect(root).format, null);
  assert.deepEqual(preview(root).operations, []);
  write(root, 'PLAN.md', '# unrelated\n');
  refusesUnchanged(root, () => preview(root), /PLAN_LEGACY_UNKNOWN/);
});
for (const [value, code] of [
  ['Kaylo format: 999', 'FORMAT_UNSUPPORTED'], ['Kaylo format: 99999999999999999999999', 'FORMAT_UNSUPPORTED'],
  ['Kaylo format: -1', 'FORMAT_MALFORMED'], ['Kaylo format: +2', 'FORMAT_MALFORMED'],
  ['Kaylo format: 02', 'FORMAT_MALFORMED'], ['Kaylo format: 2.0', 'FORMAT_MALFORMED'],
  ['Kaylo format: 2 # note', 'FORMAT_MALFORMED'], ['Kaylo format: 2 ', 'FORMAT_MALFORMED'],
  ['kaylo format: 2', 'FORMAT_MALFORMED'], ['Kaylo format : 2', 'FORMAT_MALFORMED'],
  ['Kaylo format: 2\nKaylo format: 1', 'FORMAT_DUPLICATE'], ['\nKaylo format: 2', 'FORMAT_MISPLACED'],
  ['# Kaylo format: 2', 'FORMAT_MALFORMED'], ['Kaylo format: 2<!--hidden-->', 'FORMAT_MALFORMED']
]) test(`marker refusal ${code}: ${JSON.stringify(value)}`, t => {
  const root = current(t);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2', value));
  refusesUnchanged(root, () => preview(root), new RegExp(code));
  refusesUnchanged(root, () => apply(root, 'sha256:' + '0'.repeat(64)), new RegExp(code));
  refusesUnchanged(root, () => applyOperation(root, 'append', 'T9', '{kaylo:v1 direct role=builder}'), new RegExp(code));
  assert.match(validate(root).join('\n'), new RegExp(code));
});
test('marker visibility, canonical supported forms and independent namespaces', t => {
  for (const n of [0, 1, 2]) assert.equal(marker(`\uFEFFKaylo format: ${n}\r\n# Roadmap\r\n`), n);
  for (const examples of ['```text\nKaylo format: 999\n```', '~~~\nKaylo format: bad\n~~~', '<!--\nKaylo format: 90\n-->']) {
    assert.equal(marker('# Roadmap\n' + examples), null);
    assert.equal(marker('Kaylo format: 2\n' + examples), 2);
  }
  assert.equal(marker('Format: 99\n{kaylo:v1 accept}\n'), null);
  const root = current(t);
  fs.mkdirSync(path.join(root, '.kaylo/decisions'));
  write(root, '.kaylo/preferences.md', 'Format: 99\n');
  write(root, '.kaylo/decisions/keep.md', 'Immutable decision snapshot.\n');
  const before = tree(root);
  assert.equal(inspect(root).format, 2);
  assert.equal(preview(root).operations.length, 0);
  assert.deepEqual(tree(root), before);
});
test('missing current status/dependency is structural error, not confident legacy inference', t => {
  for (const field of ['Status: Current\n', '  - Blocked by: None\n']) {
    const root = current(t);
    edit(root, active, text => text.replace(field, ''));
    assert.equal(inspect(root).format, 2);
    assert(validate(root).length > 0);
    edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2\n', ''));
    refusesUnchanged(root, () => preview(root), /MIGRATION_CANDIDATE_INVALID/);
  }
});
test('marker/content/source/field conflicts refuse without reconciliation', t => {
  for (const change of [
    root => edit(root, 'PLAN.md', text => 'Kaylo format: 2\n' + text),
    root => write(root, 'PRD.md', '# PRD\n'),
    root => write(root, 'ROADMAP.md', read(root, 'PLAN.md')),
    root => edit(root, active, text => text.replace('  - Depends on: None', '  - Depends on: None\n  - Blocked by: None')),
    root => edit(root, active, text => text.replace('## Approach', '## Design\n\n## Approach')),
    root => edit(root, active, text => text.replace('  - Result: Not started', '  - Result: Not started\n  - Result: duplicate'))
  ]) {
    const root = temp(t); change(root);
    refusesUnchanged(root, () => preview(root), /CONFLICT|DUPLICATE/);
  }
  const root = current(t);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2', 'Kaylo format: 0'));
  refusesUnchanged(root, () => preview(root), /FORMAT_CONTENT_CONFLICT/);
});
test('explicit dependencies preserve lists and None; missing legacy dependency infers every earlier permanent ID', t => {
  const root = temp(t);
  edit(root, active, text => text.replace('- [ ] T11: Independent documentation\n  - Complexity: S\n  - Depends on: None',
    '- [ ] T11: Independent documentation\n  - Complexity: S\n  - Depends on: T7, T9'));
  const p = preview(root); apply(root, p.token);
  const result = read(root, active);
  assert.match(result, /T9: Extend greeting\n  - Blocked by: T7/);
  assert.match(result, /T11: Independent documentation\n  - Estimate: S\n  - Blocked by: T7, T9/);
  assert.match(result, /Depends on: in prose/);
  assert.match(result, /```md\nKaylo format: 999\n## Approach\n  - Depends on: T500\n- R99: blocker — open\n```/);
});
test('synthetic absent/Draft statuses await confirmation; review allowed but build record/check-off refused', t => {
  for (const status of ['', 'Status: Draft\n']) {
    const root = temp(t);
    edit(root, active, text => text.replace('Status: Current\n', status));
    const p = preview(root); apply(root, p.token);
    assert.match(read(root, active), /Status: Needs revision: awaiting user confirmation/);
    refusesUnchanged(root, () => applyOperation(root, 'check-off', 'T9'), /awaits confirmation/);
    applyOperation(root, 'review', null, '{kaylo:v1 direct role=reviewer covers=phase}');
    assert.deepEqual(validate(root), []);
  }
});
test('closed Current legacy is interpreted read-only; mixed-generation unknown history is explicitly limited', t => {
  const root = temp(t);
  edit(root, 'PLAN.md', text => text.replace('Current: [02 Greeting](.kaylo/phases/02-greeting/02-PLAN.md)',
    'Current: [01 History](.kaylo/phases/01-history/01-PLAN.md)').replace('- [ ] [02 Greeting]', '- [x] [02 Greeting]'));
  // Make the other history a complete synthetic closed phase.
  edit(root, active, text => text.replaceAll('- [ ] T', '- [x] T').replaceAll('Result: Not started', 'Result: Original checks passed').replace('Not complete.', 'Original work delivered.'));
  const original = [read(root, active), read(root, closed)];
  const p = preview(root); apply(root, p.token);
  assert.deepEqual([read(root, active), read(root, closed)], original);
  assert.deepEqual(validate(root), []);
  edit(root, active, () => '# Custom historical schema\n');
  assert(inspect(root).histories.some(h => h.kind === 'unknown'));
  assert.deepEqual(validate(root), []); // Unknown non-current history is a disclosed limit.
  edit(root, closed, () => '# Custom historical schema\n');
  assert.match(validate(root).join('\n'), /Unsupported Current history/);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2\n', ''));
  refusesUnchanged(root, () => preview(root), /MIGRATION_CANDIDATE_INVALID/);
});
test('inline extraction requires safe chosen identity/path, preserves IDs, and refuses closed mutation', t => {
  const root = temp(t, 'inline');
  for (const [options, code] of [
    [{}, /DESTINATION_REQUIRED/], [{ destination: '../phase.md' }, /PLAN_PATH/],
    [{ destination: '.kaylo/phases/01-good/02-PLAN.md' }, /DESTINATION/],
    [{ destination: '.kaylo/phases/01-Good/01-PLAN.md' }, /DESTINATION/]
  ]) refusesUnchanged(root, () => preview(root, options), code);
  edit(root, 'PLAN.md', text => text.replace('# Plan', '# 02 Greeting'));
  refusesUnchanged(root, () => preview(root, { destination: '.kaylo/phases/05-inline/05-PLAN.md' }), /IDENTITY/);
  edit(root, 'PLAN.md', text => text.replaceAll('- [ ] T', '- [x] T').replaceAll('Result: Not started', 'Result: Original checks passed').replace('Not complete.', 'Original work delivered.'));
  refusesUnchanged(root, () => preview(root, { destination: '.kaylo/phases/02-inline/02-PLAN.md' }), /CLOSED_INLINE/);
});
test('default CLI is read-only/value-free, raw content is explicit, usage rejects conflicting/unknown flags', t => {
  const root = temp(t);
  edit(root, active, text => text.replace('preserve identity', 'PRIVATE_PAYLOAD_EXAMPLE'));
  const before = tree(root);
  const result = cli(root);
  assert.equal(result.status, 0, result.stderr);
  assert(!result.stdout.includes('PRIVATE_PAYLOAD_EXAMPLE'));
  const data = JSON.parse(result.stdout);
  assert(data.operations.every(op => !op.relative && op.diff.lines.every(line => /^[+-]\[redacted\]$/.test(line))));
  assert(data.operations.some(op => op.operation === 'remove'));
  assert.deepEqual(tree(root), before);
  assert(cli(root, '--show-content').stdout.includes('PRIVATE_PAYLOAD_EXAMPLE'));
  for (const args of [['--apply'], ['--recover'], ['--unknown'], ['--recover', '--show-content'], ['--apply', data.token, '--show-content']]) {
    assert.equal(cli(root, ...args).status, 2);
    assert.deepEqual(tree(root), before);
  }
});
test('malformed candidate and ambiguous commented edit targets are no-write refusals', t => {
  for (const change of [
    text => text.replace('Acceptance: Prints Hello', 'Acceptance: None'),
    text => text.replace('Complexity: S', 'Complexity: <!-- hidden -->S'),
    text => text.replace('## Approach', '## Approach <!-- hidden -->'),
    text => text.replace('Status: Current', 'Status: Current\nStatus: Draft')
  ]) {
    const root = temp(t); edit(root, active, change);
    refusesUnchanged(root, () => preview(root), /CANDIDATE_INVALID|COMMENTED_TARGET|STATUS_CONFLICT/);
  }
});
test('tokens bind changed sources, links, destinations, identity, modes and parent paths', t => {
  for (const change of [
    root => edit(root, active, text => text + '\nUser edit\n'),
    root => edit(root, 'PLAN.md', text => text + '\nUser index edit\n'),
    root => write(root, 'PRD.md', '# Collision\n'),
    root => fs.chmodSync(path.join(root, active), 0o640),
    root => { const file = path.join(root, active); const bytes = fs.readFileSync(file); fs.renameSync(file, file + '.old'); fs.writeFileSync(file, bytes); },
    root => { const dir = path.join(root, '.kaylo/phases/02-greeting'); fs.renameSync(dir, dir + '-old'); fs.cpSync(dir + '-old', dir, { recursive: true }); }
  ]) {
    const root = temp(t); const p = preview(root); change(root);
    refusesUnchanged(root, () => apply(root, p.token), /STALE|SOURCE_CONFLICT/);
  }
});
test('outside-root, hardlink/symlink aliases and destination collisions never overwrite', t => {
  for (const kind of ['symlink', 'hardlink', 'outside', 'parent-symlink']) {
    const root = temp(t); const other = temp(t, null);
    if (kind === 'outside') edit(root, 'PLAN.md', text => text.replaceAll(active, '../outside.md'));
    if (kind === 'symlink') { fs.renameSync(path.join(root, active), path.join(root, active + '.old')); fs.symlinkSync('02-PLAN.md.old', path.join(root, active)); }
    if (kind === 'hardlink') fs.linkSync(path.join(root, active), path.join(root, 'alias.md'));
    if (kind === 'parent-symlink') { fs.renameSync(path.join(root, '.kaylo/phases/02-greeting'), path.join(other, 'phase')); fs.symlinkSync(path.join(other, 'phase'), path.join(root, '.kaylo/phases/02-greeting')); }
    refusesUnchanged(root, () => preview(root), /PLAN_ALIAS|PLAN_PATH/);
  }
  const root = temp(t, 'inline');
  const destination = '.kaylo/phases/05-inline/05-PLAN.md';
  fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
  write(root, destination, 'User file.\n');
  refusesUnchanged(root, () => preview(root, { destination }), /COLLISION/);
});
function interrupted(root, expected, boundary = 1) {
  let n = 0;
  const step = () => { if (++n === boundary) { const e = new Error('synthetic EACCES'); e.code = 'EACCES'; throw e; } };
  const io = { ...fs, renameSync(from, to) { fs.renameSync(from, to); step(); },
    linkSync(from, to) { fs.linkSync(from, to); step(); } };
  assert.throws(() => apply(root, expected, { io }), /INTERRUPTED_RECOVER/);
}
for (const boundary of [1, 2, 3]) test(`recover original bytes after multi-file boundary ${boundary}; retry succeeds`, t => {
  const root = temp(t); const before = tree(root); const p = preview(root);
  interrupted(root, p.token, boundary);
  refusesUnchanged(root, () => preview(root), /RECOVERY_REQUIRED/);
  assert.equal(fs.statSync(path.join(root, '.kaylo-migration-recovery')).mode & 0o777, 0o700);
  recover(root);
  assert.deepEqual(tree(root), before);
  const again = preview(root); apply(root, again.token);
  assert.deepEqual(tree(root), tree(path.join(fixtures, 'phased/expected')));
});
test('recover refuses concurrent endpoint edits without overwriting originals or user edits', t => {
  const root = temp(t); const p = preview(root); interrupted(root, p.token);
  edit(root, 'PRD.md', text => text + 'User edit after interruption.\n');
  refusesUnchanged(root, () => recover(root), /RECOVERY_EDITED/);
  assert.match(read(root, 'PRD.md'), /User edit after interruption/);
});
test('recovery rejects malformed/corrupt/path-escaping journals with no project writes', t => {
  for (const change of [
    journal => { journal.format = 99; },
    journal => { journal.operations[0].relative = '../escape.md'; },
    journal => { journal.operations[0].after = '0'.repeat(64); }
  ]) {
    const root = temp(t); interrupted(root, preview(root).token);
    const file = '.kaylo-migration-recovery/journal.json';
    const journal = JSON.parse(read(root, file)); change(journal); write(root, file, JSON.stringify(journal));
    refusesUnchanged(root, () => recover(root), /RECOVERY_INVALID|PLAN_PATH/);
  }
});
test('storage/permission failures before replacement leave originals; prepared failures recover', t => {
  for (const prepared of [false, true]) {
    const root = temp(t); const before = tree(root); const p = preview(root);
    const io = { ...fs, openSync(file, flags, mode) {
      if (String(file).endsWith(prepared ? 'replace.tmp' : '1.before')) {
        const error = new Error('synthetic storage failure'); error.code = 'ENOSPC'; throw error;
      }
      return fs.openSync(file, flags, mode);
    } };
    assert.throws(() => apply(root, p.token, { io }), prepared ? /INTERRUPTED_RECOVER/ : /storage failure/);
    if (prepared) recover(root);
    assert.deepEqual(tree(root), before);
  }
});
test('edit during preparation is retained; journal recovery refuses to erase intervening content', t => {
  const root = temp(t); const p = preview(root);
  const io = { ...fs, fsyncSync(fd) {
    fs.fsyncSync(fd);
    if (fs.existsSync(path.join(root, '.kaylo-migration-recovery/journal.json'))) {
      edit(root, active, text => text.endsWith('User change\n') ? text : text + 'User change\n');
    }
  } };
  assert.throws(() => apply(root, p.token, { io }), /INTERRUPTED_RECOVER/);
  assert.match(read(root, active), /User change/);
  // This source has not been replaced; recovery may leave it as user-edited if it
  // was not an operation? It is an operation, so requires manual resolution.
  refusesUnchanged(root, () => recover(root), /RECOVERY_EDITED/);
});
test('actual process death retains fsynced recovery data and permits rollback', t => {
  const root = temp(t); const before = tree(root); const p = preview(root);
  const code = `const fs=require('node:fs'); const {apply}=require(${JSON.stringify(script)}); const io={...fs,linkSync(a,b){fs.linkSync(a,b);process.kill(process.pid,'SIGKILL');},renameSync(a,b){fs.renameSync(a,b);process.kill(process.pid,'SIGKILL');}};apply(process.argv[1],process.argv[2],{io});`;
  const result = spawnSync(process.execPath, ['-e', code, root, p.token]);
  assert.equal(result.signal, 'SIGKILL');
  recover(root);
  assert.deepEqual(tree(root), before);
});
test('Git dirty/staged/partial/untracked state is preserved; converter never runs plan commands', t => {
  const root = temp(t);
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  git('init', '-q'); git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline');
  edit(root, active, text => text + '\nUser staged note.\n'); git('add', active);
  edit(root, active, text => text + '\nUser unstaged note.\n');
  write(root, 'untracked.md', 'User untracked file.\n');
  const index = fs.readFileSync(path.join(root, '.git/index'));
  const p = preview(root); apply(root, p.token);
  assert.deepEqual(fs.readFileSync(path.join(root, '.git/index')), index);
  assert.match(read(root, active), /User staged note/);
  assert.match(read(root, active), /User unstaged note/);
  assert.equal(read(root, 'untracked.md'), 'User untracked file.\n');
});


test('default inspector diagnostics redact plan values/paths and report incomplete recovery before parsing', t => {
  const root = current(t);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2', 'Kaylo format: PRIVATE_PAYLOAD_EXAMPLE'));
  const inspector = path.resolve(__dirname, '../scripts/inspect-plan.cjs');
  const result = spawnSync(process.execPath, [inspector, root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FORMAT_MALFORMED.*reader supports/);
  assert(!result.stderr.includes('PRIVATE_PAYLOAD_EXAMPLE'));
  fs.mkdirSync(path.join(root, '.kaylo-migration-recovery'), { mode: 0o700 });
  assert.throws(() => inspect(root), /RECOVERY_REQUIRED/);
});
test('heading conversion ignores fenced/commented duplicates and rejects mixed inline/index records', t => {
  const root = temp(t, 'objective');
  write(root, 'OBJECTIVE.md', '```md\n# Objective\n```\n<!-- # Objective -->\n# Objective\nIntent.\n');
  const p = preview(root); apply(root, p.token);
  assert.equal(read(root, 'PRD.md'), '```md\n# Objective\n```\n<!-- # Objective -->\n# PRD\nIntent.\n');
  const mixed = temp(t, 'inline');
  edit(mixed, 'PLAN.md', text => text + '\nCurrent: [01](phase.md)\n');
  refusesUnchanged(mixed, () => preview(mixed), /INLINE_AMBIGUOUS/);
});
test('source-removal failure is recoverable after all replacements; recovery itself retries after permission failure', t => {
  const root = temp(t); const before = tree(root); const p = preview(root);
  const io = { ...fs, unlinkSync(file) {
    if (file === path.join(root, 'OBJECTIVE.md')) { const error = new Error('synthetic permission failure'); error.code = 'EACCES'; throw error; }
    return fs.unlinkSync(file);
  } };
  assert.throws(() => apply(root, p.token, { io }), /INTERRUPTED_RECOVER/);
  let once = true;
  const recoveryIO = { ...fs, renameSync(a, b) {
    if (once) { once = false; const error = new Error('synthetic permission failure'); error.code = 'EACCES'; throw error; }
    fs.renameSync(a, b);
  } };
  assert.throws(() => recover(root, { io: recoveryIO }), /permission failure/);
  recover(root);
  assert.deepEqual(tree(root), before);
});
test('new inline directories remain harmless after rollback; unrelated directory contents survive', t => {
  const root = temp(t, 'inline'); const before = tree(root);
  const destination = '.kaylo/phases/05-inline/05-PLAN.md';
  const p = preview(root, { destination });
  const io = { ...fs, linkSync(a, b) { fs.linkSync(a, b); throw new Error('synthetic interruption'); } };
  assert.throws(() => apply(root, p.token, { destination, io }), /INTERRUPTED_RECOVER/);
  write(root, '.kaylo/phases/05-inline/user.md', 'User created this.\n');
  recover(root);
  assert.equal(read(root, '.kaylo/phases/05-inline/user.md'), 'User created this.\n');
  fs.unlinkSync(path.join(root, '.kaylo/phases/05-inline/user.md'));
  assert.deepEqual(tree(root), before);
  assert(fs.existsSync(path.dirname(path.join(root, destination))));
});
test('read-only reports adapt legacy records and disclose unknown history without migrating', t => {
  const { report, format } = require('../scripts/dispatch-report.cjs');
  const root = current(t);
  const before = tree(root);
  const data = report(root);
  assert(data.history.some(h => h.kind === 'legacy'));
  assert.match(format(data), /bounded legacy interpretation/);
  assert.deepEqual(tree(root), before);
  write(root, closed, '# Unrecognized historical schema\n');
  const unchanged = tree(root);
  assert.match(format(report(root)), /unsupported historical interpretation/);
  assert.deepEqual(tree(root), unchanged);
});
test('plan content commands are data and never execute during inspection/migration/validation', t => {
  const root = temp(t);
  const sentinel = path.join(root, 'must-not-exist');
  edit(root, active, text => text.replace('Verify: node greet.cjs',
    'Verify: node -e "require(\'node:fs\').writeFileSync(\'must-not-exist\', \'bad\')"'));
  const p = preview(root); apply(root, p.token);
  assert(!fs.existsSync(sentinel));
  assert.match(read(root, active), /writeFileSync/);
});


test('explicit format 0 inline heading identity cannot be silently replaced by the chosen destination ID', t => {
  const root = temp(t, 'inline');
  edit(root, 'PLAN.md', text => 'Kaylo format: 0\n' + text.replace('# Plan', '# 02 Greeting'));
  refusesUnchanged(root, () => preview(root, { destination: '.kaylo/phases/05-inline/05-PLAN.md' }), /IDENTITY/);
});
test('legacy-looking fields inside Result continuation are ambiguous evidence, never global rename targets', t => {
  const root = current(t);
  edit(root, 'ROADMAP.md', text => text.replace('Kaylo format: 2\n', ''));
  edit(root, active, text => text.replace('  - Additive note:', '  - Complexity: S\n  - Additive note:'));
  refusesUnchanged(root, () => preview(root), /PLAN_FIELD_CONFLICT|PLAN_FIELD_LOCATION/);
});


test('recovery requires the original reviewed token and rejects recomputed self-declared journal provenance', t => {
  const root = temp(t); const p = preview(root); interrupted(root, p.token);
  refusesUnchanged(root, () => migrationRecover(root), /RECOVERY_TOKEN_REQUIRED/);
  refusesUnchanged(root, () => migrationRecover(root, { expected: 'sha256:' + '0'.repeat(64) }), /RECOVERY_INVALID/);
  const file = '.kaylo-migration-recovery/journal.json';
  const journal = JSON.parse(read(root, file));
  journal.spec.operations[0].after = '0'.repeat(64);
  journal.token = 'sha256:' + require('node:crypto').createHash('sha256').update(JSON.stringify(journal.spec)).digest('hex');
  write(root, file, JSON.stringify(journal));
  refusesUnchanged(root, () => recover(root), /RECOVERY_INVALID/);
});
