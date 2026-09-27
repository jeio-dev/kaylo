#!/usr/bin/env node
'use strict';

// Read-only structural checks. No Markdown execution or evidence adjudication.
const fs = require('node:fs');
const path = require('node:path');

function visibleMarkdown(text) {
  let fence = null;
  let comment = false;
  return text.split(/\r?\n/).map(line => {
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) fence = null;
      return '';
    }
    // Recognize raw openings before scanning comments: their info strings are
    // fence content too. An opening inside an existing comment stays ignored.
    const opening = !comment && line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) {
      fence = opening[1];
      return '';
    }
    let visible = '';
    let rest = line;
    while (rest.length) {
      const delimiter = comment ? '-->' : '<!--';
      const offset = rest.indexOf(delimiter);
      if (offset < 0) { if (!comment) visible += rest; break; }
      if (!comment) visible += rest.slice(0, offset);
      rest = rest.slice(offset + delimiter.length);
      comment = !comment;
    }
    return visible;
  }).join('\n');
}

// Candidate recognition also bounds fields, so malformed entries cannot lend
// their records to the preceding task. Unsupported records produce diagnostics.
const taskLike = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[^\]]*\][ \t]*|\[[ \txX?]*)?T\d+\b/;
const taskEntry = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(T\d+):[ \t]*(.*)$/;
const currentLike = /^[ \t]*Current\b/;
const phaseLike = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[|\d)/;
const phaseEntry = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+\[?(\d{2})\b/;
const heading = /^ {0,3}#{1,6}[ \t]+/;

function meaningful(value) {
  return Boolean(value && value.trim() && !/^\[[^]*\]$/.test(value.trim()) &&
    !/^(?:not started|in progress|none|pending|todo|tbd|n\/a)[.!]?$/i.test(value.trim()));
}

function validate(project, { closing = false } = {}) {
  const errors = [];
  const fail = message => errors.push(message);
  let root;
  try { root = fs.realpathSync(project); }
  catch { return ['Project directory is unavailable']; }

  function read(relative) {
    try {
      const target = fs.realpathSync(path.resolve(root, relative));
      const inside = path.relative(root, target);
      if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside)) {
        fail(`Plan path leaves project: ${relative}`);
        return null;
      }
      const stat = fs.statSync(target);
      return { text: visibleMarkdown(fs.readFileSync(target, 'utf8')),
        identity: stat.ino ? `${stat.dev}:${stat.ino}` : target };
    } catch { fail(`Cannot read plan: ${relative}`); return null; }
  }

  function linkTarget(line) {
    const match = line.match(/\[[^\]]+\]\(([^)]+)\)/);
    if (!match) { fail('Expected a Markdown phase link: ' + line.trim()); return null; }
    let target;
    try { target = decodeURIComponent(match[1].replace(/^<|>$/g, '')); }
    catch { fail('Invalid encoded phase link'); return null; }
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || path.isAbsolute(target) || /[?#\\]/.test(target)) {
      fail(`Expected a relative project file link: ${target}`);
      return null;
    }
    return path.normalize(target);
  }

  const indexFile = read('PLAN.md');
  if (indexFile === null) return errors;
  const index = indexFile.text;
  const currentLines = index.split('\n').filter(line => currentLike.test(line));
  const hasTasks = index.split('\n').some(line => taskLike.test(line));
  let phase = index;
  let closed = false;
  if (currentLines.length) {
    if (currentLines.length !== 1) fail('Expected exactly one Current link');
    if (hasTasks) fail('Index mixes a Current link with inline tasks');
    if (!/^[ \t]*Current:[ \t]*\[/.test(currentLines[0])) fail('Unsupported Current record; expected Current: [label](relative-file)');
    const current = linkTarget(currentLines[0]);
    const phases = index.split('\n').filter(line => phaseLike.test(line));
    const ids = new Set();
    const targets = new Set();
    let matches = 0;
    let currentText = null;
    for (const line of phases) {
      const entry = line.match(phaseEntry);
      if (!entry) { fail('Unsupported phase entry; expected a checkbox and two-digit ID: ' + line); continue; }
      const id = entry[2];
      if (ids.has(id)) fail(`Duplicate phase ID: ${id}`);
      ids.add(id);
      const checked = entry[1].toLowerCase() === 'x';
      if (!/\]\(/.test(line)) {
        if (checked) fail(`Closed phase ${id} has no plan link`);
        continue;
      }
      const target = linkTarget(line);
      if (target === null) continue;
      const content = read(target);
      if (content !== null) {
        if (targets.has(content.identity)) fail(`Duplicate phase link (same file): ${target}`);
        targets.add(content.identity);
      }
      if (target === current) {
        matches++;
        closed = checked;
        currentText = content?.text ?? null;
      }
    }
    if (matches !== 1) fail('Current must match exactly one phase checklist link');
    if (currentText === null) return errors;
    phase = currentText;
  } else if (!hasTasks) {
    fail('No Current link or legacy inline tasks found');
    return errors;
  }

  const tasks = [];
  const lines = phase.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!taskLike.test(lines[i])) continue;
    const match = lines[i].match(taskEntry);
    if (!match) { fail(`Unsupported task entry at line ${i + 1}; expected - [ ] T1: title`); continue; }
    let end = i + 1;
    while (end < lines.length && !taskLike.test(lines[end]) && !heading.test(lines[end])) end++;
    const body = lines.slice(i + 1, end).join('\n');
    const field = name => {
      const matches = [...body.matchAll(new RegExp('^[ \t]*[-*]?[ \t]*' + name + ':[ \t]*(.*)$', 'gm'))];
      if (matches.length > 1) fail(`${match[2]}: duplicate ${name} field`);
      return matches[0]?.[1]?.trim();
    };
    tasks.push({ id: match[2], checked: match[1].toLowerCase() === 'x', title: match[3],
      acceptance: field('Acceptance'), verify: field('Verify'), result: field('Result'), depends: field('Depends on') });
    i = end - 1;
  }
  if (!tasks.length) fail('Current phase has no recognizable task entries');
  const seen = new Map();
  for (const task of tasks) {
    if (seen.has(task.id)) fail(`Duplicate task ID: ${task.id}`);
    if (task.depends !== undefined && task.depends !== 'None') {
      const deps = task.depends.split(',').map(id => id.trim());
      if (!deps.length || deps.some(id => !/^T\d+$/.test(id)) || new Set(deps).size !== deps.length) {
        fail(`${task.id}: Depends on must be None or comma-separated task IDs`);
      } else for (const dep of deps) {
        if (!seen.has(dep)) fail(`${task.id}: dependency ${dep} must name an earlier task in this phase`);
      }
    }
    // Missing Depends on is the documented legacy fallback, not a new error.
    for (const [name, value] of [['title', task.title], ['Acceptance', task.acceptance], ['Verify', task.verify]]) {
      if (!meaningful(value)) fail(`${task.id}: task needs a substantive ${name} record`);
    }
    if (!task.result) fail(`${task.id}: task needs a Result record`);
    if (task.checked) {
      if (!meaningful(task.result)) fail(`${task.id}: completed task needs a substantive Result record`);
    }
    seen.set(task.id, task);
  }
  const sections = new Map([['Review', []], ['Completion', []]]);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^ {0,3}##[ \t]+(Review|Completion)(?:[ \t]+#+)?[ \t]*$/);
    if (!match) continue;
    let end = i + 1;
    while (end < lines.length && !/^ {0,3}#{1,2}[ \t]+/.test(lines[end])) end++;
    sections.get(match[1]).push(lines.slice(i + 1, end).join('\n').trim());
  }
  for (const [name, records] of sections) {
    if (records.length > 1) fail(`Duplicate ${name} sections; consolidate history under one heading`);
  }
  const review = sections.get('Review').join('\n');
  const findings = new Set();
  for (const match of review.matchAll(/^[ \t]*[-*][ \t]+(R\d+):/gm)) {
    if (findings.has(match[1])) fail(`Duplicate finding ID: ${match[1]}`);
    findings.add(match[1]);
  }
  if (closing || closed) {
    for (const task of tasks) if (!task.checked) fail(`${task.id}: phase closure requires completed tasks`);
    if (/^[ \t]*Status:[ \t]*Needs revision\b/m.test(phase)) fail('Phase needing revision cannot close');
    if (!review || /^\[[^]*\]$/.test(review)) fail('Phase closure needs a Review record (None is allowed)');
    if (!meaningful(sections.get('Completion')[0])) fail('Phase closure needs a substantive Completion record');
  }
  return errors;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const positional = args.filter(arg => !arg.startsWith('--'));
  if (positional.length !== 1 || args.some(arg => arg.startsWith('--') && arg !== '--closing') || args.filter(arg => arg === '--closing').length > 1) {
    process.stderr.write('Usage: node validate-plan.cjs <project-root> [--closing]\n');
    process.exitCode = 2;
  } else {
    const errors = validate(positional[0], { closing: args.includes('--closing') });
    for (const error of errors) process.stderr.write(`FAIL ${error}\n`);
    if (!errors.length) process.stdout.write('PASS plan structure; evidence truth and authorization were not checked\n');
    process.exitCode = errors.length ? 1 : 0;
  }
}

module.exports = { validate };
