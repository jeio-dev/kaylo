#!/usr/bin/env node
'use strict';

// Read-only check of one new commit message against a project's adopted conventional
// policy in .kaylo/preferences.md. It never commits, amends, or reads Git history.
const fs = require('node:fs');
const { readPreferences } = require('./read-preferences.cjs');

const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const maxHeader = 100;
const maxBytes = 64 * 1024;
const id = /^\d{2}(?:-[TR]\d+)?$/;
const bodies = {
  COMMIT_USAGE: 'Expected a project directory, a message file or -, and optional --require <id> options',
  COMMIT_READ: 'Cannot read the commit message as UTF-8 text',
  COMMIT_POLICY: 'The project has not adopted a usable Commit style: conventional preference',
  COMMIT_HEADER: 'Expected <type>(<scope>)!: <description> on the first line',
  COMMIT_TYPE: 'Type is not one of ' + types.join(', '),
  COMMIT_SCOPE: 'Scope is not in the confirmed Commit scopes list',
  COMMIT_LENGTH: `Header is longer than ${maxHeader} characters`,
  COMMIT_BODY: 'Leave the second line blank before a body',
  COMMIT_IDENTITY: 'Header does not end with the required identity: '
};
const diagnostic = (code, detail = '') => ({ code, message: bodies[code] + detail });

// The identity is a trailing parenthesized list such as (03-T2) or (03, 03-T1, 03-T2).
function identity(description) {
  const match = description.match(/^(.*?) \(([^()]+)\)$/);
  if (!match) return { text: description, ids: [] };
  const ids = match[2].split(', ');
  return ids.every(value => id.test(value)) ? { text: match[1], ids } : { text: description, ids: [] };
}

function checkMessage(message, preferences, required = []) {
  const values = preferences.state === 'present' ? preferences.values : {};
  const unusable = new Set((preferences.diagnostics || []).map(d => d.key));
  if (values['Commit style'] !== 'conventional' || unusable.has('Commit scopes')) {
    return { diagnostics: [diagnostic('COMMIT_POLICY')] };
  }
  const lines = message.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
  const header = lines[0] || '';
  const diagnostics = [];
  const match = header.match(/^([a-z]+)(?:\(([^()\s]+)\))?(!)?: (\S.*)$/);
  if (!match) return { diagnostics: [diagnostic('COMMIT_HEADER')] };
  const [, type, scope, bang, description] = match;
  if (!types.includes(type)) diagnostics.push(diagnostic('COMMIT_TYPE'));
  if (scope !== undefined && !(values['Commit scopes'] || []).includes(scope)) diagnostics.push(diagnostic('COMMIT_SCOPE'));
  if ([...header].length > maxHeader) diagnostics.push(diagnostic('COMMIT_LENGTH'));
  if (lines.length > 1 && lines[1].trim() !== '') diagnostics.push(diagnostic('COMMIT_BODY'));
  const { text, ids } = identity(description);
  for (const value of required) if (!ids.includes(value)) diagnostics.push(diagnostic('COMMIT_IDENTITY', value));
  const breaking = Boolean(bang) || lines.slice(2).some(line => /^BREAKING[ -]CHANGE: \S/.test(line));
  return diagnostics.length ? { diagnostics }
    : { diagnostics, type, scope: scope ?? null, breaking, description: text, ids };
}

function main(args, io = fs, out = process.stdout, err = process.stderr, stdin = 0) {
  const [project, source, ...rest] = args;
  const required = [];
  let usable = Boolean(project) && Boolean(source) && !project.startsWith('--') &&
    (source === '-' || !source.startsWith('-'));
  for (let i = 0; usable && i < rest.length; i += 2) {
    if (rest[i] !== '--require' || !id.test(rest[i + 1] || '')) usable = false;
    else required.push(rest[i + 1]);
  }
  if (!usable) {
    err.write(`COMMIT_USAGE: ${bodies.COMMIT_USAGE}\n`);
    return 2;
  }
  let message;
  try {
    const bytes = io.readFileSync(source === '-' ? stdin : source);
    if (bytes.length > maxBytes) throw new Error('too large');
    message = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    err.write(`COMMIT_READ: ${bodies.COMMIT_READ}\n`);
    return 1;
  }
  const result = checkMessage(message, readPreferences(project, io), required);
  if (result.diagnostics.length) {
    for (const { code, message: text } of result.diagnostics) err.write(`${code}: ${text}\n`);
    return 1;
  }
  const { diagnostics, ...parsed } = result;
  out.write(JSON.stringify(parsed) + '\n');
  return 0;
}

module.exports = { checkMessage, main, types };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
