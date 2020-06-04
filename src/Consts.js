const fs = require("fs");
const path = require("path");
const path_config = `${
  (process.env && process.env.PATH_ROOT) || process.cwd()
}${path.sep}m2m.config.js`;
let config = {};
if (fs.existsSync(path_config)) {
  config = require(path_config);
}
const name_dir_from =
  process.env.name_dir_from || config.name_dir_from || "doc_from";
const name_dir_to = config.name_dir_to || "doc_to";
const name_dir_fragments = config.name_dir_fragments || "fragments";
const name_dir_templates = config.name_dir_templates || "templates";
const name_file_variables = config.name_file_variables || "Variables.json";
const name_file_glossary = config.name_file_glossary || "Glossary.json";

const ignore_files = config.ignore_files || [];
const ignore_directories = config.ignore_directories || [];
const file_filtered = [name_file_variables, name_file_glossary, ...ignore_files];
const dir_filtered = [
  name_dir_fragments,
  name_dir_templates,
  ...ignore_directories,
];
const all_filtered = [...file_filtered, ...dir_filtered];

const FileType = {
  template: "template",
  fragment: "fragment",
  variable: "variable",
  normalDoc: "normalDoc",
  templateVar: "templateVar",
};

module.exports = {
  name_dir_from,
  name_dir_to,
  name_dir_fragments,
  name_dir_templates,
  name_file_variables,

  file_filtered,
  dir_filtered,
  all_filtered,

  FileType,
};
