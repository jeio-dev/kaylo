'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { applyOperation } = require('../scripts/plan-record.cjs');
const { validate } = require('../scripts/validate-plan.cjs');
const script = path.resolve(__dirname, '../scripts/plan-record.cjs');
const builder = '{kaylo:v1 dispatch id=D1 role=builder tier=Light outcome=completed}';
const reviewer = '{kaylo:v1 dispatch id=D2 role=reviewer tier=Strong outcome=completed covers=T1}';
const verify = '{kaylo:v1 verify by=D1 result=pass}';
const task = (id = 'T1', result = 'Baseline clean; greeting check passed, exit 0.', risk = '') =>
  `- [ ] ${id}: Greeting\n  - Blocked by: None\n  - Acceptance criteria: Prints Hello\n  - Test plan: node greet.cjs; expect Hello, exit 0\n${risk ? '  - Risk: ' + risk + '\n' : ''}  - Result: ${result}\n`;
const phase = (tasks = task(), review = 'None.') =>
  `# 01 Greeting\nStatus: Current\n\n## Tasks\n${tasks}\n## Review\n${review}\n\n## Completion\nNot complete.\n\n## Next step\nReview changes.\n`;
function fixture(t, text = phase()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-record-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'phase.md');
  const roadmap = path.join(root, 'ROADMAP.md');
  fs.writeFileSync(file, text);
  fs.writeFileSync(roadmap, '# Roadmap\nCurrent: [01](phase.md)\n\n- [ ] [01](phase.md) — Greeting\n');
  return { root, file, roadmap };
}
const cli = (f, ...args) => spawnSync(process.execPath, [script, f.root, ...args], { encoding: 'utf8' });
const bytes = f => fs.readFileSync(f.file);
const leftovers = f => fs.readdirSync(path.dirname(f.file)).filter(name => name.startsWith('.kaylo-record-'));
function failedUnchanged(f, args, pattern) {
  const before = bytes(f);
  const result = cli(f, ...args);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, pattern);
  assert.deepEqual(bytes(f), before);
  assert.deepEqual(leftovers(f), []);
}

test('append preserves prior prose/records and quoted identities; review and check-off have exact CLI output', t => {
  const f = fixture(t, phase(task('T1', 'Evidence; ' + builder)));
  let result = cli(f, 'append', 'T1', ' \t' + verify + '\t');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'PASS append T1; plan structure valid; evidence truth and authorization were not checked\n');
  assert.equal(result.stderr, '');
  assert.match(bytes(f).toString(), new RegExp(builder.replace(/[{}]/g, '\\$&') + ' ' + verify.replace(/[{}]/g, '\\$&')));
  result = cli(f, 'review', '{kaylo:v1 direct role=reviewer model="Some observed model" covers=phase}');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'PASS review; plan structure valid; evidence truth and authorization were not checked\n');
  assert.match(bytes(f).toString(), /## Review\nNone\.\n\n\{kaylo:v1 direct role=reviewer model="Some observed model" covers=phase\}\n## Completion/);
  result = cli(f, 'check-off', 'T1');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'PASS check-off T1; plan structure valid; evidence truth and authorization were not checked\n');
  assert.match(bytes(f).toString(), /- \[x\] T1:/);
  assert.match(bytes(f).toString(), /\{kaylo:v1 verify by=D1 result=pass\} \{kaylo:v1 accept\}/);
  failedUnchanged(f, ['check-off', 'T1'], /already checked/);
  assert.deepEqual(validate(f.root), []);
});

test('usage errors exit 2 without writes; no implicit project or extra flags', t => {
  const f = fixture(t);
  const before = bytes(f);
  for (const args of [[], ['other'], ['append', 'T1'], ['review'], ['check-off', '01-T1'],
    ['check-off', 'T1', '--closing'], ['append', 'T1', verify, 'extra']]) {
    const result = cli(f, ...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, "Usage: node plan-record.cjs <project-root> append <task> '<record>'\n" +
      "       node plan-record.cjs <project-root> review '<record>'\n" +
      '       node plan-record.cjs <project-root> check-off <task>\n');
    assert.deepEqual(bytes(f), before);
  }
  assert.equal(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status, 2);
});

