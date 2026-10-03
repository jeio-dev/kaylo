'use strict';

// Installer behavior against stub host CLIs. Stubs log their argv and print
// canned output; no real host, network, or normal profile is touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const kaylo = path.join(repo, 'bin', 'kaylo.cjs');
const { version } = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const tag = `v${version}`;
const readOnly = new Set(['claude plugin list --json', 'claude plugin marketplace list --json', 'codex plugin list --json',
  'codex plugin marketplace list --json', 'agy plugin list', 'gemini extensions list']);
// One stub for every host: the scenario maps "<host> <args>" to a response, or to
// a list of responses used in order (the last one repeats).
const stub = `#!${process.execPath}
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const host = path.basename(process.argv[1]);
const key = [host, ...process.argv.slice(2)].join(' ');
fs.appendFileSync(process.env.KAYLO_STUB_LOG, JSON.stringify(key) + '\\n');
const scenario = JSON.parse(fs.readFileSync(process.env.KAYLO_STUB_SCENARIO, 'utf8'));
const counts = process.env.KAYLO_STUB_SCENARIO + '.counts';
const seen = fs.existsSync(counts) ? JSON.parse(fs.readFileSync(counts, 'utf8')) : {};
seen[key] = (seen[key] || 0) + 1;
fs.writeFileSync(counts, JSON.stringify(seen));
let response = scenario[key] || {};
if (Array.isArray(response)) response = response[Math.min(seen[key], response.length) - 1];
const text = value => value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
process.stdout.write(text(response.stdout));
process.stderr.write(text(response.stderr));
process.exitCode = response.status || 0;
`;
const payload = ['skills', 'agents', 'claude-agents', 'templates', 'scripts', 'hooks', 'WORKERS.md',
  '.claude-plugin', 'gemini-extension.json'];
