const fs = require("fs");
const path = require("path");
const merge = require("lodash/merge");
const {
  name_dir_from,
  name_dir_template,
  name_dir_fragment,
  name_file_variable,
  FileType,
} = require("../Consts");
const { getTargetPath, getChildrenPath, getRootPath } = require("./Path");

const getLanguage = (path_abs) => {
  return path_abs.split(`${getRootPath()}/${name_dir_from}/`)[1].split("/")[0];
};
const isDirectory = (path_abs) => fs.lstatSync(path_abs).isDirectory();
const _isMarkdownFile = (path_abs) => {
  const regex = new RegExp(/\.md$/i);
  return fs.existsSync(path_abs) && regex.test(path_abs);
};
const parseJsonFile = (path_abs) => {
  return JSON.parse(fs.readFileSync(path_abs).toString() || "{}");
};
const _getMarkdownVariable = (path_abs) => {
  const res = {};
  const content = fs.readFileSync(path_abs).toString();
  const regex = /^\-\-\-[\s\S]*\-\-\-/gi;
  const arr = content.match(regex);
  if (arr) {
    const str_var = arr[0].split("---")[1];
    str_var.split("\n").forEach((str_key_value) => {
      if (str_key_value) {
        const [key, value] = str_key_value.split(" ");
        res[key] = value;
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
    path_pre = `${path_pre}/${paths_child[i]}`;
    const path_var_next = path_pre + "/" + name_file_variable;
    if (fs.existsSync(path_var_next)) {
      const var_next = parseJsonFile(path_var_next);
      res = merge(res, var_next);
    }
    i++;
  }
  // if is markdownfile, get variables in itself
  if (_isMarkdownFile(path_abs)) {
    res = merge(res, _getMarkdownVariable(path_abs));
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
const _parseFragment = (path_fragment, map_fragment = {}) => {
  const paths_child = getChildrenPath(path_fragment);
  const { directories, markdowns } = classifyFileAndDir(paths_child);
  if (markdowns.length) {
    markdowns.forEach((path_abs) => {
      const content = fs.readFileSync(path_abs).toString();
      map_fragment[path_abs] = content;
    });
  }
  if (directories.length) {
    directories.forEach((d) => {
      map_fragment = _parseFragment(d, map_fragment);
    });
  }
  return map_fragment;
};
const _getFragment = (path_abs) => {
  // get path
  const path_dir_root = getRootPath();
  const path_doc = `${path_dir_root}/${name_dir_from}/`;
  const lang = path_abs.split(path_doc)[1].split("/")[0];
  const path_fragment = `${path_dir_root}/${name_dir_from}/${lang}/${name_dir_fragment}`;
  // parse fragment
  return _parseFragment(path_fragment);
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
const replaceFragment = (content, map_fragment, language) => {
  // TODO: 默认一级菜单是语言, 这部分日后决定是否修改.
  const str = `\{\{${name_dir_fragment}\/.{0,1000}\}\}`;
  const regex = new RegExp(str, "ig");
  let matches = content.match(regex);
  while (matches && matches.length) {
    matches.forEach((name_dir_fragment) => {
      const key = name_dir_fragment
        .split(" ")
        .join("")
        .slice(2, name_dir_fragment.length - 2);
      const path_abs = path.resolve(
        getRootPath(),
        name_dir_from,
        language,
        key
      );
      const content_f = map_fragment[path_abs];
      content = replaceContent(name_dir_fragment, content_f, content);
      matches = content.match(regex);
    });
  }
  return content;
};
const _replaceVariable = (content = "", map_variable) => {
  const regex = /\{\{var\..{0,1000}\}\}/gi;
  const matches = content.match(regex);
  if (matches) {
    matches.forEach((name_dir_fragment) => {
      const keyChain = name_dir_fragment
        .split(" ")
        .join("")
        .slice(2, name_dir_fragment.length - 2)
        .split(".");
      keyChain.shift();
      let target = map_variable[keyChain[0]];
      let i = 1;
      while (i < keyChain.length && target) {
        const key = keyChain[i];
        target = target[key];
        i++;
      }
      content = replaceContent(name_dir_fragment, target, content);
    });
  }
  return content;
};
const ensureDirExist = (path_abs) => {
  var dirname = path.dirname(path_abs);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirExist(dirname);
  fs.mkdirSync(dirname);
};
const writeMarkDown = (path_from) => {
  const path_to = getTargetPath(path_from);
  const map_variable = _getVariable(path_from);
  const map_fragment = _getFragment(path_from);
  let content = fileToString(path_from);
  const language = getLanguage(path_from);
  content = replaceFragment(content, map_fragment, language);
  content = _replaceVariable(content, map_variable);
  ensureDirExist(path_to);
  fs.writeFileSync(path_to, content);
};
const markdownToString = (path_from) => {
  const path_dir_root = getRootPath();
  const map_variable = _getVariable(path_from, path_dir_root);
  const map_fragment = _getFragment(path_from, path_dir_root);
  let content = fileToString(path_from);
  const language = getLanguage(path_from, path_dir_root);
  content = replaceFragment(content, map_fragment, language);
  return _replaceVariable(content, map_variable);
};
const writeTemplate = (path_from) => {
  const json_var = parseJsonFile(path_from);
  if (json_var.useTemplate) {
    const variable = json_var.var || {};
    const map_variable = merge(_getVariable(path_from), variable);
    const map_fragment = _getFragment(path_from);
    const language = getLanguage(path_from);
    const path_template = `${getRootPath()}/${name_dir_from}/${language}/${
      json_var.path
    }`;
    let content = fileToString(path_template);
    content = replaceFragment(content, map_fragment, language);
    content = _replaceVariable(content, map_variable);
    const path_to = getTargetPath(path_from).replace(".json", ".md");
    ensureDirExist(path_to);
    fs.writeFileSync(path_to, content);
  }
};
const isDirChild = (path_from, dir_name) => {
  const reg = `\/${dir_name}\/`;
  return new RegExp(reg, "i").test(path_from);
};
const isTypeFile = (path_from, file_name) => {
  let reg;
  if (file_name.indexOf(".") !== -1) {
    const [left, right] = file_name.split(".");
    reg = `/${left}\\.${right}$/`;
  } else {
    reg = `\/${file_name}\$`;
  }
  const regex = new RegExp(reg, "i");
  return regex.test(path_from);
};
const getFileType = (path_from) => {
  const is_template = isDirChild(path_from, name_dir_template);
  if (is_template) {
    return FileType.template;
  }
  const is_fragment = isDirChild(path_from, name_dir_fragment);
  if (is_fragment) {
    return FileType.fragment;
  }
  const is_variable = isTypeFile(path_from, name_file_variable);
  if (is_variable) {
    return FileType.variable;
  }
  return path_from.indexOf(".md") > -1
    ? FileType.normalDoc
    : FileType.templateVar;
};
module.exports = {
  isDirectory,
  parseJsonFile,
  writeMarkDown,
  writeTemplate,
  classifyFileAndDir,
  getLanguage,
  replaceFragment,
  replaceContent,
  fileToString,

  isDirChild,
  isTypeFile,
  getFileType,
  markdownToString,


  // for test use
  _getMarkdownVariable,
  _getVariable,
  _getFragment
};
