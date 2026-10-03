'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

class ConfigError extends Error {}

function scan(source) {
  let offset = 0;
  function skip() {
    for (;;) {
      while (/\s/.test(source[offset] || '') && offset < source.length) offset++;
      if (source.startsWith('//', offset)) {
        offset = source.indexOf('\n', offset + 2);
        if (offset < 0) offset = source.length;
      } else if (source.startsWith('/*', offset)) {
        const end = source.indexOf('*/', offset + 2);
        if (end < 0) throw new ConfigError('unterminated comment');
        offset = end + 2;
      } else break;
    }
  }
  function string() {
    const start = offset++;
    while (offset < source.length) {
      if (source[offset] === '\\') { offset += 2; continue; }
      if (source[offset++] === '"') {
        try { return { value: JSON.parse(source.slice(start, offset)), start, end: offset }; }
        catch { throw new ConfigError('invalid string'); }
      }
    }
    throw new ConfigError('unterminated string');
  }
  function value() {
    skip();
    const start = offset;
    if (source[offset] === '"') return string();
    if (source[offset] === '[') {
      offset++;
      const elements = [];
      skip();
      while (source[offset] !== ']') {
        if (offset >= source.length) throw new ConfigError('unterminated array');
        const element = value();
        skip();
        if (source[offset] === ',') { element.comma = offset++; skip(); }
        else if (source[offset] !== ']') throw new ConfigError('expected array comma');
        elements.push(element);
      }
      offset++;
      return { value: elements.map(entry => entry.value), start, end: offset, elements };
    }
    if (source[offset] === '{') {
      offset++;
      const properties = [];
      skip();
      while (source[offset] !== '}') {
        if (offset >= source.length) throw new ConfigError('unterminated object');
        if (source[offset] !== '"') throw new ConfigError('expected object key');
        const key = string();
        skip();
        if (source[offset++] !== ':') throw new ConfigError('expected colon');
        const entry = value();
        skip();
        const property = { key, entry, start: key.start, end: entry.end };
        if (source[offset] === ',') { property.comma = offset++; skip(); }
        else if (source[offset] !== '}') throw new ConfigError('expected object comma');
        properties.push(property);
      }
      offset++;
      return { value: Object.fromEntries(properties.map(prop => [prop.key.value, prop.entry.value])), start, end: offset, properties };
    }
    const match = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(source.slice(offset));
    if (!match) throw new ConfigError('invalid value');
    offset += match[0].length;
    if (/[\w.+-]/.test(source[offset] || '')) throw new ConfigError('invalid value');
    return { value: JSON.parse(match[0]), start, end: offset };
  }
  const root = value();
  skip();
  if (offset !== source.length) throw new ConfigError('unexpected text after config');
  if (!root.properties) throw new ConfigError('top-level value must be an object');
  const matches = root.properties.filter(prop => prop.key.value === 'skills');
  if (matches.length > 1) throw new ConfigError('duplicate top-level skills key');
  if (matches.length && !matches[0].entry.elements) throw new ConfigError('skills must be an array');
  return { root, skills: matches[0]?.entry, value: root.value };
}

