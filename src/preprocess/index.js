const path = require('path');
const { name, version } = require('../../package.json');
const { scan, isRecord, variableTable, lookup } = require('./scan');
const { fragmentPath, readFragment } = require('./files');
const defaults = { maxDepth: 5, maxFragments: 100, maxFragmentBytes: 256 * 1024, maxOutputBytes: 2 * 1024 * 1024 };

function preprocess(options) {
  if (!isRecord(options)) throw new TypeError('preprocess expects an options object.');
  const { content, fragmentRoot, variables, sourceName = '<input>', limits = {} } = options;
  if (typeof content !== 'string' || typeof fragmentRoot !== 'string' || !path.isAbsolute(fragmentRoot) ||
      typeof sourceName !== 'string' || !isRecord(limits)) throw new TypeError('Invalid preprocess arguments.');
  const bounds = { ...defaults, ...limits };
  for (const key of Object.keys(bounds)) {
    if (!Object.prototype.hasOwnProperty.call(defaults, key) || !Number.isSafeInteger(bounds[key]) || bounds[key] < 0) {
      throw new TypeError(`Invalid limit: ${key}`);
    }
  }
  const table = variableTable(variables);
  const errors = [];
  const dependencies = { fragments: [], variables: [] };
  const fragments = new Map();
  const usedVariables = new Map();
  const inspected = new Map();
  const page = { file: sourceName, tokens: scan(content) };
  const addSource = (list, file) => { if (!list.includes(file)) list.push(file); };
  function report(code, source, token, detail = {}) {
    const messages = {
      VAR_MISSING: 'Variable is missing', VAR_NOT_SCALAR: 'Variable must be a string, number, or boolean',
      FRAGMENT_NOT_FOUND: 'Fragment is missing, unreadable, or not a regular file',
      FRAGMENT_OUT_OF_ROOT: 'Fragment must be a .md path inside fragments/',
      FRAGMENT_SYMLINK: 'Fragment path contains a symbolic link',
      FRAGMENT_CYCLE: 'Fragment reference cycle', LIMIT_EXCEEDED: `Exceeded ${detail.limit}`,
      UNSUPPORTED_MARK: 'Mark requires a Milvus site plugin',
    };
    errors.push({ code, message: `${messages[code]}: ${(token.key || token.text).slice(0, 160)}`, file: source.file, line: token.line, detail });
  }
  function visit(source, chain) {
    // Revisit only when a deeper route needs stricter depth validation.
    if (inspected.has(source) && inspected.get(source) >= chain.length) return;
    inspected.set(source, chain.length);
    for (const token of source.tokens.filter(item => item.type === 'fragment')) {
      const location = fragmentPath(fragmentRoot, token.key);
      if (location.code) { report(location.code, source, token); continue; }
      const file = location.path;
      if (chain.includes(file)) { report('FRAGMENT_CYCLE', source, token, { chain: [...chain, file] }); continue; }
      if (chain.length >= bounds.maxDepth) { report('LIMIT_EXCEEDED', source, token, { limit: 'maxDepth' }); continue; }
      if (!fragments.has(file)) {
        if (fragments.size >= bounds.maxFragments) { report('LIMIT_EXCEEDED', source, token, { limit: 'maxFragments' }); continue; }
        let loaded;
        try { loaded = readFragment(location.absolute, bounds.maxFragmentBytes); }
        catch (error) {
          if (!['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ELOOP'].includes(error.code)) throw error;
          loaded = { code: error.code === 'ELOOP' ? 'FRAGMENT_SYMLINK' : 'FRAGMENT_NOT_FOUND' };
        }
        const fragment = loaded.code ? loaded : { file, tokens: scan(loaded.content),
          dependency: { path: file, sha256: loaded.sha256, bytes: loaded.bytes, includedBy: [] } };
        fragments.set(file, fragment);
        if (fragment.dependency) dependencies.fragments.push(fragment.dependency);
      }
      const fragment = fragments.get(file);
      if (fragment.code) { report(fragment.code, source, token, fragment.detail); continue; }
      addSource(fragment.dependency.includedBy, source.file);
      token.target = fragment;
      visit(fragment, [...chain, file]);
    }
  }
  visit(page, []);

  const resolved = new Set();
  function resolve(source) {
    if (resolved.has(source)) return;
    resolved.add(source);
    for (const token of source.tokens) {
      if (token.target) resolve(token.target);
      if (token.type === 'unsupported') report('UNSUPPORTED_MARK', source, token);
      if (token.type !== 'variable') continue;
      if (!usedVariables.has(token.key)) {
        const dependency = { key: token.key, usedIn: [] };
        usedVariables.set(token.key, dependency);
        dependencies.variables.push(dependency);
      }
      addSource(usedVariables.get(token.key).usedIn, source.file);
      const result = lookup(table, token.key);
      if (result.code) report(result.code, source, token);
      else token.value = result.value;
    }
  }
  resolve(page);

  const rendered = new Map();
  const rendering = new Set();
  function render(source) {
    if (rendered.has(source)) return rendered.get(source);
    if (rendering.has(source)) return ''; // The cycle was already reported at its source mark.
    rendering.add(source);
    const chunks = [];
    let bytes = 0;
    for (const token of source.tokens) {
      const text = token.target ? render(token.target) : token.type === 'variable' ? (token.value || '') :
        token.type === 'fragment' ? '' : token.text;
      bytes += Buffer.byteLength(text, 'utf8');
      if (bytes > bounds.maxOutputBytes) {
        report('LIMIT_EXCEEDED', source, token, { limit: 'maxOutputBytes' });
        rendering.delete(source);
        rendered.set(source, '');
        return '';
      }
      chunks.push(text);
    }
    rendering.delete(source);
    const output = chunks.join('');
    rendered.set(source, output);
    return output;
  }
  const output = render(page);
  return { ok: errors.length === 0, content: errors.length ? null : output, dependencies, errors, engine: { name, version } };
}

module.exports = { preprocess };
