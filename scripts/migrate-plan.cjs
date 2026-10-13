#!/usr/bin/env node
'use strict';

// Local preview/apply/recovery only. No Git operations, gates, installs or inference.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspect, snapshot, relativePath, utf8, hash, fail, diagnostic, PlanError } = require('./inspect-plan.cjs');
const { convertPhase, annotate, renameHeading, transformVersion } = require('./convert-plan.cjs');
const recoveryName = '.kaylo-migration-recovery';
const journalVersion = 1;
const own = (object, key) => Object.hasOwn(object, key);
function assertNoRecovery(root, io) {
  try { io.lstatSync(path.join(root, recoveryName)); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  fail('MIGRATION_RECOVERY_REQUIRED');
}
function validateCandidate(plan, operations) {
  // Temporary candidate is private, outside the project; only selected plan bytes.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-migration-candidate-'));
  fs.chmodSync(directory, 0o700);
  try {
    const files = new Map([...plan.files].filter(([, f]) => f.exists).map(([p, f]) => [p, f.bytes]));
    for (const operation of operations) {
      if (operation.after === null) files.delete(operation.relative);
      else files.set(operation.relative, operation.after);
    }
    for (const [relative, bytes] of files) {
      const destination = path.join(directory, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      fs.writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const next = inspect(directory);
    if (next.kind === 'legacy') fail('MIGRATION_INCOMPLETE');
    if (files.has('ROADMAP.md')) {
      const errors = require('./validate-plan.cjs').validate(directory);
      if (errors.length) fail('MIGRATION_CANDIDATE_INVALID');
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
function preview(project, { destination, io = fs } = {}) {
  const plan = inspect(project, { io });
  assertNoRecovery(plan.root, io);
  const operations = [];
  const set = (relative, after, role) => {
    if (!plan.files.has(relative)) plan.files.set(relative, snapshot(plan.root, relative, io));
    const before = plan.files.get(relative);
    const bytes = after === null ? null : Buffer.from(after);
    if (before.exists && bytes !== null && before.bytes.equals(bytes) || !before.exists && bytes === null) return;
    if (operations.some(op => op.relative === relative)) fail('MIGRATION_COLLISION');
    operations.push({ relative, before: before.exists ? before.bytes : null, after: bytes,
      mode: before.exists ? before.mode : 0o600, role });
  };
  if (plan.kind === 'creation') {
    if (destination) fail('MIGRATION_DESTINATION_UNUSED');
  } else {
    if (plan.files.get('OBJECTIVE.md').exists) {
      const old = utf8(plan.files.get('OBJECTIVE.md').bytes);
      const next = renameHeading(old, 'Objective', 'PRD');
      set('PRD.md', next, 'prd');
      set('OBJECTIVE.md', null, 'converted-source');
    }
    if (plan.source) {
      let index = plan.text;
      if (plan.inline) {
        if (!destination) fail('MIGRATION_DESTINATION_REQUIRED');
        relativePath(destination);
        const match = destination.match(/^\.kaylo\/phases\/(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\/\1-PLAN\.md$/);
        if (!match) fail('MIGRATION_DESTINATION');
        const identity = plan.active.doc.lines.find(line => /^# /.test(line))?.match(/^# (\d{2})\b/);
        if (identity && identity[1] !== match[1]) fail('MIGRATION_IDENTITY');
        if (snapshot(plan.root, destination, io).exists) fail('MIGRATION_COLLISION');
        // Inline closed history cannot be extracted without historical mutation.
        const completion = plan.active.doc.sections.get('Completion');
        const value = plan.active.doc.lines.slice(completion.start + 1, completion.end).join('\n').trim();
        if (plan.active.doc.tasks.every(t => t.checked) && value && !/^\[|^not complete[.!]?$/i.test(value)) fail('MIGRATION_CLOSED_INLINE');
        let record = plan.text.replace(/^(\uFEFF?)Kaylo format: 0\r?\n/, '$1');
        record = convertPhase(record);
        set(destination, record, 'active-phase');
        const eol = plan.text.includes('\r\n') ? '\r\n' : '\n';
        // Do not copy arbitrary titles into the new link syntax.
        index = ['# Roadmap', '', `Current: [${match[1]} Converted phase](${destination})`, '',
          `- [ ] [${match[1]} Converted phase](${destination})`, ''].join(eol);
      } else {
        if (destination) fail('MIGRATION_DESTINATION_UNUSED');
        if (plan.active && plan.kind === 'legacy') set(plan.active.relative, convertPhase(plan.active.text), 'active-phase');
        if (plan.source === 'PLAN.md') index = renameHeading(index, 'Plan', 'Roadmap');
      }
      set('ROADMAP.md', annotate(index), 'index');
      if (plan.source === 'PLAN.md') set('PLAN.md', null, 'converted-source');
    }
  }
  if (operations.length) validateCandidate(plan, operations);
  const inputs = [...plan.files.values()].map(({ bytes, ...file }) => file).sort((a, b) => a.relative.localeCompare(b.relative));
  const spec = { tool: transformVersion, root: plan.root, destination: destination || null, inputs,
    operations: operations.map(({ relative, before, after, mode, role }) => ({ relative, mode, role,
      before: before === null ? null : hash(before), after: after === null ? null : hash(after) })) };
  const token = 'sha256:' + hash(JSON.stringify(spec));
  return { plan, operations, inputs, token, destination, spec };
}
function unchanged(root, inputs, io) {
  for (const before of inputs) {
    const { bytes, ...now } = snapshot(root, before.relative, io);
    if (JSON.stringify(now) !== JSON.stringify(before)) fail('MIGRATION_STALE_INPUT');
  }
}
function syncWrite(io, file, bytes, mode = 0o600) {
  const fd = io.openSync(file, 'wx', mode);
  try { io.writeFileSync(fd, bytes); io.fsyncSync(fd); } finally { io.closeSync(fd); }
}
function syncDirectory(io, directory) {
  // fsync of directories is unavailable on some platforms; failure is explicit.
  const fd = io.openSync(directory, 'r');
  try { io.fsyncSync(fd); } finally { io.closeSync(fd); }
}
function privateRecovery(root, io) {
  const directory = path.join(root, recoveryName);
  const stat = io.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) fail('MIGRATION_RECOVERY_UNSAFE');
  return directory;
}
function loadJournal(root, expected, io) {
  if (!/^sha256:[a-f0-9]{64}$/.test(expected || '')) fail('MIGRATION_RECOVERY_TOKEN_REQUIRED');
  const directory = privateRecovery(root, io);
  const read = name => {
    const file = path.join(directory, name);
    const stat = io.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail('MIGRATION_RECOVERY_UNSAFE');
    return io.readFileSync(file);
  };
  let journal;
  try { journal = JSON.parse(read('journal.json')); } catch { fail('MIGRATION_RECOVERY_INCOMPLETE'); }
  if (!journal || journal.format !== journalVersion || journal.root !== root ||
      !Array.isArray(journal.operations) || !Array.isArray(journal.directories)) fail('MIGRATION_RECOVERY_INVALID');
  if (journal.token !== expected || !journal.spec || 'sha256:' + hash(JSON.stringify(journal.spec)) !== expected ||
      journal.spec.root !== root || !Array.isArray(journal.spec.operations)) fail('MIGRATION_RECOVERY_INVALID');
  const recorded = journal.operations.map(({ relative, mode, before, after }) => ({ relative, mode, before, after }));
  const reviewed = journal.spec.operations.map(({ relative, mode, before, after }) => ({ relative, mode, before, after }));
  if (JSON.stringify(recorded) !== JSON.stringify(reviewed)) fail('MIGRATION_RECOVERY_INVALID');
  const seen = new Set();
  const operations = journal.operations.map((op, i) => {
    relativePath(op.relative);
    if (seen.has(op.relative) || !Number.isInteger(op.mode) || op.mode < 0 || op.mode > 0o777 ||
        !own(op, 'before') || !own(op, 'after') || op.before === null && op.after === null) fail('MIGRATION_RECOVERY_INVALID');
    seen.add(op.relative);
    const load = (name, digest) => {
      if (digest === null) return null;
      if (!/^[a-f0-9]{64}$/.test(digest)) fail('MIGRATION_RECOVERY_INVALID');
      const bytes = read(`${i}.${name}`);
      if (hash(bytes) !== digest) fail('MIGRATION_RECOVERY_INVALID');
      return bytes;
    };
    return { relative: op.relative, mode: op.mode, before: load('before', op.before), after: load('after', op.after) };
  });
  for (const relative of journal.directories) relativePath(relative);
  return { directory, journal, operations };
}
function recoverySnapshot(root, operation, directory, io) {
  // Exclusive creation can die between link and unlink. Permit only the one
  // journal-owned temporary alias, with exact candidate bytes and identity.
  const target = path.join(root, operation.relative);
  const temporary = path.join(directory, 'replace.tmp');
  const safeIO = { ...io, lstatSync(file) {
    const stat = io.lstatSync(file);
    if (file !== target || stat.nlink !== 2 || !stat.isFile() || stat.isSymbolicLink()) return stat;
    let other;
    try { other = io.lstatSync(temporary); } catch { return stat; }
    if (!other.isFile() || other.isSymbolicLink() || other.dev !== stat.dev || other.ino !== stat.ino ||
        other.nlink !== 2 || operation.after === null) return stat;
    if (!io.readFileSync(target).equals(operation.after)) fail('MIGRATION_RECOVERY_EDITED');
    return Object.assign(Object.create(stat), { nlink: 1 });
  } };
  return snapshot(root, operation.relative, safeIO);
}
function recover(project, { expected, io = fs } = {}) {
  const root = io.realpathSync(project);
  const { directory, operations, journal } = loadJournal(root, expected, io);
  // Verify all endpoints before restoring any. Refuse intervening user edits.
  const inputs = operations.map(op => {
    const current = recoverySnapshot(root, op, directory, io);
    const bytes = current.exists ? current.bytes : null;
    const equal = expected => bytes === null ? expected === null : expected !== null && bytes.equals(expected);
    if (!equal(op.before) && !equal(op.after)) fail('MIGRATION_RECOVERY_EDITED');
    return { ...op, current };
  });
  // All endpoints are confirmed before discarding a disposable temporary alias.
  try { io.unlinkSync(path.join(directory, 'replace.tmp')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const op of inputs.reverse()) {
    // Recheck immediately before each replacement, including alias checks.
    const current = snapshot(root, op.relative, io);
    if (current.exists !== op.current.exists || current.digest !== op.current.digest) fail('MIGRATION_RECOVERY_EDITED');
    const file = path.join(root, op.relative);
    if (op.before === null) {
      if (current.exists) io.unlinkSync(file);
    } else if (!current.exists || current.digest !== hash(op.before)) {
      const temporary = path.join(directory, 'restore.tmp');
      try { io.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      syncWrite(io, temporary, op.before, op.mode);
      io.renameSync(temporary, file);
      syncDirectory(io, path.dirname(file));
    }
  }
  // Preserve empty parent directories: after a crash their ownership cannot
  // be proven against a concurrent creator. Never remove an unrelated directory.
  for (const op of operations) {
    const current = snapshot(root, op.relative, io);
    if (op.before === null ? current.exists : !current.exists || current.digest !== hash(op.before)) fail('MIGRATION_RECOVERY_INCOMPLETE');
  }
  io.rmSync(directory, { recursive: true });
  syncDirectory(io, root);
  return { recovered: true };
}
function apply(project, expected, { destination, io = fs } = {}) {
  if (!/^sha256:[a-f0-9]{64}$/.test(expected || '')) fail('MIGRATION_PREVIEW_REQUIRED');
  const result = preview(project, { destination, io });
  if (!result.operations.length) return { changed: 0, token: result.token };
  if (result.token !== expected) fail('MIGRATION_STALE_PREVIEW');
  const { root } = result.plan;
  const directory = path.join(root, recoveryName);
  io.mkdirSync(directory, { mode: 0o700 }); // Exclusive lock; never recursive.
  let prepared = false;
  let complete = false;
  try {
    const directories = [];
    for (const op of result.operations) {
      const parts = op.relative.split('/').slice(0, -1);
      for (let i = 1; i <= parts.length; i++) {
        const relative = parts.slice(0, i).join('/');
        if (!io.existsSync(path.join(root, relative)) && !directories.includes(relative)) directories.push(relative);
      }
    }
    const journal = { format: journalVersion, tool: transformVersion, root, token: result.token, spec: result.spec, directories,
      operations: result.operations.map((op, i) => {
        if (op.before !== null) syncWrite(io, path.join(directory, `${i}.before`), op.before);
        if (op.after !== null) syncWrite(io, path.join(directory, `${i}.after`), op.after);
        return { relative: op.relative, mode: op.mode, before: op.before === null ? null : hash(op.before),
          after: op.after === null ? null : hash(op.after) };
      }) };
    syncWrite(io, path.join(directory, 'journal.json'), JSON.stringify(journal));
    syncDirectory(io, directory);
    syncDirectory(io, root);
    prepared = true;
    unchanged(root, result.inputs, io);
    for (const relative of directories) io.mkdirSync(path.join(root, relative), { mode: 0o700 });
    // Establish replacements before removing converted sources. Every after.tmp is
    // disposable; durable before/after files remain for interrupted recovery.
    const ordered = result.operations.filter(op => op.after !== null).concat(result.operations.filter(op => op.after === null));
    const expectedFiles = new Map(result.inputs.map(file => [file.relative, file]));
    for (const op of ordered) {
      // Detect edits to every source/link/destination at each multi-file boundary.
      for (const [relative, before] of expectedFiles) {
        const now = snapshot(root, relative, io);
        if (before.exists !== now.exists || before.digest !== now.digest || before.exists &&
            (before.dev !== now.dev || before.ino !== now.ino || before.mode !== now.mode)) fail('MIGRATION_STALE_INPUT');
        for (const parent of before.parents) {
          const actual = io.lstatSync(path.join(root, parent.relative));
          if (actual.isSymbolicLink() || actual.dev !== parent.dev || actual.ino !== parent.ino) fail('MIGRATION_STALE_INPUT');
        }
      }
      const file = path.join(root, op.relative);
      const endpoint = snapshot(root, op.relative, io);
      if (op.after === null) io.unlinkSync(file);
      else {
        const temporary = path.join(directory, 'replace.tmp');
        syncWrite(io, temporary, op.after, op.mode);
        const latest = snapshot(root, op.relative, io);
        if (JSON.stringify({ ...latest, bytes: undefined }) !== JSON.stringify({ ...endpoint, bytes: undefined })) fail('MIGRATION_STALE_INPUT');
        if (endpoint.exists) io.renameSync(temporary, file);
        else { io.linkSync(temporary, file); io.unlinkSync(temporary); }
      }
      syncDirectory(io, path.dirname(file));
      expectedFiles.set(op.relative, snapshot(root, op.relative, io));
    }
    const errors = require('./validate-plan.cjs').validate(root);
    if (result.plan.source && errors.length) fail('MIGRATION_APPLIED_INVALID');
    for (const op of result.operations) {
      const actual = snapshot(root, op.relative, io);
      if (op.after === null ? actual.exists : !actual.exists || actual.digest !== hash(op.after)) fail('MIGRATION_STALE_INPUT');
    }
    complete = true;
  } catch (error) {
    // The journal provides an explicit rollback, including after process death.
    // Do not restore over a user's concurrent edit, or claim a project transaction.
    if (!prepared) {
      try { io.rmSync(directory, { recursive: true }); } catch { /* retained for inspection */ }
    }
    if (prepared) fail('MIGRATION_INTERRUPTED_RECOVER');
    throw error;
  } finally {
    if (complete) {
      try { io.rmSync(directory, { recursive: true }); syncDirectory(io, root); }
      catch { fail('MIGRATION_COMPLETED_RECOVERY_RETAINED'); }
    }
  }
  return { changed: result.operations.length, token: result.token };
}
function safeDiff(op) {
  // No plan values/path names, even in context lines. Local raw content is opt-in.
  const before = op.before === null ? [] : utf8(op.before).split(/\r?\n/);
  const after = op.after === null ? [] : utf8(op.after).split(/\r?\n/);
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  return { from: prefix + 1, removed: before.length - prefix - suffix, added: after.length - prefix - suffix,
    lines: before.slice(prefix, before.length - suffix).map(() => '-[redacted]').concat(
      after.slice(prefix, after.length - suffix).map(() => '+[redacted]')) };
}
function main(args) {
  const project = args[0];
  let expected, destination, recovery, content = false;
  let bad = !project || project.startsWith('--');
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply' && expected === undefined && args[i + 1] && !args[i + 1].startsWith('--')) expected = args[++i];
    else if (arg === '--destination' && destination === undefined && args[i + 1] && !args[i + 1].startsWith('--')) destination = args[++i];
    else if (arg === '--recover' && recovery === undefined && args[i + 1] && !args[i + 1].startsWith('--')) recovery = args[++i];
    else if (arg === '--show-content' && !content) content = true;
    else bad = true;
  }
  if (bad || recovery && (expected || destination || content) || expected && content) {
    process.stderr.write('Usage: node migrate-plan.cjs <project-root> [--destination relative-file] [--show-content | --apply sha256:token]\n       node migrate-plan.cjs <project-root> --recover sha256:token\n'); return 2;
  }
  try {
    if (recovery) { recover(project, { expected: recovery }); process.stdout.write('PASS recovered original plan bytes; regenerate preview before retry\n'); }
    else if (expected) {
      const result = apply(project, expected, { destination });
      process.stdout.write(`PASS ${result.changed} operations; agreement, build readiness and Git authority were not established\n`);
    } else {
      const result = preview(project, { destination });
      process.stdout.write(JSON.stringify({ tool: transformVersion, token: result.token, kind: result.plan.kind,
        format: result.plan.format, variant: result.plan.variant,
        preconditions: 'all inspected source/link/destination bytes, identities, modes and existing parents unchanged; scoped authority required',
        operations: result.operations.map((op, i) => ({ file: `F${i + 1}`, role: op.role,
          operation: op.before === null ? 'create' : op.after === null ? 'remove' : 'change', diff: safeDiff(op),
          ...(content ? { relative: op.relative, before: op.before?.toString('utf8') ?? null, after: op.after?.toString('utf8') ?? null } : {}) })),
        history: result.plan.histories.map(h => ({ phase: h.id, kind: h.kind, reason: h.reason })) }) + '\n');
    }
    return 0;
  } catch (error) {
    process.stderr.write(diagnostic(error) + '\n');
    if (error instanceof PlanError && /RECOVER|INTERRUPTED/.test(error.code)) {
      process.stderr.write('Keep local recovery data private. Use --recover with the original reviewed preview token to restore unchanged endpoints; intervening edits require scoped manual resolution. Do not reset, stash or retry conversion over incomplete state.\n');
    }
    return 1;
  }
}
module.exports = { preview, apply, recover, safeDiff, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
