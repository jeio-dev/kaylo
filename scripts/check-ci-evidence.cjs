#!/usr/bin/env node
'use strict';

// Read-only checker for a CI evidence snapshot: exact repository and revision
// identity, required-set completeness and conclusion classification. It is not a
// provider client: it contacts no service, runs nothing and authorizes nothing,
// and cannot establish that the supplied facts, relevance or required set are true.
const fs = require('node:fs');

const maxBytes = 4 * 1024 * 1024;
const states = ['pass', 'fail', 'pending', 'missing', 'unavailable', 'not-applicable', 'skipped', 'cancelled', 'neutral'];
const sourceless = new Set(['missing', 'unavailable']);
const topKeys = ['format', 'repository', 'targetRevision', 'required', 'observations'];
const observationKeys = ['name', 'repository', 'revision', 'state', 'url', 'observedAt'];
const placeholder = /^(?:n\/?a|none|tbd|todo|unknown|-+|\.+)$/i;
const control = /[\u0000-\u001f\u007f]/;
const bodies = {
  CI_USAGE: 'Expected exactly one CI snapshot argument',
  CI_READ: 'Cannot read CI snapshot as a regular UTF-8 JSON file',
  CI_SCHEMA: 'Invalid CI snapshot schema; ',
  CI_FORMAT: 'Unsupported CI evidence format; expected 1',
  CI_DUPLICATE: 'Duplicate required check or observation name',
  CI_REPOSITORY: 'Observation repository does not match target repository',
  CI_REVISION: 'Observation revision does not match target revision',
  CI_MISSING: 'Required check has no observation: ',
  CI_NOT_PASS: 'Required check is not passing: ',
  CI_NO_REQUIREMENTS: 'Empty required set needs an explicit no-CI reason'
};

