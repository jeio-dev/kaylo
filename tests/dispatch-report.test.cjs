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

// PR #91 follow-up: desired behavior for the open record/lifecycle findings.
// Keep these executable so the gaps remain visible until implementation lands.
test('a returned dispatch appends observed identity without rewriting its initial record', t => {
  const initial = '{kaylo:v1 dispatch id=D1 role=builder tier=Light vendor=unknown model=unknown outcome=pending}';
  const update = '{kaylo:v1 update by=D1 outcome=completed vendor=openai model="Observed model"}';
  const result = `${initial} ${update} {kaylo:v1 verify by=D1 result=pass} {kaylo:v1 accept}`;
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', result)) }]);
  const file = path.join(root, '.kaylo/phases/01-greeting/01-PLAN.md');
  const before = fs.readFileSync(file, 'utf8');
  const data = report(root);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'report must preserve append-only evidence');
  assert.deepEqual(parseRecords(update).errors, [], 'later observed identity must be accepted');
  const recorded = byId(data)['01-T1'];
  assert.equal(recorded.status, 'recorded');
  assert.equal(recorded.success, true);
  assert.deepEqual(recorded.group, { tier: 'Light', estimate: 'S', vendor: 'openai' });
  assert.equal(recorded.records[0].vendor, 'unknown');
  assert.equal(recorded.records[0].model, 'unknown');
  assert.equal(recorded.records[1].model, 'Observed model');
  assert.deepEqual(data.groups.map(g => [g.vendor, g.passed, g.total]), [['openai', 1, 1]]);
  assert.equal(data.counts.unknownVendor, 0);
});

for (const [name, result, diagnostic] of [
  ['acceptance before verification',
    '{kaylo:v1 direct role=builder vendor=openai} {kaylo:v1 accept} {kaylo:v1 verify by=direct result=pass}',
    /accept|verif/i],
  ['acceptance while the builder dispatch is pending',
    '{kaylo:v1 dispatch id=D2 role=builder tier=Light vendor=openai outcome=pending} ' +
      '{kaylo:v1 verify by=D2 result=pass} {kaylo:v1 accept}',
    /pending|complet|outcome/i]
]) {
  test(`${name} is diagnosed and excluded from first-try rates`, t => {
    const root = fixture(t, [{ id: '01', closed: true,
      text: plan(task('T1', result) + task('T2', pass)) }]);
    const data = report(root);
    const invalid = byId(data)['01-T1'];
    assert.equal(invalid.status, 'malformed');
    assert.match(invalid.reason, diagnostic);
    assert.equal(invalid.success, undefined);
    assert.equal(data.counts.malformed, 1);
    assert.equal(data.counts.recorded, 1);
    assert.deepEqual(data.groups.map(g => [g.vendor, g.passed, g.total]), [['anthropic', 1, 1]]);
    assert.match(format(data), /01-T1: malformed/);
  });
}

test('a verify naming a still-pending dispatch is malformed even without an accept', t => {
  const result = '{kaylo:v1 dispatch id=D2 role=builder tier=Light vendor=openai outcome=pending} {kaylo:v1 verify by=D2 result=pass}';
  const data = report(fixture(t, [{ id: '01', closed: true, text: plan(task('T1', result)) }]));
  const invalid = byId(data)['01-T1'];
  assert.equal(invalid.status, 'malformed');
  assert.match(invalid.reason, /verify by=D2 names a dispatch still outcome=pending/);
});

test('accepting while an earlier builder handoff is still pending is malformed', t => {
  const result = '{kaylo:v1 dispatch id=D2 role=builder tier=Light vendor=openai outcome=pending fallback=manual-handoff fallback-auth=user} ' +
    '{kaylo:v1 direct role=builder vendor=anthropic} {kaylo:v1 verify by=direct result=pass} {kaylo:v1 accept}';
  const invalid = byId(report(fixture(t, [{ id: '01', closed: true, text: plan(task('T1', result)) }])))['01-T1'];
  assert.equal(invalid.status, 'malformed');
  assert.match(invalid.reason, /accept while builder dispatch D2 is still outcome=pending/);
  // Closing the abandoned handoff with an update makes the same history valid.
  const closed = result.replace('{kaylo:v1 direct', '{kaylo:v1 update by=D2 outcome=interrupted} {kaylo:v1 direct');
  assert.equal(byId(report(fixture(t, [{ id: '01', closed: true, text: plan(task('T1', closed)) }])))['01-T1'].status, 'recorded');
});

