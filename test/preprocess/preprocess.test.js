const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { preprocess } = require('../../src/preprocess');
const { fixture } = require('./helpers');
const repo = path.resolve(__dirname, '../..');
let root;
beforeEach(() => { root = fixture({ 'fragments/a.md': '{{var.product}}' }); });
afterEach(() => { jest.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });
const run = (content, options = {}) => preprocess({ content, fragmentRoot: root, variables: { product: 'Cloud' }, ...options });

function processScript(script, cwd = repo) {
  const env = { ...process.env, PATH_ROOT: root };
  delete env.name_dir_from;
  return spawnSync(process.execPath, ['-e', script], { cwd, env, encoding: 'utf8', timeout: 15000 });
}

test('[T02] invalid API argument types and ambiguous or cyclic tables throw TypeError', () => {
  const valid = { content: '', fragmentRoot: root, variables: {} };
  for (const input of [undefined, null, [], 'text', { ...valid, content: null }, { ...valid, fragmentRoot: '.' },
    { ...valid, variables: [] }, { ...valid, variables: null }, { ...valid, sourceName: 3 }, { ...valid, limits: [] },
    { ...valid, variables: { A: 1, a: 2 } }, { ...valid, variables: { unused: { A: 1, a: 2 } } }]) {
    expect(() => preprocess(input)).toThrow(TypeError);
  }
  const cycle = {}; cycle.self = cycle;
  expect(() => run('', { variables: cycle })).toThrow(TypeError);
  for (const value of [-1, 0.5, NaN, Infinity, '2', null, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => run('', { limits: { maxDepth: value } })).toThrow(TypeError);
  }
});

test('[T02] inherited keys are missing, non-scalar values fail, and empty scalar values survive', () => {
  expect(run('{{var.constructor}} {{var.__proto__}}').errors.map(error => error.code)).toEqual(['VAR_MISSING', 'VAR_MISSING']);
  for (const value of [{}, [], null, undefined, NaN, Infinity, () => 'value']) {
    expect(run('{{var.x}}', { variables: { x: value } }).errors[0].code).toBe('VAR_NOT_SCALAR');
  }
  const variables = Object.assign(Object.create(null), { empty: '', zero: 0, enabled: false });
  expect(run('{{var.empty}}/{{var.zero}}/{{var.enabled}}', { variables }).content).toBe('/0/false');
});

test('[1-3][1-4] literal values and unrelated templates retain every byte', () => {
  const literal = '$& $` $\' {{var.product}} {{fragments/missing.md}} {{tab}} ::glossary.x';
  expect(run('{{var.x}} {{var.x}}\r\n{{ doc.content }} {{custom.x}}', { variables: { x: literal } }).content)
    .toBe(`${literal} ${literal}\r\n{{ doc.content }} {{custom.x}}`);
});

test('[1-5][T03] aliases and repeated nested references open each fragment only once', () => {
  fs.mkdirSync(path.join(root, 'fragments/sub'));
  fs.writeFileSync(path.join(root, 'fragments/b.md'), '{{fragments/a.md}}');
  const open = jest.spyOn(fs, 'openSync');
  const result = run('{{fragments/a.md}}{{fragments/sub/../a.md}}{{fragments/b.md}}');
  expect(result.content).toBe('CloudCloudCloud');
  expect(open.mock.calls.map(call => call[0])).toEqual([path.join(root, 'fragments/a.md'), path.join(root, 'fragments/b.md')]);
  expect(result.dependencies.fragments[0].includedBy).toEqual(['<input>', 'fragments/b.md']);
});

test('[T02] parallel calls and later calls have independent variables and read caches', async () => {
  const content = '{{fragments/a.md}}';
  const results = await Promise.all(['First', 'Second'].map(product => Promise.resolve().then(() => run(content, { variables: { product } }))));
  expect(results.map(result => result.content)).toEqual(['First', 'Second']);
  fs.writeFileSync(path.join(root, 'fragments/a.md'), 'Changed {{var.product}}');
  expect(run(content).content).toBe('Changed Cloud');
});

