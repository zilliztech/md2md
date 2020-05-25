const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const {
  dir_filtered,
  name_dir_from,
  all_filtered,
  FileType,
} = require("./src/Consts");
const {
  writeFile,
  markdownToString,
  templateToString,
  classifyFileAndDir,
  isDirChild,
  isTypeFile,
  getFileType,
} = require("./src/helpers/File");
const {
  getChildrenPath,
  getTargetPath,
  getRootPath,
} = require("./src/helpers/Path");

// helpers
const _genID = () => Math.random().toString().substring(2, 32);
const _logStart = () => console.log(`Documents convention Start`, "\n\n\n");
const _logEnd = () => console.log(`Documents convention Finish`, "\n\n\n");

const _isFiltered = (path_abs) => {
  const self_filtered = all_filtered.some((name_f) =>
    isTypeFile(path_abs, name_f)
  );
  const father_filtered = dir_filtered.some((name_d) =>
    isDirChild(path_abs, name_d)
  );
  return self_filtered || father_filtered;
};
const _copyDir = (path_from) => {
  if (_isFiltered(path_from)) {
    return false;
  }
  const target = getTargetPath(path_from);
  const should_copy_this = !fs.existsSync(target);
  if (should_copy_this) {
    fs.mkdirSync(target);
  }
  const children = getChildrenPath(path_from) || [];
  const { directories } = classifyFileAndDir(children);
  if (directories.length) {
    directories.forEach((d) => {
      _copyDir(d);
    });
  }
};
// callbacks
const initialScan = () => {
  const path_from = path.resolve(getRootPath(), `${name_dir_from}/`);
  const path_to = getTargetPath(path_from);
  if (!fs.existsSync(path_to)) {
    fs.mkdirSync(path_to);
  }
  _logStart();
  const res = fs.readdirSync(path_from) || [];
  const paths_langs = res.map((item) => `${path_from}/${item}`);
  if (paths_langs.length) {
    _copyDir(path_from);
    _logEnd();
  } else {
    console.warn(`Documents is Empty`);
  }
};
const onFileAdd = (path_from) => {
  const type_file = getFileType(path_from);
  if (_isFiltered(path_from)) {
    switch (type_file) {
      case FileType.template:
      case FileType.fragment:
      case FileType.variable:
        break;
      default:
        break;
    }
  } else {
    const path_to = getTargetPath(path_from);
    let content = "";
    switch (type_file) {
      case FileType.normalDoc:
        content = markdownToString(path_from);
        break;
      case FileType.templateVar:
        content = templateToString(path_from);
        break;
      default:
        break;
    }
    writeFile(path_to, content);
  }
};
const onFileRemove = (path_from) => {
  const path_target = getTargetPath(path_from);
  if (fs.existsSync(path_target)) {
    fs.unlinkSync(path_target);
  }
};
const onAddDir = (path_from) => {
  if (!_isFiltered(path_from)) {
    const path_to = getTargetPath(path_from);
    !fs.existsSync(path_to) &&
      fs.mkdirSync(path_to, { recursive: true }, (err) => {});
  }
};
const _rmDir = (path_target) => {
  if (fs.existsSync(path_target)) {
    let files = fs.readdirSync(path_target);
    for (var i = 0; i < files.length; i++) {
      let newPath = path.join(path_target, files[i]);
      let stat = fs.statSync(newPath);
      if (stat && !stat.isDirectory()) {
        fs.unlinkSync(newPath);
      } else {
        _rmDir(newPath);
      }
    }
    fs.rmdirSync(path_target);
  }
};
const onDirRemove = (path_from) => {
  const path_target = getTargetPath(path_from);
  _rmDir(path_target);
};
// exports
const map_watcher = {};

const _setDirWatcher = (path_from) => {
  const watcher = chokidar.watch(path_from);
  watcher
    .on("ready", initialScan)
    .on("add", onFileAdd)
    .on("change", onFileAdd)
    .on("unlink", onFileRemove)
    .on("addDir", onAddDir)
    .on("unlinkDir", onDirRemove);
  const id = _genID();
  map_watcher[id] = watcher;
  return id;
};
const setDirWatcher = () => {
  return _setDirWatcher(path.resolve(getRootPath(), `${name_dir_from}/`));
};
const setFileWatcher = (path_from) => {
  const watcher = chokidar.watch(path_from);
  watcher
    .on("ready", () => console.log(`start wartch file : ${path_from}`))
    .on("add", onFileAdd)
    .on("change", onFileAdd)
    .on("unlink", onFileRemove);
  const id = _genID();
  map_watcher[id] = watcher;
  return id;
};

const clearWatcher = (key) => {
  const watcher = map_watcher[key];
  watcher.close().then(() => console.log("watcher closed"));
};
const clearAllWatcher = () => {
  Object.keys(map_watcher).forEach((key) => {
    clearWatcher(key);
  });
};

module.exports = {
  setDirWatcher,
  setFileWatcher,
  clearWatcher,
  clearAllWatcher,

  markdownToString,
  templateToString,
};
