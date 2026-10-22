const fs = require('fs');
const os = require('os');
const path = require('path');

function fixture(files = {}, symlinks = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md2md-preprocess-')));
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  for (const [file, target] of Object.entries(symlinks)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.symlinkSync(target, path.join(root, file));
  }
  return root;
}
module.exports = { fixture };
