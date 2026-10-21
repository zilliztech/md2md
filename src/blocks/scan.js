// Keep each line's terminator, including CRLF, mixed endings and no final EOL.
function scan(content) {
  const rawLines = content.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || [];
  if (rawLines[rawLines.length - 1] === "") rawLines.pop();
  const lines = [];
  const fences = new Map();
  let fence;
  for (const raw of rawLines) {
    const text = raw.replace(/(?:\r\n|\r|\n)$/, "");
    const line = { raw, text, code: false, candidate: false, marker: null };
    const index = lines.length;
    lines.push(line);
    if (fence) {
      line.code = true;
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(text);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        fences.set(fence.start, index);
        fence = undefined;
      }
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      line.code = true;
      fence = { start: index, char: opening[1][0], length: opening[1].length };
      continue;
    }
    line.candidate = /<!--[ \t]*doc:block\b/i.test(text);
    const marker = /^[ \t]*<!-- doc:block:(start|end) id="([a-z0-9][a-z0-9-]*)" -->[ \t]*$/.exec(text);
    if (marker) line.marker = { kind: marker[1], id: marker[2] };
  }
  if (fence) fences.set(fence.start, lines.length - 1);
  return { lines, fences };
}

function codeGroups(lines, fences) {
  const groups = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].code || lines[i].candidate) continue;
    const div = /<div\b[^>]*\bclass\s*=\s*(["'])(.*?)\1[^>]*>/i.exec(lines[i].text);
    if (!div || !div[2].split(/\s+/).includes("multipleCode")) continue;
    const start = i;
    let depth = 0;
    let closed = false;
    for (; i < lines.length; i++) {
      if (lines[i].code || lines[i].candidate) continue;
      const tags = lines[i].text.match(/<\/?div\b[^>]*>/gi) || [];
      for (const tag of tags) depth += /^<\//.test(tag) ? -1 : 1;
      if (depth <= 0) { closed = true; break; }
    }
    if (!closed) break;
    let cursor = i + 1;
    let end;
    while (cursor < lines.length) {
      if (lines[cursor].candidate || lines[cursor].text.trim() === "") {
        cursor++;
      } else if (fences.has(cursor)) {
        end = fences.get(cursor);
        cursor = end + 1;
      } else break;
    }
    if (end !== undefined) {
      groups.push({ start, end });
      i = end;
    }
  }
  return groups;
}

module.exports = { scan, codeGroups };
