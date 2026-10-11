#!/usr/bin/env node
'use strict';

// Narrow append/check-off operations. Prose, evidence and authorization stay with
// the guiding assistant; record grammar and structural rules stay in their parsers.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { parseRecords } = require('./dispatch-report.cjs');
const { validate, visibleMarkdown } = require('./validate-plan.cjs');

const usage = [
  'Usage: node plan-record.cjs <project-root> append <task> \'<record>\'',
  '       node plan-record.cjs <project-root> review \'<record>\'',
  '       node plan-record.cjs <project-root> check-off <task>'
].join('\n') + '\n';
const taskLike = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[^\]]*\][ \t]*|\[[ \txX?]*)?T\d+\b/;
const taskEntry = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(T\d+):/;
const heading = /^ {0,3}#{1,6}[ \t]+/;
const sectionEnd = /^ {0,3}#{1,2}[ \t]+/;
const resultField = /^[ \t]*[-*]?[ \t]*Result:[ \t]*(.*)$/;
const reviewHeading = /^ {0,3}##[ \t]+Review(?:[ \t]+#+)?[ \t]*$/;

class Refusal extends Error {
  constructor(errors) { super(errors.join('\n')); this.errors = errors; }
}
const refuse = message => { throw new Refusal([message]); };
const diagnostics = error => error instanceof Refusal ? error.errors :
  [`Record operation failed (${error.code || 'unexpected error'})`];

function recordArgument(raw) {
  if (/[\r\n]/.test(raw)) refuse('Expected exactly one single-line record');
  const text = raw.replace(/^[ \t]+|[ \t]+$/g, '');
  if (!/^\{kaylo:[^{}]*\}$/.test(text)) refuse('Expected exactly one record, without prose or trailing payload');
  const parsed = parseRecords(text);
  if (parsed.errors.length) {
    // The search parser includes source values in some diagnostics. Do not echo
    // a supplied record or an invalid identity value from this editing command.
    throw new Refusal(parsed.errors.map(error => error.replace(/^unreadable record .*/, 'unreadable record')
      .replace(/(invalid [a-z-]+)=.*/, '$1 value')));
  }
  if (parsed.records.length !== 1) refuse('Expected exactly one parseable record');
  return { text, record: parsed.records[0] };
}

function inside(root, target) {
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    refuse('Plan path leaves project');
  }
  return target;
}

function linkTarget(line) {
  const match = line.match(/\[[^\]]+\]\(([^)]+)\)/);
  if (!match) refuse('Expected a Markdown phase link');
  let target;
  try { target = decodeURIComponent(match[1].replace(/^<|>$/g, '')); }
  catch { refuse('Invalid encoded phase link'); }
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || path.isAbsolute(target) || /[?#\\]/.test(target)) {
    refuse('Expected a relative project file link');
  }
  return path.normalize(target);
}

