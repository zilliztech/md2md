const fs = require("fs");
const path = require("path");
const { parseBlocks, stripBlockMarkers } = require("../../src/blocks");
const directory = path.resolve(__dirname, "../contract/cases/blocks");

for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort()) {
  const fixture = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
  test(`${fixture.requirements.map((id) => `[${id}]`).join('')} contract: ${fixture.name}`, () => {
    expect(parseBlocks(fixture.input.content, fixture.options)).toEqual(fixture.expected.parse);
    if (fixture.expected.parse.ok) {
      expect(stripBlockMarkers(fixture.input.content)).toBe(fixture.expected.strip);
    }
  });
}
