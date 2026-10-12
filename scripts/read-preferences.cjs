#!/usr/bin/env node
'use strict';

// Read-only parser for a project's optional .kaylo/preferences.md. It reports which
// recorded values are usable; it never decides whether an action is authorized.
const fs = require('node:fs');
const path = require('node:path');

const file = '.kaylo/preferences.md';
const maxBytes = 64 * 1024;
const control = /[\u0000-\u001f\u007f]/;
const oneOf = (...values) => value => values.includes(value) ? value : undefined;
const scope = /^[a-z0-9][a-z0-9._-]*$/;
// Each recognized key maps a trimmed value to its usable form, or undefined when invalid.
const keys = {
  'Format': oneOf('1'),
  'Worker models': oneOf('Inherit', 'Quality', 'Balanced', 'Budget'),
  'Review vendor': oneOf('same', 'different'),
  'Metered': value => /^allowed \([^()]+\)$/.test(value) && value.slice(9, -1).trim() === value.slice(9, -1)
    ? value : undefined,
  'Git autonomy': oneOf('ask', 'commit', 'push', 'pr'),
  'Branch': oneOf('none', 'phase', 'task'),
  'Commit': oneOf('none', 'task', 'phase'),
  'Commit style': oneOf('conventional'),
  'Commit scopes': value => {
    const list = value.split(/[ \t]*,[ \t]*/);
    return list.every(name => scope.test(name)) && new Set(list).size === list.length ? list : undefined;
  },
  'Merge': oneOf('squash', 'rebase', 'merge')
};
const bodies = {
  PREFS_USAGE: 'Expected exactly one project directory argument',
  PREFS_PROJECT: 'Project directory is unavailable',
  PREFS_READ: 'Cannot read .kaylo/preferences.md as a regular UTF-8 file',
  PREFS_FORMAT: 'Expected exactly one Format: 1 record; no preference is usable',
  PREFS_DUPLICATE: 'Duplicate preference; neither value is usable: ',
  PREFS_VALUE: 'Unsupported value; this preference is unusable: ',
  PREFS_UNKNOWN: 'Unrecognized preference key; it grants nothing: '
};

// Diagnostics name the key and line, never a value.
const diagnostic = (code, line, key) => ({ code, location: line ? `${file}:${line}` : file,
  message: bodies[code] + (key || ''), ...(key ? { key } : {}) });
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
};

function parse(text) {
  const lines = text.split('\n');
  const seen = {};
  const raw = {};
  const diagnostics = [];
  const notes = [];
  lines.forEach((line, index) => {
    // A record starts at column 0 with a key ending in a letter, then a colon. Other lines,
    // such as headings, bullets, fences, or an indented record, grant nothing.
    const record = (line.endsWith('\r') ? line.slice(0, -1) : line).match(/^([A-Za-z](?:[A-Za-z -]*[A-Za-z])?):(.*)$/);
    if (!record) return;
    const [, key, value] = record;
    const number = index + 1;
    if (!(key in keys)) return notes.push(diagnostic('PREFS_UNKNOWN', number, key));
    (seen[key] = seen[key] || []).push(number);
    raw[key] = value.trim();
  });
  const formatLines = seen.Format || [];
  if (formatLines.length !== 1 || keys.Format(raw.Format) === undefined) {
    return { state: 'invalid', diagnostics: [diagnostic('PREFS_FORMAT', formatLines[0] || 0)], notes };
  }
  const values = {};
  for (const [key, numbers] of Object.entries(seen)) {
    if (key === 'Format') continue;
    if (numbers.length > 1) {
      diagnostics.push(diagnostic('PREFS_DUPLICATE', numbers[1], key));
      continue;
    }
    const usable = control.test(raw[key]) ? undefined : keys[key](raw[key]);
    if (usable === undefined) diagnostics.push(diagnostic('PREFS_VALUE', numbers[0], key));
    else values[key] = usable;
  }
  return { state: 'present', format: 1, values, diagnostics, notes };
}

function readPreferences(projectRoot, io = fs) {
  let root;
  try {
    root = io.realpathSync(path.resolve(projectRoot));
    if (!io.statSync(root).isDirectory()) throw new Error('not a directory');
  } catch {
    return { state: 'invalid', diagnostics: [{ code: 'PREFS_PROJECT', location: '', message: bodies.PREFS_PROJECT }], notes: [] };
  }
  const unreadable = { state: 'invalid', diagnostics: [diagnostic('PREFS_READ')], notes: [] };
  const target = path.join(root, '.kaylo', 'preferences.md');
  try { io.lstatSync(target); }
  catch (error) {
    if (error.code !== 'ENOENT') return unreadable;
    // A .kaylo that is a file or dangling link is a broken location, not absence.
    try { io.lstatSync(path.join(root, '.kaylo')); }
    catch (inner) { return inner.code === 'ENOENT' ? { state: 'missing' } : unreadable; }
    try { return io.statSync(path.join(root, '.kaylo')).isDirectory() ? { state: 'missing' } : unreadable; }
    catch { return unreadable; }
  }
  // Refuse special files before opening, as the gates reader does, so a FIFO cannot block.
  let bytes;
  let fd;
  try {
    const real = io.realpathSync(target);
    if (!inside(root, real)) return unreadable;
    const before = io.statSync(real);
    if (!before.isFile() || before.size > maxBytes) throw new Error('unsuitable');
    fd = io.openSync(real, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    const stat = io.fstatSync(fd);
    if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino || stat.size > maxBytes) {
      throw new Error('unsuitable');
    }
    bytes = io.readFileSync(fd);
  } catch {
    return unreadable;
  } finally {
    if (fd !== undefined) io.closeSync(fd);
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch { return unreadable; }
  return parse(text);
}

function main(args, io = fs, out = process.stdout, err = process.stderr) {
  if (args.length !== 1 || !args[0] || args[0].startsWith('--')) {
    err.write(`PREFS_USAGE: ${bodies.PREFS_USAGE}\n`);
    return 2;
  }
  const result = readPreferences(args[0], io);
  for (const { code, location, message } of [...(result.diagnostics || []), ...(result.notes || [])]) {
    err.write(`${code}: ${location ? location + ': ' : ''}${message}\n`);
  }
  out.write(JSON.stringify(result) + '\n');
  return result.state === 'invalid' || (result.diagnostics || []).length ? 1 : 0;
}

module.exports = { readPreferences, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
