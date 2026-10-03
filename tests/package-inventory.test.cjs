'use strict';

// Prove the npm package holds exactly the files Git tracks. Packs into temp
// folders only; never publishes and touches no host configuration.
// Default mode exports tracked plus new, not-ignored files from the working tree.
// Release mode (KAYLO_INVENTORY_REF=v<version>) exports that tag with git archive.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const ref = process.env.KAYLO_INVENTORY_REF;
// Paths npm adds or drops regardless of `files`, each with the npm rule that forces it.
const exceptions = [];
const env = { ...process.env, npm_config_update_notifier: 'false', npm_config_fund: 'false', npm_config_audit: 'false' };
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error) assert.fail(`${command} is required for the package inventory: ${result.error.message}`);
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stderr}`);
  return result;
}
function temp(t, name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `kaylo-${name}-`));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function list(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? list(file, base) : [path.relative(base, file).split(path.sep).join('/')];
  }).sort();
}
function exportPackage(target) {
  if (ref) {
    const head = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();
    const tagged = run('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: repo }).stdout.trim();
    assert.equal(head, tagged, `Release mode needs HEAD at ${ref}; HEAD is ${head}`);
    assert.equal(run('git', ['status', '--porcelain'], { cwd: repo }).stdout, '',
      'Release mode needs a clean working tree');
    const archive = `${target}.tar`;
    run('git', ['archive', '--format=tar', '-o', archive, ref], { cwd: repo });
    run('tar', ['-xf', archive, '-C', target]);
    fs.rmSync(archive);
    return;
  }
  const listed = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repo })
    .stdout.split('\0').filter(Boolean);
  for (const relative of new Set(listed)) {
    const source = path.join(repo, relative);
    if (!fs.existsSync(source)) continue;
    fs.mkdirSync(path.dirname(path.join(target, relative)), { recursive: true });
    fs.copyFileSync(source, path.join(target, relative));
  }
}
test('the packed npm package holds exactly the exported Git files and validates', t => {
  const exported = temp(t, 'export');
  const packs = temp(t, 'pack');
  const extracted = temp(t, 'extract');
  exportPackage(exported);
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', packs], { cwd: exported }).stdout);
  run('tar', ['-xzf', path.join(packs, packed[0].filename), '-C', extracted]);
  const root = path.join(extracted, 'package');
  const excepted = new Set(exceptions.map(entry => entry.path));
  assert.deepEqual(list(root).filter(file => !excepted.has(file)),
    list(exported).filter(file => !excepted.has(file)),
    'npm package contents differ from the Git export; adjust `files` in package.json');
  run(process.execPath, [path.join(root, 'scripts/validate-package.cjs')]);
  run(process.execPath, [path.join(repo, 'scripts/validate-package.cjs'), '--installed', root]);
});
test('the npm files list admits nothing Git ignores in the working tree', t => {
  const staging = path.join(repo, 'development', 'package');
  const staged = fs.existsSync(staging);
  // Stage the ignored local copy so the guard sees it; remove it only if this test made it.
  run(process.execPath, [path.join(repo, 'scripts/stage-development.cjs')]);
  if (!staged) t.after(() => fs.rmSync(staging, { recursive: true, force: true }));
  const files = JSON.parse(run('npm', ['pack', '--dry-run', '--json'], { cwd: repo }).stdout)[0].files
    .map(file => file.path);
  const ignored = spawnSync('git', ['check-ignore', '--stdin'], { cwd: repo, encoding: 'utf8', input: files.join('\n') });
  if (ignored.error) assert.fail(`git is required for the package inventory: ${ignored.error.message}`);
  // check-ignore exits 1 when no path is ignored, 0 when at least one is.
  assert.equal(ignored.status, 1, `npm would pack Git-ignored paths:\n${ignored.stdout}${ignored.stderr}`);
});
