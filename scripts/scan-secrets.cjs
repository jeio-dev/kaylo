#!/usr/bin/env node
'use strict';

// A deliberately bounded local adapter: no shell, project config, raw diagnostics,
// report publication, installation, index-entry changes, commits, or network operations.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const limit = 64 * 1024 * 1024;
const supportedVersion = '8.30.1';
class ScanError extends Error {
  constructor(state) { super(state); this.state = state; }
}
const fail = state => { throw new ScanError(state); };
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { timeout: 60000, killSignal: 'SIGKILL', maxBuffer: limit, ...options });
  if (result.error) fail(result.error.code === 'ENOENT' ? 'missing-tool' :
    result.error.code === 'ETIMEDOUT' ? 'timeout' : 'error');
  if (result.signal) fail('error');
  return result;
}
function scan(root, mode, refs = [], options = {}) {
  let scratch;
  try {
    if (!['candidate', 'history'].includes(mode) ||
        (mode === 'candidate' ? refs.length !== 0 : refs.length !== 2)) fail('usage');
    const cwd = fs.realpathSync(root);
    const gitEnv = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1' };
    // GIT_INDEX_FILE is intentionally retained: hooks/temporary indexes select
    // their actual candidate. Git replacement objects must not hide history.
    const git = (...args) => {
      const result = run('git', ['--no-pager', ...args], { cwd, env: gitEnv });
      if (result.status !== 0) fail('incomplete');
      return result.stdout;
    };
    if (git('rev-parse', '--show-toplevel').toString().trim() !== cwd) fail('incomplete');
    if (git('rev-parse', '--is-shallow-repository').toString().trim() !== 'false') fail('incomplete');
    // Git grafts also rewrite ancestry. Refuse them instead of certifying a range.
    const grafts = git('rev-parse', '--git-path', 'info/grafts').toString().trim();
    if (fs.existsSync(path.resolve(cwd, grafts))) fail('incomplete');
    const resolve = ref => {
      if (!ref || ref.startsWith('-') || /[\x00-\x20\x7f]/.test(ref)) fail('incomplete');
      return git('rev-parse', '--verify', ref + '^{commit}').toString().trim();
    };
    let identity;
    let trees;
    let delta;
    if (mode === 'candidate') {
      const tree = git('write-tree').toString().trim();
      const headResult = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd, env: gitEnv });
      let head = null;
      if (headResult.status === 0) head = resolve('HEAD');
      else {
        // An unborn branch is supported; an unreadable/corrupt existing ref isn't.
        const branch = git('symbolic-ref', '-q', 'HEAD').toString().trim();
        const exists = run('git', ['show-ref', '--verify', '--quiet', branch], { cwd, env: gitEnv });
        if (exists.status !== 1) fail('incomplete');
      }
      identity = { tree, parent: head };
      trees = [tree];
      delta = head ? git('diff', '--no-ext-diff', '--no-textconv', '--binary', head, tree, '--') : Buffer.alloc(0);
    } else {
      const base = resolve(refs[0]);
      const head = resolve(refs[1]);
      if (run('git', ['merge-base', '--is-ancestor', base, head], { cwd, env: gitEnv }).status !== 0) fail('incomplete');
      const commits = git('rev-list', base + '..' + head).toString().trim().split('\n').filter(Boolean);
      identity = { base, head, commits: commits.length };
      trees = commits;
      // Include deletions and merge-parent changes, even if a value is absent
      // from every outgoing final tree. No textconv, external diff, or lazy fetch.
      delta = git('log', '--format=', '--no-ext-diff', '--no-textconv', '--binary',
        '--full-history', '-m', '-p', base + '..' + head, '--');
    }
    const pieces = [];
    let bytes = 0;
    const decode = buffer => {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { fail('incomplete'); }
    };
    const append = buffer => {
      bytes += buffer.length + 1;
      if (bytes > limit || buffer.includes(0)) fail('incomplete');
      const text = decode(buffer);
      if (text.split('\n').some(line => Buffer.byteLength(line) > 60000)) fail('incomplete');
      // Binary patches are encoded data, not demonstrated binary coverage.
      if (/^GIT binary patch$/m.test(text)) fail('incomplete');
      pieces.push(buffer, Buffer.from('\n'));
    };
    append(delta);
    const blobs = new Set();
    for (const tree of trees) {
      if (mode === 'history') append(git('cat-file', 'commit', tree));
      for (const entry of decode(git('ls-tree', '-rz', '--full-tree', tree)).split('\0').filter(Boolean)) {
        const match = entry.match(/^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/);
        if (!match || match[2] !== 'blob' || !['100644', '100755', '120000'].includes(match[1])) fail('incomplete');
        // Names can themselves carry credentials; never print names or snippets.
        append(Buffer.from(match[4]));
        if (!blobs.has(match[3])) {
          append(git('cat-file', 'blob', match[3]));
          blobs.add(match[3]);
        }
      }
    }
    const input = Buffer.concat(pieces);
    const inputDigest = 'sha256:' + createHash('sha256').update(input).digest('hex');
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-secret-scan-'));
    fs.chmodSync(scratch, 0o700);
    // Never inherit detector/ignore/report settings. Empty cwd prevents automatic
    // project .gitleaks.toml/.gitleaksignore discovery. All content is stdin.
    const scannerEnv = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'TMPDIR', 'TEMP', 'TMP'].includes(key.toUpperCase())));
    const binary = options.binary || 'gitleaks';
    const version = run(binary, ['version'], { cwd: scratch, env: scannerEnv });
    if (version.status !== 0) fail('error');
    if (version.stdout.toString().trim() !== supportedVersion) fail('unsupported-version');
    const result = run(binary, ['stdin', '--no-banner', '--no-color', '--redact=100',
      '--log-level=error', '--exit-code=10', '--ignore-gitleaks-allow', '--max-decode-depth=5',
      '--timeout=55', '--report-format=json', '--report-path=report.json'],
    { cwd: scratch, env: scannerEnv, input, timeout: options.timeout || 60000 });
    if (![0, 10].includes(result.status) || result.stderr.length) fail('error');
    let report;
    try { report = JSON.parse(fs.readFileSync(path.join(scratch, 'report.json'), 'utf8')); }
    catch { fail('incomplete'); }
    if (!Array.isArray(report) || (result.status === 0) !== (report.length === 0)) fail('incomplete');
    if (mode === 'candidate') {
      const now = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd, env: gitEnv });
      const parent = now.status === 0 ? resolve('HEAD') : null;
      if (git('write-tree').toString().trim() !== identity.tree || parent !== identity.parent) fail('changed');
    }
    // Both output streams and the report are deliberately discarded, even on
    // errors. Only fixed states, counts and Git/content identities cross out.
    return { state: result.status === 10 ? 'finding' : 'clean', mode,
      tool: 'gitleaks', version: supportedVersion, configuration: 'built-in defaults; project suppressions disabled',
      identity, inputDigest, blobs: blobs.size, findings: report.length,
      coverage: 'UTF-8 Git trees and delta; binary/submodules/oversize unsupported' };
  } catch (error) {
    return { state: error instanceof ScanError ? error.state : 'error', ...(['candidate', 'history'].includes(mode) ? { mode } : {}) };
  } finally {
    if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
  }
}
function main(args, out = process.stdout) {
  const [root, mode, ...refs] = args;
  const result = root ? scan(root, mode, refs) : { state: 'usage' };
  out.write(JSON.stringify(result) + '\n');
  return result.state === 'clean' ? 0 : result.state === 'finding' ? 1 : 2;
}
module.exports = { scan, main, supportedVersion };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
