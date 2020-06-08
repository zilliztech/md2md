const fs = require("fs");
const path = require("path");
const merge = require("lodash/merge");
const {
  name_dir_from,
  name_dir_templates,
  name_dir_fragments,
  name_file_variables,
  FileType,
} = require("../Consts");
const { getRootPath } = require("./Path");

const getLanguage = (path_abs) => {
  return path_abs
    .split(`${getRootPath()}${"/"}${name_dir_from}${"/"}`)[1]
    .split("/")[0];
};

const isDirectory = (path_abs) => fs.lstatSync(path_abs).isDirectory();

const _isMarkdownFile = (path_abs) => {
  const regex = new RegExp(/\.md$/i);
  return fs.existsSync(path_abs) && regex.test(path_abs);
};

const parseJsonFile = (path_abs) => {
  return JSON.parse(fs.readFileSync(path_abs).toString() || "{}");
};

const getMarkdownVariable = (path_abs) => {
  const res = {};
  const content = fs.readFileSync(path_abs).toString();
  const regex = /^\-\-\-[\s\S]*\-\-\-/gi;
  const arr = content.match(regex);
  if (arr) {
    const str_var = arr[0].split("---")[1];
    const isWindows = str_var.indexOf("\r\n") > -1;
    str_var.split(isWindows ? "\r\n" : "\n").forEach((str_key_value) => {
      if (str_key_value) {
        const [key, value] = str_key_value.split(":");
        res[key.trim()] = value.trim();
      }
    });
  }
  return res;
};

const _getVariable = (path_abs) => {
  let res = {};
  const path_dir_root = getRootPath();
  const paths_child = path_abs.split(path_dir_root + "/")[1].split("/");
  let path_pre = path_dir_root;
  let i = 0;
  while (i < paths_child.length) {
    path_pre = `${path_pre}${"/"}${paths_child[i]}`;
    const path_var_next = path_pre + "/" + name_file_variables;
    if (fs.existsSync(path_var_next)) {
      const var_next = parseJsonFile(path_var_next);
      res = merge(res, var_next);
    }
    i++;
  }
  // if is markdownfile, get variables in itself
  if (_isMarkdownFile(path_abs)) {
    res = merge(res, getMarkdownVariable(path_abs));
  }
  return res;
};

const classifyFileAndDir = (paths_cdd) => {
  const directories = [];
  const markdowns = [];
  const jsons = [];
  paths_cdd.forEach((path_cdd) => {
    const isMarkdownFile = path_cdd.indexOf(".md") === path_cdd.length - 3;
    const isJsonFile = path_cdd.indexOf(".json") === path_cdd.length - 5;
    if (isDirectory(path_cdd)) {
      directories.push(path_cdd);
    } else if (isMarkdownFile) {
      markdowns.push(path_cdd);
    } else if (isJsonFile) {
      jsons.push(path_cdd);
    }
  });
  return { directories, markdowns, jsons };
};

const fileToString = (path_abs) => {
  return fs.readFileSync(path_abs).toString() || "";
};

const replaceContent = (match, target = "", content) => {
  const len = match.length;
  const i = content.indexOf(match);
  const c_before = content.slice(0, i);
  const c_after = content.slice(i + len, content.length);
  return c_before + target + c_after;
};

const _replaceFragment = (content, language) => {
  // TODO: 默认一级菜单是语言, 这部分日后决定是否修改.
  const str_declare_fragment = `\{\{${name_dir_fragments}\/.{0,1000}\}\}`;
  const regex = new RegExp(str_declare_fragment, "ig");
  let matches = content.match(regex);
  while (matches && matches.length) {
    matches.forEach((name_dir_fragments) => {
      const key = name_dir_fragments
        .split(" ")
        .join("")
        .slice(2, name_dir_fragments.length - 2);
      const path_abs = path.resolve(
        getRootPath(),
        name_dir_from,
        language,
        key
      );
      const content_f = fileToString(path_abs);
      content = replaceContent(name_dir_fragments, content_f, content);
    });
    matches = content.match(regex);
  }
  return content;
};

