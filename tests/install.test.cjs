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
  const npmStub = path.join(dir, 'npm-stub.cjs');
  const npmFixture = path.join(dir, 'npm.json');
  fs.writeFileSync(npmStub, `'use strict';
const fs = require('node:fs');
globalThis.fetch = async (url, options) => {
  fs.appendFileSync(process.env.KAYLO_NPM_LOG, JSON.stringify({ url, timeout: Boolean(options.signal) }) + '\\n');
  const fixture = JSON.parse(fs.readFileSync(process.env.KAYLO_NPM_FIXTURE, 'utf8'));
  if (fixture.fail) throw new Error('offline');
  return { ok: true, json: async () => ({ version: fixture.version }) };
};`);
  fs.writeFileSync(npmFixture, JSON.stringify({ version }));
  const env = { PATH: bin, HOME: home, KAYLO_STUB_LOG: path.join(dir, 'log'),
    KAYLO_STUB_SCENARIO: path.join(dir, 'scenario.json'), KAYLO_NPM_FIXTURE: npmFixture,
    KAYLO_NPM_LOG: path.join(dir, 'npm.log') };
  const testEnv = () => ({ ...env, NODE_OPTIONS: `--require=${npmStub} ${env.NODE_OPTIONS || ''}` });
  const ctx = {
    dir, home, env, testEnv,
    roots: {
      claude: path.join(home, '.claude', 'plugins', 'cache', 'kaylo', 'kaylo', version),
      codex: path.join(home, '.codex', 'plugins', 'cache', 'kaylo', 'kaylo', version),
      agy: path.join(home, '.gemini', 'config', 'plugins', 'kaylo'),
      gemini: path.join(home, '.gemini', 'extensions', 'kaylo')
    },
    // A new scenario also resets the stub log and response counters.
    scenario(value) {
      fs.writeFileSync(env.KAYLO_STUB_SCENARIO, JSON.stringify(value));
      fs.writeFileSync(env.KAYLO_STUB_LOG, '');
      fs.rmSync(`${env.KAYLO_STUB_SCENARIO}.counts`, { force: true });
    },
    npm(value) { fs.writeFileSync(npmFixture, JSON.stringify(value)); },
    run(args, input = '') {
      const result = spawnSync(process.execPath, [kaylo, ...args], { env: testEnv(), input, encoding: 'utf8', cwd: dir });
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
// Observed shape (Gemini CLI 0.62.0, on stderr); another extension comes first.
const geminiList = (root, as = version) => `✓ other-extension (1.0.0)\n Path: /elsewhere/other\n\n` +
  `✓ kaylo (${as})\n ID: 4590\n Path: ${root}\n Ref: v${as}\n Enabled (User): true\n`;
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
    'gemini extensions list': [{ stderr: 'No extensions installed.\n' }, { stderr: geminiList(ctx.roots.gemini) }]
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
    'gemini extensions list': [{ stderr: geminiList(ctx.roots.gemini, '0.9.2') }, { stderr: geminiList(ctx.roots.gemini) }]
  });
  const result = ctx.run(['update', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  // Removing a Claude marketplace also uninstalls the plugin, so install follows, never update.
  assert.deepEqual(byHost(result.mutations, 'claude'), ['claude plugin marketplace remove kaylo',
    `claude plugin marketplace add jeio-dev/kaylo@${tag}`, 'claude plugin install kaylo@kaylo']);
  assert.deepEqual(byHost(result.mutations, 'codex'), ['codex plugin marketplace remove kaylo',
    `codex plugin marketplace add jeio-dev/kaylo --ref ${tag}`, 'codex plugin add kaylo@kaylo --json']);
  assert.deepEqual(byHost(result.mutations, 'agy'), [`agy plugin install ${repo}`]);
  assert.deepEqual(byHost(result.mutations, 'gemini'), ['gemini extensions uninstall kaylo',
    `gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`]);
  assert.match(result.stdout, /replaces existing marketplace kaylo \(jeio-dev\/kaylo at v0\.9\.2\)/);
  assert.match(result.stdout, /replaces existing plugin kaylo/);
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
    'gemini extensions list': [{ stderr: geminiList(ctx.roots.gemini) }, { stderr: 'No extensions installed.\n' }]
  });
  const result = ctx.run(['uninstall', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, ['claude plugin uninstall kaylo@kaylo', 'claude plugin marketplace remove kaylo',
    'codex plugin remove kaylo@kaylo', 'codex plugin marketplace remove kaylo', 'agy plugin uninstall kaylo',
    'gemini extensions uninstall kaylo']);
  assert.match(result.stdout, /Gemini CLI: removed/);
});

