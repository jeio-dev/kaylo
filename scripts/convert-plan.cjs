'use strict';

// Versioned bounded transforms. Never run project commands; edit record tokens only.
const { phaseLayout, pairs, fail } = require('./inspect-plan.cjs');
const pending = 'Needs revision: awaiting user confirmation of the converted plan';
const transformVersion = '1';
function convertPhase(text, { pendingConfirmation = true } = {}) {
  const doc = phaseLayout(text);
  if (!doc.tasks.length || !['Goal and scope', 'Agreement', 'Tasks', 'Review', 'Completion'].every(s => doc.sections.has(s))) fail('MIGRATION_SUBSET');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  // Preserve the original physical lines, including BOM, spaces and final newline.
  const raw = text.split('\n');
  const replace = (index, from, to) => {
    if (raw[index].replace(/\r$/, '').replace(/^\uFEFF/, '') !== doc.lines[index]) fail('MIGRATION_COMMENTED_TARGET');
    raw[index] = raw[index].replace(from, to);
  };
  if (doc.sections.has('Approach')) replace(doc.sections.get('Approach').start, /Approach/, 'Design');
  const earlier = [];
  const inserts = new Map();
  for (const task of doc.tasks) {
    // A missing field in a known legacy variant is not permission to invent it.
    for (const [old, next] of pairs) {
      const field = task.fields.get(old);
      if (field) replace(field.line, new RegExp(old + ':'), next + ':');
    }
    if (!task.fields.has('Depends on') && !task.fields.has('Blocked by')) {
      const entry = raw[task.start].replace(/\r$/, '');
      const indent = entry.match(/^[ \t]*/)[0] + '  - ';
      inserts.set(task.start, indent + 'Blocked by: ' + (earlier.join(', ') || 'None') + (eol === '\r\n' ? '\r' : ''));
    }
    earlier.push(task.id);
  }
  const review = doc.sections.get('Review');
  for (let i = review.start + 1; i < review.end; i++) {
    if (/^[ \t]*[-*][ \t]+R\d+:[ \t]*(?:blocker|optional)[ \t]*(?:—|–| - )/.test(doc.lines[i])) {
      replace(i, /^(\s*[-*]\s+R\d+:\s*)(blocker|optional)(?=\s*(?:—|–| - ))/,
        (_, prefix, label) => prefix + (label === 'blocker' ? 'blocking' : 'non-blocking'));
    }
  }
  if (pendingConfirmation) {
    const statuses = doc.lines.map((line, i) => /^Status:/.test(line) ? i : -1).filter(i => i >= 0);
    if (statuses.length > 1) fail('MIGRATION_STATUS_CONFLICT');
    if (statuses.length) replace(statuses[0], /^Status:.*?(\r?)$/, 'Status: ' + pending + '$1');
    else {
      const heading = doc.lines.findIndex(line => /^# /.test(line));
      if (heading < 0) fail('MIGRATION_SUBSET');
      inserts.set(heading, 'Status: ' + pending + (eol === '\r\n' ? '\r' : ''));
    }
  }
  return raw.flatMap((line, i) => inserts.has(i) ? [line, inserts.get(i)] : [line]).join('\n');
}
function renameHeading(text, old, next) {
  const { visibleMarkdown } = require('./plan-markdown.cjs');
  const visible = visibleMarkdown(text.replace(/^\uFEFF/, '')).split('\n');
  const raw = text.split('\n');
  const matches = visible.map((line, i) => line === '# ' + old ? i : -1).filter(i => i >= 0);
  if (matches.length !== 1) fail('MIGRATION_SUBSET');
  const index = matches[0];
  if (raw[index].replace(/\r$/, '').replace(/^\uFEFF/, '') !== visible[index]) fail('MIGRATION_COMMENTED_TARGET');
  raw[index] = raw[index].replace('# ' + old, '# ' + next);
  return raw.join('\n');
}
function annotate(text) {
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const value = text.slice(bom.length);
  return bom + (/^Kaylo format: [012](?:\r?\n|$)/.test(value)
    ? value.replace(/^Kaylo format: [012]/, 'Kaylo format: 2') : 'Kaylo format: 2' + eol + value);
}
module.exports = { convertPhase, annotate, renameHeading, pending, transformVersion };
