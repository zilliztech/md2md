const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const slash = require("slash");
const { getConfigs } = require("./src/Consts");
const { dir_filtered, all_filtered, FileType } = getConfigs();
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
const plugins = require("./src/plugin/index");
const minimist = require("minimist");
const cmdParams = minimist(process.argv.slice(2));

// helpers
const _genID = () => Math.random().toString().substring(2, 32);
const Logger = {
  start: (message) => console.log("=>", message),
  end: (message) => console.log("=>", message, "\n\n"),
};
// consts
const map_watcher = {};
const map_rule = {};
const errors = [];
const register = (mark, fn) => {
  map_rule[mark] = fn;
};
// register default plugins
Object.keys(plugins).forEach((key) => {
  const { mark, fn } = plugins[key];
  if (mark === "Elasticsearch" && cmdParams.es !== "true") {
    return;
  }
  register(mark, fn);
});
console.log("----- Plugins loaded ------", Object.keys(map_rule));
const _isFiltered = (path_abs) => {
  path_abs = slash(path_abs);
  const self_filtered = all_filtered.some((name_f) =>
    isTypeFile(path_abs, name_f)
  );
  const father_filtered = dir_filtered.some((name_d) =>
    isDirChild(path_abs, name_d)
  );
  return self_filtered || father_filtered;
};
const _copyDir = (path_from) => {
  path_from = slash(path_from);
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
const _customParse = async (content, path_from) => {
  path_from = slash(path_from);
  const keys = Object.keys(map_rule);
  for (let k of keys) {
    const fn = map_rule[k];
    content = await fn(path_from, content);
  }

  return content;
};
const onFileAdd = async (path_from) => {
  Logger.start(`Origin file ${path_from} is edited.`);
  path_from = slash(path_from);
  const type_file = getFileType(path_from);
  if (_isFiltered(path_from)) {
    switch (type_file) {
      // rewrite related file, to do later
      case FileType.template:
      case FileType.fragment:
      case FileType.variable:
        break;
      default:
        break;
    }
  } else {
    try {
      let path_to = getTargetPath(path_from);
      let content = "";
      switch (type_file) {
        case FileType.normalDoc:
          content = await _customParse(markdownToString(path_from), path_from);
          break;
        case FileType.templateVar:
          path_to = path_to.replace(".json", ".md");
          content = await _customParse(templateToString(path_from), path_from);
          break;
        default:
          content = fs.readFileSync(path_from);
          break;
      }
      writeFile(path_to, content);
      Logger.end(`Target File ${path_to} is updated.`);
    } catch (error) {
      errors.push(`${path_from}:  ${error}`);
      Logger.end(`Target File has ${error}.`);
    }
  }
};
const onFileRemove = (path_from) => {
  path_from = slash(path_from);
  const path_target = getTargetPath(path_from);
  if (fs.existsSync(path_target)) {
    fs.unlinkSync(path_target);
  }
};
// const onAddDir = (path_from) => {
//   if (!_isFiltered(path_from)) {
//     const path_to = getTargetPath(path_from);
//     !fs.existsSync(path_to) &&
//       fs.mkdirSync(path_to, { recursive: true }, (err) => {});
//   }
// };
const _rmDir = (path_target) => {
  path_target = slash(path_target);
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
  path_from = slash(path_from);
  const path_target = getTargetPath(path_from);
  _rmDir(path_target);
};
const _goOverDone = () => {
  if (errors.length) {
    errors.forEach((v) => console.log(v));
    throw new Error("Some documents transform fails.");
  }
  Logger.end(`Documents go over done.`);
};
// exports
const _setDirWatcher = (path_from) => {
  path_from = slash(path_from);
  const p = new Promise((resolve, rej) => {
    const watcher = chokidar.watch(path_from);
    const id = _genID();

    watcher
      .on("ready", () => {
        _goOverDone();
        resolve(id);
      })
      .on("add", onFileAdd)
      .on("change", onFileAdd)
      .on("unlink", onFileRemove)
      .on("unlinkDir", onDirRemove);
    map_watcher[id] = watcher;
  });

  return p;
};

const setDirWatcher = () => {
  const { name_dir_from, elastic } = getConfigs();
  if (elastic) {
    register(mark, fn);
  }
  return _setDirWatcher(path.resolve(getRootPath(), `${name_dir_from}/`));
};

const setFileWatcher = (path_from) => {
  path_from = slash(path_from);
  const p = new Promise((resolve, rej) => {
    const watcher = chokidar.watch(path_from);
    watcher
      .on("ready", () => console.log(`start wartch file : ${path_from}`))
      .on("add", onFileAdd)
      .on("change", onFileAdd)
      .on("unlink", onFileRemove);
    const id = _genID();
    map_watcher[id] = watcher;
  });

  return p;
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
const goOver = () => {
  const { name_dir_from } = getConfigs();

  const path_from = path.resolve(getRootPath(), `${name_dir_from}/`);
  const watcher = chokidar.watch(path_from);
  const p = new Promise((resolve, rej) => {
    watcher
      .on("ready", () => {
        _goOverDone();
        resolve("done");
        process.exit();
      })
      .on("add", onFileAdd)
      .on("change", onFileAdd)
      .on("unlink", onFileRemove)
      .on("unlinkDir", onDirRemove);
  });
  return p;
};

module.exports = {
  setDirWatcher,
  setFileWatcher,
  clearWatcher,
  clearAllWatcher,
  goOver,

  markdownToString: (path_from) => {
    path_from = slash(path_from);
    return _customParse(markdownToString(path_from), path_from);
  },
  templateToString: (path_from) => {
    path_from = slash(path_from);
    return _customParse(templateToString(path_from), path_from);
  },
  register,
};
