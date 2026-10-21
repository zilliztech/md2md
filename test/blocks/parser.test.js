const { parseBlocks, stripBlockMarkers } = require("../../src/blocks");

const start = (id = "x") => `<!-- doc:block:start id="${id}" -->`;
const end = (id = "x") => `<!-- doc:block:end id="${id}" -->`;
const parse = (content, options = {}) => parseBlocks(content, { sourceName: "page.md", ...options });
const codes = (content, options) => parse(content, options).errors.map(({ code, line }) => [code, line]);

test('[T01] an unmarked page is valid and unchanged', () => {
  expect(parse('# Hello\n')).toEqual({ ok: true, blocks: [], errors: [] });
  expect(stripBlockMarkers('# Hello\n')).toBe('# Hello\n');
});

test('[T01][2-1] positions include the marker lines, starting at one', () => {
  const input = `# Title\n${start('first')}\nText\n${end('first')}\n${start('2-last')}\nMore\n${end('2-last')}`;
  expect(parse(input)).toEqual({ ok: true, blocks: [
    { id: 'first', startLine: 2, endLine: 4 },
    { id: '2-last', startLine: 5, endLine: 7 },
  ], errors: [] });
  expect(stripBlockMarkers(input)).toBe('# Title\nText\nMore\n');
});

test.each(['    ', '\t', ' \t    '])('[2-1] four spaces or Tab are valid marker indentation: %j', (indent) => {
  const input = `${indent}${start()} \t\nbody\n${indent}${end()}\t`;
  expect(parse(input).ok).toBe(true);
  expect(parse(input).blocks).toEqual([{ id: 'x', startLine: 1, endLine: 3 }]);
  expect(stripBlockMarkers(input)).toBe('body\n');
});

test.each(['\n', '\r\n', '\r'])('[2-1] preserves remaining bytes with line ending %j', (eol) => {
  const input = `before  ${eol}${start()}${eol}body\t${eol}${end()}${eol}after`;
  expect(stripBlockMarkers(input)).toBe(`before  ${eol}body\t${eol}after`);
  expect(parse(input).blocks).toEqual([{ id: 'x', startLine: 2, endLine: 4 }]);
});

test('[2-1] mixed endings, blank lines, and missing final newline remain exact', () => {
  const input = `before\r\n${start()}\n \t\r\nbody\r${end()}\r\nafter`;
  expect(stripBlockMarkers(input)).toBe('before\r\n \t\r\nbody\rafter');
  expect(stripBlockMarkers('')).toBe('');
  expect(parse('').ok).toBe(true);
});

test.each([
  ['BLOCK_DUPLICATE_ID', `${start()}\na\n${end()}\n${start()}\nb\n${end()}`, 4],
  ['BLOCK_UNCLOSED', `text\n${start()}\na`, 2],
  ['BLOCK_UNMATCHED_END', `text\n${end()}`, 2],
  ['BLOCK_CROSSED', `${start()}\na\n${end('y')}`, 3],
  ['BLOCK_NESTED', `${start()}\n${start('y')}\na\n${end('y')}\n${end()}`, 2],
  ['BLOCK_EMPTY', `${start()}\n \t\n${end()}`, 1],
])('[T01] [%s] reports the original line', (code, content, line) => {
  const result = parse(content);
  expect(result.ok).toBe(false);
  expect(result.blocks).toEqual([]);
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code, line, file: 'page.md', message: expect.any(String) })]));
});

test.each([
  '<!-- doc:block:start id=X -->', '<!-- doc:block:start id="X" -->',
  '<!-- doc:block:start id="-x" -->', '<!-- doc:block:start id="a_b" -->',
  '<!-- doc:block:start id="" -->', '<!-- doc:block:begin id="x" -->',
  `text ${start()}`, `${start()} text`, `${start()}${end()}`,
  `\u00a0${start()}`, `${start()}\u3000`, '<!-- DOC:BLOCK:start id="x" -->',
])('[T01][BLOCK_MALFORMED] rejects malformed or inline markers: %s', (input) => {
  expect(codes(input)).toContainEqual(['BLOCK_MALFORMED', 1]);
  expect(stripBlockMarkers(input)).toBe(input);
});

test('[BLOCK_IN_FRAGMENT] checks every marker including malformed markers', () => {
  expect(codes(`${start()}\na\n${end()}`, { isFragment: true })).toEqual([
    ['BLOCK_IN_FRAGMENT', 1], ['BLOCK_IN_FRAGMENT', 3],
  ]);
  expect(codes('<!-- doc:block:start id=X -->', { isFragment: true })).toEqual([
    ['BLOCK_IN_FRAGMENT', 1],
  ]);
});

