'use strict';

// Generate Claude frontmatter from shared worker briefs; keep their bodies exact.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'claude-agents');
// Host tool names differ, so shared briefs carry no tools line.
// Insert Claude's tool lists after the model line; never fall through silently.
const claudeTools = {
  researcher: 'Read, Glob, Grep, WebSearch, WebFetch',
  reviewer: 'Read, Glob, Grep, Bash, WebFetch, WebSearch'
};
function claudeAdapter(text, name) {
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!frontmatter) throw new Error(`agents/${name}.md has no frontmatter`);
  if (/^[ \t]*["']?tools["']?[ \t]*:/mi.test(frontmatter[0])) {
    throw new Error(`agents/${name}.md must not carry a tools line; the Claude adapter adds its own`);
  }
  if (!claudeTools[name]) return text;
  const anchor = /^model: inherit(\r?\n)/m;
  if (!anchor.test(frontmatter[0])) {
    throw new Error(`agents/${name}.md frontmatter has no "model: inherit" line to place the Claude tools line after`);
  }
  return frontmatter[0].replace(anchor, `model: inherit$1tools: ${claudeTools[name]}$1`) +
    text.slice(frontmatter[0].length);
}
fs.mkdirSync(output, { recursive: true });
for (const name of ['builder', 'researcher', 'reviewer']) {
  const text = fs.readFileSync(path.join(root, 'agents', `${name}.md`), 'utf8');
  const adapted = claudeAdapter(text, name);
  fs.writeFileSync(path.join(output, `${name}.md`), adapted);
}
