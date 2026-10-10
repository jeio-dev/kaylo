'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { validate } = require('../scripts/validate-plan.cjs');

const task = (id, checked = false, blockedBy = 'None') => `- [${checked ? 'x' : ' '}] ${id}: Print a greeting
  - Estimate: S
  - Blocked by: ${blockedBy}
  - Acceptance criteria: Output Hello
  - Test plan: node greet.cjs; expect Hello, exit 0
  - Result: ${checked ? 'node greet.cjs printed Hello, exit 0' : 'Not started'}
`;
const phase = tasks => `# 01 Greeting
Status: Current

## Tasks
${tasks}
## Review
None; inspected greeting and command output.

## Completion
Greeting delivered; node greet.cjs printed Hello, exit 0. No known limitations.
`;

function fixture(t, text = phase(task('T1'))) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const relative = '.kaylo/phases/01-greeting/01-PLAN.md';
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), text);
  fs.writeFileSync(path.join(root, 'ROADMAP.md'), `# Roadmap
Current: [01 Greeting](${relative})

- [ ] [01 Greeting](${relative}) — Print a greeting
- [ ] 02 Future — Decide later
`);
  return { root, file: path.join(root, relative), index: path.join(root, 'ROADMAP.md') };
}

test('valid roadmap with unlinked future phase; validator makes no writes', t => {
  const f = fixture(t);
  const before = [f.index, f.file].map(p => fs.readFileSync(p, 'utf8'));
  assert.deepEqual(validate(f.root), []);
  assert.deepEqual([f.index, f.file].map(p => fs.readFileSync(p, 'utf8')), before);
});

test('PRD.md is optional, and an unrelated PLAN.md beside ROADMAP.md is ignored', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'PRD.md'), '# Greeting\n');
  fs.writeFileSync(path.join(f.root, 'PLAN.md'), '# Unrelated notes\n');
  assert.deepEqual(validate(f.root), []);
});

test('Needs revision with a reason is valid before closure', t => {
  const f = fixture(t, phase(task('T1')).replace('Status: Current', 'Status: Needs revision: changed outcome'));
  assert.deepEqual(validate(f.root), []);
});

test('PLAN.md without ROADMAP.md is rejected and names the replacement', t => {
  const f = fixture(t);
  fs.renameSync(f.index, path.join(f.root, 'PLAN.md'));
  assert.deepEqual(validate(f.root), ['PLAN.md is no longer supported; rename it to ROADMAP.md']);
});

test('missing ROADMAP.md is rejected', t => {
  const f = fixture(t);
  fs.rmSync(f.index);
  assert.deepEqual(validate(f.root), ['Missing ROADMAP.md']);
});

test('OBJECTIVE.md is rejected, alone or beside PRD.md', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'OBJECTIVE.md'), '# Greeting\n');
  assert.deepEqual(validate(f.root), ['OBJECTIVE.md is no longer supported; rename it to PRD.md']);
  fs.writeFileSync(path.join(f.root, 'PRD.md'), '# Greeting\n');
  assert.deepEqual(validate(f.root), ['OBJECTIVE.md is no longer supported; rename it to PRD.md']);
});

test('inline roadmap tasks without Current are rejected', t => {
  const f = fixture(t);
  fs.writeFileSync(f.index, phase(task('T1')));
  const errors = validate(f.root).join('\n');
  assert.match(errors, /ROADMAP\.md contains tasks/);
  assert.match(errors, /ROADMAP\.md needs a Current/);
});

test('roadmap without Current or tasks is rejected', t => {
  const f = fixture(t);
  fs.writeFileSync(f.index, '# Roadmap\n\n- [ ] 01 Greeting — Print a greeting\n');
  assert.match(validate(f.root).join('\n'), /ROADMAP\.md needs a Current/);
});

