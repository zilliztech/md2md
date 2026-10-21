#!/usr/bin/env node

// Usage: node test/blocks/regression.js <milvus-checkout> <old-package> <new-output-directory>
// All builds run in the same private path; only the inserted marker lines vary.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execFileSync } = require("child_process");
const provenance = require("./fixtures/milvus-9acdc99/provenance.json");
const { parseBlocks, stripBlockMarkers } = require("../../src/blocks");

function files(directory, prefix = "") {
  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name)).flatMap((item) => {
      const file = path.join(prefix, item.name);
      return item.isDirectory() ? files(directory, file) : [file];
    });
}

function compare(left, right) {
  const leftFiles = files(left);
  const rightFiles = files(right);
  if (JSON.stringify(leftFiles) !== JSON.stringify(rightFiles)) throw new Error(`Output paths differ: ${left} / ${right}`);
  let bytes = 0;
  const digest = crypto.createHash('sha256');
  for (const file of leftFiles) {
    const a = fs.readFileSync(path.join(left, file));
    const b = fs.readFileSync(path.join(right, file));
    if (!a.equals(b)) throw new Error(`Output bytes differ: ${file}`);
    bytes += a.length;
    digest.update(file).update('\0').update(crypto.createHash('sha256').update(a).digest());
  }
  return { files: leftFiles.length, bytes, sha256: digest.digest('hex') };
}

function main() {
  const [source, previousPackage, destination, ...extra] = process.argv.slice(2);
  if (!source || !previousPackage || !destination || extra.length) throw new Error('Usage: node test/blocks/regression.js <milvus-checkout> <old-package> <new-output-directory>');
  const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (commit !== provenance.commit) throw new Error(`Expected milvus-docs ${provenance.commit}, got ${commit}`);
  const output = path.resolve(destination);
  fs.mkdirSync(output); // Refuse to overwrite an earlier run.
  const run = path.join(output, 'run');
  fs.mkdirSync(run);
  // Export committed inputs, so unrelated local modifications cannot enter the regression.
  const archive = path.join(output, 'source.tar');
  execFileSync('git', ['-C', source, 'archive', '--format=tar', `--output=${archive}`, commit, 'site']);
  execFileSync('tar', ['-xf', archive, '-C', run]);
  fs.renameSync(path.join(run, 'site'), path.join(run, 'doc_from'));
  fs.copyFileSync(path.join(run, 'doc_from/en/Variables.json'), path.join(run, 'Variables.json'));
  const env = { ...process.env, PATH_ROOT: run };
  delete env.name_dir_from;
  const oldPackage = path.resolve(previousPackage);
  const repo = path.resolve(__dirname, '../..');
  function build(name, entry) {
    const logfile = path.join(output, `${name}.log`);
    const log = fs.openSync(logfile, 'w');
    let result;
    try {
      result = spawnSync(process.execPath, [entry], { cwd: run, env, stdio: ['ignore', log, log], timeout: 300000 });
    } finally { fs.closeSync(log); }
    if (result.error || result.status !== 0) throw new Error(`${name} failed; see ${logfile}: ${result.error || result.status}`);
    fs.renameSync(path.join(run, 'doc_to'), path.join(output, name));
  }
  build('old', path.join(oldPackage, 'bin/goover.js'));
  build('new', path.join(repo, 'bin/goover.js'));
  const unmarked = compare(path.join(output, 'old'), path.join(output, 'new'));
  for (const page of provenance.pages) {
    const file = path.join(run, page.replace(/^site\//, 'doc_from/'));
    const content = fs.readFileSync(file, 'utf8');
    const header = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(content);
    const offset = header ? header[0].length : 0;
    const closing = content.lastIndexOf('\n') + 1;
    const marked = content.slice(0, offset) + '<!-- doc:block:start id="pilot" -->\n' +
      content.slice(offset, closing) + '<!-- doc:block:end id="pilot" -->\n' + content.slice(closing);
    const parsed = parseBlocks(marked, { sourceName: page });
    if (!parsed.ok || stripBlockMarkers(marked) !== content) throw new Error(`Invalid regression markers: ${page}`);
    fs.writeFileSync(file, marked);
  }
  build('marked', path.join(repo, 'bin/goover.js'));
  const marked = compare(path.join(output, 'new'), path.join(output, 'marked'));
  const result = {
    sourceCommit: commit,
    node: process.version,
    previousVersion: JSON.parse(fs.readFileSync(path.join(oldPackage, 'package.json'), 'utf8')).version,
    pages: provenance.pages,
    unmarked,
    marked,
  };
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
