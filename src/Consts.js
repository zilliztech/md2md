const process = require("process");
const fs = require("fs");
const path_dir_root = process.cwd();
const path_config = `${path_dir_root}/m2m.config.js`;
let config = {};
if (fs.existsSync(path_config)) {
  config = require(path_config);
}
const name_dir_from = config.name_dir_from || "doc";
const name_dir_to = config.name_dir_to || "site";
const name_dir_fragment = config.name_dir_fragment || "fragment";
const name_dir_template = config.name_dir_template || "template";
const name_file_variable = config.name_file_variable || "variables.json";

const ignore_files = config.ignore_files || [];
const ignore_directories = config.ignore_directories || [];
const file_filtered = [name_file_variable, ...ignore_files];
const dir_filtered = [
  name_dir_fragment,
  name_dir_template,
  ...ignore_directories
];
const all_filtered = [...file_filtered, ...dir_filtered];

const FileType = {
  template: "template",
  fragment: "fragment",
  variable: "variable",
  normalDoc: "normalDoc",
  templateVar: "templateVar"
};

module.exports = {
  name_dir_from,
  name_dir_to,
  name_dir_fragment,
  name_dir_template,
  name_file_variable,

  file_filtered,
  dir_filtered,
  all_filtered,

  FileType
};
