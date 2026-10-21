const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { parseBlocks, stripBlockMarkers } = require("../../src/blocks");
const fixtures = path.join(__dirname, 'fixtures/milvus-9acdc99');
const provenance = require('./fixtures/milvus-9acdc99/provenance.json');
const goover = path.resolve(__dirname, '../../bin/goover.js');

test.each(provenance.pages)('[2-2] real 9acdc99 page is byte-identical with and without markers: %s', (page) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md2md-pilot-'));
  try {
    for (const [file, digest] of Object.entries(provenance.files)) {
      const bytes = fs.readFileSync(path.join(fixtures, file.replace(/^site\//, '')));
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(digest);
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
    fs.copyFileSync(path.join(root, 'site/en/Variables.json'), path.join(root, 'Variables.json'));
    fs.writeFileSync(path.join(root, 'm2m.config.json'), JSON.stringify({ name_dir_from: 'site', name_dir_to: 'output' }));
    const env = { ...process.env, PATH_ROOT: root };
    delete env.name_dir_from;
    const run = () => {
      const result = spawnSync(process.execPath, [goover], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
      expect({ status: result.status, errors: result.stderr }).toEqual({ status: 0, errors: '' });
      return fs.readFileSync(path.join(root, page.replace(/^site\//, 'output/')));
    };
    const before = run();
    const content = fs.readFileSync(path.join(root, page), 'utf8');
    const header = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(content);
    const offset = header ? header[0].length : 0;
    // OpenAI has no final newline. Leave its last paragraph outside the block
    // so inserting marker lines does not change any original source bytes.
    const closing = content.lastIndexOf('\n') + 1;
    const marked = content.slice(0, offset) + '<!-- doc:block:start id="pilot" -->\n' +
      content.slice(offset, closing) + '<!-- doc:block:end id="pilot" -->\n' + content.slice(closing);
    expect(parseBlocks(marked).ok).toBe(true);
    expect(stripBlockMarkers(marked)).toBe(content);
    fs.writeFileSync(path.join(root, page), marked);
    expect(run()).toEqual(before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
