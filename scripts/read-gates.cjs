#!/usr/bin/env node
'use strict';

// Read-only parser for a project's optional .kaylo/gates reference. It never runs
// the named check, searches PATH, expands variables, or grants authorization.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const file = '.kaylo/gates';
const fields = ['Format', 'Directory', 'Full check'];
const maxBytes = 64 * 1024;
const control = /[\u0000-\u001f\u007f]/;
const bodies = {
  GATES_USAGE: 'Expected one project directory argument, optionally followed by --expect <digest>',
  GATES_PROJECT: 'Project directory is unavailable',
  GATES_READ: 'Cannot read .kaylo/gates as a regular UTF-8 file',
  GATES_RECORD: 'Expected Format, Directory or Full check record',
  GATES_DUPLICATE: 'Duplicate gate field: ',
  GATES_MISSING: 'Missing gate field: ',
  GATES_FORMAT: 'Unsupported gates format; expected 1',
  GATES_DIRECTORY: 'Expected a project-relative directory',
  GATES_ESCAPE: 'Gate reference leaves the project',
  GATES_DIRECTORY_UNAVAILABLE: 'Gate working directory is unavailable',
  GATES_COMMAND: 'Expected a nonblank single-line full-check command',
  GATES_CHANGED: 'Gate reference changed before use; inspect it again'
};

// Diagnostics carry a code, a fixed body and a location; never a command or other value.
const diagnostic = (code, line, detail = '') =>
  ({ code, location: line ? `${file}:${line}` : file, message: bodies[code] + detail });
const invalid = diagnostics => ({ state: 'invalid', diagnostics });
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
};

function directoryValid(value) {
  if (value === '.') return true;
  if (!value || value !== value.trim() || control.test(value) || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z][A-Za-z\d+.-]*:/.test(value)) return false;
  return value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

function parse(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { diagnostics: [diagnostic('GATES_RECORD', 1)] };
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return { diagnostics: [diagnostic('GATES_READ')] }; }
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const values = {};
  const lineOf = {};
  const diagnostics = [];
  lines.forEach((raw, index) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const number = index + 1;
    if (/^[ \t]*$/.test(line)) return;
    const match = line.match(/^(Format|Directory|Full check):(?: ([\s\S]*))?$/);
    if (!match || /^[ \t]+\S/.test(match[2] || '')) return diagnostics.push(diagnostic('GATES_RECORD', number));
    const [, name, value = ''] = match;
    if (name in values) return diagnostics.push(diagnostic('GATES_DUPLICATE', number, name));
    values[name] = value;
    lineOf[name] = number;
    if (name === 'Format' && value !== '1') diagnostics.push(diagnostic('GATES_FORMAT', number));
    if (name === 'Directory' && !directoryValid(value)) diagnostics.push(diagnostic('GATES_DIRECTORY', number));
    if (name === 'Full check' && (!value.trim() || control.test(value))) {
      diagnostics.push(diagnostic('GATES_COMMAND', number));
    }
  });
  for (const name of fields) if (!(name in values)) diagnostics.push(diagnostic('GATES_MISSING', 0, name));
  return { values, lineOf, diagnostics };
}

// Absence means no .kaylo/gates entry at all. A dangling, unreadable or unsuitable
// entry, or a .kaylo that is not a directory, is a present reference that failed.
function locate(root, io) {
  const gates = path.join(root, '.kaylo', 'gates');
  try {
    io.lstatSync(gates);
    return gates;
  } catch (error) {
    if (error.code !== 'ENOENT') return null;
  }
  try { io.lstatSync(path.join(root, '.kaylo')); }
  catch (error) { return error.code === 'ENOENT' ? 'missing' : null; }
  try { return io.statSync(path.join(root, '.kaylo')).isDirectory() ? 'missing' : null; }
  catch { return null; }
}

function readGates(projectRoot, io = fs) {
  let root;
  try {
    root = io.realpathSync(path.resolve(projectRoot));
    if (!io.statSync(root).isDirectory()) throw new Error('not a directory');
  } catch {
    return invalid([{ code: 'GATES_PROJECT', location: '', message: bodies.GATES_PROJECT }]);
  }
  const gates = locate(root, io);
  if (gates === 'missing') return { state: 'missing' };
  if (gates === null) return invalid([diagnostic('GATES_READ')]);
  let real;
  try { real = io.realpathSync(gates); }
  catch { return invalid([diagnostic('GATES_READ')]); }
  if (!inside(root, real)) return invalid([diagnostic('GATES_ESCAPE')]);
  let bytes;
  let fd;
  try {
    fd = io.openSync(real, 'r');
    const stat = io.fstatSync(fd);
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('unsuitable');
    bytes = io.readFileSync(fd);
  } catch {
    return invalid([diagnostic('GATES_READ')]);
  } finally {
    if (fd !== undefined) io.closeSync(fd);
  }
  const parsed = parse(bytes);
  if (parsed.diagnostics.length) return invalid(parsed.diagnostics);
  const { values, lineOf } = parsed;
  const line = lineOf.Directory;
  let resolved;
  let identity;
  try {
    resolved = io.realpathSync(path.join(root, ...values.Directory.split('/')));
  } catch {
    return invalid([diagnostic('GATES_DIRECTORY_UNAVAILABLE', line)]);
  }
  if (!inside(root, resolved)) return invalid([diagnostic('GATES_ESCAPE', line)]);
  try {
    identity = io.statSync(resolved);
    if (!identity.isDirectory()) throw new Error('not a directory');
    io.accessSync(resolved, fs.constants.R_OK | fs.constants.X_OK);
  } catch {
    return invalid([diagnostic('GATES_DIRECTORY_UNAVAILABLE', line)]);
  }
  // The digest names these exact bytes and this directory identity, so a consumer can
  // detect a change between reading the reference and running its check.
  const digest = 'sha256:' + createHash('sha256').update(bytes).update('\0')
    .update(`${resolved}\0${identity.dev}\0${identity.ino}`).digest('hex');
  return {
    state: 'present',
    format: 1,
    directory: values.Directory,
    resolvedDirectory: resolved,
    fullCheck: values['Full check'],
    digest
  };
}

function main(args, io = fs, out = process.stdout, err = process.stderr) {
  const expect = args.length === 3 && args[1] === '--expect' ? args[2] : null;
  if (!(args.length === 1 || expect) || !args[0] || args[0].startsWith('--') ||
    (expect !== null && !/^sha256:[0-9a-f]{64}$/.test(expect))) {
    err.write(`GATES_USAGE: ${bodies.GATES_USAGE}\n`);
    return 2;
  }
  const result = readGates(args[0], io);
  if (result.state === 'invalid') {
    for (const { code, location, message } of result.diagnostics) {
      err.write(`${code}: ${location ? location + ': ' : ''}${message}\n`);
    }
    return 1;
  }
  if (expect !== null && result.digest !== expect) {
    err.write(`GATES_CHANGED: ${file}: ${bodies.GATES_CHANGED}\n`);
    return 1;
  }
  out.write(JSON.stringify(result) + '\n');
  return 0;
}

module.exports = { readGates, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
