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
function exportPackage(target, scratch) {
  if (ref) {
    const head = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();
    const tagged = run('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: repo }).stdout.trim();
    assert.equal(head, tagged, `Release mode needs HEAD at ${ref}; HEAD is ${head}`);
    assert.equal(run('git', ['status', '--porcelain'], { cwd: repo }).stdout, '',
      'Release mode needs a clean working tree');
    const archive = path.join(scratch, 'export.tar');
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
// Pack the export and unpack the tarball byte for byte, without npm's install renames.
function pack(t) {
  const exported = temp(t, 'export');
  const packs = temp(t, 'pack');
  const extracted = temp(t, 'extract');
  exportPackage(exported, packs);
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', packs], { cwd: exported }).stdout);
  const tarball = path.join(packs, packed[0].filename);
  run('tar', ['-xzf', tarball, '-C', extracted]);
  return { exported, tarball, root: path.join(extracted, 'package') };
}
test('the packed npm package holds exactly the exported Git files and validates', t => {
  const { exported, root } = pack(t);
  const excepted = new Set(exceptions.map(entry => entry.path));
  assert.deepEqual(list(root).filter(file => !excepted.has(file)),
    list(exported).filter(file => !excepted.has(file)),
    'npm package contents differ from the Git export; adjust `files` in package.json');
  run(process.execPath, [path.join(root, 'scripts/validate-package.cjs')]);
  run(process.execPath, [path.join(repo, 'scripts/validate-package.cjs'), '--installed', root]);
});
// npm installs rename a packed .gitignore to .npmignore (#68). Run the installer from
// npm's installed layout and require OpenCode's copy to match the tarball exactly.
test('OpenCode installs from the npm-installed package with tarball parity', t => {
  const { tarball, root } = pack(t);
  const dir = temp(t, 'npm-install');
  const project = path.join(dir, 'project');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'package.json'), '{"private": true}\n');
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-save', '--cache', path.join(dir, 'npm-cache'), tarball],
    { cwd: project });
  const installed = path.join(project, 'node_modules', 'kaylo');
  const bin = path.join(dir, 'bin');
  const home = path.join(dir, 'home');
  fs.mkdirSync(bin);
  fs.mkdirSync(home);
  fs.writeFileSync(path.join(bin, 'opencode'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const hostEnv = { PATH: bin, HOME: home, XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_DATA_HOME: path.join(home, 'data'), XDG_CACHE_HOME: path.join(home, 'cache'), XDG_STATE_HOME: path.join(home, 'state') };
  const result = spawnSync(process.execPath, [path.join(installed, 'bin', 'kaylo.cjs'), 'install', '--opencode', '--yes'],
    { encoding: 'utf8', env: hostEnv, cwd: dir });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const copy = path.join(hostEnv.XDG_DATA_HOME, 'kaylo', `v${version}`);
  assert.deepEqual(list(copy), list(root), 'OpenCode copy files differ from the tarball');
  for (const file of list(root)) {
    assert(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(copy, file))),
      `OpenCode copy differs from the tarball: ${file}`);
  }
});
test('the npm files list admits nothing Git ignores in the working tree', t => {
  const staging = path.join(repo, 'development', 'package');
  const staged = fs.existsSync(staging);
  // The guard must see the ignored local copy. Stage it only when absent, because staging
  // rebuilds the folder, and remove it only if this test made it.
  if (!staged) {
    t.after(() => fs.rmSync(staging, { recursive: true, force: true }));
    run(process.execPath, [path.join(repo, 'scripts/stage-development.cjs')]);
  }
  const files = JSON.parse(run('npm', ['pack', '--dry-run', '--json'], { cwd: repo }).stdout)[0].files
    .map(file => file.path);
  const ignored = spawnSync('git', ['check-ignore', '--stdin'], { cwd: repo, encoding: 'utf8', input: files.join('\n') });
  if (ignored.error) assert.fail(`git is required for the package inventory: ${ignored.error.message}`);
  // check-ignore exits 1 when no path is ignored, 0 when at least one is.
  assert.equal(ignored.status, 1, `npm would pack Git-ignored paths:\n${ignored.stdout}${ignored.stderr}`);
});