test('record envelope and parser diagnostics refuse without echoing the supplied record', t => {
  const f = fixture(t);
  for (const record of [verify + ' tail', verify + verify, 'prose ' + verify, verify + '\n',
    '{kaylo:v2 accept}', '{kaylo:v1 mystery}', '{kaylo:v1 verify by=D1}',
    '{kaylo:v1 direct role=builder role=builder}', '{kaylo:v1 direct role=secret-value}', '{kaylo:v1 nonsense payload}']) {
    failedUnchanged(f, ['append', 'T1', record], /^FAIL /);
    assert(!cli(f, 'append', 'T1', record).stderr.includes(record));
  }
});

test('record placement and updates use the dispatch owner, not the requested location', t => {
  const pending = reviewer.replace('outcome=completed', 'outcome=pending');
  const f = fixture(t, phase(task('T1', 'Evidence ' + builder) + task('T2'), pending));
  failedUnchanged(f, ['append', 'T1', reviewer], /Reviewer records belong/);
  failedUnchanged(f, ['review', builder], /Review needs/);
  failedUnchanged(f, ['review', verify], /Task records belong/);
  failedUnchanged(f, ['review', '{kaylo:v1 direct role=reviewer}'], /with covers/);
  for (const [op, id, by] of [['append', 'T2', 'D1'], ['append', 'T1', 'D2'], ['review', null, 'D1'], ['review', null, 'D9']]) {
    failedUnchanged(f, [op, ...(id ? [id] : []), `{kaylo:v1 update by=${by} outcome=completed}`], /one earlier dispatch/);
  }
  assert.equal(cli(f, 'append', 'T1', '{kaylo:v1 update by=D1 outcome=interrupted}').status, 0);
  assert.equal(cli(f, 'review', '{kaylo:v1 update by=D2 outcome=completed}').status, 0);
  const duplicate = fixture(t, phase(task('T1', 'Evidence ' + builder), builder.replace('role=builder', 'role=reviewer') + ' ' + pending));
  failedUnchanged(duplicate, ['append', 'T1', '{kaylo:v1 update by=D1 outcome=completed}'], /one earlier dispatch/);
});

test('#116: see ## Review inside Result cannot cut the real section or other tasks', t => {
  const original = phase(task('T1', 'Check passed; see ## Review. ' + builder + ' ' + verify, 'high') + task('T2'), reviewer);
  const f = fixture(t, original);
  assert.equal(cli(f, 'check-off', 'T1').status, 0);
  assert.equal(bytes(f).toString(), original.replace('- [ ] T1:', '- [x] T1:').replace(verify, verify + ' {kaylo:v1 accept}'));
  assert.deepEqual(validate(f.root), []);
});

test('high-risk missing/pending coverage and unfinished Result roll back; task/phase/latest-update coverage works', t => {
  for (const review of ['None.', reviewer.replace('outcome=completed', 'outcome=pending'), reviewer.replace('covers=T1', 'covers=T2')]) {
    const f = fixture(t, phase(task('T1', 'Checks passed', 'high'), review));
    failedUnchanged(f, ['check-off', 'T1'], /needs a completed reviewer record/);
  }
  for (const review of [reviewer, reviewer.replace('covers=T1', 'covers=phase'),
    reviewer.replace('outcome=completed', 'outcome=pending') + '\n{kaylo:v1 update by=D2 outcome=completed}']) {
    const f = fixture(t, phase(task('T1', 'Checks passed', 'high'), review));
    assert.equal(cli(f, 'check-off', 'T1').status, 0);
  }
  const unfinished = fixture(t, phase(task('T1', 'In progress; old failed check retained')));
  failedUnchanged(unfinished, ['check-off', 'T1'], /unfinished state/);
  // Missing legacy records and Risk do not gain a new verify requirement.
  const legacy = fixture(t);
  assert.equal(cli(legacy, 'check-off', 'T1').status, 0);
  const blocked = fixture(t, phase(task('T1', 'Blocked: dependency unavailable. ' + builder)));
  assert.equal(cli(blocked, 'append', 'T1', '{kaylo:v1 verify by=D1 result=unavailable}').status, 0);
  assert.match(bytes(blocked).toString(), /\[ \] T1:/);
});