for (const [label, edit, expected] of [
  ['missing', text => text.replace('Status: Current\n', ''), /Phase plan needs Status: Current or Status: Needs revision/],
  ['Draft', text => text.replace('Status: Current', 'Status: Draft'), /Unsupported Status: Draft/],
  ['Current with extra text', text => text.replace('Status: Current', 'Status: Currently drafting'), /Unsupported Status: Currently drafting/],
  ['blank', text => text.replace('Status: Current', 'Status:'), /Unsupported Status: \(blank\)/],
  ['Needs revision without a reason', text => text.replace('Status: Current', 'Status: Needs revision:'), /Unsupported Status: Needs revision:/],
  ['Needs revision with a placeholder', text => text.replace('Status: Current', 'Status: Needs revision: [reason]'), /Unsupported Status/],
  ['a second, invalid line', text => text.replace('## Tasks', 'Status: Draft\n\n## Tasks'), /Unsupported Status: Draft/],
]) test(`phase plan Status rejected: ${label}`, t => {
  assert.match(validate(fixture(t, edit(phase(task('T1', true)))).root).join('\n'), expected);
});

test('valid dependency and completed task evidence', t => {
  assert.deepEqual(validate(fixture(t, phase(task('T1', true) + task('T2', false, 'T1'))).root), []);
});

test('checked tasks reject unfinished Result prefixes, while open tasks retain progress notes', t => {
  for (const result of ['In progress', 'In progress. Baseline recorded; checks passed, exit 0.',
    'Not started: waiting for implementation.', 'not started; baseline recorded.',
    'Pending — verification needed.', 'TODO', 'TODO: run checks.', 'TBD — waiting for evidence.',
    'Blocked: required check failed.', 'In progress\t: baseline recorded.',
    'Blocked- required check failed.', 'Pending— verification needed.', 'Pending —verification needed.',
    'In progress—baseline recorded.', 'Blocked–check failed.', 'Blocked—npm test denied.',
    'Pending–user check.', 'Pending\t–user check.']) {
    const text = phase(task('T1', true)).replace('node greet.cjs printed Hello, exit 0', result);
    const f = fixture(t, text);
    assert.ok(validate(f.root).some(error => /Result must not start with an unfinished state/.test(error)), result);
    assert.equal(fs.readFileSync(f.file, 'utf8'), text);
    fs.writeFileSync(f.file, text.replace('- [x] T1:', '- [ ] T1:'));
    assert.deepEqual(validate(f.root), [], result);
  }
});

test('finished Result prose and feature names do not count as unfinished state markers', t => {
  for (const result of ['Todo items now persist; checks passed, exit 0.',
    'TODO list renders; checks passed, exit 0.', 'Pending orders now appear; checks passed, exit 0.',
    'Blocked users can no longer post; checks passed, exit 0.', 'Blocked-user filter works; checks passed, exit 0.',
    'In progress bar renders; checks passed, exit 0.', 'Pending-state spinner shows; checks passed, exit 0.',
    'TBD placeholders removed; checks passed, exit 0.',
    'Pending verification.', 'In progress with baseline notes.', 'Not started implementation.',
    'Pending (queued) orders now persist; checks passed, exit 0.']) {
    const text = phase(task('T1', true)).replace('node greet.cjs printed Hello, exit 0', result);
    const f = fixture(t, text);
    assert.deepEqual(validate(f.root, { closing: true }), [], result);
    assert.equal(fs.readFileSync(f.file, 'utf8'), text);
  }
});

test('checked Results can retain historical progress and failure notes after current evidence', t => {
  for (const result of ['node greet.cjs printed Hello, exit 0. Earlier: In progress; baseline recorded.',
    'Done: node greet.cjs printed Hello, exit 0. Previously Blocked: check failed.',
    'In progression checks, node greet.cjs printed Hello, exit 0.']) {
    const text = phase(task('T1', true)).replace('node greet.cjs printed Hello, exit 0', result);
    assert.deepEqual(validate(fixture(t, text).root, { closing: true }), [], result);
  }
});