test('a completed handoff update followed by verification and acceptance counts as a first-try pass', t => {
  const result = '{kaylo:v1 dispatch id=D1 role=builder tier=Light vendor=openai outcome=pending ' +
    'fallback=manual-handoff fallback-auth=user} {kaylo:v1 update by=D1 outcome=completed} ' +
    '{kaylo:v1 verify by=D1 result=pass} {kaylo:v1 accept}';
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', result)) }]);
  const data = report(root);
  assert.equal(byId(data)['01-T1'].success, true);
  assert.deepEqual(data.counts, { tasks: 1, recorded: 1, missing: 0, malformed: 0, unchecked: 0, unknownVendor: 0 });
  assert.deepEqual(data.groups.map(g => [g.tier, g.vendor, g.passed, g.total]), [['Light', 'openai', 1, 1]]);
});

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
    ['{kaylo:v1 constructor}', /unknown record type constructor/],
    ['{kaylo:v1 __proto__}', /unreadable record/],
    ['{kaylo:v1 verify by=D1 result=ok}', /invalid result=ok/],
    ['{kaylo:v1 verify by=D1 result=pass vendor=x}', /unknown key vendor/],
    ['{kaylo:v1 direct role=reviewer tier=Medium covers=T1}', /unknown key tier/],
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
    // Direct work resumed under another vendor keeps the initial builder's attribution.
    task('T12', '{kaylo:v1 direct role=builder vendor=anthropic} {kaylo:v1 verify by=direct result=fail} {kaylo:v1 direct role=builder vendor=openai} ' +
      '{kaylo:v1 repair by=direct failure=F1 n=1 result=pass} {kaylo:v1 accept}'),
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
  assert.deepEqual(data.counts, { tasks: 12, recorded: 8, missing: 3, malformed: 1, unchecked: 0, unknownVendor: 1 });
  assert.deepEqual([tasksById['01-T12'].group, tasksById['01-T12'].success],
    [{ tier: 'direct', estimate: 'S', vendor: 'anthropic' }, false]);
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
    ['Light', 'S', 'anthropic', 1, 5], ['Light', 'S', 'unknown', 1, 1], ['direct', 'M', 'openai', 1, 1], ['direct', 'S', 'anthropic', 0, 1]]);
  const text = format(data);
  assert.match(text, /Light\tS\tanthropic\t1\/5\t20% \(below ~60%, advisory\)/);
  assert.match(text, /01-T6: missing \(no records\)/);
  assert.match(text, /leave out blocked or abandoned work/);
});

test('an inherited property name as a record type marks only its task malformed', t => {
  const root = fixture(t, [{ id: '01', closed: true,
    text: plan(task('T1', pass) + task('T2', `${D('D2')} {kaylo:v1 constructor} {kaylo:v1 verify by=D2 result=pass} {kaylo:v1 accept}`)) }]);
  const data = report(root);
  assert.deepEqual(data.counts, { tasks: 2, recorded: 1, missing: 0, malformed: 1, unchecked: 0, unknownVendor: 0 });
  assert.match(byId(data)['01-T2'].reason, /unknown record type constructor/);
  const cli = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /01-T2: malformed/);
});

test('an old plan with no records stays valid and reports every task as missing', t => {
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', 'node greet.cjs printed Hello, exit 0')) }]);
  assert.deepEqual(validate(root), []);
  const data = report(root);
  assert.deepEqual(data.counts, { tasks: 1, recorded: 0, missing: 1, malformed: 0, unchecked: 0, unknownVendor: 0 });
  assert.deepEqual(data.groups, []);
});