test('uninstall with partial state runs only the steps for what is listed', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex'] });
  ctx.scenario({
    'claude plugin marketplace list --json': [{ stdout: [{ name: 'kaylo' }] }, { stdout: [] }],
    'claude plugin list --json': { stdout: [] },
    'codex plugin marketplace list --json': { stdout: { marketplaces: [] } },
    'codex plugin list --json': [{ stdout: codexList() }, { stdout: { installed: [], available: [] } }]
  });
  const result = ctx.run(['uninstall', '--all', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(result.mutations, ['claude plugin marketplace remove kaylo', 'codex plugin remove kaylo@kaylo']);
});

test('a Gemini extension list on stdout is read as well as one on stderr', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario({ 'gemini extensions list': { stdout: geminiList('/x', '0.9.2') } });
  const result = ctx.run(['update', '--gemini', '--dry-run']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /\$ gemini extensions uninstall kaylo/);
});

test('uninstall fails a host whose list still shows Kaylo', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario({ 'gemini extensions list': { stderr: geminiList(ctx.roots.gemini) } });
  const result = ctx.run(['uninstall', '--gemini', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Gemini CLI: failed: Kaylo is still listed after uninstall/);
});

test('--dry-run runs only read-only commands', t => {
  for (const command of ['install', 'update', 'uninstall']) {
    const ctx = setup(t);
    ctx.scenario({ ...fresh(ctx), 'claude plugin marketplace list --json': { stdout: [{ name: 'kaylo', source: 'github', repo: 'x/y' }] },
      'codex plugin marketplace list --json': { stdout: { marketplaces: [{ name: 'kaylo' }] } },
      'gemini extensions list': { stderr: geminiList(ctx.roots.gemini, '0.9.2') }, 'agy plugin list': { stdout: { imports: [{ name: 'kaylo' }] } } });
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
  ctx.scenario(fresh(ctx));
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

test('a missing active install path is reported even when the listed version is also wrong', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex'] });
  const entry = claudeEntry(ctx.roots.claude, '0.9.2');
  delete entry.installPath;
  ctx.scenario({ ...fresh(ctx), 'claude plugin list --json': [{ stdout: [] }, { stdout: [entry] }],
    'codex plugin list --json': { stdout: codexList('0.9.2') },
    'codex plugin add kaylo@kaylo --json': { stdout: { pluginId: 'kaylo@kaylo', version: '0.9.2' } } });
  const result = ctx.run(['--all', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`Claude Code: failed: verification unavailable: Claude Code does not expose its active install path; installed version is 0\\.9\\.2, expected ${version.replace(/\./g, '\\.')}`));
  assert.match(result.stdout, new RegExp(`Codex: failed: verification unavailable: Codex did not report its install path; installed version is 0\\.9\\.2, expected ${version.replace(/\./g, '\\.')}`));
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

test('the JSON reader tolerates notices before and after the JSON', () => {
  const { json } = require(kaylo);
  assert.deepEqual(json('{"a":1}', 'x'), { a: 1 });
  assert.deepEqual(json('Notice: cloning\n{"a":{"b":[1]}}\nDone.\n', 'x'), { a: { b: [1] } });
  assert.deepEqual(json('[warn] stale cache\n[{"id":"kaylo@kaylo"}]\n', 'x'), [{ id: 'kaylo@kaylo' }]);
  assert.deepEqual(json('{"a":1} trailing text', 'x'), { a: 1 });
  assert.throws(() => json('no json here', 'host list'), /host list did not print JSON/);
});

test('the Gemini root comes from the Path line of its list, not from HOME', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  const moved = copy(path.join(ctx.home, 'gemini-cli-home', '.gemini', 'extensions', 'kaylo'));
  ctx.scenario({ 'gemini extensions list': [{ stderr: 'No extensions installed.\n' }, { stderr: geminiList(moved) }] });
  copy(ctx.roots.gemini, { alter: true });
  const result = ctx.run(['--gemini', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, new RegExp(`Gemini CLI: ${tag}, files verified at ${moved}`));
});

test('a Gemini list without a Path line is "verification unavailable"', t => {
  const ctx = setup(t, { hosts: ['gemini'] });
  copy(ctx.roots.gemini);
  ctx.scenario({ 'gemini extensions list': [{ stderr: 'No extensions installed.\n' }, { stderr: `✓ kaylo (${version})\n Ref: ${tag}\n` }] });
  const result = ctx.run(['--gemini', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Gemini CLI: failed: verification unavailable: Gemini CLI does not expose its active install path/);
});

test('a replace that removed the previous install and then failed says so', t => {
  const ctx = setup(t, { hosts: ['claude', 'gemini'] });
  ctx.scenario({
    ...fresh(ctx),
    'claude plugin marketplace list --json': { stdout: [{ name: 'kaylo', source: 'github', repo: 'jeio-dev/kaylo', ref: 'v0.9.2' }] },
    'claude plugin list --json': { stdout: [claudeEntry('/old', '0.9.2')] },
    [`claude plugin marketplace add jeio-dev/kaylo@${tag}`]: { status: 1 },
    'gemini extensions list': { stderr: geminiList(ctx.roots.gemini, '0.9.2') },
    // A declined consent prompt makes the install exit 1.
    [`gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`]: { status: 1 }
  });
  const result = ctx.run(['update', '--all', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Claude Code: failed: claude plugin marketplace add .* exited with 1; the previous Kaylo install was removed and not replaced/);
  assert.match(result.stdout, /Gemini CLI: failed: gemini extensions install .* exited with 1; the previous Kaylo install was removed and not replaced/);
  ctx.scenario({ ...fresh(ctx), [`gemini extensions install https://github.com/jeio-dev/kaylo --ref ${tag}`]: { status: 1 } });
  assert.doesNotMatch(ctx.run(['--gemini', '--yes']).stdout, /removed and not replaced/);
  // A marketplace without an installed plugin removes no Kaylo install.
  ctx.scenario({
    ...fresh(ctx),
    'claude plugin marketplace list --json': { stdout: [{ name: 'kaylo', source: 'github', repo: 'jeio-dev/kaylo', ref: 'v0.9.2' }] },
    'claude plugin list --json': { stdout: [] },
    [`claude plugin marketplace add jeio-dev/kaylo@${tag}`]: { status: 1 }
  });
  const marketOnly = ctx.run(['--claude', '--yes']);
  assert.match(marketOnly.stdout, /Claude Code: failed: claude plugin marketplace add .* exited with 1/);
  assert.doesNotMatch(marketOnly.stdout, /removed and not replaced/);
});

// Runs main() with a fake terminal so the picker and prompts appear, then sends
// Ctrl-C or closes input at the named prompt.
function ttyRun(ctx, args, prompt, send) {
  const script = path.join(ctx.dir, 'tty.cjs');
  fs.writeFileSync(script, `'use strict';
const { PassThrough } = require('node:stream');
const { main } = require(${JSON.stringify(kaylo)});
const input = new PassThrough();
const output = new PassThrough();
input.isTTY = output.isTTY = true;
let shown = '';
output.on('data', chunk => {
  process.stdout.write(chunk);
  shown += chunk;
  if (shown.includes(${JSON.stringify(prompt)})) {
    shown = '';
    setImmediate(() => ${send === 'ctrl-c' ? "input.write('\\x03')" : 'input.end()'});
  }
});
main(${JSON.stringify(args)}, { input, output, error: process.stderr }).then(code => { process.exitCode = code; });
`);
  const result = spawnSync(process.execPath, [script], { env: ctx.testEnv(), encoding: 'utf8', cwd: ctx.dir, timeout: 20000 });
  result.mutations = fs.readFileSync(ctx.env.KAYLO_STUB_LOG, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
    .filter(line => !readOnly.has(line));
  return result;
}

function promptedRun(ctx, args, answers) {
  const script = path.join(ctx.dir, 'answers.cjs');
  fs.writeFileSync(script, `'use strict';
const fs = require('node:fs');
const { main } = require(${JSON.stringify(kaylo)});
const answers = ${JSON.stringify(answers)};
const prompt = async question => {
  process.stdout.write(question);
  const [expected, answer] = answers.shift() || [];
  if (!question.includes(expected)) throw new Error('Unexpected prompt: ' + question);
  process.stdout.write(answer + '\\n');
  return answer;
};
const fetch = async (url, options) => {
  fs.appendFileSync(process.env.KAYLO_NPM_LOG, JSON.stringify({ url, timeout: Boolean(options.signal) }) + '\\n');
  const fixture = JSON.parse(fs.readFileSync(process.env.KAYLO_NPM_FIXTURE, 'utf8'));
  if (fixture.fail) throw new Error('offline');
  return { ok: true, json: async () => ({ version: fixture.version }) };
};
main(${JSON.stringify(args)}, { input: process.stdin, output: process.stdout, error: process.stderr,
  interactive: true, prompt, fetch }).then(code => { process.exitCode = code; });
`);
  const result = spawnSync(process.execPath, [script], { env: ctx.testEnv(), encoding: 'utf8', cwd: ctx.dir, timeout: 20000 });
  result.log = fs.readFileSync(ctx.env.KAYLO_STUB_LOG, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  result.mutations = result.log.filter(line => !readOnly.has(line));
  return result;
}

test('closed input or Ctrl-C at the picker aborts with no change, with or without --yes', t => {
  for (const [args, send, code] of [[[], 'eof', 1], [['--yes'], 'eof', 1], [['--yes'], 'ctrl-c', 130], [[], 'ctrl-c', 130]]) {
    const ctx = setup(t);
    ctx.scenario(fresh(ctx));
    const result = ttyRun(ctx, args, 'press Enter to continue', send);
    assert.equal(result.status, code, `${args} ${send}: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /Nothing was changed\./);
    assert.deepEqual(result.mutations, []);
  }
});

test('closed input or Ctrl-C at the confirmation aborts with no change', t => {
  for (const [send, code] of [['eof', 1], ['ctrl-c', 130]]) {
    const ctx = setup(t, { hosts: ['gemini'] });
    ctx.scenario(fresh(ctx));
    const result = ttyRun(ctx, ['--gemini'], 'Proceed? [y/N]', send);
    assert.equal(result.status, code, result.stdout + result.stderr);
    assert.match(result.stdout, /Nothing was changed\./);
    assert.deepEqual(result.mutations, []);
  }
  const ctx = setup(t, { hosts: ['gemini'] });
  ctx.scenario(fresh(ctx));
  const result = ctx.run(['--gemini']);
  assert.equal(result.status, 1);
  assert.deepEqual(result.mutations, []);
});

function openSetup(t) {
  const ctx = setup(t, { hosts: ['opencode'] });
  ctx.env.XDG_CONFIG_HOME = path.join(ctx.home, 'xdg-config');
  ctx.env.XDG_DATA_HOME = path.join(ctx.home, 'xdg-data');
  ctx.env.XDG_CACHE_HOME = path.join(ctx.home, 'xdg-cache');
  ctx.env.XDG_STATE_HOME = path.join(ctx.home, 'xdg-state');
  const configDir = path.join(ctx.env.XDG_CONFIG_HOME, 'opencode');
  const configFile = path.join(configDir, 'opencode.jsonc');
  const data = path.join(ctx.env.XDG_DATA_HOME, 'kaylo');
  const target = path.join(data, tag);
  const skill = path.join(target, 'skills');
  fs.mkdirSync(configDir, { recursive: true });
  return { ...ctx, configDir, configFile, data, target, skill,
    seed(content) { fs.writeFileSync(configFile, content); },
    run(args, input = '') {
      const result = spawnSync(process.execPath, [kaylo, ...args], { env: ctx.testEnv(), input, encoding: 'utf8', cwd: ctx.dir });
      return result;
    }
  };
}
const openEntry = skill => `{\n  // keep\n  "skills": ["/other", ${JSON.stringify(skill)}],\n  "other": "https://x/*still a string*/"\n}\n`;

test('OpenCode is detected by --all and its dry run leaves the profile untouched', t => {
  const ctx = openSetup(t);
  const seed = '{"skills": ["/other"]}';
  ctx.seed(seed);
  const dry = ctx.run(['install', '--all', '--yes', '--dry-run']);
  assert.equal(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /OpenCode/);
  assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
  assert(!fs.existsSync(ctx.data));
  const installed = ctx.run(['install', '--all', '--yes']);
  assert.equal(installed.status, 0, installed.stdout + installed.stderr);
  assert(fs.existsSync(ctx.target));
});

test('OpenCode install, update and uninstall use XDG locations and restore seeded config', t => {
  const ctx = openSetup(t);
  const seed = '{\n  // keep\n  "skills": ["/other",],\n  "other": true\n}\n';
  ctx.seed(seed);
  let result = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert(fs.existsSync(path.join(ctx.target, 'skills', 'build', 'SKILL.md')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(ctx.target, '.claude-plugin', 'plugin.json'))).version, version);
  assert(fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
  result = ctx.run(['update', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  result = ctx.run(['uninstall', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
  assert(!fs.existsSync(ctx.data));
});

test('OpenCode validation failure removes staging and preserves current copy and config', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  const marker = path.join(ctx.target, 'marker');
  fs.writeFileSync(marker, 'old');
  const seed = openEntry(ctx.skill);
  ctx.seed(seed);
  // The preload changes the validator result only in the installer process.
  const preload = path.join(ctx.dir, 'fail-validator.cjs');
  fs.writeFileSync(preload, `const cp = require('node:child_process'); const old = cp.spawnSync; cp.spawnSync = function(bin,args,opts) { if (String(args?.[0] || '').endsWith('validate-package.cjs')) return {status:1,stderr:'staged copy rejected'}; return old.apply(this,arguments); };`);
  ctx.env.NODE_OPTIONS = `--require=${preload}`;
  const result = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'old');
  assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
  assert.deepEqual(fs.readdirSync(ctx.data).filter(name => name.startsWith('.staging-')), []);
});

test('OpenCode config failure rolls back fresh, same-version and update copies', t => {
  for (const kind of ['fresh', 'same', 'update']) {
    const ctx = openSetup(t);
    const prior = path.join(ctx.data, 'v0.9.2');
    if (kind === 'same') { fs.mkdirSync(ctx.target, { recursive: true }); copy(ctx.target); fs.writeFileSync(path.join(ctx.target, 'marker'), 'old'); }
    if (kind === 'update') { fs.mkdirSync(prior, { recursive: true }); copy(prior, { as: '0.9.2' }); fs.writeFileSync(path.join(prior, 'marker'), 'old'); }
    const seed = kind === 'fresh' ? '{}' : openEntry(kind === 'update' ? path.join(prior, 'skills') : ctx.skill);
    ctx.seed(seed);
    const preload = path.join(ctx.dir, 'fail-config.cjs');
    fs.writeFileSync(preload, `const cfg = require(${JSON.stringify(path.join(repo, 'bin', 'opencode-config.cjs'))}); cfg.changeConfig = () => { throw new Error('injected config failure'); };`);
    ctx.env.NODE_OPTIONS = `--require=${preload}`;
    const result = ctx.run([kind === 'update' ? 'update' : 'install', '--opencode', '--yes']);
    assert.equal(result.status, 1, `${kind}: ${result.stdout}${result.stderr}`);
    assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
    assert.equal(fs.existsSync(ctx.target), kind === 'same');
    if (kind === 'same') assert.equal(fs.readFileSync(path.join(ctx.target, 'marker'), 'utf8'), 'old');
    if (kind === 'update') assert.equal(fs.readFileSync(path.join(prior, 'marker'), 'utf8'), 'old');
    assert.deepEqual(fs.readdirSync(ctx.data).filter(name => name.startsWith('.staging-') || name.startsWith('.previous-')), []);
  }
});

test('OpenCode post-edit verification failure restores the prior config and copy', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  fs.writeFileSync(path.join(ctx.target, 'marker'), 'old');
  const seed = openEntry(ctx.skill);
  ctx.seed(seed);
  const preload = path.join(ctx.dir, 'break-after-config.cjs');
  fs.writeFileSync(preload, `const fs = require('node:fs'); const path = require('node:path'); const cfg = require(${JSON.stringify(path.join(repo, 'bin', 'opencode-config.cjs'))}); const original = cfg.changeConfig; cfg.changeConfig = (...args) => { const result = original(...args); fs.writeFileSync(path.join(${JSON.stringify(ctx.target)}, '.claude-plugin', 'plugin.json'), '{"version":"wrong"}'); return result; };`);
  ctx.env.NODE_OPTIONS = `--require=${preload}`;
  const result = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
  assert.equal(fs.readFileSync(path.join(ctx.target, 'marker'), 'utf8'), 'old');
});

test('OpenCode recovers a referenced copy before install, update and uninstall', t => {
  for (const command of ['install', 'update', 'uninstall']) {
    const ctx = openSetup(t);
    const previous = path.join(ctx.data, '.previous-crashed');
    fs.mkdirSync(previous, { recursive: true });
    copy(previous);
    ctx.seed(openEntry(ctx.skill));
    fs.mkdirSync(path.join(ctx.data, '.staging-old'));
    const result = ctx.run([command, '--opencode', '--yes']);
    assert.equal(result.status, 0, `${command}: ${result.stdout}${result.stderr}`);
    if (command === 'uninstall') assert(!fs.existsSync(ctx.data));
    else {
      assert(fs.existsSync(ctx.target));
      assert.deepEqual(fs.readdirSync(ctx.data).filter(name => name.startsWith('.staging-') || name.startsWith('.previous-')), []);
    }
  }
});

test('OpenCode recovery refusal deletes nothing when previous copies are ambiguous or wrong', t => {
  for (const kind of ['two', 'wrong']) {
    const ctx = openSetup(t);
    fs.mkdirSync(ctx.data, { recursive: true });
    const first = path.join(ctx.data, '.previous-one');
    fs.mkdirSync(first);
    copy(first, { as: kind === 'wrong' ? '0.9.2' : version });
    if (kind === 'two') { const second = path.join(ctx.data, '.previous-two'); fs.mkdirSync(second); copy(second); }
    fs.mkdirSync(path.join(ctx.data, '.staging-leftover'));
    const seed = openEntry(ctx.skill);
    ctx.seed(seed);
    const before = fs.readdirSync(ctx.data).sort();
    const result = ctx.run(['install', '--opencode', '--yes']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.deepEqual(fs.readdirSync(ctx.data).sort(), before);
    assert.equal(fs.readFileSync(ctx.configFile, 'utf8'), seed);
  }
});

test('OpenCode removes stale staging and previous directories when referenced copy exists', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  ctx.seed(openEntry(ctx.skill));
  fs.mkdirSync(path.join(ctx.data, '.staging-old'));
  fs.mkdirSync(path.join(ctx.data, '.previous-old'));
  const result = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(fs.readdirSync(ctx.data).filter(name => name.startsWith('.staging-') || name.startsWith('.previous-')), []);
});

test('OpenCode update deletes old version only after the new config entry is verified', t => {
  const ctx = openSetup(t);
  const old = path.join(ctx.data, 'v0.9.2');
  fs.mkdirSync(old, { recursive: true });
  copy(old, { as: '0.9.2' });
  ctx.seed(openEntry(path.join(old, 'skills')));
  const result = ctx.run(['update', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert(!fs.existsSync(old));
  assert(fs.existsSync(ctx.target));
  assert(fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
});

test('OpenCode update reports committed install with cleanup pending after EACCES', t => {
  const ctx = openSetup(t);
  const old = path.join(ctx.data, 'v0.9.2');
  fs.mkdirSync(old, { recursive: true });
  copy(old, { as: '0.9.2' });
  ctx.seed(openEntry(path.join(old, 'skills')));
  const preload = path.join(ctx.dir, 'deny-old-cleanup.cjs');
  fs.writeFileSync(preload, `const fs = require('node:fs'); const original = fs.rmSync; fs.rmSync = function(file, options) { if (file === ${JSON.stringify(old)}) { const error = new Error('permission denied'); error.code = 'EACCES'; throw error; } return original.apply(this, arguments); };`);
  ctx.env.NODE_OPTIONS = `--require=${preload}`;
  const result = ctx.run(['update', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /OpenCode: v0\.9\.3, files verified/);
  assert.match(result.stdout, /cleanup pending: .*EACCES|cleanup pending: .*permission denied/);
  assert.doesNotMatch(result.stdout, /OpenCode: failed|OpenCode: not installed/);
  assert(fs.existsSync(old));
  assert(fs.existsSync(ctx.target));
  assert(fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
  delete ctx.env.NODE_OPTIONS;
  const retry = ctx.run(['update', '--opencode', '--yes']);
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  assert(!fs.existsSync(old));
});

test('OpenCode uninstall reports removed with cleanup pending after EACCES', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  const seed = openEntry(ctx.skill);
  ctx.seed(seed);
  const preload = path.join(ctx.dir, 'deny-data-cleanup.cjs');
  fs.writeFileSync(preload, `const fs = require('node:fs'); const original = fs.rmSync; fs.rmSync = function(file, options) { if (file === ${JSON.stringify(ctx.data)}) { const error = new Error('permission denied'); error.code = 'EACCES'; throw error; } return original.apply(this, arguments); };`);
  ctx.env.NODE_OPTIONS = `--require=${preload}`;
  const result = ctx.run(['uninstall', '--opencode', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /OpenCode: removed/);
  assert.match(result.stdout, /cleanup pending: .*permission denied/);
  assert.doesNotMatch(result.stdout, /OpenCode: failed|OpenCode: not installed/);
  assert(fs.existsSync(ctx.data));
  assert(!fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
  delete ctx.env.NODE_OPTIONS;
  const retry = ctx.run(['uninstall', '--opencode', '--yes']);
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  assert(!fs.existsSync(ctx.data));
});

test('OpenCode uninstall proceeds when a previous cleanup remains blocked', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  ctx.seed(openEntry(ctx.skill));
  const preload = path.join(ctx.dir, 'deny-previous-cleanup.cjs');
  fs.writeFileSync(preload, `const fs = require('node:fs'); const path = require('node:path'); const original = fs.rmSync; fs.rmSync = function(file, options) { if (file === ${JSON.stringify(ctx.data)} || path.basename(file).startsWith('.previous-')) { const error = new Error('permission denied'); error.code = 'EACCES'; throw error; } return original.apply(this, arguments); };`);
  ctx.env.NODE_OPTIONS = `--require=${preload}`;
  const install = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(install.status, 0, install.stdout + install.stderr);
  assert.match(install.stdout, /cleanup pending: .*\.previous-/);
  assert(fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
  assert(fs.existsSync(ctx.target));
  assert.equal(fs.readdirSync(ctx.data).filter(name => name.startsWith('.previous-')).length, 1);

  const uninstall = ctx.run(['uninstall', '--opencode', '--yes']);
  assert.equal(uninstall.status, 0, uninstall.stdout + uninstall.stderr);
  assert.match(uninstall.stdout, /OpenCode: removed/);
  assert.match(uninstall.stdout, /cleanup pending: .*EACCES/);
  assert.doesNotMatch(uninstall.stdout, /OpenCode: failed|OpenCode: not installed/);
  assert(!fs.readFileSync(ctx.configFile, 'utf8').includes(ctx.skill));
  assert(fs.existsSync(ctx.target));

  delete ctx.env.NODE_OPTIONS;
  const retry = ctx.run(['uninstall', '--opencode', '--yes']);
  assert.equal(retry.status, 0, retry.stdout + retry.stderr);
  assert(!fs.existsSync(ctx.data));
});

test('OpenCode refuses a symlinked config before changing its target or data', t => {
  const ctx = openSetup(t);
  const target = path.join(ctx.home, 'dotfiles', 'opencode.jsonc');
  fs.mkdirSync(path.dirname(target));
  const seed = '{"skills": ["/other"]}\n';
  fs.writeFileSync(target, seed);
  fs.symlinkSync(target, ctx.configFile);
  const result = ctx.run(['install', '--opencode', '--yes']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /global config is a symlink/);
  assert(fs.lstatSync(ctx.configFile).isSymbolicLink());
  assert.equal(fs.readFileSync(target, 'utf8'), seed);
  assert(!fs.existsSync(ctx.data));
});

test('status reports verified, differing, older, unknown, absent, and missing hosts', t => {
  const ids = ['claude', 'agy', 'gemini', 'opencode'];
  const ctx = setup(t, { hosts: [...ids, 'codex'] });
  ctx.env.XDG_CONFIG_HOME = path.join(ctx.home, 'xdg-config');
  ctx.env.XDG_DATA_HOME = path.join(ctx.home, 'xdg-data');
  const config = path.join(ctx.env.XDG_CONFIG_HOME, 'opencode', 'opencode.json');
  const openRoot = path.join(ctx.env.XDG_DATA_HOME, 'kaylo', tag);
  fs.mkdirSync(path.dirname(config), { recursive: true });
  const roots = { ...ctx.roots, opencode: openRoot };
  const scenario = as => ({
    'claude plugin list --json': { stdout: [claudeEntry(roots.claude, as)] },
    'codex plugin list --json': { stdout: codexList(as) },
    'agy plugin list': { stdout: { imports: [{ name: 'kaylo' }] } },
    'gemini extensions list': { stderr: geminiList(roots.gemini, as) }
  });
  for (const id of ids) copy(roots[id]);
  fs.writeFileSync(config, JSON.stringify({ skills: [path.join(openRoot, 'skills')] }));
  ctx.scenario(scenario(version));
  let result = ctx.run(['status']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const id of ids) assert.match(result.stdout, new RegExp(`${{ claude: 'Claude Code', agy: 'Antigravity', gemini: 'Gemini CLI', opencode: 'OpenCode' }[id]}: ${tag.replaceAll('.', '\\.')} \\(files verified\\)`));
  assert.match(result.stdout, new RegExp(`Codex: ${tag.replaceAll('.', '\\.')} \\(files not verified\\)`));
  assert(result.log.every(line => readOnly.has(line)));

  for (const id of ids) fs.appendFileSync(path.join(roots[id], 'templates', 'PHASE.md'), '\nchanged\n');
  ctx.scenario(scenario(version));
  result = ctx.run(['status']);
  assert.equal(result.status, 0);
  for (const name of ['Claude Code', 'Antigravity', 'Gemini CLI', 'OpenCode'])
    assert.match(result.stdout, new RegExp(`${name}: ${tag.replaceAll('.', '\\.')} \\(files differ\\)`));

  for (const id of ids) copy(roots[id], { as: '0.8.0' });
  ctx.scenario(scenario('0.8.0'));
  result = ctx.run(['status']);
  assert.equal(result.status, 0);
  for (const name of ['Claude Code', 'Antigravity', 'Gemini CLI', 'OpenCode'])
    assert.match(result.stdout, new RegExp(`${name}: v0\\.8\\.0 \\(files not compared\\)`));
  assert.match(result.stdout, /Codex: v0\.8\.0 \(files not verified\)/);

  fs.rmSync(roots.claude, { recursive: true });
  fs.rmSync(path.join(roots.agy, '.claude-plugin', 'plugin.json'));
  fs.rmSync(path.join(roots.gemini, 'gemini-extension.json'));
  fs.rmSync(openRoot, { recursive: true });
  ctx.scenario(scenario('0.8.0'));
  result = ctx.run(['status']);
  assert.equal(result.status, 0);
  for (const name of ['Claude Code', 'Antigravity', 'Gemini CLI', 'OpenCode'])
    assert.match(result.stdout, new RegExp(`${name}: version unknown`));

  ctx.scenario({ 'claude plugin list --json': { stdout: [] },
    'codex plugin list --json': { stdout: { installed: [] } },
    'agy plugin list': { stdout: { imports: [] } },
    'gemini extensions list': { stderr: 'No extensions installed.\n' } });
  fs.writeFileSync(config, '{"skills": []}');
  result = ctx.run(['status']);
  assert.equal(result.status, 0);
  for (const name of ['Claude Code', 'Codex', 'Antigravity', 'Gemini CLI', 'OpenCode'])
    assert.match(result.stdout, new RegExp(`${name}: not installed`));
  fs.rmSync(path.join(ctx.dir, 'bin', 'claude'));
  result = ctx.run(['status']);
  assert.match(result.stdout, /Claude Code: not found on PATH/);
});

test('Codex status reads its list only, even with a cache directory present', t => {
  const ctx = setup(t, { hosts: ['codex'] });
  fs.mkdirSync(ctx.roots.codex, { recursive: true });
  const guard = path.join(ctx.dir, 'guard-status.cjs');
  fs.writeFileSync(guard, `'use strict';
const fs = require('node:fs');
const cp = require('node:child_process');
for (const key of ['readFileSync', 'readdirSync', 'statSync', 'lstatSync', 'accessSync']) {
  const original = fs[key];
  fs[key] = function(file, ...args) {
    if (String(file).includes('/.codex/')) throw new Error('Codex cache read');
    return original.call(this, file, ...args);
  };
}
const spawn = cp.spawnSync;
cp.spawnSync = function(bin, args, options) {
  if (String(args?.[0]).endsWith('validate-package.cjs')) throw new Error('validator run');
  return spawn.call(this, bin, args, options);
};`);
  ctx.env.NODE_OPTIONS = `--require=${guard}`;
  for (const as of [version, '0.8.0']) {
    ctx.scenario({ 'codex plugin list --json': { stdout: codexList(as) } });
    const result = ctx.run(['status']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`Codex: v${as.replaceAll('.', '\\.')} \\(files not verified\\)`));
    assert.deepEqual(result.log, ['codex plugin list --json']);
  }
});

test('status does not claim a version without a usable source or active root', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex', 'gemini'] });
  const claude = claudeEntry(ctx.roots.claude);
  delete claude.installPath;
  ctx.scenario({
    'claude plugin list --json': { stdout: [claude] },
    'codex plugin list --json': { stdout: { installed: [{ pluginId: 'kaylo@kaylo', installed: true }] } },
    'gemini extensions list': { stderr: `✓ kaylo (${version})\n Enabled (User): true\n` }
  });
  const result = ctx.run(['status']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const name of ['Claude Code', 'Codex', 'Gemini CLI'])
    assert.match(result.stdout, new RegExp(`${name}: version unknown`));
  assert.doesNotMatch(result.stdout, /files verified|files differ/);
});

test('a failing host reader does not hide other status lines or block a selected host', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex', 'gemini'] });
  copy(ctx.roots.claude);
  const scenario = {
    'claude plugin marketplace list --json': { stdout: [] },
    'claude plugin list --json': { stdout: [claudeEntry(ctx.roots.claude)] },
    'codex plugin list --json': { status: 42, stderr: 'broken list' },
    'gemini extensions list': { stderr: 'No extensions installed.\n' }
  };
  ctx.scenario(scenario);
  let result = ctx.run(['status']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`Claude Code: ${tag.replaceAll('.', '\\.')} \\(files verified\\)`));
  assert.match(result.stdout, /Codex: status unavailable \(codex plugin list --json exited with 42: broken list\)/);
  assert.match(result.stdout, /Gemini CLI: not installed/);
  assert.equal(result.stdout.trim().split('\n').length, 5);

  ctx.scenario(scenario);
  result = ctx.run(['install', '--claude', '--dry-run']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Could not check Codex Kaylo status: codex plugin list --json exited with 42: broken list\./);
  assert.match(result.stdout, /Kaylo v[\d.]+ install plan:/);
  assert.match(result.stdout, /\$ claude plugin install kaylo@kaylo/);
  assert.deepEqual(result.mutations, []);

  ctx.scenario(scenario);
  result = ctx.run(['install', '--claude', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Claude Code: v[\d.]+, files verified/);
  assert.deepEqual(byHost(result.mutations, 'codex'), []);
});

test('OpenCode status reports config errors and cleanup without changing HOME', t => {
  const ctx = openSetup(t);
  fs.mkdirSync(ctx.target, { recursive: true });
  copy(ctx.target);
  ctx.seed(openEntry(ctx.skill));
  fs.mkdirSync(path.join(ctx.data, '.previous-left'));
  fs.mkdirSync(path.join(ctx.data, '.staging-left'));
  const snapshot = () => fs.readdirSync(ctx.home, { recursive: true }).sort().map(name => {
    const file = path.join(ctx.home, name);
    return [name, fs.lstatSync(file).isFile() ? fs.readFileSync(file).toString('base64') : null];
  });
  const before = snapshot();
  let result = ctx.run(['status']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /OpenCode: v[\d.]+ \(files verified\); cleanup pending: .*\.previous-left; cleanup pending: .*\.staging-left/);
  assert.deepEqual(snapshot(), before);
  ctx.seed('{broken');
  result = ctx.run(['status']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /OpenCode: version unknown \(expected object key\)/);
  assert.match(result.stdout, /cleanup pending: .*\.staging-left/);
});

test('preflight warns on unselected hosts and only an interactive add extends selection', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex'] });
  ctx.scenario({ ...fresh(ctx), 'codex plugin list --json': { stdout: codexList('0.8.0') } });
  let result = ctx.run(['install', '--claude', '--yes']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, new RegExp(`Codex has Kaylo v0\\.8\\.0 and will stay on it; this run installs ${tag.replaceAll('.', '\\.')}`));
  assert.deepEqual(byHost(result.mutations, 'codex'), []);
  ctx.scenario({ ...fresh(ctx), 'codex plugin list --json':
    [{ stdout: codexList('0.8.0') }, { stdout: codexList() }] });
  result = promptedRun(ctx, ['install', '--claude'], [['Add these hosts', 'y'], ['Proceed?', 'y']]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert(byHost(result.mutations, 'codex').includes(`codex plugin add kaylo@kaylo --json`));
});

test('newer npm version can abort; fetch failure continues; dry run shows both warnings', t => {
  const ctx = setup(t, { hosts: ['claude', 'codex'] });
  ctx.npm({ version: '99.0.0' });
  ctx.scenario({ ...fresh(ctx), 'codex plugin list --json': { stdout: codexList('0.8.0') } });
  let result = promptedRun(ctx, ['install', '--claude'], [['Add these hosts', 'n'], ['Continue with this version?', 'n']]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /kaylo v99\.0\.0 is available; this is v[\d.]+\. Run npx kaylo@latest\./);
  assert.deepEqual(result.mutations, []);
  ctx.scenario({ ...fresh(ctx), 'codex plugin list --json': { stdout: codexList('0.8.0') } });
  result = ctx.run(['install', '--claude', '--dry-run']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Codex has Kaylo v0\.8\.0/);
  assert.match(result.stdout, /kaylo v99\.0\.0 is available/);
  assert.deepEqual(result.mutations, []);
  assert(result.log.every(line => readOnly.has(line)));
  const npmCalls = fs.readFileSync(ctx.env.KAYLO_NPM_LOG, 'utf8').trim().split('\n').map(JSON.parse);
  assert(npmCalls.every(call => call.url === 'https://registry.npmjs.org/kaylo/latest' && call.timeout));
  ctx.npm({ fail: true });
  ctx.scenario(fresh(ctx));
  result = ctx.run(['install', '--all', '--yes', '--dry-run']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Could not check npm for a newer Kaylo\./);
});