for (const [label, tasks, expected] of [
  ['duplicate task', task('T1') + task('T1'), /Duplicate task/],
  ['unknown blocker', task('T1', false, 'T9'), /Blocked by T9 must name an earlier task/],
  ['self blocker', task('T1', false, 'T1'), /Blocked by T1 must name an earlier task/],
  ['forward blocker', task('T1', false, 'T2') + task('T2'), /Blocked by T2 must name an earlier task/],
  ['cross-phase blocker', task('T1', false, '02-T1'), /comma-separated/],
  ['duplicate blocker', task('T1') + task('T2', false, 'T1, T1'), /comma-separated/],
  ['empty Blocked by', task('T1', false, ''), /Blocked by must be None or comma-separated/],
  ['missing Blocked by', task('T1').replace(/  - Blocked by:.*\n/, ''), /T1: task needs a Blocked by record \(None is allowed\)/],
  ['duplicate Blocked by', task('T1').replace('  - Result:', '  - Blocked by: None\n  - Result:'), /duplicate Blocked by/],
  ['missing completed evidence', task('T1', true).replace(/  - Result:.*\n/, ''), /Result record/],
  ['placeholder completed evidence', task('T1', true).replace(/  - Result:.*\n/, '  - Result: [Evidence here]\n'), /Result record/],
  ['blank completed acceptance criteria cannot consume next field', task('T1', true).replace('Acceptance criteria: Output Hello', 'Acceptance criteria: '), /Acceptance criteria record/],
  ['missing acceptance criteria', task('T1').replace(/  - Acceptance criteria:.*\n/, ''), /T1: task needs a substantive Acceptance criteria record/],
  ['duplicate acceptance criteria', task('T1').replace('  - Result:', '  - Acceptance criteria: Output Hi\n  - Result:'), /duplicate Acceptance criteria/],
  ['duplicate result field', task('T1', true) + '  - Result: Another claim\n', /duplicate Result/],
  ['unfinished task still requires a test plan', task('T1').replace(/  - Test plan:.*\n/, ''), /Test plan record/],
]) test(label, t => assert.match(validate(fixture(t, phase(tasks)).root).join('\n'), expected));

for (const [old, replacement] of [['Complexity', 'Estimate'], ['Depends on', 'Blocked by'],
  ['Acceptance', 'Acceptance criteria'], ['Verify', 'Test plan']]) {
  test(`old task field ${old}: is rejected and names ${replacement}:`, t => {
    const oldOnly = task('T1').replace(`  - ${replacement}:`, `  - ${old}:`);
    const expected = `T1: ${old}: is no longer supported; use ${replacement}:`;
    assert.ok(validate(fixture(t, phase(oldOnly)).root).includes(expected));
    const mixed = task('T1').replace('  - Result:', `  - ${old}: S\n  - Result:`);
    assert.deepEqual(validate(fixture(t, phase(mixed)).root), [expected]);
  });
}

test('Estimate values are instructions only', t => {
  const f = fixture(t, phase(task('T1').replace('Estimate: S', 'Estimate: XXL') + task('T2').replace(/  - Estimate:.*\n/, '')));
  assert.deepEqual(validate(f.root), []);
});

test('blocking and non-blocking review comments pass', t => {
  const text = phase(task('T1', true)).replace('None; inspected greeting and command output.',
    '- R1: blocking — fixed\n  - Recheck: node greet.cjs printed Hello\n- R2: non-blocking — optional follow-up accepted by user\n- R3: non-blocking - fixed; the flag is optional now\n- R4: blocking—fixed; optional flag removed\n- R5: non-blocking–fixed; optional flag kept\n- R6: non-blocking – fixed; optional flag kept');
  assert.deepEqual(validate(fixture(t, text).root, { closing: true }), []);
});

for (const [entry, expected] of [
  ['- R1: blocker — open', 'R1: label blocker is no longer supported; use blocking'],
  ['- R1: optional — open', 'R1: label optional is no longer supported; use non-blocking'],
  ['- R1: Optional - accepted by user', 'R1: label optional is no longer supported; use non-blocking'],
  ['- R1: blocker / blocking — fixed', 'R1: label blocker is no longer supported; use blocking'],
]) test(`old review label is rejected: ${entry}`, t => {
  const text = phase(task('T1')).replace('None; inspected greeting and command output.', entry);
  assert.deepEqual(validate(fixture(t, text).root), [expected]);
});

for (const entry of [
  '- R1 (non-blocking, open): `now` is not validated',
  '- R2 — blocking — open',
  '* R3 non-blocking, fixed: guard added',
]) test(`review comment without the R1: form is rejected: ${entry}`, t => {
  const text = phase(task('T1')).replace('None; inspected greeting and command output.', entry);
  const id = entry.match(/R\d+/)[0];
  assert.deepEqual(validate(fixture(t, text).root), [`${id}: write review comments as "- ${id}: <blocking or non-blocking> — <resolution>"`]);
});

test('Review prose that mentions comment IDs without a label still passes', t => {
  const text = phase(task('T1')).replace('None; inspected greeting and command output.',
    '- R1: non-blocking — fixed\n  - Recheck: R1 rechecked with node greet.cjs\n- R1 and the earlier note were rechecked together.');
  assert.deepEqual(validate(fixture(t, text).root), []);
});