test('an uncited acceptance makes every operation refuse, restore and show the accepted form', t => {
  const accepted = 'R1: "accepted by user" must cite the user\'s decision on this finding, as in "- R1: non-blocking — accepted by user; decision: <question asked and the user\'s answer, or where it is recorded>"; a route exception or waiver is not that decision, so otherwise keep it open';
  const finding = resolution => `${reviewer}\n\n- R1: non-blocking — ${resolution}\n  - No test for a non-finite now.`;
  const f = fixture(t, phase(task('T1', 'Checks passed. ' + builder, 'high'), finding('accepted by user')));
  for (const args of [['review', '{kaylo:v1 update by=D2 outcome=completed}'], ['append', 'T1', verify], ['check-off', 'T1']]) {
    const before = bytes(f);
    const result = cli(f, ...args);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(result.stderr, `FAIL ${accepted}\n`);
    assert.deepEqual(bytes(f), before);
    assert.deepEqual(leftovers(f), []);
  }
  const cited = fixture(t, phase(task('T1', 'Checks passed. ' + builder, 'high'),
    finding('accepted by user; decision: asked "Accept R1 without a NaN test?"; the user answered "Yes"')));
  for (const args of [['review', '{kaylo:v1 update by=D2 outcome=completed}'], ['append', 'T1', verify], ['check-off', 'T1']]) {
    const result = cli(cited, ...args);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.deepEqual(validate(cited.root), []);
});

test('visible Markdown ignores fenced and commented decoys; ambiguous raw targets refuse', t => {
  const f = fixture(t, '```md\n## Review\n' + task('T1') + '```\n<!--\n## Review\n' + task('T1') + '-->\n' + phase());
  assert.equal(cli(f, 'review', reviewer).status, 0);
  assert.equal(cli(f, 'check-off', 'T1').status, 0);
  assert.equal((bytes(f).toString().match(/- \[x\] T1:/g) || []).length, 1);
  for (const text of [phase().replace('Result: Baseline', 'Result: <!-- hidden -->Baseline'),
    phase().replace('## Review', '## Review <!-- hidden -->')]) {
    const ambiguous = fixture(t, text);
    failedUnchanged(ambiguous, [text.includes('Result: <!--') ? 'append' : 'review', ...(text.includes('Result: <!--') ? ['T1'] : []),
      text.includes('Result: <!--') ? verify : reviewer], /ambiguous edit target/);
  }
  for (const ending of ['<!-- unclosed', '```md\nunclosed']) {
    const eof = fixture(t, '# Phase\nStatus: Current\n## Tasks\n' + task() + '\n## Review\n' + ending);
    failedUnchanged(eof, ['review', reviewer], /ends inside a fence\/comment/);
  }
});

test('missing/duplicate task, Result, Review and Current targets fail without changing files', t => {
  for (const [text, args, pattern] of [
    [phase(), ['append', 'T9', verify], /exactly one current-phase entry/],
    [phase(task() + task()), ['check-off', 'T1'], /PLAN_DUPLICATE_TASK/],
    [phase(task().replace('  - Result:', '  - Other:')), ['append', 'T1', verify], /one Result/],
    [phase(task() + '  - Result: duplicate\n'), ['append', 'T1', verify], /PLAN_DUPLICATE_FIELD/],
    [phase().replace('## Review', '## Other'), ['review', reviewer], /one real/],
    [phase() + '\n## Review\nNone.\n', ['review', reviewer], /PLAN_DUPLICATE_SECTION/]
  ]) failedUnchanged(fixture(t, text), args, pattern);
  const f = fixture(t);
  fs.appendFileSync(f.roadmap, 'Current: [01](phase.md)\n');
  failedUnchanged(f, ['review', reviewer], /PLAN_CURRENT/);
});

test('closed current phase is untouched, historical evidence stays byte-identical', t => {
  const f = fixture(t);
  const history = path.join(f.root, 'history.md');
  fs.writeFileSync(history, '# Historical plan without records\n');
  fs.appendFileSync(f.roadmap, '- [x] [00](history.md) — History\n');
  const previous = fs.readFileSync(history);
  assert.equal(cli(f, 'append', 'T1', verify).status, 0);
  assert.deepEqual(fs.readFileSync(history), previous);
  fs.writeFileSync(f.roadmap, fs.readFileSync(f.roadmap, 'utf8').replace('- [ ] [01]', '- [x] [01]'));
  failedUnchanged(f, ['check-off', 'T1'], /Current phase is closed/);
});

test('pre-write format inspection refuses unsafe links and all symlink/hardlink targets without edits', t => {
  const f = fixture(t);
  const outside = fixture(t);
  for (const link of ['https://example.invalid/phase.md', '/phase.md', 'phase.md#review', 'phase.md?x', 'phase%ZZ.md', '../phase.md', outside.file]) {
    fs.writeFileSync(f.roadmap, `Current: [01](${link})\n- [ ] [01](${link})\n`);
    failedUnchanged(f, ['append', 'T1', verify], /PLAN_PATH|PLAN_LINK/);
  }
  fs.writeFileSync(f.roadmap, 'Current: [01](link.md)\n- [ ] [01](link.md)\n');
  fs.symlinkSync(outside.file, path.join(f.root, 'link.md'));
  failedUnchanged(f, ['append', 'T1', verify], /PLAN_ALIAS/);
  fs.unlinkSync(path.join(f.root, 'link.md'));
  fs.symlinkSync('phase.md', path.join(f.root, 'link.md'));
  failedUnchanged(f, ['append', 'T1', verify], /PLAN_ALIAS/);
  assert(fs.lstatSync(path.join(f.root, 'link.md')).isSymbolicLink());
  fs.unlinkSync(path.join(f.root, 'link.md'));
  fs.writeFileSync(f.roadmap, 'Current: [01](phase.md)\n- [ ] [01](phase.md)\n');
  fs.linkSync(f.file, path.join(f.root, 'alias.md'));
  failedUnchanged(f, ['append', 'T1', verify], /PLAN_ALIAS/);
});

test('CRLF, final newline state and file mode survive minimal edits, including Review at EOF', t => {
  for (const eol of ['\n', '\r\n']) for (const final of ['', eol]) {
    const text = ('# Phase\nStatus: Current\n## Tasks\n' + task() + '\n## Review\nNone.').replace(/\n/g, eol) + final;
    const f = fixture(t, text);
    fs.chmodSync(f.file, 0o640);
    assert.equal(cli(f, 'review', reviewer).status, 0);
    assert.equal(bytes(f).toString(), text + (final ? '' : eol) + reviewer + final);
    assert.equal(cli(f, 'check-off', 'T1').status, 0);
    assert.equal(fs.statSync(f.file).mode & 0o777, 0o640);
    assert.equal(bytes(f).toString().endsWith(eol), Boolean(final));
  }
});

test('validator failure/throw after each operation restores exact bytes and cleans temporary files', t => {
  for (const [op, record] of [['append', verify], ['review', reviewer], ['check-off', undefined]]) {
    for (const validator of [() => ['fixture validation refused'], () => { throw new Error('validation crashed'); }]) {
      const f = fixture(t);
      const before = bytes(f);
      assert.throws(() => applyOperation(f.root, op, 'T1', record, { validator }), /fixture validation refused|unexpected error/);
      assert.deepEqual(bytes(f), before);
      assert.deepEqual(leftovers(f), []);
    }
  }
});

test('candidate write/rename failures leave originals intact; failed restore keeps a recovery copy', t => {
  for (const failing of ['write', 'rename']) {
    const f = fixture(t);
    const before = bytes(f);
    const io = { ...fs,
      writeFileSync(file, ...args) {
        if (failing === 'write' && file.endsWith('.tmp')) throw Object.assign(new Error('full'), { code: 'ENOSPC' });
        return fs.writeFileSync(file, ...args);
      },
      renameSync(from, to) {
        if (failing === 'rename') throw Object.assign(new Error('denied'), { code: 'EACCES' });
        return fs.renameSync(from, to);
      }
    };
    assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { io }), /ENOSPC|EACCES/);
    assert.deepEqual(bytes(f), before);
    assert.deepEqual(leftovers(f), []);
  }
  const f = fixture(t);
  const before = bytes(f);
  let renames = 0;
  const io = { ...fs, renameSync(from, to) {
    if (++renames === 2) throw Object.assign(new Error('denied'), { code: 'EACCES' });
    return fs.renameSync(from, to);
  } };
  assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { io, validator: () => ['refused'] }), /State uncertain; recovery copy:/);
  const recovery = leftovers(f).find(file => file.endsWith('.original'));
  assert(recovery);
  assert.deepEqual(fs.readFileSync(path.join(f.root, recovery)), before);
});

