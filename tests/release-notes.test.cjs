'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { propose, reviewNote, kayloVersion, main } = require('../scripts/release-notes.cjs');
const { validate } = require('../scripts/validate-plan.cjs');
const helper = path.resolve(__dirname, '../scripts/release-notes.cjs');

function fixture(t, eol = '\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-release-notes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => fs.writeFileSync(path.join(root, file), value.replaceAll('\r\n', '\n').replaceAll('\n', eol));
  write('ROADMAP.md', 'Current: [01 Export](phase.md)\n- [x] [01 Export](phase.md) — Export\n- [ ] 02 Future — Later\n');
  write('phase.md', '# 01 Export\nStatus: Current\n## Tasks\n- [x] T1: Export\n  - Blocked by: None\n' +
    '  - Acceptance criteria: Prints the requested export.\n  - Test plan: node export.cjs\n' +
    '  - Result: Scoped check passed.\n## Review\nReview completed; highest impact feature, also fixes invalid exports.\n' +
    'Release note: feature (reviewed) — Users can export; invalid exports show an error.\n' +
    'Release contribution: v0.11.0 / initial\n## Completion\nDelivered and verified.\n');
  write('CHANGELOG.md', '# Changes\n\n## [Unreleased]\n\n### Notable Changes\n\nHuman note stays here.\n\n' +
    '## 2026-10-06, Version 0.11.0\n\nHistorical human notes.\n');
  const selection = { format: 1, project: 'example', boundary: 'v0.11.0', notes: 'CHANGELOG.md',
    phases: [{ id: '01', plan: 'phase.md' }] };
  return { root, selection, write, read: file => fs.readFileSync(path.join(root, file), 'utf8'),
    run: () => propose(root, selection) };
}
function errorCode(fn, code) { assert.throws(fn, error => error.code === code); }

test('proposal reads local reviewed metadata and leaves all files untouched; repeated adoption is byte-idempotent', t => {
  const f = fixture(t);
  const before = Object.fromEntries(['ROADMAP.md', 'phase.md', 'CHANGELOG.md'].map(name => [name, f.read(name)]));
  const result = f.run();
  assert.equal(result.state, 'complete');
  assert.deepEqual(result.counts, { breaking: 0, feature: 1, fix: 0, internal: 0 });
  assert.match(result.notes, /Human note stays here/);
  assert.equal(result.notes.split('## 2026-10-06')[1], before['CHANGELOG.md'].split('## 2026-10-06')[1]);
  for (const name of Object.keys(before)) assert.equal(f.read(name), before[name]);
  f.write('CHANGELOG.md', result.notes);
  assert.equal(f.run().notes, result.notes);
});

test('reclassification updates the matching pending contribution, not human notes or count units', t => {
  const f = fixture(t);
  f.write('CHANGELOG.md', f.run().notes);
  f.write('phase.md', f.read('phase.md').replace('feature (reviewed)', 'breaking (reviewed)'));
  const result = f.run();
  assert.equal(result.counts.breaking, 1);
  assert.equal(result.counts.feature, 0);
  assert.equal(result.notes.match(/<!-- kaylo-release:/g).length, 1);
  assert.match(result.notes, /Human note stays here/);
});

for (const [name, edit] of [
  ['open phase', f => f.write('ROADMAP.md', f.read('ROADMAP.md').replace('[x]', '[ ]'))],
  ['provisional', f => f.write('phase.md', f.read('phase.md').replace('(reviewed)', '(provisional)'))],
  ['pending disagreement', f => f.write('phase.md', f.read('phase.md').replace('(reviewed)', '(pending)'))],
  ['missing legacy metadata', f => f.write('phase.md', f.read('phase.md').replace(/^Release .+\n/gm, ''))],
  ['duplicate metadata', f => f.write('phase.md', f.read('phase.md').replace('## Completion',
    'Release note: fix (reviewed) — Competing classification.\n## Completion'))],
  ['wrong boundary', f => { f.selection.boundary = 'v0.10.0'; }]
]) {
  test(`${name} remains pending without changing source closure`, t => {
    const f = fixture(t);
    const original = f.run().notes;
    f.write('CHANGELOG.md', original);
    edit(f);
    const roadmap = f.read('ROADMAP.md');
    const result = f.run();
    assert.equal(result.state, 'pending');
    assert.equal(result.counts.feature, 0);
    assert.equal(result.diagnostics[0].code, 'RELEASE_PENDING');
    if (['missing legacy metadata', 'duplicate metadata', 'wrong boundary'].includes(name)) {
      assert.equal(result.notes, original);
    } else assert.doesNotMatch(result.notes, /<!-- kaylo-release:/);
    assert.equal(f.read('ROADMAP.md'), roadmap);
  });
}