test('duplicate review comments only count entries in Review', t => {
  const text = phase(task('T1')).replace('None; inspected greeting and command output.', '- R1: non-blocking — open\n- R1: blocking — open');
  assert.match(validate(fixture(t, text).root).join('\n'), /Duplicate review comment ID: R1/);
  const outside = phase(task('T1')).replace('## Tasks', '- R1: example\n\n## Tasks').replace('None; inspected greeting and command output.', '- R1: blocking — open');
  assert.deepEqual(validate(fixture(t, outside).root), []);
});

test('examples inside fences and comments do not become tasks', t => {
  const text = phase(task('T1')).replace('## Review', '```md\n' + task('T1') + '```\n<!--\n' + task('T1') + '-->\n## Review');
  assert.deepEqual(validate(fixture(t, text).root), []);
});

test('completed phase and --closing require records and finished tasks', t => {
  const f = fixture(t);
  assert.match(validate(f.root, { closing: true }).join('\n'), /requires completed tasks/);
  fs.writeFileSync(f.file, phase(task('T1', true)));
  assert.deepEqual(validate(f.root, { closing: true }), []);
  fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('- [ ] [01', '- [x] [01'));
  fs.writeFileSync(f.file, phase(task('T1', true)).replace(/## Completion[^]*/, '## Completion\n[Record later]\n'));
  assert.match(validate(f.root).join('\n'), /Completion record/);
});

test('closure refuses Needs revision and absent review', t => {
  const f = fixture(t, phase(task('T1', true)).replace('Status: Current', 'Status: Needs revision: changed outcome').replace(/## Review[^]*?(?=## Completion)/, ''));
  const errors = validate(f.root, { closing: true }).join('\n');
  assert.match(errors, /needing revision/);
  assert.match(errors, /Review record/);
});

test('bare Not complete is a closure placeholder, including a checked current phase', t => {
  for (const completion of ['Not complete.', 'Not complete', 'not complete!']) {
    const text = phase(task('T1', true)).replace(/## Completion[^]*/, `## Completion\n${completion}\n`);
    const f = fixture(t, text);
    assert.deepEqual(validate(f.root), []); // An open phase may keep its placeholder.
    assert.deepEqual(validate(f.root, { closing: true }), ['Phase closure needs a substantive Completion record']);
    assert.equal(fs.readFileSync(f.file, 'utf8'), text);
    fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('- [ ] [01', '- [x] [01'));
    assert.deepEqual(validate(f.root), ['Phase closure needs a substantive Completion record']);
  }
  const f = fixture(t, phase(task('T1', true)));
  assert.deepEqual(validate(f.root, { closing: true }), []);
  fs.writeFileSync(f.file, fs.readFileSync(f.file, 'utf8').replace('No known limitations.',
    'Not complete coverage of optional edge cases; no user decision recorded.'));
  assert.deepEqual(validate(f.root, { closing: true }), []);
});

for (const indent of [' ', '  ', '   ', '\t']) {
  test(`indented Needs revision blocks closure: ${JSON.stringify(indent)}`, t => {
    const text = phase(task('T1', true)).replace('Status: Current', `${indent}Status: Needs revision: changed outcome`);
    const f = fixture(t, text);
    assert.match(validate(f.root, { closing: true }).join('\n'), /needing revision/);
    fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('- [ ] [01', '- [x] [01'));
    assert.match(validate(f.root).join('\n'), /needing revision/);
  });
}

test('broken link and Current mismatch', t => {
  const f = fixture(t);
  fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('Current: [01 Greeting](.kaylo/phases/01-greeting/01-PLAN.md)', 'Current: [99 Missing](missing.md)'));
  assert.match(validate(f.root).join('\n'), /Current must match/);
  fs.rmSync(f.file);
  assert.match(validate(f.root).join('\n'), /Cannot read plan/);
});

test('duplicate phase IDs and duplicate Current lines', t => {
  const f = fixture(t);
  const text = fs.readFileSync(f.index, 'utf8');
  fs.writeFileSync(f.index, text + text.split('\n')[1] + '\n- [ ] 01 Duplicate — invalid\n');
  const errors = validate(f.root).join('\n');
  assert.match(errors, /exactly one Current/);
  assert.match(errors, /Duplicate phase ID/);
});

test('reject path traversal and symlink escape', t => {
  const f = fixture(t);
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-outside-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const outside = path.join(external, 'external.md');
  fs.writeFileSync(outside, phase(task('T1')));
  const relative = path.relative(f.root, outside);
  const index = target => `Current: [01 Greeting](${target})\n- [ ] [01 Greeting](${target})\n`;
  fs.writeFileSync(f.index, index(relative));
  assert.match(validate(f.root).join('\n'), /leaves project/);
  fs.symlinkSync(outside, path.join(f.root, 'linked.md'));
  fs.writeFileSync(f.index, index('linked.md'));
  assert.match(validate(f.root).join('\n'), /leaves project/);
});

test('encoded paths with spaces resolve; external URLs rejected', t => {
  const f = fixture(t);
  fs.renameSync(f.file, path.join(path.dirname(f.file), 'plan with spaces.md'));
  const text = fs.readFileSync(f.index, 'utf8').replaceAll('01-PLAN.md', 'plan%20with%20spaces.md');
  fs.writeFileSync(f.index, text);
  assert.deepEqual(validate(f.root), []);
  fs.writeFileSync(f.index, text.replaceAll('.kaylo/phases/01-greeting/plan%20with%20spaces.md', 'https://example.com/plan.md'));
  assert.match(validate(f.root).join('\n'), /relative project file/);
});

test('CLI returns 0, 1, and 2 for valid plan, invalid plan, and usage', t => {
  const f = fixture(t);
  const script = path.resolve(__dirname, '../scripts/validate-plan.cjs');
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.equal(run([f.root]).status, 0);
  assert.equal(run([f.root, '--closing']).status, 1);
  assert.equal(run([]).status, 2);
  assert.equal(run([f.root, '--unknown']).status, 2);
});

test('supported whitespace keeps unfinished tasks visible at closure', t => {
  const unfinished = task('T2').replace('- [ ] T2:', '  -\t[ ]  T2:');
  const f = fixture(t, phase(task('T1', true) + unfinished));
  assert.deepEqual(validate(f.root), []);
  assert.match(validate(f.root, { closing: true }).join('\n'), /T2: phase closure requires completed tasks/);
});

for (const entry of ['- [ ] T2 Still unfinished', '- [?] T2: Still unfinished',
  '- [ T2: Still unfinished', '- T2: Still unfinished', '+ [ ] T2: Still unfinished']) {
  test(`malformed task cannot disappear: ${entry}`, t => {
    const f = fixture(t, phase(task('T1', true) + entry + '\n'));
    assert.match(validate(f.root, { closing: true }).join('\n'), /Unsupported task entry/);
  });
}

test('fields below a malformed task cannot complete its predecessor', t => {
  const first = task('T1', true).replace(/  - Result:.*\n/, '');
  const second = '- [ ] T2 Still unfinished\n  - Result: Pretend success, exit 0\n';
  const errors = validate(fixture(t, phase(first + second)).root, { closing: true }).join('\n');
  assert.match(errors, /T1:.*Result record/);
  assert.match(errors, /Unsupported task entry/);
});

for (const entry of ['- [?] 03 Future — invalid', '- [ 03 Future — invalid', '- [ ] Future — invalid']) {
  test(`malformed phase cannot disappear: ${entry}`, t => {
    const f = fixture(t);
    fs.appendFileSync(f.index, entry + '\n');
    assert.match(validate(f.root).join('\n'), /Unsupported phase entry/);
  });
}

test('inline roadmap tasks are rejected even beside an indented Current', t => {
  const f = fixture(t, phase(task('T1', true)));
  fs.appendFileSync(f.index, '\n' + task('T1', true));
  fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('Current:', '  Current:'));
  assert.match(validate(f.root, { closing: true }).join('\n'), /ROADMAP\.md contains tasks/);
});