function configFile(dir) {
  const json = path.join(dir, 'opencode.json');
  const jsonc = path.join(dir, 'opencode.jsonc');
  // lstat also sees dangling links, which must never be treated as an absent config.
  const exists = file => {
    try { fs.lstatSync(file); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  if (exists(json) && exists(jsonc)) throw new ConfigError('both opencode.json and opencode.jsonc exist');
  return exists(jsonc) ? jsonc : json;
}
function kayloElements(parsed, dataDir) {
  const base = path.resolve(dataDir, 'kaylo');
  return (parsed.skills?.elements || []).filter(entry => typeof entry.value === 'string' &&
    (path.resolve(entry.value) === base || path.resolve(entry.value).startsWith(base + path.sep)));
}
function readConfig(dir, dataDir) {
  const file = configFile(dir);
  let stat;
  try { stat = fs.lstatSync(file); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (stat?.isSymbolicLink()) throw new ConfigError('global config is a symlink');
  const exists = Boolean(stat);
  const source = exists ? fs.readFileSync(file, 'utf8') : null;
  const parsed = exists ? scan(source) : null;
  const entries = parsed ? kayloElements(parsed, dataDir) : [];
  if (entries.length > 1) throw new ConfigError('more than one Kaylo skills entry');
  return { file, exists, source, parsed, entry: entries[0] };
}
function entryVersion(state, dataDir) {
  if (!state.entry) return undefined;
  const base = path.resolve(dataDir, 'kaylo');
  const skill = path.resolve(state.entry.value);
  const relative = path.relative(base, skill).split(path.sep);
  if (relative.length !== 2 || !/^v[^/]+$/.test(relative[0]) || relative[1] !== 'skills')
    throw new ConfigError('Kaylo entry is not a versioned skills directory');
  return { version: relative[0].slice(1), root: path.join(base, relative[0]) };
}
const splice = (source, start, end, replacement) => source.slice(0, start) + replacement + source.slice(end);
function edited(state, action, skillPath) {
  const literal = JSON.stringify(skillPath);
  if (!state.exists) return action === 'uninstall' ? null : `{\n  "skills": [${literal}]\n}\n`;
  const { source, parsed, entry } = state;
  if (action === 'install') {
    if (entry) return entry.value === skillPath ? source : splice(source, entry.start, entry.end, literal);
    const array = parsed.skills;
    if (array) {
      const last = array.elements.at(-1);
      if (!last) return splice(source, array.start + 1, array.start + 1, literal);
      if (last.comma !== undefined) return splice(source, last.comma + 1, last.comma + 1, literal + ',');
      return splice(source, last.end, last.end, ',' + literal);
    }
    const first = parsed.root.properties[0];
    if (!first) return splice(source, parsed.root.start + 1, parsed.root.start + 1, `\n  "skills": [${literal}]\n`);
    const line = source.slice(source.lastIndexOf('\n', first.start - 1) + 1, first.start);
    const indent = /^\s*$/.test(line) ? line : '  ';
    return splice(source, first.start, first.start, `"skills": [${literal}],\n${indent}`);
  }
  if (!entry) return source;
  const elements = parsed.skills.elements;
  const index = elements.indexOf(entry);
  if (entry.comma !== undefined) {
    // A trailing comma belongs to this element only if it is the last one.
    return splice(source, entry.start, entry.comma + 1, source.slice(entry.end, entry.comma));
  }
  if (index > 0) {
    const prior = elements[index - 1];
    return splice(source, prior.comma, entry.end, source.slice(prior.comma + 1, entry.start));
  }
  return splice(source, entry.start, entry.end, '');
}
function changeConfig(dir, dataDir, action, skillPath) {
  const state = readConfig(dir, dataDir);
  const next = edited(state, action, skillPath);
  if (next === null || next === state.source) return state.file;
  const expected = structuredClone(state.parsed?.value || {});
  const old = Array.isArray(expected.skills) ? expected.skills : [];
  if (action === 'install') expected.skills = state.entry ? old.map(value => value === state.entry.value ? skillPath : value) : [...old, skillPath];
  else expected.skills = old.filter(value => value !== state.entry?.value);
  assert.deepStrictEqual(scan(next).value, expected);
  fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.kaylo-config-${process.pid}-${Math.random().toString(16).slice(2)}`);
  try {
    fs.writeFileSync(temp, next, { mode: state.exists ? fs.statSync(state.file).mode : 0o666 });
    assert.deepStrictEqual(scan(fs.readFileSync(temp, 'utf8')).value, expected);
    if (state.exists) fs.copyFileSync(state.file, `${state.file}.kaylo-backup`);
    fs.renameSync(temp, state.file);
  } finally { fs.rmSync(temp, { force: true }); }
  return state.file;
}
function manualMessage(reason, dir, skillPath) {
  let file;
  try { file = configFile(dir); } catch { file = path.join(dir, 'opencode.json'); }
  return `OpenCode: not installed — ${reason}. Add this to ${file} manually: "skills": [${JSON.stringify(skillPath)}]`;
}
module.exports = { ConfigError, scan, configFile, readConfig, entryVersion, changeConfig, manualMessage };
