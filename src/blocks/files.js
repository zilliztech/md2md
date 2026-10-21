const fs = require("fs");
const path = require("path");
const { parseBlocks } = require("./index");

const isFragmentPath = (file, fragmentDirectory = "fragments") =>
  file.split(/[\\/]/).some((part) => part === "fragments" || part === fragmentDirectory);
const formatError = ({ file, line, code, message }) => `${file}:${line} ${code} ${message}`;

// Filesystem boundary shared by the CLI and goOver; the parser itself is pure.
function checkDirectory(directory, { fragmentDirectory = "fragments" } = {}) {
  const errors = [];
  const ancestors = new Set();
  function visit(folder) {
    const real = fs.realpathSync(folder);
    if (ancestors.has(real)) return; // Do not recurse through a symlink cycle.
    ancestors.add(real);
    for (const name of fs.readdirSync(folder).sort()) {
      const file = path.join(folder, name);
      const stat = fs.statSync(file);
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile() && /\.md$/i.test(name)) {
        errors.push(...parseBlocks(fs.readFileSync(file, "utf8"), {
          sourceName: file,
          isFragment: isFragmentPath(file, fragmentDirectory),
        }).errors);
      }
    }
    ancestors.delete(real);
  }
  visit(directory);
  return { ok: errors.length === 0, errors };
}

module.exports = { checkDirectory, isFragmentPath, formatError };
