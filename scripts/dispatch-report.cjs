#!/usr/bin/env node
'use strict';

// Read-only report of first-try pass rates from {kaylo:v1 ...} records in closed
// phases. Separate from plan validation: records are optional, and a missing or
// malformed record is counted and disclosed, never treated as a pass.
const fs = require('node:fs');
const path = require('node:path');
const { visibleMarkdown } = require('./validate-plan.cjs');

const taskLike = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[^\]]*\][ \t]*|\[[ \txX?]*)?T\d+\b/;
const taskEntry = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(T\d+):/;
const heading = /^ {0,3}#{1,6}[ \t]+/;
const closedPhase = /^[ \t]*[-*][ \t]+\[[xX]\][ \t]+\[?(\d{2})\b/;
const link = /\[[^\]]+\]\(([^)]+)\)/;
const record = /\{kaylo:([^\s{}]*)[ \t]+([a-z]+)((?:[ \t]+[a-z-]+=(?:"[^"{}]*"|[^\s"{}]+))*)[ \t]*\}/y;
const pair = /([a-z-]+)=("[^"{}]*"|[^\s"{}]+)/g;
const text = /^.+$/;
const values = {
  id: /^D\d+$/, resumes: /^D\d+$/, by: /^(?:D\d+|direct)$/, failure: /^F\d+$/, n: /^[1-9]\d*$/,
  covers: /^(?:phase|T\d+(?:,T\d+)*)$/,
  role: ['builder', 'reviewer', 'researcher'], tier: ['Light', 'Medium', 'Strong', 'Inherit'],
  outcome: ['completed', 'failed', 'interrupted', 'blocked', 'pending'],
  billing: ['subscription', 'metered', 'unknown', 'n/a'], 'billing-auth': ['preference', 'session', 'n/a'],
  fallback: ['none', 'inherit', 'other-model', 'vendor-waived', 'tier-exception', 'manual-handoff', 'direct', 'pause'],
  'fallback-auth': ['user', 'session', 'n/a'], result: ['pass', 'fail', 'unavailable'],
  basis: ['new-evidence', 'changed-condition', 'authorized'],
  setting: text, host: text, route: text, vendor: text, model: text
};
const schema = {
  dispatch: [['id', 'role', 'tier', 'outcome'], ['setting', 'host', 'route', 'vendor', 'model', 'billing',
    'billing-auth', 'fallback', 'fallback-auth', 'resumes', 'covers']],
  direct: [['role'], ['host', 'vendor', 'model', 'fallback', 'fallback-auth', 'covers']],
  update: [['by', 'outcome'], []],
  verify: [['by', 'result'], []],
  repair: [['by', 'failure', 'n', 'result'], ['basis']],
  accept: [[], []],
  reopen: [[], []]
};

// Returns { records, errors } for every {kaylo: occurrence in a line of text.
function parseRecords(line) {
  const records = [];
  const errors = [];
  for (let at = line.indexOf('{kaylo:'); at >= 0; at = line.indexOf('{kaylo:', at + 1)) {
    record.lastIndex = at;
    const match = record.exec(line);
    const shown = line.slice(at, line.indexOf('}', at) + 1 || undefined).slice(0, 80);
    if (!match) { errors.push(`unreadable record ${shown}`); continue; }
    const [, version, type, rest] = match;
    if (version !== 'v1') { errors.push(`unsupported record version ${version || '(none)'}`); continue; }
    if (!Object.hasOwn(schema, type)) { errors.push(`unknown record type ${type}`); continue; }
    const [required, optional] = schema[type];
    const fields = {};
    let bad = false;
    for (const [, key, raw] of rest.matchAll(pair)) {
      const value = raw.startsWith('"') ? raw.slice(1, -1) : raw;
      const rule = values[key];
      if (!required.includes(key) && !optional.includes(key)) { errors.push(`${type}: unknown key ${key}`); bad = true; }
      else if (key in fields) { errors.push(`${type}: duplicate key ${key}`); bad = true; }
      else if (Array.isArray(rule) ? !rule.includes(value) : !rule.test(value)) {
        errors.push(`${type}: invalid ${key}=${raw}`); bad = true;
      }
      fields[key] = value;
    }
    for (const key of required) if (!(key in fields)) { errors.push(`${type}: missing ${key}`); bad = true; }
    if (type === 'repair' && Number(fields.n) > 2 && !fields.basis) {
      errors.push(`repair ${fields.failure} n=${fields.n}: a third or later repair needs basis`); bad = true;
    }
    if (!bad) records.push({ type, ...fields });
  }
  return { records, errors };
}