test('published entries remain immutable and repeated preparation cannot add them again', t => {
  const f = fixture(t);
  const adopted = f.run().notes;
  const published = adopted.replace('## [Unreleased]', '## 2026-10-12, Version 0.12.0')
    .replace('# Changes\n', '# Changes\n\n## [Unreleased]\n\n### Notable Changes\n');
  f.write('CHANGELOG.md', published);
  let result = f.run();
  assert.equal(result.notes, published);
  assert.deepEqual(result.alreadyPublished, [{ phase: '01', delta: 'initial' }]);
  assert.equal(result.counts.feature, 0);
  f.selection.boundary = 'v0.12.0';
  assert.equal(f.run().state, 'complete');
  assert.deepEqual(f.run().alreadyPublished, [{ phase: '01', delta: 'initial' }]);
  f.selection.boundary = 'v0.11.0';
  f.write('phase.md', f.read('phase.md').replace('Users can export;', 'Changed historical description;'));
  result = f.run();
  assert.equal(result.state, 'pending');
  assert.equal(result.diagnostics[0].code, 'RELEASE_PUBLISHED');
  assert.equal(result.notes, published);
  // A new boundary alone is no license to publish the old delta again.
  f.selection.boundary = 'v0.12.0';
  f.write('phase.md', f.read('phase.md').replace('v0.11.0 / initial', 'v0.12.0 / initial'));
  assert.equal(f.run().notes, published);
  // Separately reviewed new contribution from the same phase is eligible.
  f.write('phase.md', f.read('phase.md').replace('v0.12.0 / initial', 'v0.12.0 / repair-1'));
  result = f.run();
  assert.equal(result.counts.feature, 1);
  assert.equal(result.notes.match(/<!-- kaylo-release:/g).length, 2);
  assert.equal(result.notes.slice(result.notes.indexOf('## 2026-10-12')), published.slice(published.indexOf('## 2026-10-12')));
});

test('pending identity changes conflict rather than overwrite an unfinished delta', t => {
  const f = fixture(t);
  const notes = f.run().notes;
  f.write('CHANGELOG.md', notes);
  f.write('phase.md', f.read('phase.md').replace('/ initial', '/ repair-1'));
  const result = f.run();
  assert.equal(result.diagnostics[0].code, 'RELEASE_CONFLICT');
  assert.equal(result.notes, notes);
});

test('human-edited managed bullet is retained even when the phase reopens', t => {
  const f = fixture(t);
  const notes = f.run().notes.replace('- **feature**:', '- Human edit **feature**:');
  f.write('CHANGELOG.md', notes);
  f.write('ROADMAP.md', f.read('ROADMAP.md').replace('[x]', '[ ]'));
  const result = f.run();
  assert.equal(result.diagnostics[0].code, 'RELEASE_EDITED');
  assert.equal(result.notes, notes);
  assert.equal(result.counts.feature, 0);
});

test('unselected unreleased entries remain pending and preserved', t => {
  const f = fixture(t);
  const notes = f.run().notes;
  f.write('CHANGELOG.md', notes);
  f.selection.phases = [];
  const result = f.run();
  assert.equal(result.state, 'pending');
  assert.equal(result.diagnostics[0].code, 'RELEASE_UNSELECTED');
  assert.equal(result.notes, notes);
});

test('future unlinked phases need not close, PR association is optional, and multiple phase counts use highest reviewed impact', t => {
  const f = fixture(t);
  f.write('ROADMAP.md', f.read('ROADMAP.md') + '- [x] [03 Fix](fix.md) — Fix\n');
  f.write('fix.md', '## Review\nRelease note: fix (reviewed) — Invalid input is rejected.\n' +
    'Release contribution: v0.11.0 / initial\nPull request: https://tracker.example/pull/3 (ready)\n');
  f.selection.phases.push({ id: '03', plan: 'fix.md' });
  const result = f.run();
  assert.deepEqual(result.counts, { breaking: 0, feature: 1, fix: 1, internal: 0 });
  assert.equal(result.entries[0].pr, null);
  assert.equal(result.entries[1].pr, 'https://tracker.example/pull/3 (ready)');
});