test('reviewer records in task Results are malformed and excluded from first-try rates', t => {
  const direct = '{kaylo:v1 direct role=builder vendor=anthropic} {kaylo:v1 verify by=direct result=pass}';
  const reviewer = '{kaylo:v1 dispatch id=D2 role=reviewer tier=Inherit fallback=tier-exception fallback-auth=user outcome=completed covers=T1}';
  const root = fixture(t, [{ id: '01', closed: true, text: plan([
    task('T1', `${direct} ${reviewer} {kaylo:v1 accept}`),
    task('T2', `${direct} {kaylo:v1 direct role=reviewer covers=T2} {kaylo:v1 accept}`),
    task('T3', pass)
  ].join('')) }]);
  // Placement diagnostics belong to the report; structural validation stays unchanged.
  assert.deepEqual(validate(root, { closing: true }), []);
  const data = report(root);
  const tasks = byId(data);
  for (const id of ['01-T1', '01-T2']) {
    assert.equal(tasks[id].status, 'malformed');
    assert.match(tasks[id].reason, /reviewer (dispatch|direct) record belongs under ## Review, not in task Result/);
    assert.equal(tasks[id].success, undefined);
  }
  assert.equal(tasks['01-T3'].status, 'recorded');
  assert.equal(tasks['01-T3'].success, true);
  assert.equal(data.counts.malformed, 2);
  assert.deepEqual(data.groups.map(g => [g.passed, g.total]), [[1, 1]]);
  assert.match(format(data), /01-T1: malformed \(reviewer dispatch record belongs under ## Review/);
});

test('reviewer records under Review keep valid tasks recorded and dispatch IDs phase-unique', t => {
  const direct = '{kaylo:v1 direct role=builder vendor=anthropic} {kaylo:v1 verify by=direct result=pass} {kaylo:v1 accept}';
  const reviewer = '{kaylo:v1 dispatch id=D2 role=reviewer tier=Inherit fallback=tier-exception fallback-auth=user outcome=completed covers=T1}';
  const review = `Independent task reviews. ${reviewer} {kaylo:v1 direct role=reviewer covers=T2}`;
  const root = fixture(t, [{ id: '01', closed: true,
    text: plan(task('T1', direct) + task('T2', direct) + task('T3', pass), review) }]);
  const data = report(root);
  assert.equal(data.counts.recorded, 3);
  assert.equal(data.counts.malformed, 0);
  assert.ok(data.tasks.every(t => t.success));
  // Moving a reviewer record must not release its ID for use by a builder.
  const duplicate = fixture(t, [{ id: '01', closed: true,
    text: plan(task('T1', pass.replace(/D1/g, 'D2')) + task('T2', direct), review) }]);
  const tasks = byId(report(duplicate));
  assert.equal(tasks['01-T1'].status, 'malformed');
  assert.match(tasks['01-T1'].reason, /dispatch ID D2 is not unique in the phase/);
  assert.equal(tasks['01-T2'].status, 'recorded');
});

// #92: review records that fail to parse, or build records placed under Review, are disclosed
// without changing task classification or first-try rates.
test('review-section parse errors and misplaced build records are reported, rates unchanged', t => {
  const review = 'Phase review. {kaylo:v1 dispatch id=D2 role=reviewer tier=unknown outcome=completed covers=T1} ' +
    '{kaylo:v1 direct role=reviewer tier=Medium covers=T1} {kaylo:v1 bogus}\n\n' +
    '{kaylo:v1 verify by=D1 result=pass} {kaylo:v1 direct role=builder vendor=anthropic}\n\n' +
    '{kaylo:v1 dispatch id=D3 role=reviewer tier=Medium outcome=pending fallback=manual-handoff fallback-auth=user covers=T1} ' +
    '{kaylo:v1 update by=D3 outcome=completed}';
  const root = fixture(t, [{ id: '01', closed: true, text: plan(task('T1', pass), review) }]);
  const data = report(root);
  assert.deepEqual(data.counts, { tasks: 1, recorded: 1, missing: 0, malformed: 0, unchecked: 0, unknownVendor: 0 });
  assert.deepEqual(data.review.map(r => [r.phase, r.problem]), [
    ['01', 'dispatch: invalid tier=unknown'],
    ['01', 'direct: unknown key tier'],
    ['01', 'unknown record type bogus'],
    ['01', 'verify record belongs in a task Result, not under ## Review'],
    ['01', 'direct role=builder record belongs in a task Result, not under ## Review']
  ]);
  const text = format(data);
  assert.match(text, /Review section records not counted \(first-try rates unaffected\):\n- 01: dispatch: invalid tier=unknown\n/);
  assert.match(text, /Light\tS\tanthropic\t1\/1\t100%/);
  // A clean Review section adds no review lines.
  const clean = report(fixture(t, [{ id: '01', closed: true, text: plan(task('T1', pass), 'None.') }]));
  assert.deepEqual(clean.review, []);
  assert.doesNotMatch(format(clean), /Review section records/);
});

test('the build delegation tier table matches the canonical builder recommendations', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const canonical = read('WORKERS.md');
  const delegation = read('skills/build/references/delegation.md');
  const rows = text => text.split('\n').filter(line => /^\| Builder, [SML] task \|/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
  const expected = [
    ['Builder, S task', 'Medium', 'Light', 'Light'],
    ['Builder, M task', 'Strong', 'Medium', 'Medium'],
    ['Builder, L task', 'Strong', 'Strong', 'Strong']
  ];
  for (const text of [canonical, delegation]) assert.match(text, /^\| Work \| Quality \| Balanced \| Budget \|$/m);
  assert.deepEqual(rows(canonical), expected);
  assert.deepEqual(rows(delegation), rows(canonical));
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

// Every complete record example in shipped guidance, by file. Grammar placeholders such
// as `{kaylo:v1 <type> key=value ...}` are not examples.
function shippedExamples() {
  const root = path.join(__dirname, '..');
  const files = ['WORKERS.md', 'README.md', 'GLOSSARY.md', 'templates/PHASE.md'];
  for (const dir of ['skills', 'agents']) {
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) files.push(path.relative(root, p));
    });
    walk(path.join(root, dir));
  }
  const found = {};
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    found[file] = (text.match(/\{kaylo:v1 [^}]*\}/g) || []).filter(r => !/<type>|\.\.\./.test(r));
  }
  return found;
}
const examplesIn = (file, type) => shippedExamples()[file].filter(r => parseRecords(r).records[0]?.type === type);