// Classify one task's records; returns { status, reason?, success?, group? }.
function classify(task, errors) {
  if (errors.length) return { status: 'malformed', reason: [...new Set(errors)].join('; ') };
  const { records } = task;
  if (!records.length) return { status: 'missing', reason: 'no records' };
  const problems = [];
  const dispatches = new Map();
  const counts = new Map();
  let verify = null;
  let builder = null;
  let builders = 0;
  for (const item of records) {
    if (['dispatch', 'direct'].includes(item.type) && item.role === 'reviewer') {
      problems.push(`reviewer ${item.type} record belongs under ## Review, not in task Result`);
    }
    if (item.type === 'dispatch') {
      if (item.resumes && !dispatches.has(item.resumes)) problems.push(`${item.id} resumes unknown ${item.resumes}`);
      dispatches.set(item.id, item);
      if (item.role === 'builder') builders++;
    } else if (item.type === 'direct' && item.role === 'builder') {
      builders++;
      dispatches.set('direct', item);
    } else if (item.type === 'update') {
      if (!dispatches.has(item.by) || item.by === 'direct') problems.push(`update by=${item.by} names no earlier dispatch`);
    } else if (item.type === 'verify' || item.type === 'repair') {
      const by = dispatches.get(item.by);
      if (!by || by.role !== 'builder') problems.push(`${item.type} by=${item.by} names no earlier builder record`);
      if (item.type === 'verify') {
        if (verify) problems.push('more than one verify record');
        // Later direct work replaces the 'direct' entry, so keep the initial builder now.
        else { verify = item; builder = by; }
      } else {
        if (!verify) problems.push(`repair ${item.failure} precedes verify`);
        const expected = (counts.get(item.failure) || 0) + 1;
        if (Number(item.n) !== expected) problems.push(`repair ${item.failure} n=${item.n}, expected n=${expected}`);
        counts.set(item.failure, Number(item.n));
      }
    }
  }
  if (problems.length) return { status: 'malformed', reason: problems.join('; ') };
  if (!builders) return { status: 'missing', reason: 'no builder dispatch or direct record' };
  if (!verify) return { status: 'missing', reason: 'no initial verify record' };
  if (!records.some(item => item.type === 'accept')) return { status: 'missing', reason: 'no accept record' };
  const vendor = !builder.vendor || ['unknown', 'n/a'].includes(builder.vendor) ? 'unknown' : builder.vendor.toLowerCase();
  const success = verify.result === 'pass' && !records.some(item => item.type === 'repair' || item.type === 'reopen');
  return { status: 'recorded', success,
    group: { tier: builder.type === 'direct' ? 'direct' : builder.tier, estimate: task.estimate || 'unknown', vendor } };
}

