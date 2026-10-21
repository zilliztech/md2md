const fs = require("fs");
const path = require("path");
const requirements = require("./requirements.json");
const pending = require("./pending.json");

function testFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) return testFiles(file);
    return /\.(test|spec)\.js$/.test(item.name) ? [file] : [];
  });
}

test('requirement IDs cover this package and contain no unknown or stale pending IDs', () => {
  const known = new Set([
    ...requirements.behaviours.map((item) => item.id),
    ...requirements.acceptance.map((item) => item.id),
    ...requirements.errors.map((item) => item.code),
  ]);
  const owned = new Set([
    '1-2', '1-3', '1-4', '1-5', '2-1', '2-2', '2-3', 'T01', 'T02', 'T03', 'T11',
    ...requirements.errors.filter((item) => ['named-blocks', 'variables-and-fragments'].includes(item.area_id)).map((item) => item.code),
  ]);
  const covered = new Set();
  const readTags = (name) => {
    for (const match of name.matchAll(/\[([A-Z][A-Z0-9_]*|\d+-\d+)\]/g)) covered.add(match[1]);
  };
  const root = path.resolve(__dirname, '../..');
  for (const file of [...testFiles(path.join(root, 'test')), ...testFiles(path.join(root, 'src'))]) {
    const source = fs.readFileSync(file, 'utf8');
    // Read literal test names, including test.each(...)(name, ...). Dynamic
    // shared contract names are taken from the JSON consumed by their runner.
    const names = /\b(?:test|it|cases)(?:\.each\([\s\S]*?\))?\(\s*(['"`])([\s\S]*?)\1/g;
    for (const match of source.matchAll(names)) readTags(match[2]);
  }
  const contracts = path.join(root, 'test/contract/cases/blocks');
  for (const file of fs.readdirSync(contracts).filter((name) => name.endsWith('.json'))) {
    const fixture = JSON.parse(fs.readFileSync(path.join(contracts, file), 'utf8'));
    for (const id of fixture.requirements) covered.add(id);
  }
  expect([...covered].filter((id) => !known.has(id))).toEqual([]);
  expect(Object.keys(pending).filter((id) => !known.has(id) || !owned.has(id))).toEqual([]);
  expect(Object.values(pending).every((owner) => /^WP\d+$/.test(owner))).toBe(true);
  expect([...owned].filter((id) => !covered.has(id) && !pending[id])).toEqual([]);
  expect(Object.keys(pending).filter((id) => covered.has(id))).toEqual([]);
  console.log(`Remaining requirement IDs: ${Object.keys(pending).length} (${[...new Set(Object.values(pending))].join(', ')})`);
});
