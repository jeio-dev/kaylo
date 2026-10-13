#!/usr/bin/env node
'use strict';

// Read-only format recognition. No agreement, authorization or evidence checks.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { visibleMarkdown } = require('./plan-markdown.cjs');
const supported = '0 (recognized legacy), 1, 2';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
class PlanError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new PlanError(code); };
// Deliberately never interpolate plan values, paths or OS exception messages.
function diagnostic(error) {
  const code = error instanceof PlanError ? error.code : 'PLAN_IO';
  return `${code}; reader supports ${supported}. Resolve the input using the migration reference, or update to a compatible Kaylo reader and start a new session; no protected writes.`;
}
function relativePath(relative) {
  if (typeof relative !== 'string' || !relative || /[\x00-\x1f\x7f\\?#]/.test(relative) ||
      path.isAbsolute(relative) || /^[a-z][a-z\d+.-]*:/i.test(relative) ||
      relative.split('/').some(part => part === '..' || part === '.' || part === '')) fail('PLAN_PATH');
  if (relative.split('/')[0] === '.kaylo-migration-recovery') fail('PLAN_PATH');
  return relative;
}
function link(line) {
  const m = line.match(/\[[^\]]+\]\(([^)]+)\)/);
  if (!m) fail('PLAN_LINK');
  let value;
  try { value = decodeURIComponent(m[1].replace(/^<|>$/g, '')); } catch { fail('PLAN_LINK'); }
  return relativePath(value);
}
function snapshot(root, relative, io = fs) {
  relativePath(relative);
  const parts = relative.split('/');
  const parents = [];
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try { stat = io.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { relative, exists: false, parents };
    }
    if (stat.isSymbolicLink()) fail('PLAN_ALIAS');
    if (i < parts.length - 1) {
      if (!stat.isDirectory()) fail('PLAN_PATH');
      parents.push({ relative: parts.slice(0, i + 1).join('/'), dev: stat.dev, ino: stat.ino });
    } else {
      if (!stat.isFile() || stat.nlink !== 1) fail('PLAN_ALIAS');
      const bytes = io.readFileSync(current);
      return { relative, exists: true, parents, dev: stat.dev, ino: stat.ino,
        mode: stat.mode & 0o777, digest: hash(bytes), bytes };
    }
  }
}
function utf8(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail('PLAN_ENCODING'); }
}
function marker(text) {
  const raw = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const visible = visibleMarkdown(text.replace(/^\uFEFF/, '')).split('\n');
  const found = [];
  for (let i = 0; i < visible.length; i++) {
    if (/^[ \t]*(?:[-*+][ \t]+|#{1,6}[ \t]+)?Kaylo[ \t]+format\b/i.test(visible[i])) found.push(i);
  }
  if (!found.length) return null;
  if (found.length > 1) fail('FORMAT_DUPLICATE');
  if (found[0] !== 0) fail('FORMAT_MISPLACED');
  const match = /^Kaylo format: (0|[1-9]\d*)$/.exec(raw[0]);
  if (!match || raw[0] !== visible[0]) fail('FORMAT_MALFORMED');
  // Compare strings: large canonical integers must not round to a supported value.
  if (!['0', '1', '2'].includes(match[1])) fail('FORMAT_UNSUPPORTED');
  return Number(match[1]);
}
const taskEntry = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(T\d+):[ \t]*(.*)$/;
const taskLike = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[[^\]]*\][ \t]*|\[[ \txX?]*)?T\d+\b/;
const pairs = [['Complexity', 'Estimate'], ['Depends on', 'Blocked by'],
  ['Acceptance', 'Acceptance criteria'], ['Verify', 'Test plan']];
function phaseLayout(text) {
  const lines = visibleMarkdown(text.replace(/^\uFEFF/, '')).split('\n');
  const tasks = [];
  const sections = new Map();
  for (let i = 0; i < lines.length; i++) {
    const section = lines[i].match(/^ {0,3}##[ \t]+([^#]+?)[ \t]*(?:#+[ \t]*)?$/);
    if (section) {
      if (sections.has(section[1])) fail('PLAN_DUPLICATE_SECTION');
      let end = i + 1;
      while (end < lines.length && !/^ {0,3}#{1,2}[ \t]+/.test(lines[end])) end++;
      sections.set(section[1], { start: i, end });
    }
    if (!taskLike.test(lines[i])) continue;
    const m = lines[i].match(taskEntry);
    if (!m) fail('PLAN_TASK_SUBSET');
    let end = i + 1;
    while (end < lines.length && !taskLike.test(lines[end]) && !/^ {0,3}#{1,6}[ \t]+/.test(lines[end])) end++;
    const fields = new Map();
    for (let j = i + 1; j < end; j++) {
      const f = lines[j].match(/^[ \t]*[-*]?[ \t]*([^:]+):[ \t]*(.*)$/);
      if (!f) continue;
      if (fields.has(f[1])) fail('PLAN_DUPLICATE_FIELD');
      fields.set(f[1], { line: j, value: f[2] });
    }
    for (const [old, next] of pairs) {
      if (fields.has(old) && fields.has(next)) fail('PLAN_FIELD_CONFLICT');
      if (fields.has(old) && fields.has('Result') && fields.get(old).line > fields.get('Result').line) fail('PLAN_FIELD_LOCATION');
    }
    if (tasks.some(task => task.id === m[2])) fail('PLAN_DUPLICATE_TASK');
    tasks.push({ id: m[2], checked: m[1].toLowerCase() === 'x', start: i, end, fields });
    i = end - 1;
  }
  if (sections.has('Approach') && sections.has('Design')) fail('PLAN_FIELD_CONFLICT');
  const review = sections.get('Review');
  const oldReview = review && lines.slice(review.start + 1, review.end).some(line =>
    /^[ \t]*[-*][ \t]+R\d+:[ \t]*(?:blocker|optional)[ \t]*(?:—|–| - )/.test(line));
  const legacy = sections.has('Approach') || oldReview || tasks.some(task => pairs.some(([old]) => task.fields.has(old)));
  return { lines, tasks, sections, legacy };
}
function history(text) {
  try {
    // Phase markers have not been introduced. A roadmap marker here is not phase identity.
    if (marker(text) !== null) return { kind: 'unknown', reason: 'HISTORY_IDENTITY' };
    const doc = phaseLayout(text);
    if (!doc.tasks.length) {
      return { kind: 'unknown', reason: 'HISTORY_SUBSET' };
    }
    if (doc.legacy) {
      const recognizable = ['Goal and scope', 'Agreement', 'Tasks', 'Review', 'Completion', 'Approach'].every(s => doc.sections.has(s)) && doc.tasks.every(t =>
        ['Complexity', 'Acceptance', 'Verify', 'Result'].every(f => t.fields.has(f)));
      return recognizable ? { kind: 'legacy', variant: 'phased-v0.3-v0.4' } : { kind: 'unknown', reason: 'HISTORY_MIXED' };
    }
    return { kind: 'current' };
  } catch { return { kind: 'unknown', reason: 'HISTORY_SUBSET' }; }
}
function inspect(project, { io = fs } = {}) {
  const root = io.realpathSync(project);
  if (!io.statSync(root).isDirectory()) fail('PLAN_ROOT');
  try { io.lstatSync(path.join(root, '.kaylo-migration-recovery')); fail('MIGRATION_RECOVERY_REQUIRED'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const files = new Map();
  const read = relative => {
    if (!files.has(relative)) files.set(relative, snapshot(root, relative, io));
    const file = files.get(relative);
    return file.exists ? utf8(file.bytes) : null;
  };
  const roadmap = read('ROADMAP.md');
  const oldIndex = read('PLAN.md');
  const objective = read('OBJECTIVE.md');
  const prd = read('PRD.md');
  if (objective !== null && prd !== null) fail('PLAN_SOURCE_CONFLICT');
  if (objective !== null && !/^# Objective\r?$/m.test(visibleMarkdown(objective.replace(/^\uFEFF/, '')))) fail('PLAN_LEGACY_UNKNOWN');
  const recognizedIndex = value => value !== null && (/^[ \t]*Current:[ \t]*\[/m.test(visibleMarkdown(value)) ||
    /^# (?:Plan|Roadmap|\d{2}\b.*)\r?$/m.test(visibleMarkdown(value)) && phaseLayout(value).tasks.length > 0);
  if (roadmap !== null && recognizedIndex(oldIndex)) fail('PLAN_SOURCE_CONFLICT');
  const source = roadmap !== null ? 'ROADMAP.md' : oldIndex !== null ? 'PLAN.md' : null;
  if (source === 'PLAN.md' && !recognizedIndex(oldIndex)) fail('PLAN_LEGACY_UNKNOWN');
  if (!source) return { root, files, kind: objective !== null ? 'legacy' : 'creation', format: objective !== null ? 0 : null,
    variant: objective !== null ? 'objective-only' : null, histories: [], current: null };
  const text = roadmap ?? oldIndex;
  const explicit = marker(text);
  const visible = visibleMarkdown(text.replace(/^\uFEFF/, ''));
  const inline = phaseLayout(text).tasks.length > 0;
  const currentLines = visible.split('\n').filter(line => /^[ \t]*Current\b/.test(line));
  const entries = [];
  let current = null;
  let active = null;
  const histories = [];
  if (inline) {
    if (currentLines.length || !/^# (?:Plan|Roadmap|\d{2}\b.*)$/m.test(visible)) fail('PLAN_INLINE_AMBIGUOUS');
    const doc = phaseLayout(text);
    if (!['Goal and scope', 'Agreement', 'Tasks', 'Review', 'Completion'].every(s => doc.sections.has(s)) || !doc.legacy) fail('PLAN_LEGACY_UNKNOWN');
    active = { relative: source, text, doc };
  } else {
    if (currentLines.length !== 1 || !/^[ \t]*Current:[ \t]*\[/.test(currentLines[0])) fail('PLAN_CURRENT');
    const target = link(currentLines[0]);
    const identities = new Set();
    const ids = new Set();
    for (const line of visible.split('\n')) {
      if (!/^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[|\d)/.test(line)) continue;
      const m = line.match(/^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+\[?(\d{2})\b/);
      if (!m) fail('PLAN_INDEX_SUBSET');
      if (ids.has(m[2])) fail('PLAN_DUPLICATE_PHASE');
      ids.add(m[2]);
      const entry = { id: m[2], closed: m[1].toLowerCase() === 'x', line };
      if (/\]\(/.test(line)) {
        entry.relative = link(line);
        if (['ROADMAP.md', 'PLAN.md', 'PRD.md', 'OBJECTIVE.md'].includes(entry.relative)) fail('PLAN_SOURCE_CONFLICT');
        entry.text = read(entry.relative);
        if (entry.text === null) fail('PLAN_LINK_MISSING');
        const f = files.get(entry.relative);
        const identity = `${f.dev}:${f.ino}`;
        if (identities.has(identity)) fail('PLAN_ALIAS');
        identities.add(identity);
        if (entry.closed) histories.push({ relative: entry.relative, id: entry.id, ...history(entry.text) });
        else {
          // All linked open records govern future writes, not just Current.
          const doc = phaseLayout(entry.text);
          entry.doc = doc;
          if (marker(entry.text) !== null) fail('PLAN_PHASE_IDENTITY');
          if (entry.relative === target) active = { relative: entry.relative, text: entry.text, doc };
          else if (doc.legacy) fail('PLAN_OPEN_LEGACY');
        }
      } else if (entry.closed) fail('PLAN_LINK_MISSING');
      if (entry.relative === target) {
        if (current) fail('PLAN_CURRENT');
        current = entry;
      }
      entries.push(entry);
    }
    if (!current) fail('PLAN_CURRENT');
  }
  const legacy = source === 'PLAN.md' || objective !== null || inline || active?.doc.legacy;
  if (explicit !== null && explicit > 0 && legacy) fail('FORMAT_CONTENT_CONFLICT');
  if (explicit === 0 && !legacy) fail('FORMAT_CONTENT_CONFLICT');
  return { root, files, source, text, explicit, format: legacy ? 0 : (explicit ?? 1), kind: legacy ? 'legacy' : 'current',
    variant: inline ? 'inline-v0.1' : legacy ? 'phased-v0.3-v0.4' : null, inline, active, current, entries, histories };
}
function main(args) {
  if (args.length !== 1 || args[0].startsWith('--')) {
    process.stderr.write('Usage: node inspect-plan.cjs <project-root>\n'); return 2;
  }
  try {
    const result = inspect(args[0]);
    process.stdout.write(JSON.stringify({ kind: result.kind, format: result.format, variant: result.variant,
      supported, history: result.histories.map(h => ({ phase: h.id, kind: h.kind, reason: h.reason })) }) + '\n');
    return 0;
  } catch (error) { process.stderr.write(diagnostic(error) + '\n'); return 1; }
}
module.exports = { inspect, marker, phaseLayout, history, relativePath, snapshot, utf8, hash, pairs, PlanError, fail, diagnostic, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
