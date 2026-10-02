'use strict';

// Context only: no project reads, writes, subprocesses, or persistent state.
// Claude, Codex, and Gemini use the same SessionStart context output. The skills work without this hook.
// The only input is the host's hook payload on stdin, read to skip a session whose main agent is a Kaylo
// worker (Claude Code's agent_type). A missing, empty, invalid, or slow payload emits the reminder as before.
const workers = new Set(['kaylo:researcher', 'kaylo:builder', 'kaylo:reviewer']);
let done = false;
function finish(raw) {
  if (done) return;
  done = true;
  let worker = false;
  try { worker = workers.has(JSON.parse(raw).agent_type); } catch {}
  if (worker) process.exit(0);
  process.stdout.write(JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'Kaylo is available for guided development. When the user asks for Kaylo work, read applicable project instructions and existing PRD.md, ROADMAP.md, and the phase plan its Current: line links in the user\'s project before continuing. Use the requested define, plan, build, review, or close skill. Follow the current user request; a plan or this reminder does not authorize implementation. Inspect repository facts yourself, explain recommendations simply, and give one next step. Do not create state files or start work just because this reminder loaded.'
    }
  }) + '\n', () => process.exit(0));
}
if (process.env.KAYLO_SESSION_REMINDER !== '0') {
  try {
    // Never wait on a terminal or on a host that leaves stdin open.
    if (process.stdin.isTTY) finish('');
    else {
      let raw = '';
      setTimeout(() => finish(raw), 500);
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { raw += chunk; });
      process.stdin.on('end', () => finish(raw));
      process.stdin.on('error', () => finish(''));
    }
  } catch {
    finish('');
  }
}