function currentPlan(project, io) {
  const root = io.realpathSync(project);
  const roadmapLink = path.join(root, 'ROADMAP.md');
  const roadmap = inside(root, io.realpathSync(roadmapLink));
  const roadmapBytes = io.readFileSync(roadmap);
  const lines = visibleMarkdown(roadmapBytes.toString('utf8')).split('\n');
  const current = lines.filter(line => /^[ \t]*Current\b/.test(line));
  if (current.length !== 1) refuse('Expected exactly one Current link');
  if (!/^[ \t]*Current:[ \t]*\[/.test(current[0])) refuse('Unsupported Current record');
  const relative = linkTarget(current[0]);
  const matches = lines.filter(line => /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+\[?\d{2}\b/.test(line) &&
    /\]\(/.test(line) && linkTarget(line) === relative);
  if (matches.length !== 1) refuse('Current must match exactly one phase checklist link');
  if (/^[ \t]*[-*][ \t]+\[[xX]\]/.test(matches[0])) refuse('Current phase is closed; no historical edits');
  const planLink = path.resolve(root, relative);
  const file = inside(root, io.realpathSync(planLink));
  const stat = io.statSync(file);
  if (!stat.isFile()) refuse('Current plan is not a regular file');
  if (stat.nlink > 1) refuse('Hard-linked plan requires targeted manual edits and structural inspection');
  const original = io.readFileSync(file);
  const text = original.toString('utf8');
  if (!Buffer.from(text).equals(original)) refuse('Plan encoding requires manual inspection');
  return { root, roadmapLink, roadmap, roadmapBytes, planLink, file, stat, original, text };
}

function layout(text) {
  const visible = visibleMarkdown(text).split('\n');
  const lines = [];
  let start = 0;
  for (const [i, raw] of text.split('\n').entries()) {
    const content = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const hasNewline = start + raw.length < text.length;
    lines.push({ raw: content, visible: visible[i], start, end: start + content.length,
      eol: hasNewline ? (raw.endsWith('\r') ? '\r\n' : '\n') : '' });
    start += raw.length + 1;
  }
  const tasks = [];
  const reviews = [];
  for (let i = 0; i < lines.length; i++) {
    if (reviewHeading.test(lines[i].visible)) {
      let end = i + 1;
      while (end < lines.length && !sectionEnd.test(lines[end].visible)) end++;
      reviews.push({ start: i, end });
    }
    if (!taskLike.test(lines[i].visible)) continue;
    const match = lines[i].visible.match(taskEntry);
    if (!match) refuse('Unsupported task entry; use the existing plan migration/manual path');
    let end = i + 1;
    while (end < lines.length && !taskLike.test(lines[end].visible) && !heading.test(lines[end].visible)) end++;
    const results = [];
    for (let j = i + 1; j < end; j++) if (resultField.test(lines[j].visible)) results.push(j);
    tasks.push({ id: match[2], checked: match[1].toLowerCase() === 'x', start: i, results });
  }
  if (reviews.length !== 1) refuse('Expected exactly one real ## Review section');
  return { lines, tasks, review: reviews[0] };
}

function rawTarget(line) {
  if (line.raw !== line.visible) refuse('Commented or ambiguous edit target requires targeted manual inspection');
}

function placement(record, target, task, doc) {
  if (target === 'review') {
    if (['dispatch', 'direct'].includes(record.type)) {
      if (record.role !== 'reviewer' || !record.covers) refuse('Review needs a reviewer record with covers');
    } else if (record.type !== 'update') refuse('Task records belong on the task Result: line');
  } else if (['dispatch', 'direct'].includes(record.type) && record.role === 'reviewer') {
    refuse('Reviewer records belong under ## Review');
  }
  if (record.type !== 'update') return;
  const owners = [];
  for (const item of doc.tasks) for (const index of item.results) {
    const parsed = parseRecords(doc.lines[index].visible.match(resultField)[1]);
    for (const r of parsed.records) if (r.type === 'dispatch' && r.id === record.by) owners.push({ task: item.id, role: r.role });
  }
  const { start, end } = doc.review;
  for (const r of parseRecords(doc.lines.slice(start + 1, end).map(line => line.visible).join('\n')).records) {
    if (r.type === 'dispatch' && r.id === record.by) owners.push({ task: null, role: r.role });
  }
  if (owners.length !== 1 || (target === 'review' ? owners[0].task !== null || owners[0].role !== 'reviewer' :
    owners[0].task !== task.id || owners[0].role === 'reviewer')) {
    refuse('Update needs one earlier dispatch owned by this record location');
  }
}

function candidate(plan, operation, taskId, rawRecord) {
  const supplied = operation === 'check-off' ? { text: '{kaylo:v1 accept}' } : recordArgument(rawRecord);
  const doc = layout(plan.text);
  const edits = [];
  if (operation === 'review') {
    placement(supplied.record, 'review', null, doc);
    const { start, end } = doc.review;
    rawTarget(doc.lines[start]);
    const eol = doc.lines[start].eol || (plan.text.includes('\r\n') ? '\r\n' : '\n');
    if (end < doc.lines.length) rawTarget(doc.lines[end]);
    else if (!visibleMarkdown(plan.text + '\nKAYLO_RECORD_BOUNDARY').endsWith('KAYLO_RECORD_BOUNDARY')) {
      refuse('Review ends inside a fence/comment; use targeted manual inspection');
    }
    const at = end < doc.lines.length ? doc.lines[end].start : plan.text.length;
    const prefix = at > 0 && plan.text[at - 1] !== '\n' ? eol : '';
    const suffix = at < plan.text.length || plan.text.endsWith('\n') ? eol : '';
    edits.push({ at, value: prefix + supplied.text + suffix });
  } else {
    const matches = doc.tasks.filter(task => task.id === taskId);
    if (matches.length !== 1) refuse('Task must identify exactly one current-phase entry');
    const task = matches[0];
    if (task.results.length !== 1) refuse(`${taskId}: expected exactly one Result field`);
    const result = doc.lines[task.results[0]];
    rawTarget(result);
    if (operation === 'append') placement(supplied.record, 'task', task, doc);
    else {
      if (task.checked) refuse(`${taskId}: task is already checked`);
      const entry = doc.lines[task.start];
      rawTarget(entry);
      const at = entry.start + entry.raw.indexOf('[') + 1;
      edits.push({ at, remove: 1, value: 'x' });
    }
    edits.push({ at: result.end, value: ' ' + supplied.text });
  }
  let text = plan.text;
  for (const edit of edits.sort((a, b) => b.at - a.at)) {
    text = text.slice(0, edit.at) + edit.value + text.slice(edit.at + (edit.remove || 0));
  }
  return Buffer.from(text);
}

// Dependencies are injectable only through this module API for failure tests.
function applyOperation(project, operation, taskId, rawRecord, { io = fs, validator = validate } = {}) {
  const plan = currentPlan(project, io);
  const next = candidate(plan, operation, taskId, rawRecord);
  const base = path.join(path.dirname(plan.file), `.kaylo-record-${randomUUID()}`);
  const temporary = base + '.tmp';
  const recovery = base + '.original';
  let replaced = false;
  let retainRecovery = false;
  const write = (file, bytes) => {
    io.writeFileSync(file, bytes, { flag: 'wx', mode: plan.stat.mode & 0o7777 });
    io.chmodSync(file, plan.stat.mode & 0o7777);
  };
  try {
    write(recovery, plan.original);
    write(temporary, next);
    if (io.realpathSync(plan.planLink) !== plan.file || io.realpathSync(plan.roadmapLink) !== plan.roadmap ||
      !io.readFileSync(plan.file).equals(plan.original) || !io.readFileSync(plan.roadmap).equals(plan.roadmapBytes)) {
      refuse('Plan or ROADMAP changed during the operation; nothing replaced');
    }
    io.renameSync(temporary, plan.file);
    replaced = true;
    const errors = validator(plan.root);
    if (errors.length) throw new Refusal(errors);
    if (io.realpathSync(plan.planLink) !== plan.file || io.realpathSync(plan.roadmapLink) !== plan.roadmap ||
      !io.readFileSync(plan.roadmap).equals(plan.roadmapBytes) || !io.readFileSync(plan.file).equals(next)) {
      refuse('Plan or ROADMAP changed during validation');
    }
  } catch (error) {
    const errors = diagnostics(error);
    if (replaced) {
      retainRecovery = true;
      try {
        if (io.realpathSync(plan.file) !== plan.file || !io.readFileSync(plan.file).equals(next)) {
          refuse('Intervening plan edit retained; automatic restore refused');
        }
        // Keep the original recovery file until read-back confirms restoration.
        // A failed restore/read must never point the user at a consumed backup.
        write(temporary, plan.original);
        io.renameSync(temporary, plan.file);
        if (!io.readFileSync(plan.file).equals(plan.original)) refuse('Restored bytes could not be confirmed');
        retainRecovery = false;
      } catch (restoreError) {
        throw new Refusal([...errors, ...diagnostics(restoreError),
          `State uncertain; recovery copy: ${recovery}`]);
      }
    }
    throw new Refusal(errors);
  } finally {
    // Cleanup errors must not obscure validation/restore diagnostics or success.
    for (const file of retainRecovery ? [temporary] : [temporary, recovery]) {
      try { io.unlinkSync(file); } catch { /* absent or left for manual cleanup */ }
    }
  }
}

function main(args) {
  const [project, operation] = args;
  const taskId = operation === 'review' ? null : args[2];
  if (!project || project.startsWith('--') || !['append', 'review', 'check-off'].includes(operation) ||
    args.length !== (operation === 'append' ? 4 : 3) || (taskId !== null && !/^T\d+$/.test(taskId))) {
    process.stderr.write(usage);
    return 2;
  }
  try {
    applyOperation(project, operation, taskId, operation === 'review' ? args[2] : args[3]);
    process.stdout.write(`PASS ${operation}${taskId ? ' ' + taskId : ''}; plan structure valid; evidence truth and authorization were not checked\n`);
    return 0;
  } catch (error) {
    for (const message of diagnostics(error)) process.stderr.write(`FAIL ${message}\n`);
    return 1;
  }
}

module.exports = { applyOperation, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
