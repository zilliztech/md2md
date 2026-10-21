const { scan, codeGroups } = require("./scan");

function parseBlocks(content, { sourceName, isFragment = false } = {}) {
  const { lines, fences } = scan(content);
  const blocks = [];
  const errors = [];
  const open = [];
  const ids = new Set();
  const report = (code, line, message) => errors.push({ code, message, file: sourceName, line });

  for (let i = 0; i < lines.length; i++) {
    const { marker, candidate } = lines[i];
    if (!candidate) continue;
    const line = i + 1;
    if (isFragment) {
      report("BLOCK_IN_FRAGMENT", line, "Named block markers are not allowed in fragments.");
      continue;
    }
    if (!marker) {
      report("BLOCK_MALFORMED", line, 'Expected a standalone <!-- doc:block:start|end id="lowercase-id" --> marker.');
      continue;
    }
    const { kind, id } = marker;
    if (kind === "start") {
      if (ids.has(id)) report("BLOCK_DUPLICATE_ID", line, `Duplicate block ID "${id}".`);
      if (open.length) report("BLOCK_NESTED", line, `Block "${id}" starts inside block "${open[open.length - 1].id}".`);
      ids.add(id);
      open.push({ id, startLine: line });
      continue;
    }
    if (!open.length) {
      report("BLOCK_UNMATCHED_END", line, `End marker "${id}" has no matching start.`);
      continue;
    }
    let index = open.length - 1;
    if (open[index].id !== id) {
      report("BLOCK_CROSSED", line, `End marker "${id}" does not match open block "${open[index].id}".`);
      // Close the named block when possible. Otherwise consume the wrong closer
      // against the current block so one typo does not hide later diagnostics.
      const matching = open.map((block) => block.id).lastIndexOf(id);
      if (matching !== -1) index = matching;
    }
    const block = open.splice(index, 1)[0];
    block.endLine = line;
    const hasContent = lines.slice(block.startLine, i)
      .some((item) => !item.candidate && item.text.trim() !== "");
    if (!hasContent) report("BLOCK_EMPTY", block.startLine, `Block "${block.id}" contains no content.`);
    blocks.push(block);
  }
  for (const block of open) {
    report("BLOCK_UNCLOSED", block.startLine, `Block "${block.id}" has no end marker.`);
  }
  const groups = codeGroups(lines, fences);
  for (const block of blocks) {
    // Group positions are zero-based; public block positions are one-based.
    const first = block.startLine - 1;
    const last = block.endLine - 1;
    if (groups.some((group) => first < group.end && last > group.start &&
        !(first < group.start && last > group.end))) {
      report("BLOCK_PARTIAL_CODE_GROUP", block.startLine, `Block "${block.id}" splits a multipleCode group.`);
    }
  }
  errors.sort((a, b) => a.line - b.line);
  blocks.sort((a, b) => a.startLine - b.startLine);
  return { ok: errors.length === 0, blocks: errors.length ? [] : blocks, errors };
}

function stripBlockMarkers(content) {
  return scan(content).lines.filter((line) => !line.marker).map((line) => line.raw).join("");
}

module.exports = { parseBlocks, stripBlockMarkers };