test('intervening changes before replacement or during validation are retained, never overwritten', t => {
  for (const when of ['before', 'validation']) {
    const f = fixture(t);
    const original = bytes(f);
    const changed = Buffer.from(original.toString() + '\nExternal edit\n');
    const io = { ...fs, writeFileSync(file, ...args) {
      const result = fs.writeFileSync(file, ...args);
      if (when === 'before' && file.endsWith('.tmp')) fs.writeFileSync(f.file, changed);
      return result;
    } };
    const validator = () => {
      if (when === 'validation') fs.writeFileSync(f.file, changed);
      return [];
    };
    assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { io, validator }), /changed during/);
    assert.deepEqual(bytes(f), changed);
    if (when === 'validation') {
      const recovery = leftovers(f).find(file => file.endsWith('.original'));
      assert.deepEqual(fs.readFileSync(path.join(f.root, recovery)), original);
    } else assert.deepEqual(leftovers(f), []);
  }
});

test('ROADMAP edits and retargeted Current links during a transaction cannot validate a different plan', t => {
  const f = fixture(t);
  const original = bytes(f);
  assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { validator() {
    fs.appendFileSync(f.roadmap, '\nExternal roadmap edit\n');
    return [];
  } }), /ROADMAP changed during validation/);
  assert.deepEqual(bytes(f), original);
  assert.match(fs.readFileSync(f.roadmap, 'utf8'), /External roadmap edit/);
  const other = path.join(f.root, 'other.md');
  fs.writeFileSync(other, phase());
  fs.writeFileSync(f.roadmap, 'Current: [01](phase.md)\n- [ ] [01](phase.md)\n');
  const io = { ...fs, writeFileSync(file, ...args) {
    const result = fs.writeFileSync(file, ...args);
    if (file.endsWith('.tmp')) fs.writeFileSync(f.roadmap, 'Current: [01](other.md)\n- [ ] [01](other.md)\n');
    return result;
  } };
  assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { io }), /changed during the operation/);
  assert.deepEqual(bytes(f), original);
  assert.equal(fs.readFileSync(other, 'utf8'), phase());
});