// An installed copy of this package, optionally with another manifest version or an altered file.
function copy(dir, { as = version, alter = false } = {}) {
  for (const entry of payload) fs.cpSync(path.join(repo, entry), path.join(dir, entry), { recursive: true });
  for (const file of ['.claude-plugin/plugin.json', 'gemini-extension.json']) {
    const target = path.join(dir, file);
    fs.writeFileSync(target, JSON.stringify({ ...JSON.parse(fs.readFileSync(target, 'utf8')), version: as }));
  }
  if (alter) fs.appendFileSync(path.join(dir, 'templates', 'PHASE.md'), '\nAltered\n');
  return dir;
}
function setup(t, { hosts = ['claude', 'codex', 'agy', 'gemini'] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-install-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bin = path.join(dir, 'bin');
  const home = path.join(dir, 'home');
  fs.mkdirSync(bin);
  fs.mkdirSync(home);
  for (const host of hosts) fs.writeFileSync(path.join(bin, host), stub, { mode: 0o755 });
  const env = { PATH: bin, HOME: home, KAYLO_STUB_LOG: path.join(dir, 'log'), KAYLO_STUB_SCENARIO: path.join(dir, 'scenario.json') };
  fs.writeFileSync(env.KAYLO_STUB_LOG, '');
  const ctx = {
    dir, home, env,
    roots: {
      claude: path.join(home, '.claude', 'plugins', 'cache', 'kaylo', 'kaylo', version),
      codex: path.join(home, '.codex', 'plugins', 'cache', 'kaylo', 'kaylo', version),
      agy: path.join(home, '.gemini', 'config', 'plugins', 'kaylo'),
      gemini: path.join(home, '.gemini', 'extensions', 'kaylo')
    },
    scenario(value) {
      fs.writeFileSync(env.KAYLO_STUB_SCENARIO, JSON.stringify(value));
    },
    run(args, input = '') {
      const result = spawnSync(process.execPath, [kaylo, ...args], { env, input, encoding: 'utf8', cwd: dir });
      result.log = fs.readFileSync(env.KAYLO_STUB_LOG, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
      result.mutations = result.log.filter(line => !readOnly.has(line));
      return result;
    }
  };
  ctx.scenario({});
  return ctx;
}
const claudeEntry = (root, as = version) => ({ id: 'kaylo@kaylo', version: as, scope: 'user', enabled: true, installPath: root });
const codexList = (as = version) => ({ installed: [{ pluginId: 'kaylo@kaylo', name: 'kaylo', version: as, installed: true }], available: [] });
const geminiList = (as = version) => `✓ kaylo (${as})\n Path: somewhere\n Ref: v${as}\n`;
// Nothing installed before; every host installs and reports this release.
function fresh(ctx) {
  for (const id of ['claude', 'codex', 'agy', 'gemini']) copy(ctx.roots[id]);
  return {
    'claude plugin marketplace list --json': { stdout: [] },
    'claude plugin list --json': [{ stdout: [] }, { stdout: [claudeEntry(ctx.roots.claude)] }],
    'codex plugin marketplace list --json': { stdout: { marketplaces: [] } },
    'codex plugin list --json': { stdout: codexList() },
    'codex plugin add kaylo@kaylo --json': { stdout: { pluginId: 'kaylo@kaylo', version, installedPath: ctx.roots.codex } },
    'agy plugin list': { stdout: { imports: [] } },
    'gemini extensions list': { stderr: 'No extensions installed.\n' }
  };
}
const byHost = (log, host) => log.filter(line => line.startsWith(`${host} `));

test('install runs the pinned native commands on every host and verifies each one', t => {
  const ctx = setup(t);
  ctx.scenario(fresh(ctx));
  const result = ctx.run(['install', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, [
    `claude plugin marketplace add jeio-dev/kaylo@${tag}`,
    'claude plugin install kaylo@kaylo',
    `codex plugin marketplace add jeio-dev/kaylo --ref ${tag}`,
    'codex plugin add kaylo@kaylo --json',
    `agy plugin install ${repo}`,
    `gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`
  ]);
  for (const id of ['claude', 'codex', 'agy', 'gemini']) assert.match(result.stdout, new RegExp(`${tag}, files verified at ${ctx.roots[id]}`));
  assert.match(result.stdout, /\/kaylo:build/);
  assert.match(result.stdout, /Start a new session\./);
});

test('every path the installer passes or verifies is the installer root or under HOME', t => {
  const ctx = setup(t);
  ctx.scenario(fresh(ctx));
  const result = ctx.run(['--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const paths = [...result.log.join(' ').matchAll(/(?:^|\s)(\/\S+)/g), ...result.stdout.matchAll(/verified at (\/\S+)/g)]
    .map(match => match[1]);
  assert(paths.length >= 5);
  for (const file of paths) assert(file === repo || file.startsWith(`${ctx.home}${path.sep}`), `outside HOME: ${file}`);
});

test('update replaces a differently pinned Claude marketplace, any Codex marketplace, and an installed Gemini extension', t => {
  const ctx = setup(t);
  ctx.scenario({
    ...fresh(ctx),
    'claude plugin marketplace list --json': { stdout: [{ name: 'kaylo', source: 'github', repo: 'jeio-dev/kaylo', ref: 'v0.9.2' }] },
    'claude plugin list --json': [{ stdout: [claudeEntry('/old', '0.9.2')] }, { stdout: [claudeEntry(ctx.roots.claude)] }],
    'codex plugin marketplace list --json': { stdout: { marketplaces: [{ name: 'kaylo', root: '/x' }] } },
    'agy plugin list': { stdout: { imports: [{ name: 'kaylo' }] } },
    'gemini extensions list': [{ stderr: geminiList('0.9.2') }]
  });
  const result = ctx.run(['update', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  // Removing a Claude marketplace also uninstalls the plugin, so install follows, never update.
  assert.deepEqual(byHost(result.mutations, 'claude'), ['claude plugin marketplace remove kaylo',
    `claude plugin marketplace add jeio-dev/kaylo@${tag}`, 'claude plugin install kaylo@kaylo']);
  assert.deepEqual(byHost(result.mutations, 'codex'), ['codex plugin marketplace remove kaylo',
    `codex plugin marketplace add jeio-dev/kaylo --ref ${tag}`, 'codex plugin add kaylo@kaylo --json']);
  assert.deepEqual(byHost(result.mutations, 'gemini'), ['gemini extensions uninstall kaylo',
    `gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`]);
  assert.match(result.stdout, /replaces existing marketplace kaylo \(jeio-dev\/kaylo at v0\.9\.2\)/);
  assert.match(result.stdout, /replaces existing extension kaylo/);
});

test('an existing Claude marketplace with the pinned source is kept', t => {
  const ctx = setup(t, { hosts: ['claude'] });
  const pinned = { stdout: [{ name: 'kaylo', source: 'github', repo: 'jeio-dev/kaylo', ref: tag }] };
  ctx.scenario({ ...fresh(ctx), 'claude plugin marketplace list --json': pinned,
    'claude plugin list --json': { stdout: [claudeEntry(ctx.roots.claude)] } });
  let result = ctx.run(['update', '--claude', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, ['claude plugin update kaylo@kaylo']);
  // Kept but not yet installed: install, still without touching the marketplace.
  fs.writeFileSync(ctx.env.KAYLO_STUB_LOG, '');
  fs.rmSync(`${ctx.env.KAYLO_STUB_SCENARIO}.counts`);
  ctx.scenario({ ...fresh(ctx), 'claude plugin marketplace list --json': pinned });
  result = ctx.run(['--claude', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, ['claude plugin install kaylo@kaylo']);
});

test('a Claude marketplace pinned elsewhere or unpinned is removed and re-added before install', t => {
  for (const market of [{ name: 'kaylo', source: 'github', repo: 'jeio-dev/kaylo' },
    { name: 'kaylo', source: 'git', url: 'https://example.com/fork.git', ref: tag }]) {
    const ctx = setup(t, { hosts: ['claude'] });
    ctx.scenario({ ...fresh(ctx), 'claude plugin marketplace list --json': { stdout: [market] },
      'claude plugin list --json': [{ stdout: [claudeEntry('/old')] }, { stdout: [claudeEntry(ctx.roots.claude)] }] });
    const result = ctx.run(['--claude', '--yes']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(result.mutations, ['claude plugin marketplace remove kaylo',
      `claude plugin marketplace add jeio-dev/kaylo@${tag}`, 'claude plugin install kaylo@kaylo']);
  }
});

test('uninstall removes what is listed and checks that Kaylo is gone', t => {
  const ctx = setup(t);
  ctx.scenario({
    'claude plugin marketplace list --json': [{ stdout: [{ name: 'kaylo' }] }, { stdout: [] }],
    'claude plugin list --json': [{ stdout: [claudeEntry('/x')] }, { stdout: [] }],
    'codex plugin marketplace list --json': [{ stdout: { marketplaces: [{ name: 'kaylo' }] } }, { stdout: { marketplaces: [] } }],
    'codex plugin list --json': [{ stdout: codexList() }, { stdout: { installed: [], available: [] } }],
    'agy plugin list': [{ stdout: { imports: [{ name: 'kaylo' }] } }, { stdout: { imports: [] } }],
    'gemini extensions list': [{ stderr: geminiList() }, { stderr: 'No extensions installed.\n' }]
  });
  const result = ctx.run(['uninstall', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, ['claude plugin uninstall kaylo@kaylo', 'claude plugin marketplace remove kaylo',
    'codex plugin remove kaylo@kaylo', 'codex plugin marketplace remove kaylo', 'agy plugin uninstall kaylo',
    'gemini extensions uninstall kaylo']);
  assert.match(result.stdout, /Gemini CLI: removed/);
});

test('a Gemini extension list on stdout is read as well as one on stderr', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario({ 'gemini extensions list': { stdout: geminiList('0.9.2') } });
  const result = ctx.run(['update', '--gemini', '--dry-run']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /\$ gemini extensions uninstall kaylo/);
});

test('uninstall fails a host whose list still shows Kaylo', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario({ 'gemini extensions list': { stderr: geminiList() } });
  const result = ctx.run(['uninstall', '--gemini', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Gemini CLI: failed: Kaylo is still listed after uninstall/);
});

test('--dry-run runs only read-only commands', t => {
  for (const command of ['install', 'update', 'uninstall']) {
    const ctx = setup(t);
    ctx.scenario({ ...fresh(ctx), 'claude plugin marketplace list --json': { stdout: [{ name: 'kaylo', source: 'github', repo: 'x/y' }] },
      'codex plugin marketplace list --json': { stdout: { marketplaces: [{ name: 'kaylo' }] } },
      'gemini extensions list': { stderr: geminiList('0.9.2') }, 'agy plugin list': { stdout: { imports: [{ name: 'kaylo' }] } } });
    const result = ctx.run([command, '--all', '--dry-run']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(result.mutations, []);
    assert(result.log.length >= 4);
    assert.match(result.stdout, /Dry run: nothing was changed\./);
    if (command !== 'uninstall') assert.match(result.stdout, /\$ codex plugin marketplace remove kaylo/);
  }
});

test('without a terminal and without host flags, it exits 2', t => {
  const ctx = setup(t);
  ctx.scenario(fresh(ctx));
  const result = ctx.run(['install']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Choose hosts with/);
  assert.deepEqual(result.log, []);
});

test('usage errors, --help, and --version', t => {
  const ctx = setup(t);
  assert.equal(ctx.run(['--bogus']).status, 2);
  assert.equal(ctx.run(['install', 'update']).status, 2);
  const help = ctx.run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Usage: kaylo/);
  assert.equal(ctx.run(['--version']).stdout.trim(), version);
});

test('an undetected host cannot be requested, is skipped by --all, and cannot be picked', async t => {
  const ctx = setup(t, { hosts: ['claude', 'agy', 'gemini'] });
  fs.writeFileSync(path.join(ctx.dir, 'bin', 'codex'), 'not executable', { mode: 0o644 });
  ctx.scenario(fresh(ctx));
  let result = ctx.run(['--codex', '--claude', '--yes']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Codex was requested with --codex, but `codex` is not found on PATH\./);
  assert.deepEqual(result.log, []);
  result = ctx.run(['--all', '--dry-run']);
  assert.equal(result.status, 0);
  assert.equal(byHost(result.log, 'codex').length, 0);
  assert.doesNotMatch(result.stdout, /^Codex$/m);
  const { prompter, pick } = require(kaylo);
  const input = new PassThrough();
  const output = new PassThrough();
  let shown = '';
  output.on('data', chunk => { shown += chunk; });
  // Both answers arrive at once, as when pasted; neither may be lost.
  input.end('2 3\n\n');
  const reader = prompter(input, output);
  assert.deepEqual(await pick(new Set(['claude', 'agy', 'gemini']), reader.ask, output), ['claude', 'gemini']);
  reader.close();
  assert.match(shown, /2\. \[ \] Codex \(not found on PATH\)/);
  assert.match(shown, /Codex is not found on PATH and cannot be selected\./);
});

test('without --yes the plan is confirmed first; any answer but yes changes nothing', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario(fresh(ctx));
  let result = ctx.run(['--gemini'], 'n\n');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Proceed\? \[y\/N\]/);
  assert.deepEqual(result.mutations, []);
  result = ctx.run(['--gemini'], 'y\n');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, [`gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`]);
});

test('a failing host stops its own steps, later hosts still run, and the exit code is 1', t => {
  const ctx = setup(t);
  ctx.scenario({ ...fresh(ctx), [`claude plugin marketplace add jeio-dev/kaylo@${tag}`]: { status: 1, stderr: 'clone failed' } });
  const result = ctx.run(['--all', '--yes']);
  assert.equal(result.status, 1);
  assert(!result.mutations.includes('claude plugin install kaylo@kaylo'));
  assert(result.mutations.includes(`gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`));
  assert.match(result.stdout, /Claude Code: failed: claude plugin marketplace add jeio-dev\/kaylo@v[\d.]+ exited with 1/);
  assert.match(result.stdout, /Gemini CLI: v[\d.]+, files verified/);
});

test('another installed version or altered installed files fail verification', t => {
  const ctx = setup(t, { hosts: ['agy', 'gemini'] });
  ctx.scenario(fresh(ctx));
  copy(ctx.roots.agy, { as: '0.9.2' });
  copy(ctx.roots.gemini, { alter: true });
  const result = ctx.run(['--all', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Antigravity: failed: installed version is 0\.9\.2, expected /);
  assert.match(result.stdout, /Gemini CLI: failed: installed files at .* do not match: .*Installed resource differs: templates\/PHASE\.md/);
});

test('a stale cached copy at this version is not chosen over an older active Claude install', t => {
  const ctx = setup(t, { hosts: ['claude'] });
  const older = copy(path.join(ctx.home, '.claude', 'plugins', 'cache', 'kaylo', 'kaylo', '0.9.2'), { as: '0.9.2' });
  ctx.scenario({ ...fresh(ctx), 'claude plugin list --json': [{ stdout: [] }, { stdout: [claudeEntry(older, '0.9.2')] }] });
  assert(fs.existsSync(path.join(ctx.roots.claude, 'skills')));
  const result = ctx.run(['--claude', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Claude Code: failed: installed version is 0\.9\.2/);
});

test('a missing active install path is "verification unavailable", even when a good cache copy exists', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex'] });
  const entry = claudeEntry(ctx.roots.claude);
  delete entry.installPath;
  ctx.scenario({ ...fresh(ctx), 'claude plugin list --json': [{ stdout: [] }, { stdout: [entry] }],
    'codex plugin add kaylo@kaylo --json': { stdout: { pluginId: 'kaylo@kaylo', version } } });
  const result = ctx.run(['--all', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Claude Code: failed: verification unavailable: Claude Code does not expose its active install path/);
  assert.match(result.stdout, /Codex: failed: verification unavailable: Codex did not report its install path/);
});

test('Codex verification uses the installedPath from its own add output, never the cache directory', t => {
  const ctx = setup(t, { hosts: ['codex'] });
  const active = copy(path.join(ctx.home, '.codex', 'active-kaylo'), { alter: true });
  ctx.scenario({ ...fresh(ctx), 'codex plugin add kaylo@kaylo --json': { stdout: { pluginId: 'kaylo@kaylo', version, installedPath: active } } });
  assert(fs.existsSync(path.join(ctx.roots.codex, 'skills')));
  const result = ctx.run(['--codex', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`Codex: failed: installed files at ${active} do not match`));
});
