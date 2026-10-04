#!/usr/bin/env node
'use strict';

// Runs native host commands, or installs OpenCode's verified package copy.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');
const openConfig = require('./opencode-config.cjs');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const tag = `v${version}`;
const repo = 'jeio-dev/kaylo';
const plugin = 'kaylo@kaylo';
const hosts = [
  { id: 'claude', name: 'Claude Code', bin: 'claude', invoke: '/kaylo:build' },
  { id: 'codex', name: 'Codex', bin: 'codex', invoke: '$ → kaylo:build' },
  { id: 'agy', name: 'Antigravity', bin: 'agy', invoke: 'load build by name' },
  { id: 'gemini', name: 'Gemini CLI', bin: 'gemini', invoke: 'load build by name' },
  { id: 'opencode', name: 'OpenCode', bin: 'opencode', invoke: 'load build by name' }
];
const usage = `Usage: kaylo [install|update|uninstall|status] [--claude] [--codex] [--agy] [--gemini] [--opencode] [--all] [--yes] [--dry-run]
       kaylo --help | --version

Installs Kaylo ${tag} through native host commands or a verified OpenCode copy.
Status reports each supported host's installed version and file state.
Without host flags, a terminal shows a picker.
  --all       every supported host found on PATH
  --yes       skip Kaylo's own confirmation (host prompts still appear)
  --dry-run   print the plan using read-only commands; change nothing`;

class UsageError extends Error {}
function parse(argv) {
  const options = { command: 'install', hosts: new Set(), all: false, yes: false, dryRun: false };
  let command;
  for (const arg of argv) {
    if (['install', 'update', 'uninstall', 'status'].includes(arg) && !command) command = options.command = arg;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version') options.version = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--yes') options.yes = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--') && hosts.some(host => host.id === arg.slice(2))) options.hosts.add(arg.slice(2));
    else throw new UsageError(`Unknown argument: ${arg}`);
  }
  return options;
}

