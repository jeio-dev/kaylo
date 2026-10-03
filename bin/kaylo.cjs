#!/usr/bin/env node
'use strict';

// Thin installer: runs each host's native Kaylo commands pinned to this package's
// release, then verifies the installed files with this package's validator.
// It copies no Kaylo files itself and keeps no receipt or other state.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const tag = `v${version}`;
const repo = 'jeio-dev/kaylo';
const plugin = 'kaylo@kaylo';
const hosts = [
  { id: 'claude', name: 'Claude Code', bin: 'claude', invoke: '/kaylo:build' },
  { id: 'codex', name: 'Codex', bin: 'codex', invoke: '$ → kaylo:build' },
  { id: 'agy', name: 'Antigravity', bin: 'agy', invoke: 'load build by name' },
  { id: 'gemini', name: 'Gemini CLI', bin: 'gemini', invoke: 'load build by name' }
];
const usage = `Usage: kaylo [install|update|uninstall] [--claude] [--codex] [--agy] [--gemini] [--all] [--yes] [--dry-run]
       kaylo --help | --version

Installs Kaylo ${tag} through each selected host's own commands, pinned to ${tag},
then verifies the installed files. Without host flags, a terminal shows a picker.
  --all       every supported host found on PATH
  --yes       skip Kaylo's own confirmation (host prompts still appear)
  --dry-run   print the plan using read-only commands; change nothing`;

class UsageError extends Error {}
function parse(argv) {
  const options = { command: 'install', hosts: new Set(), all: false, yes: false, dryRun: false };
  let command;
  for (const arg of argv) {
    if (['install', 'update', 'uninstall'].includes(arg) && !command) command = options.command = arg;
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
  const missing = hosts.filter(host => options.hosts.has(host.id) && !found.has(host.id));
  if (missing.length) {
    fail(missing.map(host => `${host.name} was requested with --${host.id}, but \`${host.bin}\` is not found on PATH.`).join('\n'));
    return 2;
  }
  const interactive = Boolean(io.input.isTTY && io.output.isTTY);
  let reader;
  const ask = question => (reader || (reader = prompter(io.input, io.output))).ask(question);
  try {
    let selected;
    if (options.all) selected = hosts.filter(host => found.has(host.id)).map(host => host.id);
    else if (options.hosts.size) selected = hosts.filter(host => options.hosts.has(host.id)).map(host => host.id);
    else if (interactive) selected = await pick(found, ask, io.output);
    else {
      fail(`Choose hosts with --claude, --codex, --agy, --gemini, or --all when not running in a terminal.\n\n${usage}`);
      return 2;
    }
    if (!selected.length) {
      fail(found.size ? 'No host selected; nothing to do.' : 'No supported host (claude, codex, agy, gemini) is found on PATH.');
      return 1;
    }
    const command = options.command;
    const work = selected.map(id => {
      const host = hosts.find(entry => entry.id === id);
      try {
        return { host, ...plans[id](command) };
      } catch (error) {
        return { host, steps: [], failed: `could not read the current install: ${error.message}` };
      }
    });
    out(`Kaylo ${tag} ${command} plan:`);
    for (const item of work) {
      out(`\n${item.host.name}`);
      if (item.failed) out(`  cannot plan: ${item.failed}`);
      for (const replaced of item.replaces || []) out(`  replaces existing ${replaced}`);
      if (!item.failed && !item.steps.length) out('  Kaylo is not installed; nothing to remove.');
      for (const step of item.steps) out(`  $ ${display(item.host.bin, step.args)}`);
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
      else if (command === 'uninstall') out(`  ${item.host.name}: ${item.steps.length ? 'removed' : 'not installed'}`);
      else out(`  ${item.host.name}: ${tag}, files verified at ${item.root}`);
    }
    const done = work.filter(item => !item.failed);
    if (command !== 'uninstall' && done.length) {
      out('\nUse Kaylo:');
      for (const item of done) out(`  ${item.host.name}: ${item.host.invoke}`);
      out('Start a new session.');
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
  claudeInstall, claudeMarketplace, codexInstall, codexMarketplace, agyRoot, geminiInstall
};
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