test.each(['../outside.md', 'sub/../../outside.md', '/absolute.md', 'C:/absolute.md', '..\\outside.md', 'a.txt', 'a.md\0'])
('[FRAGMENT_OUT_OF_ROOT] rejects unsafe fragment path %s', suffix => {
  const read = jest.spyOn(fs, 'openSync');
  expect(run(`{{fragments/${suffix}}}`).errors[0].code).toBe('FRAGMENT_OUT_OF_ROOT');
  expect(read).not.toHaveBeenCalled();
});

test('[FRAGMENT_SYMLINK] checks the file, directories, root, and paths before parent normalization', () => {
  fs.symlinkSync('a.md', path.join(root, 'fragments/link.md'));
  fs.symlinkSync('.', path.join(root, 'fragments/link'));
  fs.symlinkSync('missing.md', path.join(root, 'fragments/broken.md'));
  for (const reference of ['link.md', 'link/a.md', 'link/../a.md', 'broken.md']) {
    expect(run(`{{fragments/${reference}}}`).errors[0].code).toBe('FRAGMENT_SYMLINK');
  }
  fs.symlinkSync(root, path.join(root, 'alias'));
  expect(run('{{fragments/a.md}}', { fragmentRoot: path.join(root, 'alias') }).errors[0].code).toBe('FRAGMENT_SYMLINK');
  fs.renameSync(path.join(root, 'fragments'), path.join(root, 'real-fragments'));
  fs.symlinkSync('real-fragments', path.join(root, 'fragments'));
  expect(run('{{fragments/a.md}}').errors[0].code).toBe('FRAGMENT_SYMLINK');
});

test('[FRAGMENT_NOT_FOUND] refuses directories and reports independent content errors together', () => {
  fs.mkdirSync(path.join(root, 'fragments/directory.md'));
  const result = run('{{var.missing}}\r\n{{fragments/directory.md}}\r\n{{fragments/absent.md}}\r\n{{tab}}');
  expect(result.content).toBeNull();
  expect(result.errors.map(({ code, line }) => [code, line])).toEqual([
    ['FRAGMENT_NOT_FOUND', 2], ['FRAGMENT_NOT_FOUND', 3], ['VAR_MISSING', 1], ['UNSUPPORTED_MARK', 4],
  ]);
});

test('[LIMIT_EXCEEDED] inclusive limits count distinct files and final UTF-8 output', () => {
  fs.writeFileSync(path.join(root, 'fragments/a.md'), '{{var.x}}');
  const result = run('{{fragments/a.md}}{{fragments/a.md}}', {
    variables: { x: 'é' }, limits: { maxDepth: 1, maxFragments: 1, maxFragmentBytes: 9, maxOutputBytes: 4 },
  });
  expect(result.content).toBe('éé');
  expect(run('{{var.x}}', { variables: { x: 'éé' }, limits: { maxOutputBytes: 3 } }).errors[0].detail.limit).toBe('maxOutputBytes');
  expect(run('', { limits: { maxOutputBytes: 0, maxFragments: 0, maxDepth: 0, maxFragmentBytes: 0 } }).ok).toBe(true);
  for (const key of ['maxDepth', 'maxFragments', 'maxFragmentBytes']) {
    expect(run('{{fragments/a.md}}', { limits: { [key]: 0 } }).errors[0].detail.limit).toBe(key);
  }
});

test('[LIMIT_EXCEEDED] shared fragments are rechecked on deeper routes', () => {
  fs.writeFileSync(path.join(root, 'fragments/a.md'), '{{fragments/b.md}}');
  fs.writeFileSync(path.join(root, 'fragments/b.md'), '{{fragments/c.md}}');
  fs.writeFileSync(path.join(root, 'fragments/c.md'), 'end');
  const result = run('{{fragments/b.md}}{{fragments/a.md}}', { limits: { maxDepth: 2 } });
  expect(result.errors).toEqual([expect.objectContaining({ code: 'LIMIT_EXCEEDED', file: 'fragments/b.md', line: 1, detail: { limit: 'maxDepth' } })]);
});