// Names come from evidence: show them only as bounded printable text.
const shown = name => {
  const printable = name.replace(/[^\x20-\x7e]/g, '?');
  return printable.length > 80 ? printable.slice(0, 80) + '...' : printable;
};
const diagnostic = (code, detail = '') => ({ code, message: bodies[code] + detail });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identity = value => typeof value === 'string' && value.trim() !== '' && value === value.trim() && !control.test(value);
const timestamp = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(Date.parse(value)).toISOString().slice(0, 19) === value.slice(0, 19);
function httpsUrl(value) {
  if (typeof value !== 'string' || value !== value.trim() || control.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function schema(snapshot) {
  const errors = [];
  const fail = detail => errors.push(diagnostic('CI_SCHEMA', detail));
  if (!isObject(snapshot)) return [diagnostic('CI_SCHEMA', 'snapshot must be an object')];
  if ('format' in snapshot && snapshot.format !== 1) return [diagnostic('CI_FORMAT')];
  const allowed = new Set([...topKeys, 'noCiReason']);
  for (const key of topKeys) if (!(key in snapshot)) fail(`${key} is required`);
  for (const key of Object.keys(snapshot)) if (!allowed.has(key)) fail('unexpected top-level property');
  if ('repository' in snapshot && !identity(snapshot.repository)) fail('repository must be a nonblank exact identifier');
  if ('targetRevision' in snapshot && !identity(snapshot.targetRevision)) {
    fail('targetRevision must be a nonblank exact identifier');
  }
  if ('required' in snapshot) {
    if (!Array.isArray(snapshot.required)) fail('required must be an array');
    else snapshot.required.forEach((name, i) => { if (!identity(name)) fail(`required[${i}] must be a nonblank string`); });
  }
  if ('noCiReason' in snapshot) {
    if (typeof snapshot.noCiReason !== 'string' || control.test(snapshot.noCiReason.replace(/\n/g, ' '))) {
      fail('noCiReason must be a string');
    } else if (Array.isArray(snapshot.required) && snapshot.required.length) {
      fail('noCiReason is allowed only with an empty required set');
    }
  }
  if ('observations' in snapshot) {
    if (!Array.isArray(snapshot.observations)) fail('observations must be an array');
    else snapshot.observations.forEach((item, i) => {
      const at = `observations[${i}]`;
      if (!isObject(item)) return fail(`${at} must be an object`);
      for (const key of observationKeys) if (!(key in item)) fail(`${at}.${key} is required`);
      for (const key of Object.keys(item)) if (!observationKeys.includes(key)) fail(`${at} has an unexpected property`);
      if ('name' in item && !identity(item.name)) fail(`${at}.name must be a nonblank string`);
      if ('repository' in item && !identity(item.repository)) fail(`${at}.repository must be a nonblank exact identifier`);
      if ('revision' in item && !identity(item.revision)) fail(`${at}.revision must be a nonblank exact identifier`);
      if ('state' in item && !states.includes(item.state)) fail(`${at}.state must be one of ${states.join(', ')}`);
      if ('url' in item && !(httpsUrl(item.url) || (item.url === null && sourceless.has(item.state)))) {
        fail(`${at}.url must be an https URL (null only for missing or unavailable)`);
      }
      if ('observedAt' in item && !timestamp(item.observedAt)) fail(`${at}.observedAt must be a UTC ISO 8601 timestamp`);
    });
  }
  return errors;
}

function checkCiEvidence(snapshot) {
  const errors = schema(snapshot);
  if (errors.length) return { ok: false, diagnostics: errors };
  const diagnostics = [];
  const { repository, targetRevision, required, observations } = snapshot;
  if (new Set(required).size !== required.length ||
    new Set(observations.map(item => item.name)).size !== observations.length) {
    diagnostics.push(diagnostic('CI_DUPLICATE'));
    return { ok: false, diagnostics };
  }
  // A mismatched identity is not evidence for anything, advisory records included:
  // it blocks, and a required name it would have filled stays missing.
  if (observations.some(item => item.repository !== repository)) diagnostics.push(diagnostic('CI_REPOSITORY'));
  if (observations.some(item => item.revision !== targetRevision)) diagnostics.push(diagnostic('CI_REVISION'));
  const matches = item => item.repository === repository && item.revision === targetRevision;
  const byName = new Map(observations.filter(matches).map(item => [item.name, item]));
  const classified = required.map(name => {
    const item = byName.get(name);
    if (!item) {
      diagnostics.push(diagnostic('CI_MISSING', shown(name)));
      return { name, state: 'missing', url: null, observedAt: null };
    }
    if (item.state !== 'pass') diagnostics.push(diagnostic('CI_NOT_PASS', `${shown(name)} (${item.state})`));
    return { name, state: item.state, url: item.url, observedAt: item.observedAt };
  });
  const requiredNames = new Set(required);
  const advisory = observations.filter(item => matches(item) && !requiredNames.has(item.name))
    .map(({ name, state, url, observedAt }) => ({ name, state, url, observedAt }));
  const rejected = observations.filter(item => !matches(item))
    .map(({ name, repository: repo, revision }) => ({ name, repository: repo, revision }));
  const reason = typeof snapshot.noCiReason === 'string' ? snapshot.noCiReason.trim() : '';
  if (!required.length && (!reason || placeholder.test(reason))) diagnostics.push(diagnostic('CI_NO_REQUIREMENTS'));
  const report = {
    result: diagnostics.length ? 'blocked' : required.length ? 'pass' : 'no-required-ci',
    repository,
    targetRevision,
    required: classified,
    advisory,
    rejected
  };
  if (!required.length && reason) report.noCiReason = reason;
  return { ok: diagnostics.length === 0, diagnostics, report };
}

function readSnapshot(file, io = fs) {
  let fd;
  try {
    fd = io.openSync(file, 'r');
    const stat = io.fstatSync(fd);
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('unsuitable');
    const bytes = io.readFileSync(fd);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error('bom');
    return { snapshot: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch {
    return { diagnostics: [diagnostic('CI_READ')] };
  } finally {
    if (fd !== undefined) io.closeSync(fd);
  }
}

function main(args, io = fs, out = process.stdout, err = process.stderr) {
  if (args.length !== 1 || !args[0] || args[0].startsWith('--')) {
    err.write(`CI_USAGE: ${bodies.CI_USAGE}\n`);
    return 2;
  }
  const read = readSnapshot(args[0], io);
  const result = read.diagnostics ? { ok: false, diagnostics: read.diagnostics } : checkCiEvidence(read.snapshot);
  for (const { code, message } of result.diagnostics) err.write(`${code}: ${message}\n`);
  if (result.report) out.write(JSON.stringify(result.report) + '\n');
  return result.ok ? 0 : 1;
}

module.exports = { checkCiEvidence, readSnapshot, main, states };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