function report(project) {
  const root = fs.realpathSync(project);
  const read = relative => {
    const target = fs.realpathSync(path.resolve(root, relative));
    const inside = path.relative(root, target);
    if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside)) {
      throw new Error(`plan path leaves project: ${relative}`);
    }
    return visibleMarkdown(fs.readFileSync(target, 'utf8'));
  };
  const phases = [];
  const unlinked = [];
  const tasks = [];
  for (const line of read('ROADMAP.md').split('\n')) {
    const entry = line.match(closedPhase);
    if (!entry) continue;
    const href = line.match(link);
    if (!href) { unlinked.push(entry[1]); continue; }
    let target;
    try { target = decodeURIComponent(href[1].replace(/^<|>$/g, '')); }
    catch { throw new Error(`invalid encoded phase link: ${href[1]}`); }
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || path.isAbsolute(target) || /[?#\\]/.test(target)) {
      throw new Error(`expected a relative project file link: ${target}`);
    }
    const id = entry[1];
    phases.push(id);
    const lines = read(path.normalize(target)).split('\n');
    const phaseTasks = [];
    const errorsById = new Map();
    const owners = new Map();
    const claim = (dispatchId, owner) => {
      if (owners.has(dispatchId)) {
        for (const who of [owners.get(dispatchId), owner]) {
          if (who) errorsById.get(who).push(`dispatch ID ${dispatchId} is not unique in the phase`);
        }
      } else owners.set(dispatchId, owner);
    };
    for (let i = 0; i < lines.length; i++) {
      const review = /^ {0,3}##[ \t]+Review\b/.test(lines[i]);
      if (review) {
        let end = i + 1;
        while (end < lines.length && !/^ {0,3}#{1,2}[ \t]+/.test(lines[end])) end++;
        for (const item of parseRecords(lines.slice(i + 1, end).join('\n')).records) {
          if (item.type === 'dispatch') claim(item.id, null);
        }
        i = end - 1;
        continue;
      }
      if (!taskLike.test(lines[i])) continue;
      const match = lines[i].match(taskEntry);
      let end = i + 1;
      while (end < lines.length && !taskLike.test(lines[end]) && !heading.test(lines[end])) end++;
      const body = lines.slice(i + 1, end);
      i = end - 1;
      if (!match) continue;
      const field = name => body.map(l => l.match(new RegExp('^[ \t]*[-*]?[ \t]*' + name + ':[ \t]*(.*)$'))).find(Boolean)?.[1].trim();
      const name = `${id}-${match[2]}`;
      const parsed = parseRecords(field('Result') || '');
      errorsById.set(name, [...parsed.errors]);
      const task = { id: name, checked: match[1].toLowerCase() === 'x', estimate: field('Estimate'), records: parsed.records };
      for (const item of task.records) if (item.type === 'dispatch') claim(item.id, name);
      phaseTasks.push(task);
    }
    for (const task of phaseTasks) tasks.push({ ...task, ...(task.checked
      ? classify(task, errorsById.get(task.id))
      : { status: 'unchecked', reason: 'unchecked task in a closed phase' }) });
  }
  const groups = new Map();
  for (const task of tasks.filter(t => t.status === 'recorded')) {
    const key = [task.group.tier, task.group.estimate, task.group.vendor].join('\0');
    const group = groups.get(key) || { ...task.group, passed: 0, total: 0 };
    group.total++;
    if (task.success) group.passed++;
    groups.set(key, group);
  }
  const count = status => tasks.filter(t => t.status === status).length;
  return {
    phases, unlinked, tasks,
    groups: [...groups.values()].sort((a, b) => [a.tier, a.estimate, a.vendor].join() < [b.tier, b.estimate, b.vendor].join() ? -1 : 1),
    counts: { tasks: tasks.length, recorded: count('recorded'), missing: count('missing'), malformed: count('malformed'),
      unchecked: count('unchecked'), unknownVendor: tasks.filter(t => t.status === 'recorded' && t.group.vendor === 'unknown').length }
  };
}

function format(data) {
  const { phases, unlinked, groups, counts, tasks } = data;
  const out = ['First-try pass rates among recorded tasks in closed phases (read-only; preferences and the tier table are unchanged).'];
  out.push(phases.length ? `Closed phases: ${phases.join(', ')}. Open phases are not counted.` : 'No closed phases; nothing to report.');
  if (unlinked.length) out.push(`Closed phases without a plan link, not counted: ${unlinked.join(', ')}.`);
  out.push(`Tasks: ${counts.tasks}; recorded ${counts.recorded}, missing records ${counts.missing}, malformed ${counts.malformed}, unchecked ${counts.unchecked}; unknown builder vendor ${counts.unknownVendor} of ${counts.recorded} recorded.`);
  if (groups.length) {
    out.push('', 'Tier\tEstimate\tVendor\tFirst try\tRate');
    for (const g of groups) {
      const below = g.passed / g.total < 0.6 ? ' (below ~60%, advisory)' : '';
      out.push(`${g.tier}\t${g.estimate}\t${g.vendor}\t${g.passed}/${g.total}\t${Math.round(100 * g.passed / g.total)}%${below}`);
    }
  }
  const excluded = tasks.filter(t => t.status !== 'recorded');
  if (excluded.length) {
    out.push('', 'Not counted:');
    for (const t of excluded) out.push(`- ${t.id}: ${t.status} (${t.reason})`);
  }
  out.push('', 'Limits: closed phases leave out blocked or abandoned work; missing history never counts as a pass. These are observations of recorded tasks, not model reliability or vendor quality.');
  return out.join('\n') + '\n';
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith('--')) {
    process.stderr.write('Usage: node dispatch-report.cjs <project-root>\n');
    process.exitCode = 2;
  } else {
    try { process.stdout.write(format(report(args[0]))); }
    catch (error) {
      process.stderr.write(`FAIL ${error.code === 'ENOENT' ? `cannot read ${path.basename(error.path || '') || 'project'}` : error.message}\n`);
      process.exitCode = 1;
    }
  }
}

module.exports = { parseRecords, report, format };
