// Pure tokenization and variable lookup; source locations survive fragment expansion.
function scan(content) {
  const pattern = /\{\{(var\.[^{}\r\n]*|fragments\/[^{}\r\n]*)\}\}|\{\{(?:tab\}\}|glossary\.|images\/)|::glossary\./gi;
  const tokens = [];
  let offset = 0;
  let line = 1;
  function add(text, type, key) {
    if (text) tokens.push({ text, type, key, line });
    line += (text.match(/\n/g) || []).length;
  }
  for (const match of content.matchAll(pattern)) {
    const mark = match[1];
    // Unlike variable marks, fragment prefixes must be exactly lowercase.
    if (mark && /^fragments\//i.test(mark) && !mark.startsWith('fragments/')) continue;
    add(content.slice(offset, match.index), 'text');
    const type = !mark ? 'unsupported' : /^var\./i.test(mark) ? 'variable' : 'fragment';
    add(match[0], type, type === 'variable' ? mark.slice(4).toLowerCase() : mark);
    offset = match.index + match[0].length;
  }
  add(content.slice(offset), 'text');
  return tokens;
}

const isRecord = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function variableTable(variables, ancestors = new Set()) {
  if (!isRecord(variables) || ancestors.has(variables)) throw new TypeError('variables must be an acyclic object.');
  ancestors.add(variables);
  const table = new Map();
  for (const key of Object.keys(variables)) {
    const lower = key.toLowerCase();
    if (table.has(lower)) throw new TypeError(`Ambiguous variable key: ${key}`);
    const value = variables[key];
    table.set(lower, isRecord(value) ? variableTable(value, ancestors) : value);
  }
  ancestors.delete(variables);
  return table;
}

function lookup(table, key) {
  let value = table;
  for (const part of key.split('.')) {
    if (!(value instanceof Map) || !value.has(part)) return { code: 'VAR_MISSING' };
    value = value.get(part);
  }
  if (!['string', 'number', 'boolean'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))) return { code: 'VAR_NOT_SCALAR' };
  return { value: String(value) };
}

module.exports = { scan, isRecord, variableTable, lookup };