test('every record example in shipped guidance parses', () => {
  const found = shippedExamples();
  const all = Object.entries(found).flatMap(([file, records]) => records.map(r => [file, r]));
  for (const [file, r] of all) assert.deepEqual(parseRecords(r).errors, [], `${file}: ${r}`);
  // The entry points carry their own syntax, so a model need not open WORKERS.md.
  const types = file => new Set(found[file].map(r => parseRecords(r).records[0].type));
  assert.deepEqual([...types('skills/build/SKILL.md')].sort(), ['accept', 'direct', 'dispatch', 'reopen', 'repair', 'verify']);
  assert.deepEqual([...types('skills/review/SKILL.md')].sort(), ['direct', 'dispatch']);
  for (const file of ['skills/build/SKILL.md', 'skills/review/SKILL.md', 'skills/review/references/delegation.md']) {
    for (const r of found[file]) {
      const [item] = parseRecords(r).records;
      if (item.tier) assert.match(item.tier, /^(Light|Medium|Strong|Inherit)$/);
    }
  }
  const fallbacks = found['skills/review/references/delegation.md'].map(r => parseRecords(r).records[0].fallback).filter(Boolean);
  assert.deepEqual(fallbacks, ['vendor-waived', 'tier-exception', 'manual-handoff']);
});

test('documented record sequences classify as the guidance intends', t => {
  const build = 'skills/build/SKILL.md';
  const [direct] = examplesIn(build, 'direct');
  const [dispatch] = examplesIn(build, 'dispatch');
  const [verify] = examplesIn(build, 'verify');
  const repairs = examplesIn(build, 'repair');
  const [accept] = examplesIn(build, 'accept');
  const [reopen] = examplesIn(build, 'reopen');
  const resumed = repairs.find(r => r.includes('by=direct'));
  const firstRepair = repairs.find(r => r.includes('by=D1'));
  assert(direct && dispatch && verify && firstRepair && resumed && accept && reopen);
  const review = examplesIn('skills/review/references/delegation.md', 'dispatch')
    .concat(examplesIn('skills/review/references/delegation.md', 'update')).join(' ');
  const root = fixture(t, [{ id: '01', closed: true, text: plan([
    // Direct work, first try.
    task('T1', `Baseline clean. ${direct} {kaylo:v1 verify by=direct result=pass} Check passed. ${accept}`),
    // A worker that failed its first check and passed after one repair.
    task('T2', `Baseline clean. ${dispatch.replace('id=D1', 'id=D5')} ${verify.replace('D1', 'D5')} Failed. ${firstRepair.replace('D1', 'D5')} Passed. ${accept}`),
    // E2's shape: seeded worker history, then a resumed direct repair continuing F1.
    task('T3', `Baseline clean. ${dispatch.replace('id=D1', 'id=D6')} {kaylo:v1 verify by=D6 result=fail} {kaylo:v1 repair by=D6 failure=F1 n=1 result=fail} ${direct} ${resumed} Passed. ${accept}`, { estimate: 'M' }),
    // Accepted, then unchecked again.
    task('T4', `${direct} {kaylo:v1 verify by=direct result=pass} ${accept} Review found a defect. ${reopen}`, { checked: false })
  ].join('\n'), `Reviews of T1 to T3 with the user's routing choices. ${review}`) }]);
  const tasks = byId(report(root));
  assert.deepEqual(tasks['01-T1'], { ...tasks['01-T1'], status: 'recorded', success: true });
  assert.deepEqual(tasks['01-T2'], { ...tasks['01-T2'], status: 'recorded', success: false });
  assert.deepEqual(tasks['01-T3'], { ...tasks['01-T3'], status: 'recorded', success: false });
  assert.equal(tasks['01-T3'].group.tier, 'Light');
  assert.equal(tasks['01-T4'].status, 'unchecked');
  for (const id of ['01-T1', '01-T2', '01-T3']) assert.equal(tasks[id].reason, undefined, id);
});
