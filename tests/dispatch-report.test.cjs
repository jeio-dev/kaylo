'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { parseRecords, report, format } = require('../scripts/dispatch-report.cjs');
const { validate } = require('../scripts/validate-plan.cjs');

const script = path.join(__dirname, '../scripts/dispatch-report.cjs');
const task = (id, result, { checked = true, estimate = 'S', extra = '' } = {}) => `- [${checked ? 'x' : ' '}] ${id}: Print a greeting
  - Estimate: ${estimate}
  - Blocked by: None
  - Acceptance criteria: Output Hello
  - Test plan: node greet.cjs; expect Hello, exit 0
${extra}  - Result: ${result}
`;
const plan = (tasks, review = 'None; inspected greeting and command output.') => `# Greeting
Status: Current

## Tasks
${tasks}
## Review
${review}

## Completion
Greeting delivered; node greet.cjs printed Hello, exit 0. No known limitations.
`;
const D = (id, more = '') => `{kaylo:v1 dispatch id=${id} role=builder tier=Light vendor=anthropic outcome=completed${more}}`;
const pass = `${D('D1')} {kaylo:v1 verify by=D1 result=pass} node greet.cjs printed Hello, exit 0. {kaylo:v1 accept}`;

// phases: [{ id, closed, text }]; open phases stay unlinked unless text is given.
function fixture(t, phases) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-report-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lines = [];
  let current;
  for (const { id, closed, text } of phases) {
    const relative = `.kaylo/phases/${id}-greeting/${id}-PLAN.md`;
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), text);
    lines.push(`- [${closed ? 'x' : ' '}] [${id} Greeting](${relative}) — Print a greeting`);
    current = relative;
  }
  fs.writeFileSync(path.join(root, 'ROADMAP.md'), `# Roadmap\nCurrent: [Current](${current})\n\n${lines.join('\n')}\n`);
  return root;
}
const byId = data => Object.fromEntries(data.tasks.map(t => [t.id, t]));

test('records parse with quoted values, explicit unknowns, and every type', () => {
  const { records, errors } = parseRecords(
    '{kaylo:v1 dispatch id=D1 role=builder tier=Inherit setting=n/a host=opencode route=openrouter vendor=unknown ' +
    'model="DeepSeek v4 flash" billing=metered billing-auth=preference fallback=none outcome=completed} ' +
    '{kaylo:v1 direct role=reviewer covers=phase fallback=vendor-waived fallback-auth=user} {kaylo:v1 update by=D1 outcome=completed} ' +
    '{kaylo:v1 verify by=D1 result=fail} {kaylo:v1 repair by=D1 failure=F1 n=3 result=pass basis=authorized} {kaylo:v1 accept} {kaylo:v1 reopen}');
  assert.deepEqual(errors, []);
  assert.deepEqual(records.map(r => r.type), ['dispatch', 'direct', 'update', 'verify', 'repair', 'accept', 'reopen']);
  assert.equal(records[0].model, 'DeepSeek v4 flash');
});

test('malformed records are diagnosed rather than skipped', () => {
  const cases = [
    ['{kaylo:v2 accept}', /unsupported record version v2/],
    ['{kaylo:v1 approve}', /unknown record type approve/],
    ['{kaylo:v1 verify by=D1 result=ok}', /invalid result=ok/],
    ['{kaylo:v1 verify by=D1 result=pass vendor=x}', /unknown key vendor/],
    ['{kaylo:v1 dispatch id=D1 role=builder outcome=completed}', /missing tier/],
    ['{kaylo:v1 dispatch id=D1 id=D2 role=builder tier=Light outcome=completed}', /duplicate key id/],
    ['{kaylo:v1 repair by=D1 failure=F1 n=3 result=fail}', /needs basis/],
    ['{kaylo:v1 verify by=D1 result=pass', /unreadable record/]
  ];
  for (const [text, pattern] of cases) assert.match(parseRecords(text).errors.join('; '), pattern, text);
});

