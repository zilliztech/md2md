function convert(
  path_from,
  map_template = {},
  map_fragment = {},
  map_variable = {}
) {
  // 获取目录[fragments, template, variable.json, ....]
  const res = fs.readdirSync(path_from) || [];
  const paths_child = [];
  let variableFile;
  res.forEach((name) => {
    const isContent = name !== name_dir_fragment && name !== name_file_variable;
    if (isContent) {
      paths_child.push(_getAbsPath(target, name));
    }
    if (name === name_file_variable) {
      variableFile = name;
    }
  });
  const { directories, markdowns, jsons } = classifyFileAndDir(paths_child);
  // 获取fragment和顶部变量,开始遍历和替换
  if (!!fragmentDir) {
    map_fragment = _parseFragment(
      _getAbsPath(target, fragmentFolder),
      map_fragment
    );
  }
  if (!!variableFile) {
    map_variable = _parseVariable(
      _getAbsPath(target, variableFile),
      map_variable
    );
  }
  if (!!templateDir) {
  }
  // rewrite file or generate file with template
  if (template) {
    const path_template = _getAbsPath(target, template);
    const version = _getVersion();
    const tabLinks = {};
    jsons.forEach((path_jsonFile) => {
      path_jsonFile = path_jsonFile.split(
        path.resolve(__dirname, name_dir_from)
      )[1];
      const arr = path_jsonFile.split("/");
      const key = arr[arr.length - 1].split(".json")[0];
      arr.splice(1, 0, version);
      let _path = arr.join("/");
      _path = _path.slice(0, _path.length - 4) + "md";
      tabLinks[key] = _path;
    });
    jsons.forEach((path_jsonFile) => {
      _genPageFromTemplate(
        path_jsonFile,
        path_template,
        map_fragment,
        map_variable,
        tabLinks
      );
    });
  } else {
    markdowns.forEach((file) => {
      _reWriteFile(file, map_fragment, map_variable);
    });
  }
  directories.forEach((directory) => {
    convert(directory, map_fragment, map_variable);
  });
}
const _getVersion = () => {
  return `v${
    JSON.parse(fileToString(path.resolve(__dirname, "version.json"))).version
  }`;
};

const _getTargetPathFromJson = (path_abs) => {
  path_abs = path_abs.replace(name_dir_from, name_dir_to);
  return path_abs.slice(0, path_abs.length - 4) + "md";
};
const _replaceVariable = (content = "", variable) => {
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
      let target = variable[keyChain[0]];
      let i = 1;
      while (i < keyChain.length) {
        target = target[key];
        i++;
      }
      content = replaceContent(name_dir_fragment, target, content);
    });
  }
  return content;
};
const _replaceTab = (content = "", tabLinks) => {
  const tabRegx = /\{\{tab\}\}/i;
  const html = `<div>${Object.keys(tabLinks)
    .map((key) => {
      return `<a href="${tabLinks[key]}">${key}</a>`;
    })
    .join("")}</div>`;
  return content.replace(tabRegx, html);
};
const _reWriteFile = (path_from, map_fragment, map_variable) => {
  let content = fileToString(path_from);
  const language = getLanguage(path_from);
  content = replaceFragment(content, map_fragment, language);
  content = _replaceVariable(content, map_variable);
  const path_to = getTargetPath(path_from);
  return fs.writeFileSync(path_to, content);
};
const _genPageFromTemplate = (
  path_jsonFile,
  path_template,
  map_fragment,
  map_variable,
  tabLinks
) => {
  const language = path_jsonFile
    .split(`${__dirname}/${name_dir_from}/`)[1]
    .split("/")[0];
  let content = fileToString(path_template);
  // replace fragments
  content = replaceFragment(content, map_fragment, language);
  // replace var
  const var_json = JSON.parse(fileToString(path_jsonFile));
  map_variable = merge(map_variable, var_json);
  content = _replaceVariable(content, map_variable);
  // replace tab
  content = _replaceTab(content, tabLinks);
  const path_target = _getTargetPathFromJson(path_jsonFile);
  return fs.writeFileSync(path_target, content);
};
const _parseVariable = (path_abs, map_variable = {}) => {
  const obj = JSON.parse(fs.readFileSync(path_abs).toString());
  return merge(map_variable, obj);
};
const _mapDir = (path_dir, fileMap = {}) => {
  const res = getChildrenPath(path_dir) || [];
  const { directories, markdowns } = classifyFileAndDir(res);
  if (markdowns.length) {
    markdowns.forEach((path_markdown) => {
      const content = fs.readFileSync(path_markdown).toString();
      fileMap[path_markdown] = content;
    });
  }
  if (directories.length) {
    directories.forEach((d) => {
      fileMap = _mapDir(d, fileMap);
    });
  }
  return fileMap;
};
