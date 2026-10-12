#!/usr/bin/env node
'use strict';

// Read-only size report for a phase's changes between an identified base and head, or the
// working tree. Lockfiles and files the project marks linguist-generated are listed apart,
// binary files are listed without line counts. Its band is advisory, never a pass or failure.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lockfiles = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock',
  'bun.lockb', 'deno.lock', 'Cargo.lock', 'Gemfile.lock', 'composer.lock', 'poetry.lock', 'Pipfile.lock', 'uv.lock',
  'go.sum', 'mix.lock', 'pubspec.lock', 'Podfile.lock', 'packages.lock.json', 'flake.lock', 'gradle.lockfile']);
const bodies = {
  SIZE_USAGE: 'Expected a project directory, a base revision, and an optional head revision',
  SIZE_PROJECT: 'Project directory is not an available Git work tree',
  SIZE_REVISION: 'Revision does not name a commit: ',
  SIZE_GIT: 'Git could not compare the revisions'
};
const revision = /^[^\s\u0000-\u001f\u007f-][^\s\u0000-\u001f\u007f]*$/;

function git(root, args, input) {
  return spawnSync('git', ['-C', root, '-c', 'core.quotepath=off', ...args], { encoding: 'buffer',
    input: input === undefined ? undefined : Buffer.from(input, 'utf8'), maxBuffer: 256 * 1024 * 1024 });
}
const fail = (code, detail = '') => ({ error: { code, message: bodies[code] + detail } });

// numstat -z: "added\tdeleted\tpath\0", or "added\tdeleted\t\0old\0new\0" for a rename.
function numstat(buffer) {
  const parts = buffer.toString('utf8').split('\0');
  const rows = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const [added, deleted, name] = parts[i].split('\t');
    const file = name === '' ? parts[(i += 2)] : name;
    rows.push(added === '-' ? { path: file, binary: true } : { path: file, added: Number(added), deleted: Number(deleted) });
  }
  return rows;
}

// Untracked files count as additions when comparing with the working tree; Git's own
// heuristic treats a NUL in the first 8000 bytes as binary.
function untracked(root) {
  const listed = git(root, ['ls-files', '-z', '--others', '--exclude-standard']);
  if (listed.status !== 0) return null;
  return listed.stdout.toString('utf8').split('\0').filter(Boolean).map(file => {
    // Git stores a symlink as a one-line blob; anything else that is not a regular file,
    // such as a nested repository or a FIFO, is listed without reading it.
    const stat = fs.lstatSync(path.join(root, file));
    if (stat.isSymbolicLink()) return { path: file, added: 1, deleted: 0 };
    if (!stat.isFile()) return { path: file, binary: true };
    const bytes = fs.readFileSync(path.join(root, file));
    if (bytes.subarray(0, 8000).includes(0)) return { path: file, binary: true };
    const text = bytes.toString('utf8');
    const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    return { path: file, added: lines, deleted: 0 };
  });
}

function band(lines) {
  return lines < 400 ? 'under-400' : lines <= 600 ? '400-600' : 'over-600';
}

function diffSize(projectRoot, base, head) {
  let root;
  try { root = fs.realpathSync(path.resolve(projectRoot)); }
  catch { return fail('SIZE_PROJECT'); }
  // Paths from diff and check-attr are relative to the repository's top level, so work there.
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) return fail('SIZE_PROJECT');
  root = top.stdout.toString('utf8').replace(/\n$/, '');
  for (const rev of head === undefined ? [base] : [base, head]) {
    if (git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${rev}^{commit}`]).status !== 0) {
      return fail('SIZE_REVISION', rev);
    }
  }
  const diff = git(root, ['diff', '--numstat', '-z', '-M', '--no-ext-diff', '--no-textconv', base,
    ...(head === undefined ? [] : [head]), '--']);
  if (diff.status !== 0) return fail('SIZE_GIT');
  let rows = numstat(diff.stdout);
  if (head === undefined) {
    const extra = untracked(root);
    if (extra === null) return fail('SIZE_GIT');
    rows = rows.concat(extra);
  }
  const attrs = rows.length ? git(root, ['check-attr', '-z', '--stdin', 'linguist-generated'],
    rows.map(row => row.path).join('\0') + '\0') : { status: 0, stdout: Buffer.alloc(0) };
  if (attrs.status !== 0) return fail('SIZE_GIT');
  const generated = new Set();
  const fields = attrs.stdout.toString('utf8').split('\0');
  for (let i = 0; i + 2 < fields.length; i += 3) {
    if (fields[i + 2] === 'true' || fields[i + 2] === 'set') generated.add(fields[i]);
  }
  const result = { base, head: head ?? 'working tree', counted: { files: 0, added: 0, deleted: 0, lines: 0 },
    lockfiles: [], generated: [], binary: [] };
  for (const row of rows) {
    if (row.binary) { result.binary.push(row.path); continue; }
    const entry = { path: row.path, added: row.added, deleted: row.deleted };
    if (lockfiles.has(path.posix.basename(row.path))) result.lockfiles.push(entry);
    else if (generated.has(row.path)) result.generated.push(entry);
    else {
      result.counted.files++;
      result.counted.added += row.added;
      result.counted.deleted += row.deleted;
    }
  }
  result.counted.lines = result.counted.added + result.counted.deleted;
  result.band = band(result.counted.lines);
  return result;
}

function main(args, out = process.stdout, err = process.stderr) {
  if (args.length < 2 || args.length > 3 || !args[0] || args[0].startsWith('--') ||
    !args.slice(1).every(rev => revision.test(rev))) {
    err.write(`SIZE_USAGE: ${bodies.SIZE_USAGE}\n`);
    return 2;
  }
  const result = diffSize(args[0], args[1], args[2]);
  if (result.error) {
    err.write(`${result.error.code}: ${result.error.message}\n`);
    return 1;
  }
  out.write(JSON.stringify(result) + '\n');
  return 0;
}

module.exports = { diffSize, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
