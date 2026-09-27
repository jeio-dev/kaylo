'use strict';

// Stage the checkout for Codex's contained local-source catalog. No host changes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'development', 'package');
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const entry of fs.readdirSync(root)) {
  if (['.git', '.local', 'development', 'AGENT.md', 'AGENTS.md'].includes(entry)) continue;
  fs.cpSync(path.join(root, entry), path.join(destination, entry), { recursive: true });
}
console.log(`Staged local package: ${destination}`);