test('first-try rates count closed phases only and disclose missing, malformed, and unknown entries', t => {
  const escalated = `${D('D1')} {kaylo:v1 verify by=D1 result=fail} npm test failed. ` +
    `${D('D2', ' resumes=D1').replace('tier=Light', 'tier=Medium')} {kaylo:v1 repair by=D2 failure=F1 n=1 result=pass} {kaylo:v1 accept}`;
  const tasks = [
    task('T1', pass),
    // Several repairs in one dispatch: one dispatch, two repairs, not a first-try pass.
    task('T2', `${D('D3')} {kaylo:v1 verify by=D3 result=fail} {kaylo:v1 repair by=D3 failure=F1 n=1 result=fail} ` +
      '{kaylo:v1 repair by=D3 failure=F1 n=2 result=pass} {kaylo:v1 accept}'),
    task('T3', escalated.replace(/D1/g, 'D4').replace(/D2/g, 'D5')),
    task('T4', `${D('D6').replace('vendor=anthropic', 'vendor=unknown')} {kaylo:v1 verify by=D6 result=pass} {kaylo:v1 accept}`),
    task('T5', '{kaylo:v1 direct role=builder host=codex vendor=OpenAI model=unknown} {kaylo:v1 verify by=direct result=pass} {kaylo:v1 accept}', { estimate: 'M' }),
    task('T6', 'node greet.cjs printed Hello, exit 0'),
    task('T7', `${D('D7')} {kaylo:v1 accept}`),
    task('T8', `${D('D8')} {kaylo:v1 verify by=D8 result=pass}`),
    task('T9', `${D('D9')} {kaylo:v1 verify by=D9 result=pass} {kaylo:v1 accept} {kaylo:v1 reopen} ` +
      '{kaylo:v1 repair by=D9 failure=F1 n=1 result=pass} {kaylo:v1 accept}'),
    task('T10', `${D('D10')} {kaylo:v1 verify by=D10 result=fail} {kaylo:v1 repair by=D10 failure=F1 n=2 result=pass} {kaylo:v1 accept}`),
    task('T11', `${D('D11').replace('outcome=completed', 'outcome=pending fallback=manual-handoff fallback-auth=user')} ` +
      '{kaylo:v1 update by=D11 outcome=completed} {kaylo:v1 verify by=D11 result=fail} {kaylo:v1 repair by=D11 failure=F1 n=1 result=fail} ' +
      '{kaylo:v1 repair by=D11 failure=F1 n=2 result=fail} {kaylo:v1 repair by=D11 failure=F1 n=3 result=pass basis=authorized} ' +
      '{kaylo:v1 repair by=D11 failure=F2 n=1 result=pass} {kaylo:v1 accept}')
  ].join('');
  const review = 'Phase review by a fresh reviewer. {kaylo:v1 dispatch id=D20 role=reviewer tier=Medium vendor=openai covers=phase outcome=completed}\n\nNone.';
  const root = fixture(t, [
    { id: '01', closed: true, text: plan(tasks, review) },
    { id: '02', closed: false, text: plan(task('T1', pass, { checked: false })) }
  ]);
  const data = report(root);
  const tasksById = byId(data);
  assert.deepEqual(data.phases, ['01']);
  assert.equal(Object.keys(tasksById).some(id => id.startsWith('02-')), false);
  assert.deepEqual(data.counts, { tasks: 11, recorded: 7, missing: 3, malformed: 1, unchecked: 0, unknownVendor: 1 });
  assert.equal(tasksById['01-T11'].success, false);
  assert.equal(tasksById['01-T1'].success, true);
  assert.equal(tasksById['01-T2'].success, false);
  assert.deepEqual(tasksById['01-T3'].group, { tier: 'Light', estimate: 'S', vendor: 'anthropic' });
  assert.deepEqual(tasksById['01-T5'].group, { tier: 'direct', estimate: 'M', vendor: 'openai' });
  assert.equal(tasksById['01-T6'].reason, 'no records');
  assert.equal(tasksById['01-T7'].reason, 'no initial verify record');
  assert.equal(tasksById['01-T8'].reason, 'no accept record');
  assert.equal(tasksById['01-T9'].success, false);
  assert.match(tasksById['01-T10'].reason, /n=2, expected n=1/);
  assert.deepEqual(data.groups.map(g => [g.tier, g.estimate, g.vendor, g.passed, g.total]), [
    ['Light', 'S', 'anthropic', 1, 5], ['Light', 'S', 'unknown', 1, 1], ['direct', 'M', 'openai', 1, 1]]);
  const text = format(data);
  assert.match(text, /Light\tS\tanthropic\t1\/5\t20% \(below ~60%, advisory\)/);
  assert.match(text, /01-T6: missing \(no records\)/);
  assert.match(text, /leave out blocked or abandoned work/);
});

test('an old plan with no records stays valid and reports every task as missing', t => {
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', 'node greet.cjs printed Hello, exit 0')) }]);
  assert.deepEqual(validate(root), []);
  const data = report(root);
  assert.deepEqual(data.counts, { tasks: 1, recorded: 0, missing: 1, malformed: 0, unchecked: 0, unknownVendor: 0 });
  assert.deepEqual(data.groups, []);
});

test('records and Risk fields do not affect structural plan validation', t => {
  const root = fixture(t, [{ id: '01', closed: true,
    text: plan(task('T1', pass, { extra: '  - Risk: high — changes session expiry enforcement\n' })) }]);
  assert.deepEqual(validate(root, { closing: true }), []);
});