test('[T01] collects errors across the whole file and never returns partial blocks', () => {
  const input = `${end()}\n${start('ok')}\na\n${end('ok')}\n<!-- doc:block:start id=X -->\n${start('empty')}\n${end('empty')}\n${start('open')}`;
  expect(codes(input)).toEqual([
    ['BLOCK_UNMATCHED_END', 1], ['BLOCK_MALFORMED', 5], ['BLOCK_EMPTY', 6], ['BLOCK_UNCLOSED', 8],
  ]);
  expect(parse(input).blocks).toEqual([]);
});

test.each(['```', '~~~~', '`````', '   ~~~'])('[2-1] fence %s protects valid and malformed example markers', (fence) => {
  const input = `${fence}markdown\n${start()}\n<!-- doc:block:end id=X -->\n${fence.trim()}`;
  expect(parse(input, { isFragment: true })).toEqual({ ok: true, blocks: [], errors: [] });
  expect(stripBlockMarkers(input)).toBe(input);
});

test('[2-1] shorter and unlike fences cannot close a fence; a longer matching fence can', () => {
  const example = `\`\`\`\`md\n\`\`\`\n~~~\n${start()}\n\`\`\`\`\`\n`;
  const input = `${example}${start()}\nreal\n${end()}`;
  expect(parse(input).blocks).toEqual([{ id: 'x', startLine: 6, endLine: 8 }]);
  expect(stripBlockMarkers(input)).toBe(`${example}real\n`);
});

test('[2-1] closing fences allow only horizontal whitespace and an unclosed fence protects to EOF', () => {
  const input = `~~~md\n~~~ text\n${start()}\n~~~\t \n${start()}\nreal\n${end()}`;
  expect(parse(input).blocks).toEqual([{ id: 'x', startLine: 5, endLine: 7 }]);
  expect(parse(`~~~\n${start()}`).ok).toBe(true);
  expect(stripBlockMarkers(`~~~\n${start()}`)).toBe(`~~~\n${start()}`);
});

test('[T01] backticks in backtick info strings and four-space fences are not opening fences', () => {
  for (const invalid of ['```bad`info', '    ```', '\t~~~']) {
    expect(codes(`${invalid}\n${end()}`)).toContainEqual(['BLOCK_UNMATCHED_END', 2]);
  }
  expect(parse(`~~~bad\`info\n${end()}`).ok).toBe(true);
});

const group = ['<div class="multipleCode">', '<a href="#python">Python</a>', '</div>', '', '```python', 'print(1)', '```', '', '~~~java', 'hello();', '~~~'];
test('[T01] complete multipleCode groups and standalone code blocks are valid', () => {
  for (const body of [group.join('\n'), '```python\npass\n```', `Text\n${group.join('\n')}\nMore`]) {
    expect(parse(`${start()}\n${body}\n${end()}`).ok).toBe(true);
  }
});

test.each([0, 1, 2, 3, 4, 7, 8])('[T01][BLOCK_PARTIAL_CODE_GROUP] rejects boundaries inside a code group at %i', (index) => {
  // Boundary in the switcher, before code, or between languages.
  const content = [...group.slice(0, index + 1), start(), ...group.slice(index + 1), end()].join('\n');
  // index 4/8 is inside a fence, so only the end is visible: still invalid.
  expect(parse(content).ok).toBe(false);
  if (![4, 8].includes(index)) expect(codes(content)).toContainEqual(['BLOCK_PARTIAL_CODE_GROUP', index + 2]);
});

test('[BLOCK_PARTIAL_CODE_GROUP] rejects only the switcher or the first language', () => {
  for (const last of [2, 6]) {
    expect(codes([start(), ...group.slice(0, last + 1), end(), ...group.slice(last + 1)].join('\n')))
      .toContainEqual(['BLOCK_PARTIAL_CODE_GROUP', 1]);
  }
});

test('[T01] blank lines and markers are transparent to group boundaries, prose ends a group', () => {
  const input = `${group.join('\n')}\n\nparagraph\n${start()}\n~~~js\ncode\n~~~\n${end()}`;
  expect(parse(input).ok).toBe(true);
  const fake = `\`\`\`html\n<div class="multipleCode">\n\`\`\`\n${start()}\nbody\n${end()}`;
  expect(parse(fake).ok).toBe(true);
});