test('active metadata is section-bound and fenced/commented examples cannot establish reviewed classification', () => {
  const record = 'Release note: fix (reviewed) — Fixed.\nRelease contribution: first / initial\n';
  assert.equal(reviewNote('## Review\n' + record + '## Completion\n' + record).class, 'fix');
  assert.ok(reviewNote('## Review\n```text\n' + record + '```\n').reason);
  assert.ok(reviewNote('## Review\n<!--\n' + record + '-->\n').reason);
  assert.ok(reviewNote('## Completion\n' + record).reason);
  assert.ok(reviewNote('## Review\n' + record + '## Review\n' + record).reason);
});

test('CRLF notes, hidden headings, and lack of final newline preserve human bytes', t => {
  const f = fixture(t, '\r\n');
  const original = f.read('CHANGELOG.md');
  f.write('CHANGELOG.md', original.replace('Human note stays here.',
    'Human note stays here.\r\n\r\n```md\r\n## [Unreleased]\r\n```\r\n<!--\r\n## [Unreleased]\r\n-->'));
  const result = f.run();
  assert.equal(result.state, 'complete');
  assert.doesNotMatch(result.notes, /(?<!\r)\n/);
  fs.writeFileSync(path.join(f.root, 'CHANGELOG.md'), '# Changes\n## [Unreleased]\n### Notable Changes');
  const noNewline = f.run();
  assert.match(noNewline.notes, /### Notable Changes\n<!-- kaylo-release:/);
});

test('fenced marker copies are ignored and malformed nested comments refuse reconciliation', t => {
  const f = fixture(t);
  const adopted = f.run().notes;
  const marker = adopted.slice(adopted.indexOf('<!-- kaylo-release:'), adopted.indexOf('<!-- /kaylo-release -->') + '<!-- /kaylo-release -->'.length);
  f.write('CHANGELOG.md', f.read('CHANGELOG.md') + '\n```md\n' + marker + '\n```\n');
  assert.equal(f.run().counts.feature, 1);
  f.write('CHANGELOG.md', f.read('CHANGELOG.md') + '\n<!--\n' + marker + '\n-->\n');
  errorCode(f.run, 'RELEASE_MARKER');
});

test('duplicate/orphan/malformed blocks fail closed with no writes', t => {
  const f = fixture(t);
  const adopted = f.run().notes;
  const begin = adopted.indexOf('<!-- kaylo-release:');
  const end = adopted.indexOf('<!-- /kaylo-release -->') + '<!-- /kaylo-release -->'.length;
  f.write('CHANGELOG.md', adopted + '\n' + adopted.slice(begin, end));
  errorCode(f.run, 'RELEASE_IDENTITY');
  f.write('CHANGELOG.md', adopted.replace('<!-- /kaylo-release -->', 'BROKEN'));
  errorCode(f.run, 'RELEASE_MARKER');
});

test('exact roadmap link, unique IDs and contained files are required', t => {
  const f = fixture(t);
  f.selection.phases[0].plan = 'wrong.md';
  errorCode(f.run, 'RELEASE_IDENTITY');
  f.selection.phases[0].plan = '../outside.md';
  errorCode(f.run, 'RELEASE_PATH');
  f.selection.phases[0].plan = 'phase.md';
  f.selection.phases.push({ id: '01', plan: 'phase.md' });
  errorCode(f.run, 'RELEASE_IDENTITY');
  f.selection.phases.pop();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-release-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'phase.md'), f.read('phase.md'));
  fs.unlinkSync(path.join(f.root, 'phase.md'));
  fs.symlinkSync(path.join(outside, 'phase.md'), path.join(f.root, 'phase.md'));
  errorCode(f.run, 'RELEASE_PATH');
});

test('moving a pending plan changes its link but not its permanent contribution identity', t => {
  const f = fixture(t);
  f.write('CHANGELOG.md', f.run().notes);
  fs.renameSync(path.join(f.root, 'phase.md'), path.join(f.root, 'moved.md'));
  f.write('ROADMAP.md', f.read('ROADMAP.md').replaceAll('phase.md', 'moved.md'));
  f.selection.phases[0].plan = 'moved.md';
  const result = f.run();
  assert.equal(result.counts.feature, 1);
  assert.match(result.notes, /\[01\]\(moved.md\)/);
  assert.equal(result.notes.match(/<!-- kaylo-release:/g).length, 1);
});