test('[LIMIT_EXCEEDED] defaults bound depth, distinct fragments, fragment bytes, and output bytes', () => {
  for (let i = 1; i <= 6; i++) fs.writeFileSync(path.join(root, `fragments/${i}.md`), i === 6 ? 'end' : `{{fragments/${i + 1}.md}}`);
  expect(run('{{fragments/1.md}}').errors[0].detail.limit).toBe('maxDepth');
  let content = '';
  for (let i = 1; i <= 101; i++) {
    fs.writeFileSync(path.join(root, `fragments/${i}.md`), '');
    content += `{{fragments/${i}.md}}`;
  }
  expect(run(content).errors[0].detail.limit).toBe('maxFragments');
  fs.writeFileSync(path.join(root, 'fragments/a.md'), 'x'.repeat(256 * 1024 + 1));
  expect(run('{{fragments/a.md}}').errors[0].detail.limit).toBe('maxFragmentBytes');
  expect(run('x'.repeat(2 * 1024 * 1024)).ok).toBe(true);
  expect(run('x'.repeat(2 * 1024 * 1024 + 1)).errors[0].detail.limit).toBe('maxOutputBytes');
});

test('[T02][T11] supported expansion matches the existing goover output', () => {
  fs.mkdirSync(path.join(root, 'source/en/fragments'), { recursive: true });
  fs.writeFileSync(path.join(root, 'm2m.config.json'), JSON.stringify({ name_dir_from: 'source', name_dir_to: 'output' }));
  fs.writeFileSync(path.join(root, 'source/en/Variables.json'), JSON.stringify({ product: 'Milvus', cloud: { region: 'eu' } }));
  fs.writeFileSync(path.join(root, 'source/en/fragments/intro.md'), '{{var.product}}\n');
  const content = '# Page\n\n{{fragments/intro.md}}\n```js\n{{var.cloud.region}}\n```\n';
  fs.writeFileSync(path.join(root, 'source/en/page.md'), content);
  const result = processScript(`require(${JSON.stringify(path.join(repo, 'bin/goover.js'))})`, root);
  expect(result.status).toBe(0);
  const expanded = run(content, { fragmentRoot: path.join(root, 'source/en'), variables: { product: 'Milvus', cloud: { region: 'eu' } } });
  expect(expanded.content).toBe(fs.readFileSync(path.join(root, 'output/en/page.md'), 'utf8'));
  expect(run('{{var.product}}', { fragmentRoot: path.join(root, 'source/en'), variables: {} }).errors[0].code).toBe('VAR_MISSING');
});

test('[T02] public CommonJS export loads without site configuration or plugins', () => {
  fs.writeFileSync(path.join(root, 'm2m.config.json'), 'invalid JSON');
  const result = processScript(`const assert = require('assert');
    const { preprocess } = require('@zilliz/mdtomd/preprocess.js');
    assert(preprocess({ content: '', fragmentRoot: ${JSON.stringify(root)}, variables: {} }).ok);
    assert(!Object.keys(require.cache).some(file => ['/src/plugin/', '/src/Consts.js', '/src/helpers/'].some(part => file.includes(part))));`);
  expect(result).toMatchObject({ status: 0, stdout: '', stderr: '' });
});

test('[LIMIT_EXCEEDED] output limits are still checked when other independent errors exist', () => {
  const result = run('{{var.missing}}\nlong text', { limits: { maxOutputBytes: 2 } });
  expect(result.errors.map(error => error.code)).toEqual(['VAR_MISSING', 'LIMIT_EXCEEDED']);
  expect(result.content).toBeNull();
});
