#!/usr/bin/env node
'use strict';

// Optional read-only proposal helper. No writes, Git, network, or evidence verdicts.
const fs = require('node:fs');
const path = require('node:path');
const { visibleMarkdown, linkTarget, phaseEntry } = require('./validate-plan.cjs');
const token = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const classes = ['breaking', 'feature', 'fix', 'internal'];
function refuse(code, message) { throw Object.assign(new Error(message), { code }); }
function shape(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== keys.slice().sort().join(',')) {
    refuse('RELEASE_SCHEMA', `Unexpected fields in ${label}`);
  }
}
function identifier(value, label) {
  if (typeof value !== 'string' || !token.test(value)) refuse('RELEASE_SCHEMA', `Invalid ${label}`);
}
function relative(value) {
  if (typeof value !== 'string' || !value || /[\r\n\0?#\\]/.test(value) ||
      /^[a-z][a-z\d+.-]*:/i.test(value) || path.isAbsolute(value)) {
    refuse('RELEASE_PATH', 'Expected a project-relative file path');
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    refuse('RELEASE_PATH', 'File path leaves the project or names its root');
  }
  return normalized;
}
function releaseFailure(error) { return typeof error?.code === 'string' && error.code.startsWith('RELEASE_'); }
function readFailure(error, message) {
  if (releaseFailure(error)) throw error;
  if (error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA' || /^E[A-Z]+$/.test(error.code || '')) {
    refuse('RELEASE_READ', message);
  }
  throw error;
}
function readRegular(name, expected) {
  let fd;
  try {
    fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) refuse('RELEASE_READ', 'Expected a regular file');
    if (expected && (stat.dev !== expected.dev || stat.ino !== expected.ino)) refuse('RELEASE_READ', 'File changed while reading');
    const bytes = fs.readFileSync(fd);
    return { stat, text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) };
  } catch (error) { readFailure(error, 'Cannot read a regular UTF-8 file'); }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function readInside(root, name) {
  name = relative(name);
  try {
    const target = fs.realpathSync(path.join(root, name));
    const inside = path.relative(root, target);
    if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside)) {
      refuse('RELEASE_PATH', 'File resolves outside the project');
    }
    const stat = fs.statSync(target);
    if (!stat.isFile()) refuse('RELEASE_READ', 'Expected a regular file');
    const file = readRegular(target, stat);
    return { text: file.text, target, identity: stat.ino ? `${stat.dev}:${stat.ino}` : target };
  } catch (error) {
    readFailure(error, `Cannot read ${name} as a project UTF-8 file`);
  }
}
function reviewNote(text) {
  const lines = visibleMarkdown(text).split('\n');
  const starts = lines.flatMap((line, i) => /^ {0,3}##[ \t]+Review(?:[ \t]+#+)?[ \t]*$/.test(line) ? [i] : []);
  if (starts.length !== 1) return { reason: 'missing or repeated Review section' };
  const end = lines.findIndex((line, i) => i > starts[0] && /^ {0,3}#{1,2}[ \t]/.test(line));
  const section = lines.slice(starts[0] + 1, end < 0 ? undefined : end);
  const notes = section.filter(line => /^Release note:/.test(line));
  const contributions = section.filter(line => /^Release contribution:/.test(line));
  if (notes.length !== 1 || contributions.length !== 1) return { reason: 'missing or repeated release metadata' };
  const note = notes[0].match(/^Release note: (breaking|feature|fix|internal) \((provisional|reviewed|pending)\) — (\S.*)$/);
  const contribution = contributions[0].match(/^Release contribution: ([A-Za-z0-9][A-Za-z0-9._-]{0,127}) \/ ([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/);
  const identity = contribution ? { boundary: contribution[1], delta: contribution[2] } : {};
  if (!note || !contribution) return { ...identity, reason: 'invalid release metadata grammar' };
  const areas = section.filter(line => /^Release area:/.test(line));
  const area = areas[0]?.match(/^Release area: ([a-z][a-z0-9-]{0,63})$/)?.[1];
  if (areas.length > 1 || (areas.length && !area)) return { ...identity, reason: 'invalid or repeated release area' };
  const prs = section.filter(line => /^Pull request:/.test(line));
  if (prs.length > 1) return { ...identity, reason: 'repeated Pull request record' };
  // Preserve provider-neutral association as data; never execute retrieved text.
  return { class: note[1], description: note[3], ...identity,
    ...(area ? { area } : {}), pr: prs[0]?.replace(/^Pull request:/, '').trim() || null,
    ...(note[2] !== 'reviewed' ? { reason: `${note[2]} classification` } : {}) };
}
function roadmap(text, selected) {
  const result = new Map();
  for (const line of visibleMarkdown(text).split('\n')) {
    const entry = line.match(phaseEntry);
    if (!entry || !selected.has(entry[2])) continue;
    if (result.has(entry[2])) refuse('RELEASE_IDENTITY', 'Duplicate selected roadmap phase ID');
    const plan = linkTarget(line, () => refuse('RELEASE_PATH', 'Invalid selected roadmap plan link'));
    result.set(entry[2], { closed: entry[1].toLowerCase() === 'x', plan: relative(plan) });
  }
  return result;
}
function entryShape(entry) {
  const keys = ['project', 'phase', 'plan', 'boundary', 'delta', 'class', 'description', 'pr'];
  if (entry && Object.hasOwn(entry, 'area')) keys.push('area');
  shape(entry, keys, 'release entry');
  if (Object.hasOwn(entry, 'area') && (typeof entry.area !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(entry.area))) {
    refuse('RELEASE_SCHEMA', 'Invalid release area');
  }
  for (const key of ['project', 'boundary', 'delta']) identifier(entry[key], key);
  if (typeof entry.phase !== 'string' || !/^\d{2}$/.test(entry.phase)) refuse('RELEASE_SCHEMA', 'Invalid phase ID');
  relative(entry.plan);
  if (!classes.includes(entry.class) || typeof entry.description !== 'string' || !entry.description.trim() ||
      /[\r\n\0]/.test(entry.description) || (entry.pr !== null &&
        (typeof entry.pr !== 'string' || !entry.pr.trim() || /[\r\n\0]/.test(entry.pr)))) {
    refuse('RELEASE_SCHEMA', 'Invalid release entry content');
  }
}
const keyOf = entry => JSON.stringify([entry.project, entry.phase, entry.delta]);
function block(entry, eol) {
  const json = JSON.stringify(entry).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
  // Description stays in JSON as well; bullet text is data, never release authority.
  const description = entry.description.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const link = encodeURI(entry.plan).replaceAll('(', '%28').replaceAll(')', '%29');
  return `<!-- kaylo-release:${json} -->${eol}- **${entry.area || entry.class}**: ${description} ([${entry.phase}](${link}))${eol}<!-- /kaylo-release -->`;
}
function noteLayout(text) {
  const raw = text.split(/\r?\n/);
  const visible = visibleMarkdown(text).split('\n');
  let offset = 0;
  const lines = raw.map((line, i) => {
    const start = offset;
    offset += line.length + (text.slice(offset + line.length, offset + line.length + 2) === '\r\n' ? 2 : 1);
    return { raw: line, visible: visible[i], start };
  });
  const headings = lines.filter(line => /^ {0,3}##[ \t]+/.test(line.visible));
  const unreleased = headings.filter(line => /^ {0,3}##[ \t]+\[Unreleased\](?:[ \t]+#+)?[ \t]*$/.test(line.visible));
  if (unreleased.length !== 1) refuse('RELEASE_NOTES', 'Expected one real ## [Unreleased] section; use manual reconciliation for other formats');
  const start = unreleased[0].start;
  const end = headings.find(line => line.start > start)?.start ?? text.length;
  const notable = lines.filter(line => line.start > start && line.start < end &&
    /^ {0,3}###[ \t]+Notable Changes(?:[ \t]+#+)?[ \t]*$/.test(line.visible));
  if (notable.length !== 1) refuse('RELEASE_NOTES', 'Expected one ### Notable Changes in [Unreleased]');
  const insert = lines.find(line => line.start > notable[0].start && line.start < end &&
    /^ {0,3}#{1,3}[ \t]+/.test(line.visible))?.start ?? end;
  const entries = [];
  let fence = null;
  let comment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].raw;
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      continue;
    }
    const opening = !comment && line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) { fence = opening[1]; continue; }
    if (!comment && line.startsWith('<!-- kaylo-release:')) {
      const match = line.match(/^<!-- kaylo-release:(.*) -->$/);
      if (!match || !lines[i + 1]?.raw.startsWith('- ') || lines[i + 2]?.raw !== '<!-- /kaylo-release -->') {
        refuse('RELEASE_MARKER', 'Malformed release block; inspect before retrying');
      }
      let entry;
      try { entry = JSON.parse(match[1]); } catch { refuse('RELEASE_MARKER', 'Invalid release marker JSON'); }
      entryShape(entry);
      const finish = lines[i + 2].start + lines[i + 2].raw.length;
      const eol = text.slice(finish, finish + 2) === '\r\n' ? '\r\n' : '\n';
      const removalEnd = text.slice(finish, finish + 2 * eol.length) === eol + eol ? finish + 2 * eol.length : finish;
      entries.push({ entry, start: lines[i].start, end: finish, removalEnd, pending: lines[i].start > start && finish <= end,
        edited: lines[i + 1].raw !== block(entry, '\n').split('\n')[1] });
      i += 2;
      continue;
    }
    if (!comment && line.startsWith('<!-- /kaylo-release')) refuse('RELEASE_MARKER', 'Orphan release block end');
    for (const delimiter of line.match(/<!--|-->/g) || []) {
      if (delimiter === '<!--') comment = true;
      else comment = false;
    }
  }
  const keys = new Set();
  for (const { entry } of entries) {
    const key = keyOf(entry);
    if (keys.has(key)) refuse('RELEASE_IDENTITY', 'Duplicate contribution identity in notes');
    keys.add(key);
  }
  return { entries, insert };
}
function propose(project, selection) {
  shape(selection, ['format', 'project', 'boundary', 'notes', 'phases'], 'selection');
  if (selection.format !== 1) refuse('RELEASE_FORMAT', 'Only selection format 1 is supported');
  identifier(selection.project, 'project identity');
  identifier(selection.boundary, 'release boundary');
  if (!Array.isArray(selection.phases)) refuse('RELEASE_SCHEMA', 'phases must be an array');
  const selected = new Set();
  const phases = selection.phases.map(phase => {
    shape(phase, ['id', 'plan'], 'selected phase');
    if (typeof phase.id !== 'string' || !/^\d{2}$/.test(phase.id) || selected.has(phase.id)) {
      refuse('RELEASE_IDENTITY', 'Invalid or duplicate selected phase ID');
    }
    selected.add(phase.id);
    return { id: phase.id, plan: relative(phase.plan) };
  });
  let root;
  try { root = fs.realpathSync(project); }
  catch (error) { readFailure(error, 'Project directory is unavailable'); }
  const notesFile = readInside(root, selection.notes);
  const notes = notesFile.text;
  const layout = noteLayout(notes);
  const index = roadmap(readInside(root, 'ROADMAP.md').text, selected);
  const diagnostics = [];
  const targets = new Set();
  const eligible = [];
  const alreadyPublished = [];
  const replacements = [];
  const additions = [];
  for (const phase of phases) {
    const indexed = index.get(phase.id);
    if (!indexed || indexed.plan !== phase.plan) refuse('RELEASE_IDENTITY', 'Selection must use the authoritative roadmap ID and plan link');
    const file = readInside(root, phase.plan);
    if (targets.has(file.identity) || file.identity === notesFile.identity) refuse('RELEASE_IDENTITY', 'Selected plans and notes must be distinct files');
    targets.add(file.identity);
    const metadata = reviewNote(file.text);
    const matching = layout.entries.filter(item => item.entry.project === selection.project && item.entry.phase === phase.id);
    const pending = matching.filter(item => item.pending);
    if (pending.some(item => item.edited)) {
      diagnostics.push({ code: 'RELEASE_EDITED', phase: phase.id, reason: 'human-edited release block retained; reconcile explicitly' });
      continue;
    }
    const published = !metadata.reason && matching.find(item => !item.pending && item.entry.delta === metadata.delta);
    if (indexed.closed && published) {
      if (pending.length) {
        diagnostics.push({ code: 'RELEASE_CONFLICT', phase: phase.id, reason: 'pending contribution exists but active metadata points to published history' });
        continue;
      }
      alreadyPublished.push({ phase: phase.id, delta: metadata.delta });
      // Published presentation may be curated; preserve it without rewriting or blocking future batches.
      if (['boundary', 'class', 'description'].some(field => published.entry[field] !== metadata[field])) {
        diagnostics.push({ code: 'RELEASE_PUBLISHED', phase: phase.id, reason: 'published contribution changed; review a new unreleased delta' });
      }
      continue;
    }
    const reason = !indexed.closed ? 'phase is open' : metadata.reason ||
      (metadata.boundary !== selection.boundary ? 'release boundary mismatch' : null);
    if (reason) {
      diagnostics.push({ code: 'RELEASE_PENDING', phase: phase.id, reason });
      // Invalidate only the identified contribution. Unknown/later metadata must not erase earlier work.
      for (const item of pending) {
        if ((!indexed.closed || metadata.reason) &&
            item.entry.delta === metadata.delta && item.entry.boundary === metadata.boundary) {
          replacements.push({ ...item, end: item.removalEnd, text: '' });
        }
      }
      continue;
    }
    const entry = { project: selection.project, phase: phase.id, plan: phase.plan,
      boundary: metadata.boundary, delta: metadata.delta, class: metadata.class,
      description: metadata.description, pr: metadata.pr, ...(metadata.area ? { area: metadata.area } : {}) };
    entryShape(entry);
    const old = matching.find(item => keyOf(item.entry) === keyOf(entry));
    if (pending.some(item => keyOf(item.entry) !== keyOf(entry)) || (old && old.entry.boundary !== entry.boundary)) {
      diagnostics.push({ code: 'RELEASE_CONFLICT', phase: phase.id, reason: 'pending contribution identity changed; reconcile explicitly' });
      continue;
    }
    eligible.push(entry);
    if (old) replacements.push({ ...old, text: block(entry, notes.includes('\r\n') ? '\r\n' : '\n') });
    else additions.push(entry);
  }
  for (const item of layout.entries) {
    if (item.pending && (item.entry.project !== selection.project || !selected.has(item.entry.phase))) {
      diagnostics.push({ code: 'RELEASE_UNSELECTED', phase: item.entry.phase, reason: 'unselected unreleased entry retained; batch classification incomplete' });
    }
  }
  const eol = notes.includes('\r\n') ? '\r\n' : '\n';
  if (additions.length) replacements.push({ start: layout.insert, end: layout.insert,
    text: (layout.insert > 0 && !notes.slice(0, layout.insert).endsWith('\n') ? eol : '') +
      additions.map(entry => block(entry, eol) + eol + eol).join('') });
  let proposed = notes;
  for (const edit of replacements.sort((a, b) => b.start - a.start)) {
    proposed = proposed.slice(0, edit.start) + edit.text + proposed.slice(edit.end);
  }
  const counts = Object.fromEntries(classes.map(name => [name, eligible.filter(entry => entry.class === name).length]));
  return { state: diagnostics.length ? 'pending' : 'complete', counts, entries: eligible, diagnostics, alreadyPublished, notes: proposed };
}
function kayloVersion(version, impacts) {
  const match = typeof version === 'string' && version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!match || !Array.isArray(impacts) || impacts.some(value => ![...classes, 'deprecation'].includes(value))) {
    refuse('RELEASE_VERSION', 'Expected a stable Kaylo SemVer and known reviewed impacts');
  }
  const parts = match.slice(1).map(Number);
  if (parts.some(value => !Number.isSafeInteger(value) || value === Number.MAX_SAFE_INTEGER)) {
    refuse('RELEASE_VERSION', 'Version component is out of range');
  }
  const breaking = impacts.includes('breaking');
  const minor = impacts.some(value => ['feature', 'deprecation'].includes(value));
  const bump = breaking && parts[0] > 0 ? 'major' : breaking || minor ? 'minor' : impacts.includes('fix') ? 'patch' : null;
  if (!bump) return { version: null, bump: null, rule: 'Internal-only or empty batch: no release by default' };
  if (bump === 'major') { parts[0]++; parts[1] = parts[2] = 0; }
  else if (bump === 'minor') { parts[1]++; parts[2] = 0; }
  else parts[2]++;
  return { version: parts.join('.'), bump, rule: `${version.startsWith('0.') ? 'Kaylo pre-1.0' : 'Kaylo post-1.0'}: highest reviewed impact requires ${bump.toUpperCase()}` };
}
function main(args) {
  if (args.length !== 2) { console.error('RELEASE_USAGE: node scripts/release-notes.cjs <project-root> <selection.json>'); return 2; }
  try {
    const source = readRegular(args[1]).text;
    let selection;
    try { selection = JSON.parse(source); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      refuse('RELEASE_SCHEMA', 'Selection is not valid JSON');
    }
    const result = propose(args[0], selection);
    console.log(JSON.stringify(result, null, 2));
    return result.state === 'complete' ? 0 : 1;
  } catch (error) {
    if (!releaseFailure(error)) throw error;
    console.error(`${error.code}: ${error.message}`);
    return 1;
  }
}
module.exports = { propose, reviewNote, kayloVersion, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