test('CLI distinguishes proposals, pending classification, schema/read failures and invocation errors', t => {
  const f = fixture(t);
  const selectionFile = path.join(f.root, 'selection.json');
  fs.writeFileSync(selectionFile, JSON.stringify(f.selection));
  const run = (...args) => spawnSync(process.execPath, [helper, ...args], { encoding: 'utf8' });
  assert.equal(run().status, 2);
  let result = run(f.root, selectionFile);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).counts.feature, 1);
  assert.doesNotMatch(f.read('CHANGELOG.md'), /kaylo-release/);
  f.write('phase.md', f.read('phase.md').replace('(reviewed)', '(pending)'));
  assert.equal(run(f.root, selectionFile).status, 1);
  fs.writeFileSync(selectionFile, JSON.stringify({ ...f.selection, unknown: 'not allowed' }));
  result = run(f.root, selectionFile);
  assert.match(result.stderr, /RELEASE_SCHEMA/);
  fs.writeFileSync(selectionFile, '{not json');
  assert.match(run(f.root, selectionFile).stderr, /RELEASE_SCHEMA: Selection is not valid JSON/);
  assert.match(run(f.root, path.join(f.root, 'missing.json')).stderr, /RELEASE_READ/);
});

test('Kaylo version matrix uses highest impact and resets without imposing a consumer policy', () => {
  for (const [version, impacts, expected, bump] of [
    ['0.11.4', ['feature'], '0.12.0', 'minor'],
    ['0.11.4', ['breaking', 'feature', 'fix'], '0.12.0', 'minor'],
    ['0.11.0', ['fix', 'internal'], '0.11.1', 'patch'],
    ['1.3.4', ['breaking', 'fix'], '2.0.0', 'major'],
    ['1.3.4', ['deprecation'], '1.4.0', 'minor'],
    ['1.3.4', ['feature'], '1.4.0', 'minor'],
    ['1.3.4', ['fix'], '1.3.5', 'patch'],
    ['0.11.0', [], null, null],
    ['1.3.4', ['internal'], null, null]
  ]) assert.deepEqual([kayloVersion(version, impacts).version, kayloVersion(version, impacts).bump], [expected, bump]);
  errorCode(() => kayloVersion('2026.10.12-beta', ['fix']), 'RELEASE_VERSION');
  errorCode(() => kayloVersion('01.2.3', ['fix']), 'RELEASE_VERSION');
  errorCode(() => kayloVersion('1.2.3', ['urgent']), 'RELEASE_VERSION');
});

test('hardlink aliases, invalid UTF-8, repeated sections and unrecognized metadata cannot produce eligible entries', t => {
  const f = fixture(t);
  f.write('ROADMAP.md', f.read('ROADMAP.md') + '- [x] [03](alias.md) — Alias\n');
  fs.linkSync(path.join(f.root, 'phase.md'), path.join(f.root, 'alias.md'));
  f.selection.phases.push({ id: '03', plan: 'alias.md' });
  errorCode(f.run, 'RELEASE_IDENTITY');
  f.selection.phases.pop();
  fs.writeFileSync(path.join(f.root, 'phase.md'), Buffer.from([0xc0, 0xff]));
  errorCode(f.run, 'RELEASE_READ');
  f.write('phase.md', '## Review\nRelease note: urgent (reviewed) — Fix.\nRelease contribution: first / initial\n');
  assert.equal(f.run().state, 'pending');
  f.write('CHANGELOG.md', f.read('CHANGELOG.md') + '\n## [Unreleased]\n### Notable Changes\n');
  errorCode(f.run, 'RELEASE_NOTES');
});

