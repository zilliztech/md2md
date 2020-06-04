const fs = require("fs");
const { name_dir_from, name_dir_to } = require("../Consts");

const getTargetPath = (path_from) => {
  const from = `${path.sep}${name_dir_from}${path.sep}`;
  const to = `${path.sep}${name_dir_to}${path.sep}`;
  return path_from.replace(from, to);
};
const getChildrenPath = (path_father) => {
  return fs
    .readdirSync(path_father)
    .map((name_child) => `${path_father}${path.sep}${name_child}`);
};

const getRootPath = () =>
  (process.env && process.env.PATH_ROOT) || process.cwd();

module.exports = { getTargetPath, getChildrenPath, getRootPath };
