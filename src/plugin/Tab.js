const path = require('path');
const {
  getChildrenPath,
  getTargetPath,
  getRootPath,
} = require('../helpers/Path');
const { getMarkdownVariable } = require('../helpers/File');
const mark = 'tab';

// tab can be used in two ways:
// 1. All files in one directory use same tab ;
// 2. Files might display different tabs by special group;

const parseTab = (path_from, content) => {
  const regex_mark = `\{\{${mark}\}\}`;
  const regex = new RegExp(regex_mark, 'ig');
  // get target content from path_from;
  const arr = path_from.split('/');
  const path_dir = arr.slice(0, arr.length - 1).join('/');
  // get tabs
  const group_this = getMarkdownVariable(path_from).group;
  let tabs = [];
  const regex_md = /\.md$/i;
  getChildrenPath(path_dir).forEach((path_child) => {
    const isMarkdownFile = regex_md.test(path_child);
    if (isMarkdownFile) {
      const { label, order = 0, group = '', icon = '' } = getMarkdownVariable(
        path_child
      );
      const link = getTargetPath(path_child).split(getRootPath())[1];
      const shoud_show = !group_this || group_this === group;
      if (label && shoud_show) {
        tabs.push({ label, order, link, icon });
      }
    }
  });
  const content_link = tabs
    .sort((a, b) => Number.parseInt(a.order) > Number.parseInt(b.order) ? 1 : -1)
    .map((tab) => {
      const { label, link, icon } = tab;
      const arrRelLink = link.split('/');
      const relLink = arrRelLink[arrRelLink.length - 1];
      const isActive = getTargetPath(path_from).indexOf(link) !== -1;
      return `<a href="${relLink}" ${isActive ? `class='active ${icon}'` : `class='${icon}'`
        }>${label}</a>`;
    })
    .join('');
  console.log(tabs.sort((a, b) => Number.parseInt(a.order) > Number.parseInt(b.order)))
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
