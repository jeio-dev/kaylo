'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const hook = path.resolve(__dirname, '../hooks/session-start.cjs');
const base = { ...process.env };
delete base.KAYLO_SESSION_REMINDER;
const payload = extra => JSON.stringify({
  session_id: 'test', cwd: '/tmp/project', hook_event_name: 'SessionStart', source: 'startup', ...extra
});
function run(options) {
  return spawnSync(process.execPath, [hook], { env: base, encoding: 'utf8', timeout: 10000, ...options });
}
function reminded(result) {
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(output.hookSpecificOutput.additionalContext, /Kaylo is available/);
}

test('the session reminder is emitted without a usable payload', () => {
  reminded(run({ stdio: ['ignore', 'pipe', 'pipe'] }));
  reminded(run({ input: '' }));
  reminded(run({ input: 'not json' }));
  reminded(run({ input: 'null' }));
  reminded(run({ input: '[]' }));
});

test('the session reminder is emitted for ordinary sessions and other agents', () => {
  reminded(run({ input: payload() }));
  reminded(run({ input: payload({ agent_type: 'researcher' }) }));
  reminded(run({ input: payload({ agent_type: 'other:researcher' }) }));
  reminded(run({ input: payload({ agent_type: 'kaylo:researcher-notes' }) }));
});

test('the session reminder is skipped when the main agent is a Kaylo worker', () => {
  for (const name of ['researcher', 'builder', 'reviewer']) {
    const result = run({ input: payload({ agent_type: `kaylo:${name}` }) });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

test('KAYLO_SESSION_REMINDER=0 suppresses the reminder', () => {
  const result = run({ input: payload(), env: { ...base, KAYLO_SESSION_REMINDER: '0' } });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('a host that leaves stdin open still gets the reminder and the hook exits', async () => {
  const child = spawn(process.execPath, [hook], { env: base, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  // Stdin is never written to or closed.
  const guard = setTimeout(() => child.kill(), 10000);
  const [status] = await new Promise(resolve => child.on('exit', (...args) => resolve(args)));
  clearTimeout(guard);
  assert.equal(status, 0);
  assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /Kaylo is available/);
});

test('an open stdin holding a worker payload is still skipped', async () => {
  const child = spawn(process.execPath, [hook], { env: base, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stdin.write(payload({ agent_type: 'kaylo:builder' }));
  const guard = setTimeout(() => child.kill(), 10000);
  const [status] = await new Promise(resolve => child.on('exit', (...args) => resolve(args)));
  clearTimeout(guard);
  assert.equal(status, 0);
  assert.equal(stdout, '');
});