test('read-back failure with backup recreation unavailable retains the original copy and reports uncertainty', t => {
  const f = fixture(t);
  const original = bytes(f);
  let restoring = false;
  let renames = 0;
  let recoveryWrites = 0;
  const io = { ...fs, renameSync(from, to) {
    fs.renameSync(from, to);
    if (++renames === 2) restoring = true;
  }, writeFileSync(file, ...args) {
    if (file.endsWith('.original') && ++recoveryWrites > 1) {
      throw Object.assign(new Error('backup creation unavailable'), { code: 'ENOSPC' });
    }
    return fs.writeFileSync(file, ...args);
  }, readFileSync(file, ...args) {
    if (restoring && file === f.file) throw Object.assign(new Error('unavailable'), { code: 'EIO' });
    return fs.readFileSync(file, ...args);
  } };
  assert.throws(() => applyOperation(f.root, 'append', 'T1', verify, { io, validator: () => ['failed'] }), /State uncertain; recovery copy:/);
  assert.deepEqual(bytes(f), original);
  const recovery = leftovers(f).find(file => file.endsWith('.original'));
  assert.deepEqual(fs.readFileSync(path.join(f.root, recovery)), original);
  assert.equal(recoveryWrites, 1, 'restore must not consume or recreate the original backup');
});
