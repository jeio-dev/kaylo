'use strict';

// Generate Claude frontmatter from shared worker briefs; keep their bodies exact.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'claude-agents');
// Host tool names differ, so the shared researcher brief carries no tools line.
// Insert Claude's read-only list after the model line; never fall through silently.
function claudeResearcher(text) {
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!frontmatter) throw new Error('agents/researcher.md has no frontmatter');
  if (/^[ \t]*["']?tools["']?[ \t]*:/mi.test(frontmatter[0])) {
    throw new Error('agents/researcher.md must not carry a tools line; the Claude adapter adds its own');
  }
  const anchor = /^model: inherit(\r?\n)/m;
  if (!anchor.test(frontmatter[0])) {
    throw new Error('agents/researcher.md frontmatter has no "model: inherit" line to place the Claude tools line after');
  }
  return frontmatter[0].replace(anchor, 'model: inherit$1tools: Read, Glob, Grep, WebSearch, WebFetch$1') +
    text.slice(frontmatter[0].length);
}
fs.mkdirSync(output, { recursive: true });
for (const name of ['builder', 'researcher', 'reviewer']) {
  const text = fs.readFileSync(path.join(root, 'agents', `${name}.md`), 'utf8');
  const adapted = name === 'researcher' ? claudeResearcher(text) : text;
  fs.writeFileSync(path.join(output, `${name}.md`), adapted);
}
