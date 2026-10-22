const fs = require('fs');
const path = require('path');
const { preprocess } = require('../../src/preprocess');
const { fixture } = require('./helpers');
const engine = require('../../package.json');

function contract(file) {
  const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../contract/cases/preprocess', file), 'utf8'));
  const root = fixture(data.files, data.symlinks);
  try {
    const run = () => preprocess({ ...data.input, fragmentRoot: root });
    if (data.expected.throws) { expect(run).toThrow(TypeError); return; }
    const result = run();
    expect(result.engine).toEqual({ name: engine.name, version: engine.version });
    expect(result.errors.every(error => typeof error.message === 'string' && error.message.length > 0)).toBe(true);
    const actual = { ...result, errors: result.errors.map(({ code, file, line, detail }) => ({ code, file, line, detail })) };
    delete actual.engine;
    expect(actual).toEqual(data.expected);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// Literal IDs keep these portable contracts visible to the existing coverage checker.
test('[1-2][1-3][1-4][1-5][T02][T03] dependency and expansion contract', () => contract('success.json'));
test('[VAR_MISSING] missing variable contract', () => contract('missing.json'));
test('[VAR_NOT_SCALAR] non-scalar variable contract', () => contract('scalar.json'));
test('[FRAGMENT_NOT_FOUND] missing fragment contract', () => contract('not-found.json'));
test('[FRAGMENT_OUT_OF_ROOT] escaping fragment contract', () => contract('out-of-root.json'));
test('[FRAGMENT_SYMLINK] symlink contract', () => contract('symlink.json'));
test('[FRAGMENT_CYCLE] cycle contract', () => contract('cycle.json'));
test('[LIMIT_EXCEEDED] depth contract', () => contract('limits.json'));
test('[LIMIT_EXCEEDED] distinct-file count contract', () => contract('limit-count.json'));
test('[LIMIT_EXCEEDED] UTF-8 fragment bytes contract', () => contract('limit-size.json'));
test('[LIMIT_EXCEEDED] repeated output bytes contract', () => contract('limit-repeat.json'));
test('[UNSUPPORTED_MARK] site plugin contract', () => contract('unsupported.json'));
test('[T02] case-insensitive collision contract', () => contract('collision.json'));
