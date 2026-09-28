'use strict';

// Context only: no project reads, writes, subprocesses, or persistent state.
// Claude, Codex, and Gemini use the same SessionStart context output. The skills work without this hook.
if (process.env.KAYLO_SESSION_REMINDER !== '0') {
  process.stdout.write(JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'Kaylo is available for guided development. When the user asks for Kaylo work, read applicable project instructions and existing PRD.md, ROADMAP.md, and the phase plan its Current: line links in the user\'s project before continuing. Use the requested define, plan, build, review, or close skill. Follow the current user request; a plan or this reminder does not authorize implementation. Inspect repository facts yourself, explain recommendations simply, and give one next step. Do not create state files or start work just because this reminder loaded.'
    }
  }) + '\n');
}