// Detection scans PATH directly; it never spawns `which`.
function detect(env = process.env) {
  const dirs = (env.PATH || '').split(path.delimiter).filter(Boolean);
  return new Set(hosts.filter(host => dirs.some(dir => {
    const file = path.join(dir, host.bin);
    try {
      fs.accessSync(file, fs.constants.X_OK);
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  })).map(host => host.id));
}

// Read-only host commands: output is captured and nothing is changed. JSON readers
// use stdout only, because hosts print warnings on stderr.
function read(bin, args, { stderr = false } = {}) {
  const result = spawnSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw new Error(`${display(bin, args)} could not run: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${display(bin, args)} exited with ${result.status}: ${lastLine(result.stderr || result.stdout)}`);
  }
  return stderr ? `${result.stdout}\n${result.stderr}` : result.stdout;
}
// Hosts may print notices around their JSON. Try each line that opens an object or
// array, up to the last matching closer.
function json(text, label) {
  const starts = [0, ...[...text.matchAll(/^[ \t]*[[{]/gm)].map(match => match.index)];
  for (const start of starts) {
    const body = text.slice(start).trim();
    const end = body.lastIndexOf(body[0] === '[' ? ']' : '}');
    try {
      return JSON.parse(end >= 0 ? body.slice(0, end + 1) : body);
    } catch {}
  }
  throw new Error(`${label} did not print JSON`);
}
const lastLine = text => (text || '').trim().split('\n').pop() || 'no output';
const quote = arg => /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
const display = (bin, args) => [bin, ...args].map(quote).join(' ');

// Version and root readers, shared with `status` later (#61).
const home = () => os.homedir();
const openData = () => path.join(process.env.XDG_DATA_HOME || path.join(home(), '.local', 'share'), 'kaylo');
const openDir = () => path.join(process.env.XDG_CONFIG_HOME || path.join(home(), '.config'), 'opencode');
const openSkills = () => path.join(openData(), tag, 'skills');
function openState() { return openConfig.readConfig(openDir(), path.dirname(openData())); }
function openVersion() {
  const entry = openConfig.entryVersion(openState(), path.dirname(openData()));
  return entry && { ...entry, configuredVersion: entry.version,
    version: manifestVersion(entry.root, '.claude-plugin/plugin.json') };
}
function openFailure(reason) { return openConfig.manualMessage(reason, openDir(), openSkills()); }
function openRecover() {
  const cleanupWarnings = [];
  const state = openState();
  const current = openConfig.entryVersion(state, path.dirname(openData()));
  const data = openData();
  if (!fs.existsSync(data)) {
    if (current) throw new Error(`referenced copy is missing: ${current.root}`);
    fs.mkdirSync(data, { recursive: true });
  }
  const previous = fs.readdirSync(data).filter(name => name.startsWith('.previous-'));
  if (current && (!fs.existsSync(current.root) || !fs.statSync(current.root).isDirectory())) {
    if (fs.existsSync(current.root)) throw new Error(`referenced copy is not a directory: ${current.root}`);
    if (previous.length !== 1 || manifestVersion(path.join(data, previous[0]), '.claude-plugin/plugin.json') !== current.version)
      throw new Error(`referenced copy is missing and cannot be recovered: ${current.root}`);
    fs.renameSync(path.join(data, previous[0]), current.root);
  }
  for (const name of fs.readdirSync(data)) {
    if (name.startsWith('.staging-') || name.startsWith('.previous-')) {
      const dir = path.join(data, name);
      try { fs.rmSync(dir, { recursive: true, force: true }); }
      catch (error) { cleanupWarnings.push({ dir, reason: `${error.code || 'error'}: ${error.message}` }); }
    }
  }
  return cleanupWarnings;
}
function openCopy(staging) {
  fs.mkdirSync(staging);
  const entries = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).files;
  for (const relative of ['package.json', ...entries]) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) throw new Error(`package entry is missing: ${relative}`);
    const target = path.join(staging, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  }
  function files(dir, relative) {
    const entry = fs.lstatSync(path.join(dir, relative));
    if (entry.isSymbolicLink()) throw new Error(`package entry is a symlink: ${relative}`);
    return entry.isDirectory() ? fs.readdirSync(path.join(dir, relative)).flatMap(name =>
      files(dir, path.join(relative, name))) : [relative];
  }
  const sourceFiles = ['package.json', ...entries.flatMap(relative => files(root, relative))].sort();
  const stagedFiles = fs.readdirSync(staging).flatMap(name => files(staging, name)).sort();
  if (JSON.stringify(sourceFiles) !== JSON.stringify(stagedFiles) ||
      sourceFiles.some(relative => !fs.readFileSync(path.join(root, relative)).equals(fs.readFileSync(path.join(staging, relative)))))
    throw new Error('staging copy differs from the package');
}
function runOpenCode(command) {
  const cleanupWarnings = openRecover();
  const data = openData();
  const current = openState();
  // Once the config edit commits, a failed recursive deletion may already have
  // removed part of an old copy. Report the committed config state with deferred
  // cleanup rather than claiming the transaction was rolled back.
  const removeAfterCommit = dir => {
    try { fs.rmSync(dir, { recursive: true, force: true }); }
    catch (error) { cleanupWarnings.push({ dir, reason: `${error.code || 'error'}: ${error.message}` }); }
  };
  const pendingCleanup = () => cleanupWarnings.filter(({ dir }) => {
    try { fs.lstatSync(dir); return true; }
    catch (error) { return error.code !== 'ENOENT'; }
  }).map(({ dir, reason }) => `could not remove ${dir}: ${reason}`);
  if (command === 'uninstall') {
    openConfig.changeConfig(openDir(), path.dirname(data), 'uninstall');
    removeAfterCommit(data);
    return { removed: Boolean(current.entry), cleanupWarnings: pendingCleanup() };
  }
  const staged = path.join(data, `.staging-${process.pid}-${Math.random().toString(16).slice(2)}`);
  const target = path.join(data, tag);
  let previous;
  let placed = false;
  let configChanged = false;
  try {
    openCopy(staged);
    const invalid = verifyFiles(staged);
    if (invalid) throw new Error(`staging verification failed: ${invalid}`);
    if (fs.existsSync(target)) {
      previous = path.join(data, `.previous-${process.pid}-${Math.random().toString(16).slice(2)}`);
      fs.renameSync(target, previous);
    }
    fs.renameSync(staged, target);
    placed = true;
    if (verifyFiles(target)) throw new Error('installed copy verification failed');
    openConfig.changeConfig(openDir(), path.dirname(data), 'install', openSkills());
    configChanged = true;
    const entry = openVersion();
    if (!entry || entry.version !== version || entry.root !== target || entry.configuredVersion !== version ||
        openState().entry?.value !== openSkills())
      throw new Error('post-install verification failed');
  } catch (error) {
    if (configChanged) {
      const file = current.file;
      if (current.exists) {
        const restore = `${file}.kaylo-restore-${process.pid}`;
        fs.writeFileSync(restore, current.source, { mode: fs.statSync(file).mode });
        fs.renameSync(restore, file);
      } else fs.rmSync(file, { force: true });
    }
    if (placed) fs.rmSync(target, { recursive: true, force: true });
    if (previous) fs.renameSync(previous, target);
    fs.rmSync(staged, { recursive: true, force: true });
    throw error;
  }
  if (previous) removeAfterCommit(previous);
  if (command === 'update') {
    try {
      for (const name of fs.readdirSync(data)) {
        if (/^v[^/]+$/.test(name) && name !== tag) removeAfterCommit(path.join(data, name));
      }
    } catch (error) { cleanupWarnings.push({ dir: data, reason: `could not list old copies: ${error.code || 'error'}: ${error.message}` }); }
  }
  return { root: target, cleanupWarnings: pendingCleanup() };
}
function claudeMarketplace() {
  return json(read('claude', ['plugin', 'marketplace', 'list', '--json']), 'claude plugin marketplace list --json')
    .find(entry => entry.name === 'kaylo');
}
function claudeInstall() {
  return json(read('claude', ['plugin', 'list', '--json']), 'claude plugin list --json').find(entry => entry.id === plugin);
}
function codexMarketplace() {
  const list = json(read('codex', ['plugin', 'marketplace', 'list', '--json']), 'codex plugin marketplace list --json');
  return (list.marketplaces || []).find(entry => entry.name === 'kaylo');
}
// Codex's list names the version but no install path (#57 Q5).
function codexInstall() {
  const list = json(read('codex', ['plugin', 'list', '--json']), 'codex plugin list --json');
  return (list.installed || []).find(entry => entry.pluginId === plugin && entry.installed !== false);
}
// Antigravity CLI 1.2.14 names no home override; its plugin root is fixed under HOME (#57 Q2).
const agyRoot = () => path.join(home(), '.gemini', 'config', 'plugins', 'kaylo');
function agyListed() {
  const output = read('agy', ['plugin', 'list']);
  try {
    return (json(output, 'agy plugin list').imports || []).some(entry => entry.name === 'kaylo');
  } catch {
    return /^\W*kaylo\b/m.test(output);
  }
}
// Gemini CLI 0.62.0 prints its extension list on stderr. The list is the active
// install record: a `kaylo (version)` header and its `Path:` line. Gemini's home can
// move with GEMINI_CLI_HOME, so the root is never derived from HOME.
function geminiInstall() {
  const lines = read('gemini', ['extensions', 'list'], { stderr: true }).split('\n');
  const header = /^\W*([\w.-]+) \(([^)]*)\)\s*$/;
  const start = lines.findIndex(line => header.exec(line)?.[1] === 'kaylo');
  if (start < 0) return undefined;
  const next = lines.findIndex((line, index) => index > start && header.test(line));
  const block = lines.slice(start + 1, next < 0 ? undefined : next);
  const found = block.map(line => /^\s*Path:\s*(.+?)\s*$/.exec(line)).find(Boolean);
  return { version: header.exec(lines[start])[2], root: found && found[1] };
}
// Antigravity's plugin.json has no version, so read the copy's Claude manifest.
function manifestVersion(dir, file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).version;
  } catch {
    return undefined;
  }
}
function verifyFiles(dir) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-package.cjs'), '--installed', dir],
    { encoding: 'utf8' });
  return result.status === 0 ? null : lastLine(result.stderr || result.stdout);
}