test('whitespace in valid phase and Current records is supported', t => {
  const f = fixture(t);
  fs.writeFileSync(f.index, fs.readFileSync(f.index, 'utf8').replace('Current:', '  Current:').replaceAll('- [ ] ', '  -\t[ ]  '));
  assert.deepEqual(validate(f.root), []);
});

test('malformed Current is diagnosed even beside inline tasks', t => {
  const f = fixture(t, phase(task('T1', true)));
  fs.writeFileSync(f.index, phase(task('T1', true)) + '\n Current [01 Greeting](.kaylo/phases/01-greeting/01-PLAN.md)\n');
  const errors = validate(f.root).join('\n');
  assert.match(errors, /Unsupported Current record/);
  assert.match(errors, /ROADMAP\.md contains tasks/);
});

test('fence-like lines with info suffixes do not expose example tasks', t => {
  const text = phase(task('T1', true)).replace('## Review', '```md\n```js\n' + task('T9') + '```\n## Review');
  assert.deepEqual(validate(fixture(t, text).root, { closing: true }), []);
});

test('real tasks after a closing fence stay visible after an info suffix', t => {
  const text = phase(task('T1', true)).replace('## Review', '```md\n```js\nexample\n```\n' + task('T2') + '## Review');
  assert.match(validate(fixture(t, text).root, { closing: true }).join('\n'), /T2: phase closure requires completed tasks/);
});