test('order, references, and dispatch ID uniqueness are checked', t => {
  const root = fixture(t, [{ id: '01', closed: true, text: plan([
    task('T1', '{kaylo:v1 verify by=D1 result=pass} ' + D('D1') + ' {kaylo:v1 accept}'),
    task('T2', `${D('D2')} {kaylo:v1 repair by=D2 failure=F1 n=1 result=pass} {kaylo:v1 verify by=D2 result=fail} {kaylo:v1 accept}`),
    task('T3', `${D('D3')} {kaylo:v1 verify by=D3 result=pass} {kaylo:v1 accept}`),
    task('T4', `${D('D4', ' resumes=D9')} {kaylo:v1 verify by=D4 result=pass} {kaylo:v1 accept}`),
    task('T5', `${D('D5')} {kaylo:v1 verify by=D5 result=pass} {kaylo:v1 verify by=D5 result=pass} {kaylo:v1 accept}`),
    task('T6', `${D('D6')} {kaylo:v1 verify by=D6 result=pass} {kaylo:v1 accept}`),
    task('T7', '{kaylo:v1 dispatch id=D7 role=reviewer tier=Strong outcome=completed} {kaylo:v1 verify by=D7 result=pass} {kaylo:v1 accept}'),
    task('T8', `${D('D3')} {kaylo:v1 verify by=D3 result=pass} {kaylo:v1 accept}`),
    task('T9', `{kaylo:v1 update by=D9 outcome=completed} ${D('D9')} {kaylo:v1 verify by=D9 result=pass} {kaylo:v1 accept}`)
  ].join(''), `{kaylo:v1 dispatch id=D6 role=reviewer tier=Strong outcome=completed covers=T6}`) }]);
  const tasksById = byId(report(root));
  assert.match(tasksById['01-T1'].reason, /verify by=D1 names no earlier builder record/);
  assert.match(tasksById['01-T2'].reason, /repair F1 precedes verify/);
  assert.match(tasksById['01-T3'].reason, /dispatch ID D3 is not unique/);
  assert.match(tasksById['01-T8'].reason, /dispatch ID D3 is not unique/);
  assert.match(tasksById['01-T4'].reason, /resumes unknown D9/);
  assert.match(tasksById['01-T5'].reason, /more than one verify record/);
  assert.match(tasksById['01-T6'].reason, /dispatch ID D6 is not unique/);
  assert.match(tasksById['01-T7'].reason, /verify by=D7 names no earlier builder record/);
  assert.match(tasksById['01-T9'].reason, /update by=D9 names no earlier dispatch/);
  assert.ok(Object.values(tasksById).every(t => t.status === 'malformed'));
});

test('examples in fences and comments are ignored; unchecked tasks and unlinked closed phases are disclosed', t => {
  const fenced = '```text\n- Result: {kaylo:v1 bogus}\n```\n<!-- {kaylo:v9 accept} -->\n';
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', pass) + task('T2', pass.replace(/D1/g, 'D2'), { checked: false })) + fenced }]);
  fs.appendFileSync(path.join(root, 'ROADMAP.md'), '- [x] 03 Unlinked — closed without a link\n');
  const data = report(root);
  assert.deepEqual(data.counts, { tasks: 2, recorded: 1, missing: 0, malformed: 0, unchecked: 1, unknownVendor: 0 });
  assert.deepEqual(data.unlinked, ['03']);
  assert.match(format(data), /Closed phases without a plan link, not counted: 03/);
});

test('CLI is read-only, reports usage and unreadable projects, and refuses paths outside the project', t => {
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', pass)) }]);
  const files = ['ROADMAP.md', '.kaylo/phases/01-greeting/01-PLAN.md'].map(f => path.join(root, f));
  const before = files.map(f => fs.readFileSync(f, 'utf8'));
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const ok = run([root]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Light\tS\tanthropic\t1\/1\t100%/);
  assert.deepEqual(files.map(f => fs.readFileSync(f, 'utf8')), before);
  assert.equal(run([]).status, 2);
  assert.equal(run([root, '--json']).status, 2);
  const missing = run([path.join(root, 'nowhere')]);
  assert.equal(missing.status, 1);
  fs.writeFileSync(path.join(root, 'ROADMAP.md'), 'Current: [x](../outside.md)\n\n- [x] [01 Outside](../outside.md) — escape\n');
  fs.writeFileSync(path.join(path.dirname(root), 'outside.md'), plan(task('T1', pass)));
  t.after(() => fs.rmSync(path.join(path.dirname(root), 'outside.md'), { force: true }));
  const escape = run([root]);
  assert.equal(escape.status, 1);
  assert.match(escape.stderr, /leaves project/);
});

test('the documented example and record types match the parser', () => {
  const guide = fs.readFileSync(path.join(__dirname, '../WORKERS.md'), 'utf8');
  const section = guide.slice(guide.indexOf('## Dispatch records'));
  const example = section.split('\n').find(line => line.startsWith('- Result: Baseline:'));
  const parsed = parseRecords(example);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.records.map(r => r.type), ['dispatch', 'verify', 'repair', 'accept']);
  const types = [...section.matchAll(/^\| `([a-z]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(types, ['dispatch', 'direct', 'update', 'verify', 'repair', 'accept', 'reopen']);
  for (const type of types) assert.doesNotMatch(parseRecords(`{kaylo:v1 ${type}}`).errors.join(), /unknown record type/);
  const template = fs.readFileSync(path.join(__dirname, '../templates/PHASE.md'), 'utf8').match(/\{kaylo:v1 [^}]*\}/)[0];
  assert.deepEqual(parseRecords(template).errors, []);
});
