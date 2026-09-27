'use strict';

// Generate Claude frontmatter from shared worker briefs; keep their bodies exact.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'claude-agents');
fs.mkdirSync(output, { recursive: true });
for (const name of ['builder', 'researcher', 'reviewer']) {
  const text = fs.readFileSync(path.join(root, 'agents', `${name}.md`), 'utf8');
  const adapted = name === 'researcher'
    ? text.replace(/^tools: .*$/m, 'tools: Read, Glob, Grep, WebSearch, WebFetch')
    : text;
  fs.writeFileSync(path.join(output, `${name}.md`), adapted);
}
