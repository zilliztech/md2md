const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Check the lexical route before normalization, including directories before '..'.
function fragmentPath(root, reference) {
  const suffix = reference.slice(reference.indexOf('/') + 1);
  if (path.posix.isAbsolute(suffix) || path.win32.isAbsolute(suffix) || suffix.includes('\\') ||
      suffix.includes('\0') || !suffix.endsWith('.md')) return { code: 'FRAGMENT_OUT_OF_ROOT' };
  let depth = 0;
  for (const part of suffix.split('/')) {
    if (part === '..') depth--;
    else if (part && part !== '.') depth++;
    if (depth < 0) return { code: 'FRAGMENT_OUT_OF_ROOT' };
  }
  const relative = path.posix.normalize(`fragments/${suffix}`);
  try {
    const route = `${root}/fragments/${suffix}`;
    let current = path.parse(root).root;
    for (const part of route.slice(current.length).split('/')) {
      if (!part || part === '.') continue;
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) return { code: 'FRAGMENT_SYMLINK' };
    }
    const absolute = path.join(root, relative);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile()) return { code: 'FRAGMENT_NOT_FOUND' };
    return { path: relative, absolute, bytes: stat.size };
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ELOOP'].includes(error.code)) return { code: 'FRAGMENT_NOT_FOUND' };
    throw error;
  }
}

function readFragment(file, maxBytes) {
  // A bounded read also catches growth between stat and read without loading it all.
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return { code: 'FRAGMENT_NOT_FOUND' };
    if (stat.size > maxBytes) return { code: 'LIMIT_EXCEEDED', detail: { limit: 'maxFragmentBytes' } };
    const buffer = Buffer.alloc(Math.min(stat.size, maxBytes) + 1);
    let bytes = 0;
    while (bytes < buffer.length) {
      const count = fs.readSync(fd, buffer, bytes, buffer.length - bytes, null);
      if (!count) break;
      bytes += count;
    }
    if (bytes > stat.size || bytes > maxBytes) return { code: 'LIMIT_EXCEEDED', detail: { limit: 'maxFragmentBytes' } };
    const data = buffer.subarray(0, bytes);
    return { content: data.toString('utf8'), bytes, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  } finally { fs.closeSync(fd); }
}

module.exports = { fragmentPath, readFragment };
