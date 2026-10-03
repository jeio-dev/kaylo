'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const config = require('../bin/opencode-config.cjs');

function fixture(t, source, ext = 'jsonc') {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kaylo-config-test-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const dir = path.join(home, 'config', 'opencode');
  const data = path.join(home, 'data');
  const skill = path.join(data, 'kaylo', 'v0.9.3', 'skills');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `opencode.${ext}`);
  if (source !== null) fs.writeFileSync(file, source);
  return { dir, data, skill, file, read: () => fs.readFileSync(file, 'utf8') };
}
function roundtrip(t, source) {
  const f = fixture(t, source);
  config.changeConfig(f.dir, f.data, 'install', f.skill);
  assert.equal(config.readConfig(f.dir, f.data).entry.value, f.skill);
  config.changeConfig(f.dir, f.data, 'uninstall');
  assert.equal(f.read(), source);
}

test('JSONC scanner handles comments, escapes, URLs, trailing commas and rejects unterminated tokens', () => {
  const parsed = config.scan('/*before*/ {"url":"https://x/*not-comment*/", "skills": ["a", // inside\n "b",],} //after');
  assert.deepEqual(parsed.value.skills, ['a', 'b']);
  assert.equal(parsed.value.url, 'https://x/*not-comment*/');
  for (const source of ['{"skills": ["a"', '{"skills": ["a"] /*', '{"skills": ["a\\', '{"skills": nope}'])
    assert.throws(() => config.scan(source), config.ConfigError);
});

test('install then uninstall restores existing skills fixtures byte for byte', t => {
  for (const source of [
    '{"skills":[]}',
    '{"skills":["/other"]}',
    '{\n // before\n "skills": [\n  "https://host//path", /* inside */\n ], // after\n "other": true\n}\n',
    '{"skills": ["/other", // after item\n ], "x": "/*text*/"}',
    '{"skills": ["/other", "/somewhere/else"], "x": 1}'
  ]) roundtrip(t, source);
});

test('an existing Kaylo path is replaced with one text splice', t => {
  const f = fixture(t, '{"skills": ["/other", "OLD"], "x": 2}'.replace('OLD',
    path.join(os.tmpdir(), 'unused')));
  const old = path.join(f.data, 'kaylo', 'v0.9.2', 'skills');
  const original = `{"skills": ["/other", ${JSON.stringify(old)}], "x": 2}`;
  fs.writeFileSync(f.file, original);
  config.changeConfig(f.dir, f.data, 'install', f.skill);
  assert.equal(f.read(), original.replace(JSON.stringify(old), JSON.stringify(f.skill)));
  assert.deepEqual(config.entryVersion(config.readConfig(f.dir, f.data), f.data),
    { version: '0.9.3', root: path.join(f.data, 'kaylo', 'v0.9.3') });
});

test('new skills key is inserted first and uninstall leaves an empty array', t => {
  for (const source of ['{}', '{\n  "other": 1\n}', '{"other":1}']) {
    const f = fixture(t, source);
    config.changeConfig(f.dir, f.data, 'install', f.skill);
    assert.equal(Object.keys(config.scan(f.read()).value)[0], 'skills');
    config.changeConfig(f.dir, f.data, 'uninstall');
    assert.deepEqual(config.scan(f.read()).value.skills, []);
  }
});

test('no file creates opencode.json; both files and malformed configs refuse without changes', t => {
  const f = fixture(t, null);
  config.changeConfig(f.dir, f.data, 'install', f.skill);
  const json = path.join(f.dir, 'opencode.json');
  assert.equal(fs.readFileSync(json, 'utf8'), `{\n  "skills": [${JSON.stringify(f.skill)}]\n}\n`);
  fs.writeFileSync(f.file, '{}');
  const before = fs.readFileSync(json, 'utf8');
  assert.throws(() => config.changeConfig(f.dir, f.data, 'install', f.skill), config.ConfigError);
  assert.equal(fs.readFileSync(json, 'utf8'), before);
});

test('duplicate, non-array, malformed and two Kaylo entries refuse byte-identically', t => {
  for (const make of [
    () => '{"skills": [], "skills": []}',
    () => '{"skills": 2}',
    () => '{"skills": [}',
    f => `{"skills": [${JSON.stringify(f.skill)}, ${JSON.stringify(f.skill)}]}`
  ]) {
    const f = fixture(t, '{}');
    const source = make(f);
    fs.writeFileSync(f.file, source);
    assert.throws(() => config.changeConfig(f.dir, f.data, 'install', f.skill));
    assert.equal(f.read(), source);
  }
});

test('uninstall removes sole Kaylo entry and leaves skills key', t => {
  const f = fixture(t, '{}');
  fs.writeFileSync(f.file, `{"skills": [${JSON.stringify(f.skill)}]}`);
  config.changeConfig(f.dir, f.data, 'uninstall');
  assert.equal(f.read(), '{"skills": []}');
});

test('symlinked and dangling global configs are refused without replacing the link', t => {
  for (const dangling of [false, true]) {
    const f = fixture(t, null);
    const target = path.join(f.dir, '..', `dotfiles-${dangling}.jsonc`);
    const original = '{"skills": ["/other"]}\n';
    if (!dangling) fs.writeFileSync(target, original);
    fs.symlinkSync(target, f.file);
    assert.throws(() => config.readConfig(f.dir, f.data), /symlink/);
    assert.throws(() => config.changeConfig(f.dir, f.data, 'install', f.skill), /symlink/);
    assert(fs.lstatSync(f.file).isSymbolicLink());
    if (!dangling) assert.equal(fs.readFileSync(target, 'utf8'), original);
    assert(!fs.existsSync(path.join(f.dir, 'opencode.json')));
  }
});
