// const process = require("process");
const fs = require("fs");
const { name_dir_from, name_dir_to } = require("../Consts");

// const path_dir_root = process.cwd();
const getTargetPath = path_from => {
  const from = `/${name_dir_from}/`;
  const to = `/${name_dir_to}/`;
  return path_from.replace(from, to);
};
const getChildrenPath = path_father => {
  return fs.readdirSync(path_father).map(item => `${path_father}/${item}`);
};

module.exports = { getTargetPath, getChildrenPath };
