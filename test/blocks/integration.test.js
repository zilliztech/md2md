const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const repo = path.resolve(__dirname, "../..");
const start = '<!-- doc:block:start id="x" -->';
const end = '<!-- doc:block:end id="x" -->';
let root;

function put(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function run(bin, args = []) {
  const env = { ...process.env, PATH_ROOT: root };
  delete env.name_dir_from;
  return spawnSync(process.execPath, [path.join(repo, 'bin', bin), ...args], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'md2md-blocks-'));
  put('m2m.config.json', JSON.stringify({ name_dir_from: 'source', name_dir_to: 'output' }));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('[2-3] CLI checks all nested markdown files and reports every file, line and code', () => {
  put('source/en/a.md', `${end}\n${start}`);
  put('source/en/nested/b.md', `text\n<!-- doc:block:start id=X -->`);
  put('source/en/fragments/c.md', `${start}\nbody\n${end}`);
  put('source/en/ignored.txt', start);
  const result = run('md2md-blocks.js', ['check', 'source']);
  expect(result.status).toBe(1);
  const output = result.stdout + result.stderr;
  expect(output).toContain('source/en/a.md:1 BLOCK_UNMATCHED_END');
  expect(output).toContain('source/en/a.md:2 BLOCK_UNCLOSED');
  expect(output).toContain('source/en/nested/b.md:2 BLOCK_MALFORMED');
  expect(output).toContain('source/en/fragments/c.md:1 BLOCK_IN_FRAGMENT');
  expect(output).toContain('source/en/fragments/c.md:3 BLOCK_IN_FRAGMENT');
  expect(output).not.toContain('ignored.txt');
});

test('[2-3] CLI success is silent and does not modify the input', () => {
  const input = `${start}\nbody\n${end}`;
  put('source/en/a.md', input);
  put('source/en/fragments/example.md', `~~~md\n${start}\n~~~`);
  expect(run('md2md-blocks.js', ['check', 'source'])).toMatchObject({ status: 0, stdout: '', stderr: '' });
  expect(fs.readFileSync(path.join(root, 'source/en/a.md'), 'utf8')).toBe(input);
});

test('[2-3] CLI rejects missing directories and invalid arguments', () => {
  for (const args of [[], ['nope', 'source'], ['check'], ['check', 'missing'], ['check', 'a', 'b']]) {
    const result = run('md2md-blocks.js', args);
    expect(result.status).toBe(1);
    expect(result.stderr).not.toBe('');
  }
});

test('[2-1][2-2] goover strips real markers while retaining code examples and existing substitutions', () => {
  const body = '# Title\r\n\r\n{{var.product}}\r\n~~~md\r\n<!-- doc:block:start id=EXAMPLE -->\r\n~~~\r\n';
  put('source/en/Variables.json', '{"product":"Milvus"}');
  put('source/en/page.md', body);
  expect(run('goover.js').status).toBe(0);
  const before = fs.readFileSync(path.join(root, 'output/en/page.md'));
  put('source/en/page.md', `    ${start}\r\n${body}\t${end}\r\n`);
  const result = run('goover.js');
  expect(result.status).toBe(0);
  expect(fs.readFileSync(path.join(root, 'output/en/page.md'))).toEqual(before);
  expect(before.toString()).toContain('Milvus');
  expect(before.toString()).toContain('doc:block:start id=EXAMPLE');
});

test('[2-3] goover fails before writing an invalid source and reports original line numbers', () => {
  put('source/en/page.md', `---\ntitle: Example\n---\n${end}`);
  const result = run('goover.js');
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('page.md:4 BLOCK_UNMATCHED_END');
  expect(fs.existsSync(path.join(root, 'output/en/page.md'))).toBe(false);
});

test.each(['fragments', 'snippets'])('[BLOCK_IN_FRAGMENT] goover validates filtered and unused fragment directory %s', (directory) => {
  put('m2m.config.json', JSON.stringify({ name_dir_from: 'source', name_dir_to: 'output', name_dir_fragments: directory }));
  put('source/en/page.md', '# Good page');
  put(`source/en/${directory}/unused.md`, `${start}\nbody\n${end}`);
  const result = run('goover.js');
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain(`${directory}/unused.md:1 BLOCK_IN_FRAGMENT`);
});

test('[2-1] goover validates the transformed output as well as the source', () => {
  put('source/en/Variables.json', JSON.stringify({ injected: end }));
  put('source/en/page.md', '{{var.injected}}');
  const result = run('goover.js');
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('BLOCK_UNMATCHED_END');
  expect(fs.existsSync(path.join(root, 'output/en/page.md'))).toBe(false);
});

test('[2-1] goover clears generated template markdown but leaves non-markdown assets alone', () => {
  put('source/en/templates/page.md', `${start}\n{{var.product}}\n${end}`);
  put('source/en/page.json', JSON.stringify({ useTemplate: true, path: 'templates/page.md', var: { product: 'Milvus' } }));
  put('source/en/example.txt', `${start}\n${end}`);
  const result = run('goover.js');
  expect(result.status).toBe(0);
  expect(fs.readFileSync(path.join(root, 'output/en/page.md'), 'utf8')).toBe('Milvus\n');
  expect(fs.readFileSync(path.join(root, 'output/en/example.txt'), 'utf8')).toBe(`${start}\n${end}`);
});

test('[2-1] the package exposes its CommonJS blocks subpath without loading site plugins', () => {
  const result = spawnSync(process.execPath, ['-e', 'const b = require("@zilliz/mdtomd/blocks.js"); console.log(b.parseBlocks("text").ok)'], { cwd: repo, encoding: 'utf8' });
  expect(result).toMatchObject({ status: 0, stdout: 'true\n', stderr: '' });
});

test('[2-1] goover waits for async plugins before validating and writing', () => {
  put('source/en/page.md', 'body');
  const script = `const md = require(${JSON.stringify(repo)});
    md.register('slow-example', async (_path, content) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return ${JSON.stringify(start + '\n')} + content + ${JSON.stringify('\n' + end + '\n')};
    });
    md.goOver();`;
  const env = { ...process.env, PATH_ROOT: root };
  delete env.name_dir_from;
  const result = spawnSync(process.execPath, ['-e', script], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
  expect(result.status).toBe(0);
  expect(fs.readFileSync(path.join(root, 'output/en/page.md'), 'utf8')).toBe('body\n');
});

test('the original root API retains markers outside goover', () => {
  const input = `${start}\nbody\n${end}`;
  put('source/en/page.md', input);
  const script = `const md = require('@zilliz/mdtomd');
    md.markdownToString(${JSON.stringify(path.join(root, 'source/en/page.md'))}).then(content => console.log(JSON.stringify(content)));`;
  const env = { ...process.env, PATH_ROOT: root };
  delete env.name_dir_from;
  const result = spawnSync(process.execPath, ['-e', script], { cwd: repo, env, encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(JSON.stringify(input));
});

test('[2-3] CLI handles symlink cycles and checks a fragment-directory alias', () => {
  put('source/en/plain/a.md', `${start}\nbody\n${end}`);
  fs.symlinkSync(path.join(root, 'source/en'), path.join(root, 'source/en/plain/cycle'));
  fs.symlinkSync(path.join(root, 'source/en/plain'), path.join(root, 'source/en/fragments'));
  const result = run('md2md-blocks.js', ['check', 'source']);
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('source/en/fragments/a.md:1 BLOCK_IN_FRAGMENT');
});
