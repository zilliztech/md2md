const {
  getChildrenPath,
  getTargetPath,
  getRootPath,
} = require("../helpers/Path");
const { getMarkdownVariable } = require("../helpers/File");
const mark = "tab";
const parseTab = (path_from, content) => {
  const regex_mark = `\{\{${mark}\}\}`;
  const regex = new RegExp(regex_mark, "ig");
  // get target content from path_from;
  const arr = path_from.split("/");
  const path_dir = arr.slice(0, arr.length - 1).join("/");
  // get tabs
  let tabs = [];
  const paths_child = getChildrenPath(path_dir).filter((p) => {
    return /\.md$/i.test(p);
  });
  paths_child.forEach((path_child) => {
    const { label, order = 0 } = getMarkdownVariable(path_child);
    const link = getTargetPath(path_child).split(getRootPath())[1];
    if (label) {
      tabs.push({ label, order, link });
    }
  });
  const content_link = tabs
    .sort((a, b) => Number.parseInt(a.order) > Number.parseInt(b.order))
    .map((tab) => {
      const { label, link } = tab;
      const isActive = getTargetPath(path_from).indexOf(link) !== -1;
      return `<a href="${link}" ${
        isActive ? "class='active'" : ""
      }>${label}</a>`;
    })
    .join("");
  const content_replace = `<div class="tab-wrapper">${content_link}</div>`;
  // replace matches
  let matches = content.match(regex);
  const length = (matches && matches.length) || 0;
  let i = 0;
  while (i < length) {
    content = content.replace(matches[0], content_replace);
    i++;
  }
  return content;
};

module.exports = {
  mark,
  fn: parseTab,
};