const replaceStandardMark = (mark, content, map) => {
  const regex_str = `\{\{${mark}\..{0,1000}\}\}`;
  const regex = new RegExp(regex_str, "ig");
  const matches = content.match(regex);
  if (matches) {
    matches.forEach((str_match) => {
      const keyChain = str_match.substring(2, str_match.length - 2).split(`.`);
      keyChain.shift();
      let target = map[keyChain[0]];
      let i = 1;
      while (i < keyChain.length && target) {
        const key = keyChain[i];
        target = target[key];
        i++;
      }
      content = replaceContent(str_match, target, content);
    });
  }
  return content;
};

const _replaceVariable = (content = "", map_variable) => {
  return replaceStandardMark("var", content, map_variable);
};

const _ensureDirExist = (path_abs) => {
  var dirname = path.dirname(path_abs);
  if (fs.existsSync(dirname)) {
    return true;
  }
  _ensureDirExist(dirname);
  fs.mkdirSync(dirname);
};

const writeFile = (path_to, content) => {
  _ensureDirExist(path_to);
  fs.writeFileSync(path_to, content);
};

const markdownToString = (path_from) => {
  const map_variable = _getVariable(path_from);
  let content = fileToString(path_from);
  const language = getLanguage(path_from);
  content = _replaceFragment(content, language);
  return _replaceVariable(content, map_variable);
};

const templateToString = (path_from) => {
  const json_var = parseJsonFile(path_from);
  if (json_var.useTemplate) {
    const variable = json_var.var || {};
    const map_variable = merge(_getVariable(path_from), variable);
    const language = getLanguage(path_from);
    const path_template = `${getRootPath()}${"/"}${name_dir_from}${"/"}${language}${"/"}${
      json_var.path
    }`;
    let content = fileToString(path_template);
    content = _replaceFragment(content, language);
    return _replaceVariable(content, map_variable);
  }
  return "";
};

const isDirChild = (path_from, dir_name) => {
  const reg = `\/${dir_name}\/`;
  return new RegExp(reg, "i").test(path_from);
};

const isTypeFile = (path_from, file_name) => {
  let reg;
  if (file_name.indexOf(".") !== -1) {
    const [left, right] = file_name.split(".");
    reg = `${left}\.${right}$`;
  } else {
    reg = "/" === "/" ? `\/${file_name}\$` : `\\${file_name}\$`;
  }
  const regex = new RegExp(reg, "i");
  return regex.test(path_from);
};
const _isTemplateJson = (path_from) => {
  const is_json = path_from.indexOf(".json") > -1;
  if (!is_json) {
    return false;
  }
  const content = parseJsonFile(path_from);
  return content.useTemplate && content.path;
};

const getFileType = (path_from) => {
  const is_template = isDirChild(path_from, name_dir_templates);
  if (is_template) {
    return FileType.template;
  }
  const is_fragment = isDirChild(path_from, name_dir_fragments);
  if (is_fragment) {
    return FileType.fragment;
  }
  const is_variable = isTypeFile(path_from, name_file_variables);
  if (is_variable) {
    return FileType.variable;
  }
  const is_markdown = path_from.indexOf(".md") > -1;
  if (is_markdown) {
    return FileType.normalDoc;
  }
  const is_template_json = _isTemplateJson(path_from);
  if (is_template_json) {
    return FileType.templateVar;
  }
  return FileType.others;
};

module.exports = {
  isDirectory,
  isDirChild,
  isTypeFile,
  parseJsonFile,
  writeFile,
  classifyFileAndDir,
  getLanguage,
  replaceContent,
  fileToString,
  replaceStandardMark,

  getFileType,
  markdownToString,
  templateToString,

  // for test use
  getMarkdownVariable,
  _getVariable,
  _replaceFragment,
};
