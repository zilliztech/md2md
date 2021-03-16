const fs = require("fs");
const slash = require("slash");
const path = require("path");
const { getConfigs } = require("../Consts");

const getTargetPath = (path_from) => {
  const { name_dir_from, name_dir_to } = getConfigs();
  const from = `${"/"}${name_dir_from}${"/"}`;
  const to = `${"/"}${name_dir_to}${"/"}`;
  return path_from.replace(from, to);
};

const getChildrenPath = (path_father) => {
  return fs
    .readdirSync(path_father)
    .map((name_child) => path.join(path_father, name_child));
};

const getRootPath = () =>
  slash((process.env && process.env.PATH_ROOT) || process.cwd());
module.exports = { getTargetPath, getChildrenPath, getRootPath };