test('closing fences require matching character and sufficient length', t => {
  const text = phase(task('T1', true)).replace('## Review', '~~~~md\n~~~\n```\n' + task('T9') + '~~~~ \t\n## Review');
  assert.deepEqual(validate(fixture(t, text).root, { closing: true }), []);
});

test('literal comment markers in a fence cannot hide later real tasks', t => {
  const text = phase(task('T1', true)).replace('## Review', '```md\n<!--\n```\n' + task('T2') + '-->\n## Review');
  assert.match(validate(fixture(t, text).root, { closing: true }).join('\n'), /T2: phase closure requires completed tasks/);
});

for (const fence of ['```', '~~~']) {
  test(`comment marker in ${fence} opening info cannot hide an unfinished task`, t => {
    const unfinished = '- [ ] T2: Still unfinished\n' +
      '  - Blocked by: None\n  - Acceptance criteria: Prints GOODBYE\n  - Test plan: Check goodbye\n  - Result: Not started\n';
    const text = phase(task('T1', true)).replace('## Review',
      `${fence}md <!--\nexample\n${fence}\n${unfinished}-->\n## Review`);
    const f = fixture(t, text);
    const before = fs.readFileSync(f.file, 'utf8');
    const result = spawnSync(process.execPath,
      [path.resolve(__dirname, '../scripts/validate-plan.cjs'), f.root, '--closing'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /T2: phase closure requires completed tasks/);
    assert.doesNotMatch(result.stdout, /PASS/);
    assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  });
}

test('opening info comments cannot expose tasks inside a valid fence', t => {
  const text = phase(task('T1', true)).replace('## Review',
    '```md <!--\n-->\n' + task('T9') + '```\n## Review');
  assert.deepEqual(validate(fixture(t, text).root, { closing: true }), []);
});

test('fence markers inside a real HTML comment do not open a fence', t => {
  const text = phase(task('T1', true)).replace('## Review',
    '<!--\n```md\n-->\n' + task('T2') + '## Review');
  assert.match(validate(fixture(t, text).root, { closing: true }).join('\n'), /T2: phase closure requires completed tasks/);
});

test('duplicate Review sections and cross-section review comment IDs are diagnosed', t => {
  const text = phase(task('T1', true)).replace('None; inspected greeting and command output.', '- R1: non-blocking — open\n\n## Review\n- R1: non-blocking — open');
  const errors = validate(fixture(t, text).root, { closing: true }).join('\n');
  assert.match(errors, /Duplicate Review sections/);
  assert.match(errors, /Duplicate review comment ID: R1/);
});

test('duplicate Completion sections fail even before closure', t => {
  const text = phase(task('T1')) + '\n## Completion\nA second record\n';
  assert.match(validate(fixture(t, text).root).join('\n'), /Duplicate Completion sections/);
});

for (const kind of ['symlink', 'hardlink']) {
  test(`${kind} aliases cannot give two phases the same plan file`, t => {
    const f = fixture(t);
    const alias = path.join(f.root, 'alias.md');
    if (kind === 'symlink') fs.symlinkSync(f.file, alias);
    else fs.linkSync(f.file, alias);
    fs.appendFileSync(f.index, '- [ ] [03 Alias](alias.md) — Shares existing plan\n');
    assert.match(validate(f.root).join('\n'), /Duplicate phase link \(same file\)/);
  });
}