// Status reads active install records. Codex exposes a version but no active
// path in its read-only list, so its files cannot be compared here.
function hostStatus(id) {
  let entry;
  if (id === 'claude') {
    entry = claudeInstall();
    if (!entry) return { state: 'not installed' };
    entry = { version: entry.version, root: entry.installPath };
  } else if (id === 'codex') {
    entry = codexInstall();
    if (!entry) return { state: 'not installed' };
    return entry.version ? { version: entry.version, state: `v${entry.version} (files not verified)` } :
      { state: 'version unknown' };
  } else if (id === 'agy') {
    if (!agyListed()) return { state: 'not installed' };
    entry = { root: agyRoot() };
    entry.version = manifestVersion(entry.root, '.claude-plugin/plugin.json');
  } else if (id === 'gemini') {
    const listed = geminiInstall();
    if (!listed) return { state: 'not installed' };
    entry = { root: listed.root, version: listed.root && manifestVersion(listed.root, 'gemini-extension.json') };
  } else {
    try { entry = openVersion(); }
    catch (error) { entry = { state: `version unknown (${error.message})` }; }
    if (!entry) entry = { state: 'not installed' };
  }
  let result;
  if (entry.state) result = entry;
  else if (!entry.root || !entry.version || !fs.existsSync(entry.root) || !fs.statSync(entry.root).isDirectory())
    result = { state: 'version unknown' };
  else if (entry.version !== version) result = { version: entry.version, state: `v${entry.version} (files not compared)` };
  else result = { version: entry.version, state: `v${entry.version} (files ${verifyFiles(entry.root) ? 'differ' : 'verified'})` };
  if (id === 'opencode' && fs.existsSync(openData())) {
    const leftovers = fs.readdirSync(openData()).filter(name =>
      name.startsWith('.previous-') || name.startsWith('.staging-')).sort();
    for (const name of leftovers) result.state += `; cleanup pending: ${path.join(openData(), name)}`;
  }
  return result;
}
function statuses(found) {
  return hosts.map(host => ({ host, ...found.has(host.id) ? hostStatus(host.id) : { state: 'not found on PATH' } }));
}
function newerVersion(candidate) {
  const parts = value => /^\d+\.\d+\.\d+$/.test(value) ? value.split('.').map(BigInt) : null;
  const available = parts(candidate);
  const current = parts(version);
  if (!available || !current) return false;
  for (let index = 0; index < 3; index++) {
    if (available[index] !== current[index]) return available[index] > current[index];
  }
  return false;
}
async function latestVersion(fetcher) {
  const response = await fetcher('https://registry.npmjs.org/kaylo/latest', { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`npm returned ${response.status}`);
  return (await response.json()).version;
}

// Each plan uses only read-only commands. A step is { args, capture }.
const plans = {
  claude(command) {
    const market = claudeMarketplace();
    const installed = claudeInstall();
    if (command === 'uninstall') {
      return {
        steps: [installed && { args: ['plugin', 'uninstall', plugin] },
          market && { args: ['plugin', 'marketplace', 'remove', 'kaylo'] }].filter(Boolean)
      };
    }
    const pinned = market && market.source === 'github' && market.repo === repo && market.ref === tag;
    const steps = [];
    const replaces = [];
    if (market && !pinned) {
      replaces.push(`marketplace kaylo (${market.repo || market.url || market.source}${market.ref ? ` at ${market.ref}` : ', unpinned'})`);
      // Removing a Claude marketplace also uninstalls its plugin.
      steps.push({ args: ['plugin', 'marketplace', 'remove', 'kaylo'], removes: Boolean(installed) });
    }
    if (!pinned) steps.push({ args: ['plugin', 'marketplace', 'add', `${repo}@${tag}`] });
    // Removing a marketplace also uninstalls the plugin, so only a kept one can update.
    steps.push({ args: ['plugin', pinned && installed ? 'update' : 'install', plugin] });
    return { steps, replaces };
  },
  codex(command) {
    const market = codexMarketplace();
    if (command === 'uninstall') {
      return {
        steps: [codexInstall() && { args: ['plugin', 'remove', plugin] },
          market && { args: ['plugin', 'marketplace', 'remove', 'kaylo'] }].filter(Boolean)
      };
    }
    // The marketplace list hides the pinned ref, so an existing one is always replaced.
    // Removing a Codex marketplace also unlists its plugin (#57 Q5).
    const steps = market ? [{ args: ['plugin', 'marketplace', 'remove', 'kaylo'], removes: Boolean(codexInstall()) }] : [];
    steps.push({ args: ['plugin', 'marketplace', 'add', repo, '--ref', tag] });
    steps.push({ args: ['plugin', 'add', plugin, '--json'], capture: true });
    return { steps, replaces: market ? ['marketplace kaylo (its pinned ref is not shown)'] : [] };
  },
  agy(command) {
    const listed = agyListed();
    if (command === 'uninstall') return { steps: listed ? [{ args: ['plugin', 'uninstall', 'kaylo'] }] : [] };
    const current = manifestVersion(agyRoot(), '.claude-plugin/plugin.json');
    return {
      steps: [{ args: ['plugin', 'install', root] }],
      replaces: listed ? [`plugin kaylo (${current ? `v${current}` : 'version unknown'})`] : []
    };
  },
  gemini(command) {
    const listed = geminiInstall();
    const uninstall = { args: ['extensions', 'uninstall', 'kaylo'], removes: true };
    if (command === 'uninstall') return { steps: listed ? [uninstall] : [] };
    return {
      steps: [...listed ? [uninstall] : [],
        { args: ['extensions', 'install', `https://github.com/${repo}`, '--ref', tag] }],
      replaces: listed ? [`extension kaylo (${listed.version ? `v${listed.version}` : 'version unknown'})`] : []
    };
  },
  opencode(command) {
    const current = openVersion();
    return { steps: [{ description: command === 'uninstall' ? `remove Kaylo from ${openDir()} and delete ${openData()}` :
      `copy package to ${path.join(openData(), tag)}, verify it, and edit ${openDir()}` }],
    replaces: current && command !== 'uninstall' ? [`OpenCode copy ${current.version ? `v${current.version}` : '(version unknown)'}`] : [] };
  }
};

// Locate each root from the active install record only; never pick a cached copy.
const installed = {
  claude() {
    const entry = claudeInstall();
    if (!entry) return { error: `${plugin} is not listed after install` };
    if (!entry.installPath) return { version: entry.version, error: 'verification unavailable: Claude Code does not expose its active install path' };
    return { version: entry.version, root: entry.installPath };
  },
  codex(added) {
    const entry = codexInstall();
    if (!entry) return { error: `${plugin} is not listed after install` };
    let reported;
    try {
      reported = json(added || '', 'codex plugin add --json').installedPath;
    } catch {}
    if (!reported) return { version: entry.version, error: 'verification unavailable: Codex did not report its install path' };
    return { version: entry.version, root: reported };
  },
  agy() {
    const dir = agyRoot();
    if (!fs.existsSync(dir)) return { error: `no installed copy at ${dir}` };
    return { version: manifestVersion(dir, '.claude-plugin/plugin.json'), root: dir };
  },
  gemini() {
    const entry = geminiInstall();
    if (!entry) return { error: 'kaylo is not listed after install' };
    if (!entry.root) return { error: 'verification unavailable: Gemini CLI does not expose its active install path' };
    if (!fs.existsSync(entry.root)) return { error: `no installed copy at ${entry.root}` };
    return { version: manifestVersion(entry.root, 'gemini-extension.json'), root: entry.root };
  }
};
function verifyInstall(id, added) {
  const found = installed[id](added);
  const mismatch = found.version !== undefined && found.version !== version
    ? `installed version is ${found.version}, expected ${version}` : '';
  // A missing active path is reported first, so a version mismatch cannot hide it.
  if (found.error) return mismatch ? `${found.error}; ${mismatch}` : found.error;
  if (mismatch) return mismatch;
  if (found.version === undefined) return `no version found in ${found.root}`;
  const differs = verifyFiles(found.root);
  return differs ? `installed files at ${found.root} do not match: ${differs}` : { root: found.root };
}
const removed = {
  claude: () => !claudeInstall() && !claudeMarketplace(),
  codex: () => !codexInstall() && !codexMarketplace(),
  agy: () => !agyListed(),
  gemini: () => !geminiInstall()
};

// Closed input or Ctrl-C at a prompt aborts the run before any change.
class Aborted extends Error {
  constructor(code) {
    super(code === 130 ? 'Interrupted.' : 'Input closed.');
    this.code = code;
  }
}
// Buffered line reader: answers typed or pasted ahead of a prompt are kept.
function prompter(input, output) {
  const rl = readline.createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const lines = rl[Symbol.asyncIterator]();
  let interrupted = false;
  rl.on('SIGINT', () => {
    interrupted = true;
    rl.close();
  });
  return {
    async ask(question) {
      output.write(question);
      const next = await lines.next();
      if (next.done) throw new Aborted(interrupted ? 130 : 1);
      return next.value;
    },
    close: () => rl.close()
  };
}
// Numbered checklist. Detected hosts start selected; undetected ones cannot be chosen.
async function pick(found, ask, output) {
  const chosen = new Set(found);
  for (;;) {
    hosts.forEach((host, index) => output.write(`  ${index + 1}. [${chosen.has(host.id) ? 'x' : ' '}] ${host.name}` +
      `${found.has(host.id) ? '' : ' (not found on PATH)'}\n`));
    const answer = (await ask('Toggle hosts by number, or press Enter to continue: ')).trim();
    if (!answer) return hosts.filter(host => chosen.has(host.id)).map(host => host.id);
    for (const token of answer.split(/[\s,]+/)) {
      const host = hosts[Number(token) - 1];
      if (!host) output.write(`No host numbered ${token}.\n`);
      else if (!found.has(host.id)) output.write(`${host.name} is not found on PATH and cannot be selected.\n`);
      else if (chosen.has(host.id)) chosen.delete(host.id);
      else chosen.add(host.id);
    }
  }
}

async function main(argv, io = { input: process.stdin, output: process.stdout, error: process.stderr }) {
  const out = text => io.output.write(`${text}\n`);
  const fail = text => io.error.write(`${text}\n`);
  let options;
  try {
    options = parse(argv);
  } catch (error) {
    fail(`${error.message}\n\n${usage}`);
    return 2;
  }
  if (options.help) return out(usage), 0;
  if (options.version) return out(version), 0;
  const found = detect();
  if (options.command === 'status') {
    try {
      for (const item of statuses(found)) out(`${item.host.name}: ${item.state}`);
      return 0;
    } catch (error) {
      fail(`Could not read Kaylo status: ${error.message}`);
      return 1;
    }
  }
  const missing = hosts.filter(host => options.hosts.has(host.id) && !found.has(host.id));
  if (missing.length) {
    fail(missing.map(host => `${host.name} was requested with --${host.id}, but \`${host.bin}\` is not found on PATH.`).join('\n'));
    return 2;
  }
  const interactive = io.interactive ?? Boolean(io.input.isTTY && io.output.isTTY);
  let reader;
  const ask = question => io.prompt ? io.prompt(question) :
    (reader || (reader = prompter(io.input, io.output))).ask(question);
  try {
    let selected;
    if (options.all) selected = hosts.filter(host => found.has(host.id)).map(host => host.id);
    else if (options.hosts.size) selected = hosts.filter(host => options.hosts.has(host.id)).map(host => host.id);
    else if (interactive) selected = await pick(found, ask, io.output);
    else {
      fail(`Choose hosts with --claude, --codex, --agy, --gemini, --opencode, or --all when not running in a terminal.\n\n${usage}`);
      return 2;
    }
    if (!selected.length) {
      fail(found.size ? 'No host selected; nothing to do.' : 'No supported host (claude, codex, agy, gemini, opencode) is found on PATH.');
      return 1;
    }
    const command = options.command;
    const planFor = id => {
      const host = hosts.find(entry => entry.id === id);
      try {
        return { host, ...plans[id](command) };
      } catch (error) {
        return { host, steps: [], failed: id === 'opencode' ? openFailure(error.message) :
          `could not read the current install: ${error.message}` };
      }
    };
    const work = selected.map(planFor);
    if (command !== 'uninstall') {
      let current;
      try { current = statuses(found); }
      catch (error) {
        fail(`Could not check Kaylo versions: ${error.message}`);
        return 1;
      }
      const drifted = current.filter(item => found.has(item.host.id) && !selected.includes(item.host.id) &&
        !item.state.startsWith('not installed'));
      for (const item of drifted) {
        out(`${item.host.name} has Kaylo ${item.version ? `v${item.version}` : '(version unknown)'} and will stay on it; this run installs ${tag}.`);
      }
      if (drifted.length && interactive && !options.yes && !options.dryRun) {
        const answer = (await ask('Add these hosts to this run? [y/N] ')).trim().toLowerCase();
        if (['y', 'yes'].includes(answer)) {
          for (const item of drifted) {
            selected.push(item.host.id);
            work.push(planFor(item.host.id));
          }
        }
      }
      let latest;
      try { latest = await latestVersion(io.fetch || globalThis.fetch); }
      catch { out('Could not check npm for a newer Kaylo.'); }
      if (newerVersion(latest)) {
        out(`kaylo v${latest} is available; this is ${tag}. Run npx kaylo@latest.`);
        if (interactive && !options.yes && !options.dryRun) {
          const answer = (await ask('Continue with this version? [y/N] ')).trim().toLowerCase();
          if (!['y', 'yes'].includes(answer)) {
            out('Nothing was changed.');
            return 1;
          }
        }
      }
    }
    out(`Kaylo ${tag} ${command} plan:`);
    for (const item of work) {
      out(`\n${item.host.name}`);
      if (item.failed) out(`  cannot plan: ${item.failed}`);
      for (const replaced of item.replaces || []) out(`  replaces existing ${replaced}`);
      if (!item.failed && !item.steps.length) out('  Kaylo is not installed; nothing to remove.');
      for (const step of item.steps) out(step.description ? `  ${step.description}` : `  $ ${display(item.host.bin, step.args)}`);
      if (!item.failed && command !== 'uninstall') out(`  then verify version ${version} and the installed files`);
    }
    if (options.dryRun) {
      out('\nDry run: nothing was changed.');
      return 0;
    }
    if (!options.yes) {
      const answer = (await ask('\nProceed? [y/N] ')).trim().toLowerCase();
      if (!['y', 'yes'].includes(answer)) {
        out('Nothing was changed.');
        return 1;
      }
    }
    // Release stdin before host commands so their own prompts reach the user.
    if (reader) reader.close(), reader = undefined;
    for (const item of work) {
      if (item.failed) continue;
      out(`\n${item.host.name}`);
      if (item.host.id === 'opencode') {
        try {
          const result = runOpenCode(command);
          item.root = result.root;
          item.removed = result.removed;
          item.cleanupWarnings = result.cleanupWarnings;
        } catch (error) { item.failed = openFailure(error.message); }
        continue;
      }
      let added;
      let removedPrevious = false;
      for (const step of item.steps) {
        out(`$ ${display(item.host.bin, step.args)}`);
        const result = spawnSync(item.host.bin, step.args, step.capture ?
          { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] } : { stdio: 'inherit' });
        if (step.capture && result.stdout) io.output.write(result.stdout);
        if (result.error || result.status !== 0) {
          item.failed = `${display(item.host.bin, step.args)} ${result.error ? `could not run: ${result.error.message}` : `exited with ${result.status}`}`;
          if (removedPrevious && command !== 'uninstall') item.failed += '; the previous Kaylo install was removed and not replaced';
          break;
        }
        if (step.removes) removedPrevious = true;
        if (step.capture) added = result.stdout;
      }
      if (item.failed) continue;
      try {
        if (command === 'uninstall') {
          if (!removed[item.host.id]()) item.failed = 'Kaylo is still listed after uninstall';
        } else {
          const verified = verifyInstall(item.host.id, added);
          if (typeof verified === 'string') item.failed = verified;
          else item.root = verified.root;
        }
      } catch (error) {
        item.failed = `could not verify: ${error.message}`;
      }
    }
    out('\nSummary:');
    for (const item of work) {
      if (item.failed) out(`  ${item.host.name}: failed: ${item.failed}`);
      else if (command === 'uninstall') out(`  ${item.host.name}: ${item.host.id === 'opencode' ? (item.removed ? 'removed' : 'not installed') : (item.steps.length ? 'removed' : 'not installed')}`);
      else out(`  ${item.host.name}: ${tag}, files verified at ${item.root}`);
      if (item.cleanupWarnings?.length) {
        for (const warning of item.cleanupWarnings) out(`    cleanup pending: ${warning}`);
      }
    }
    const done = work.filter(item => !item.failed);
    if (command !== 'uninstall' && done.length) {
      out('\nUse Kaylo:');
      for (const item of done) out(`  ${item.host.name}: ${item.host.invoke}`);
      out('Start a new session.');
      if (done.some(item => item.host.id === 'opencode')) out('For OpenCode, you can also restart the server.');
    }
    return done.length === work.length ? 0 : 1;
  } catch (error) {
    if (!(error instanceof Aborted)) throw error;
    out(`\n${error.message} Nothing was changed.`);
    return error.code;
  } finally {
    if (reader) reader.close();
  }
}

module.exports = {
  hosts, version, tag, parse, detect, prompter, pick, main, json, manifestVersion, verifyFiles,
  claudeInstall, claudeMarketplace, codexInstall, codexMarketplace, agyRoot, geminiInstall,
  openVersion, openData, openDir
};
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