test('a FIFO selection is refused promptly without a blocking read', t => {
  const f = fixture(t);
  const fifo = path.join(f.root, 'selection.pipe');
  const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
  assert.equal(made.status, 0, 'mkfifo required for this fixture');
  const result = spawnSync(process.execPath, [helper, f.root, fifo], { encoding: 'utf8', timeout: 2000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /RELEASE_READ/);
});

test('a provisional later delta retains the earlier unreleased contribution', t => {
  const f = fixture(t);
  const original = f.run().notes;
  f.write('CHANGELOG.md', original);
  f.write('phase.md', f.read('phase.md').replace('(reviewed)', '(provisional)').replace('/ initial', '/ repair-1'));
  const result = f.run();
  assert.equal(result.state, 'pending');
  assert.equal(result.notes, original);
  assert.equal(result.counts.feature, 0);
});

test('unselected ./ links do not block proposals and selected ./ links normalize like the plan validator', t => {
  const f = fixture(t);
  f.write('other.md', f.read('phase.md').replace('01 Export', '02 Future'));
  f.write('ROADMAP.md', f.read('ROADMAP.md').replace('- [ ] 02 Future — Later', '- [ ] [02 Future](./other.md) — Later'));
  assert.deepEqual(validate(f.root), []);
  assert.equal(f.run().state, 'complete');
  f.write('ROADMAP.md', f.read('ROADMAP.md').replaceAll('(phase.md)', '(./phase.md)'));
  assert.equal(f.run().state, 'complete');
  f.selection.phases[0].plan = './phase.md';
  assert.deepEqual(validate(f.root), []);
  assert.equal(f.run().state, 'complete');
  f.write('ROADMAP.md', f.read('ROADMAP.md').replace('(./other.md)', '(https://tracker.example/future)'));
  assert.equal(f.run().state, 'complete');
  assert.equal(f.run().entries[0].plan, 'phase.md');
});

test('area metadata formats the bullet independently of its release classification', t => {
  const f = fixture(t);
  f.write('phase.md', f.read('phase.md').replace('## Completion', 'Release area: skills\n## Completion'));
  const result = f.run();
  assert.match(result.notes, /- \*\*skills\*\*:/);
  assert.equal(result.counts.feature, 1);
  f.write('CHANGELOG.md', result.notes);
  assert.equal(f.run().notes, result.notes);
});

test('curated published area labels stay immutable without a permanent pending diagnostic', t => {
  const f = fixture(t);
  const published = f.run().notes.replace('- **feature**:', '- **skills**:')
    .replace('## [Unreleased]', '## 2026-10-12, Version 0.12.0')
    .replace('# Changes\n', '# Changes\n\n## [Unreleased]\n\n### Notable Changes\n');
  f.write('CHANGELOG.md', published);
  const result = f.run();
  assert.equal(result.state, 'complete');
  assert.equal(result.notes, published);
  assert.deepEqual(result.alreadyPublished, [{ phase: '01', delta: 'initial' }]);
});

for (const eol of ['\n', '\r\n']) {
  test(`reopen/close cycles preserve exact separators (${JSON.stringify(eol)})`, t => {
    const f = fixture(t, eol);
    const baseline = f.read('CHANGELOG.md');
    const closed = f.run().notes;
    for (let i = 0; i < 3; i++) {
      f.write('CHANGELOG.md', closed);
      f.write('ROADMAP.md', f.read('ROADMAP.md').replace('[x]', '[ ]'));
      const reopened = f.run().notes;
      assert.equal(reopened, baseline);
      f.write('CHANGELOG.md', reopened);
      f.write('ROADMAP.md', f.read('ROADMAP.md').replace('[ ] [01', '[x] [01'));
      assert.equal(f.run().notes, closed);
    }
  });
}

test('Pull request records preserve URLs with zero, one or several spaces after the colon', () => {
  for (const spacing of ['', ' ', '   ', '\t']) {
    const note = reviewNote('## Review\nRelease note: fix (reviewed) — Fixed.\n' +
      'Release contribution: first / initial\nPull request:' + spacing + 'https://tracker.example/pull/1\n');
    assert.equal(note.pr, 'https://tracker.example/pull/1');
  }
});

test('unexpected helper errors escape the CLI handler instead of becoming read failures', t => {
  const f = fixture(t);
  const selected = path.join(f.root, 'selection.json');
  fs.writeFileSync(selected, JSON.stringify(f.selection));
  t.mock.method(fs, 'realpathSync', () => { throw new TypeError('Unexpected fixture bug'); });
  assert.throws(() => main([f.root, selected]), /Unexpected fixture bug/);
});

test('area metadata remains optional and rejects malformed or repeated labels as pending', t => {
  const f = fixture(t);
  assert.equal(f.run().state, 'complete');
  for (const record of ['Release area: Skills', 'Release area: skills\nRelease area: tools']) {
    f.write('phase.md', '## Review\nRelease note: feature (reviewed) — Export.\n' +
      'Release contribution: v0.11.0 / initial\n' + record + '\n');
    const result = f.run();
    assert.equal(result.state, 'pending');
    assert.equal(result.counts.feature, 0);
  }
});
