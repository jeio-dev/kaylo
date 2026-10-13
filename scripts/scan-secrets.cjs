#!/usr/bin/env node
'use strict';

// Local Git-object adapter. No shell, project detector config, raw diagnostics,
// installation, index-entry changes, publication or network operations.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const limit = 64 * 1024 * 1024;
const supportedVersion = '>=8.30.1 <9';
const policyPath = '.kaylo/secret-findings.json';
const oidPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const acceptsVersion = value => {
  const match = /^8\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  return !!match && (+match[1] > 30 || (+match[1] === 30 && +match[2] >= 1));
};
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
function parseDispositions(bytes) {
  let policy;
  try { policy = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('invalid-dispositions'); }
  const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === expected.sort().join(',');
  if (!keys(policy, ['format', 'findings']) || policy.format !== 1 || !Array.isArray(policy.findings)) fail('invalid-dispositions');
  const seen = new Set();
  for (const entry of policy.findings) {
    if (!keys(entry, ['fingerprint', 'reason']) || !digestPattern.test(entry.fingerprint) ||
        typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 512 ||
        /[\x00-\x1f\x7f]/.test(entry.reason) || seen.has(entry.fingerprint)) fail('invalid-dispositions');
    seen.add(entry.fingerprint);
  }
  return seen;
}
function scan(root, mode, refs = [], options = {}) {
  let scratch;
  try {
    if (!['candidate', 'history'].includes(mode) ||
        (mode === 'candidate' ? refs.length !== 0 : refs.length !== 2) ||
        (options.dispositions !== undefined && !digestPattern.test(options.dispositions))) fail('usage');
    const cwd = fs.realpathSync(root);
    const gitEnv = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1' };
    // Retain GIT_INDEX_FILE: hooks and alternate indexes select their candidate.
    const git = (...args) => {
      const result = run('git', ['--no-pager', ...args], { cwd, env: gitEnv });
      if (result.status !== 0) fail('incomplete');
      return result.stdout;
    };
    if (path.relative(cwd, fs.realpathSync(git('rev-parse', '--show-toplevel').toString().trim())) !== '') fail('incomplete');
    if (git('rev-parse', '--is-shallow-repository').toString().trim() !== 'false') fail('incomplete');
    const grafts = git('rev-parse', '--git-path', 'info/grafts').toString().trim();
    if (fs.existsSync(path.resolve(cwd, grafts))) fail('incomplete');
    const resolve = ref => {
      if (!ref || ref.startsWith('-') || /[\x00-\x20\x7f]/.test(ref)) fail('incomplete');
      const value = git('rev-parse', '--verify', ref + '^{commit}').toString().trim();
      if (!oidPattern.test(value)) fail('incomplete');
      return value;
    };
    const headParent = () => {
      const result = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd, env: gitEnv });
      if (result.status === 0) return resolve('HEAD');
      const branch = git('symbolic-ref', '-q', 'HEAD').toString().trim();
      if (run('git', ['show-ref', '--verify', '--quiet', branch], { cwd, env: gitEnv }).status !== 1) fail('incomplete');
      return null;
    };
    let identity, trees, policyTree, baseline;
    if (mode === 'candidate') {
      const tree = git('write-tree').toString().trim();
      if (!oidPattern.test(tree)) fail('incomplete');
      baseline = headParent(); identity = { tree, parent: baseline }; trees = [tree]; policyTree = tree;
    } else {
      baseline = refs[0] === '--root' ? null : resolve(refs[0]);
      const head = resolve(refs[1]);
      const commits = git('rev-list', baseline ? baseline + '..' + head : head).toString().trim().split('\n').filter(Boolean);
      if (!commits.every(value => oidPattern.test(value))) fail('incomplete');
      identity = { base: baseline, head, commits: commits.length }; trees = commits; policyTree = head;
    }
    const treeCache = new Map();
    const entries = tree => {
      if (!treeCache.has(tree)) {
        let text;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(git('ls-tree', '-rz', '--full-tree', tree)); }
        catch (error) { if (error instanceof ScanError) throw error; fail('incomplete'); }
        treeCache.set(tree, text.split('\0').filter(Boolean).map(entry => {
          const match = entry.match(/^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]+)\t([\s\S]+)$/);
          if (!match || !oidPattern.test(match[3]) || (match[1] === '160000') !== (match[2] === 'commit')) fail('incomplete');
          return { kind: match[2] === 'commit' ? 'submodule' : 'blob', object: match[3], name: match[4] };
        }));
      }
      return treeCache.get(tree);
    };
    const prior = new Set(baseline ? entries(baseline).map(entry => entry.object) : []);
    const policyEntry = entries(policyTree).find(entry => entry.name === policyPath);
    if (policyEntry && policyEntry.kind !== 'blob') fail('invalid-dispositions');
    let dispositions = { digest: null, approved: false, entries: 0 };
    let approved = new Set();
    if (policyEntry) {
      const bytes = git('cat-file', 'blob', policyEntry.object);
      if (bytes.length > 65536) fail('invalid-dispositions');
      approved = parseDispositions(bytes);
      dispositions = { digest: digest(bytes), approved: options.dispositions === digest(bytes), entries: approved.size };
    }
    if (options.dispositions && !dispositions.approved) fail('changed-dispositions');
    if (!dispositions.approved) approved.clear();

    const skipped = { binary: 0, longLine: 0, oversized: 0, submodule: 0 };
    const skippedObjects = [];
    const skip = (source, reason) => {
      skipped[reason]++;
      skippedObjects.push({ kind: source.kind, object: source.object, reason,
        newContent: source.kind === 'commit' || !prior.has(source.object) });
    };
    const sources = new Map();
    const names = new Map();
    for (const tree of trees) {
      if (mode === 'history') sources.set(tree, { kind: 'commit', object: tree });
      for (const entry of entries(tree)) {
        names.set(digest(Buffer.from(entry.name)), { kind: 'path', object: digest(Buffer.from(entry.name)), bytes: Buffer.from(entry.name) });
        if (!sources.has(entry.object)) sources.set(entry.object, { kind: entry.kind, object: entry.object });
      }
    }
    const pieces = [], spans = [];
    let bytes = 0, nextLine = 1;
    const append = (buffer, source) => {
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { skip(source, 'binary'); return; }
      if (buffer.includes(0)) { skip(source, 'binary'); return; }
      if (text.split('\n').some(line => Buffer.byteLength(line) > 60000)) { skip(source, 'longLine'); return; }
      const separator = Buffer.from('\n# kaylo object boundary\n');
      if (bytes + buffer.length + separator.length > limit) { skip(source, 'oversized'); return; }
      pieces.push(Buffer.from(buffer), separator); bytes += buffer.length + separator.length;
      const lines = text.split('\n').length;
      spans.push({ ...source, bytes: undefined, first: nextLine, last: nextLine + lines - 1 });
      nextLine += lines + 1;
    };
    for (const name of names.values()) append(name.bytes, name);
    const objectSources = [...sources.values()].filter(source => {
      if (source.kind === 'submodule') { skip(source, 'submodule'); return false; }
      return true;
    });
    // Size-check before bulk reads; batch plumbing avoids one process per blob.
    if (objectSources.length) {
      const checks = run('git', ['cat-file', '--batch-check'], { cwd, env: gitEnv,
        input: objectSources.map(source => source.object).join('\n') + '\n' });
      if (checks.status !== 0) fail('incomplete');
      const lines = checks.stdout.toString().trim().split('\n');
      if (lines.length !== objectSources.length) fail('incomplete');
      const pending = [];
      lines.forEach((line, index) => {
        const match = line.match(/^([a-f0-9]+) (blob|commit) (\d+)$/);
        const source = objectSources[index];
        if (!match || match[1] !== source.object || match[2] !== source.kind || !Number.isSafeInteger(+match[3])) fail('incomplete');
        source.size = +match[3];
        if (source.size > limit - 1024) skip(source, 'oversized'); else pending.push(source);
      });
      let pendingIndex = 0;
      while (pendingIndex < pending.length) {
        const batch = []; let size = 0;
        while (pendingIndex < pending.length && size + pending[pendingIndex].size + 256 <= limit) {
          const source = pending[pendingIndex++]; batch.push(source); size += source.size + 256;
        }
        const result = run('git', ['cat-file', '--batch'], { cwd, env: gitEnv,
          input: batch.map(source => source.object).join('\n') + '\n' });
        if (result.status !== 0) fail('incomplete');
        let offset = 0;
        for (const source of batch) {
          const newline = result.stdout.indexOf(10, offset);
          if (newline < 0 || result.stdout.subarray(offset, newline).toString() !== `${source.object} ${source.kind} ${source.size}`) fail('incomplete');
          const start = newline + 1, end = start + source.size;
          if (end >= result.stdout.length || result.stdout[end] !== 10) fail('incomplete');
          append(result.stdout.subarray(start, end), source); offset = end + 1;
        }
        if (offset !== result.stdout.length) fail('incomplete');
      }
    }
    const input = Buffer.concat(pieces);
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-secret-scan-')); fs.chmodSync(scratch, 0o700);
    const scannerEnv = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'TMPDIR', 'TEMP', 'TMP'].includes(key.toUpperCase())));
    const binary = options.binary || 'gitleaks';
    const versionResult = run(binary, ['version'], { cwd: scratch, env: scannerEnv });
    if (versionResult.status !== 0) fail('error');
    const version = versionResult.stdout.toString().trim();
    if (!acceptsVersion(version)) fail('unsupported-version');
    const result = run(binary, ['stdin', '--no-banner', '--no-color', '--redact=100',
      '--log-level=error', '--exit-code=10', '--ignore-gitleaks-allow', '--max-decode-depth=5',
      '--timeout=55', '--report-format=json', '--report-path=report.json'],
    { cwd: scratch, env: scannerEnv, input, timeout: options.timeout || 60000 });
    if (![0, 10].includes(result.status) || result.stderr.length) fail('error');
    let report;
    try { report = JSON.parse(fs.readFileSync(path.join(scratch, 'report.json'), 'utf8')); }
    catch { fail('incomplete'); }
    if (!Array.isArray(report) || (result.status === 0) !== (report.length === 0)) fail('incomplete');
    const locations = new Map(), dismissed = new Map();
    for (const finding of report) {
      if (!/^[a-z0-9-]{1,100}$/.test(finding.RuleID) ||
          !['StartLine', 'EndLine', 'StartColumn', 'EndColumn'].every(key => Number.isSafeInteger(finding[key]) && finding[key] >= 0) || finding.StartLine < 1 || finding.EndLine < finding.StartLine) fail('incomplete');
      const source = spans.find(span => finding.StartLine >= span.first && finding.EndLine <= span.last);
      if (!source) fail('incomplete');
      const location = { rule: finding.RuleID, kind: source.kind, object: source.object,
        line: finding.StartLine - source.first + 1, endLine: finding.EndLine - source.first + 1,
        column: finding.StartColumn, endColumn: finding.EndColumn };
      location.fingerprint = digest(Buffer.from(JSON.stringify(location)));
      // Policy-file findings cannot dismiss themselves. Reasons are never echoed.
      const target = approved.has(location.fingerprint) && source.object !== policyEntry?.object ? dismissed : locations;
      target.set(location.fingerprint, location);
    }
    if (mode === 'candidate' && (git('write-tree').toString().trim() !== identity.tree || headParent() !== identity.parent)) fail('changed');
    const complete = skippedObjects.length === 0;
    return { state: locations.size ? 'finding' : complete ? 'clean' : 'partial', mode,
      tool: 'gitleaks', version, configuration: 'built-in defaults; project detector suppressions disabled',
      identity, inputDigest: digest(input), blobs: objectSources.filter(source => source.kind === 'blob').length,
      findings: locations.size, locations: [...locations.values()], dismissed: [...dismissed.values()],
      dispositions, skipped, skippedObjects, coverage: { complete,
        scope: mode === 'candidate' ? 'selected candidate tree and names' : 'outgoing trees, names and commit metadata' } };
  } catch (error) {
    const state = error instanceof ScanError ? error.state : 'error';
    const result = { state, ...(['candidate', 'history'].includes(mode) ? { mode } : {}) };
    if (['missing-tool', 'unsupported-version'].includes(state)) result.nextAction =
      'Install Gitleaks >=8.30.1 <9 using approved project tooling, or establish an equivalent scanner; no automatic installation.';
    return result;
  } finally {
    if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
  }
}
function main(args, out = process.stdout) {
  const parsed = [...args]; const flag = parsed.indexOf('--dispositions'); const options = {};
  if (flag !== -1) {
    if (flag !== parsed.length - 2 || !digestPattern.test(parsed[flag + 1])) {
      out.write(JSON.stringify({ state: 'usage' }) + '\n'); return 2;
    }
    options.dispositions = parsed[flag + 1]; parsed.splice(flag);
  }
  const [root, mode, ...refs] = parsed;
  const result = root ? scan(root, mode, refs, options) : { state: 'usage' };
  out.write(JSON.stringify(result) + '\n');
  return result.state === 'clean' ? 0 : result.state === 'finding' ? 1 : 2;
}
module.exports = { scan, main, supportedVersion, acceptsVersion };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
