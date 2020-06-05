const cases = require("jest-in-case");
const fs = require("fs");
const slash = require('slash')
const { name_dir_fragments } = require("../Consts");

const {
  getMarkdownVariable,
  _getVariable,
  getLanguage,
  _replaceFragment,
} = require("./File.js");

const getAbsPath = (relativePath) => slash(process.cwd()) + relativePath

cases(
  "getMarkdownVariable",
  (opts) => {
    expect(getMarkdownVariable(opts.path_abs)).toStrictEqual(opts.res);
  },
  [
    {
      path_abs: process.cwd() + "/test/en/normal.md",
      res: { a: "aha", b: "bha" },
    },
    {
      path_abs: process.cwd() + "/test/en/test_fragment.md",
      res: {
        a: "lalala",
        b: "hahaha",
      },
    },
  ]
);

cases(
  "_getVariable",
  (opts) => {
    expect(_getVariable(opts.path_abs)).toStrictEqual(opts.res);
  },
  [
    {
      path_abs: getAbsPath("/test/en/test_fragment.md"),
      res: {
        a: "lalala",
        b: "hahaha",
        content: "write whatever you like here ~",
        auth: {
          name: "talentAN",
          github: "https://github.com/talentAN/md2md",
        },
      },
    },
  ]
);

cases(
  "getLanguage",
  (opts) => {
    expect(getLanguage(opts.path_abs)).toBe(opts.res);
  },
  [
    {
      path_abs: getAbsPath("/test/en/test_fragment.md"),
      res: "en",
    },
  ]
);

const _isFragmentExit = (content) => {
  const str_declare_fragment = `\{\{${name_dir_fragments}\/.{0,1000}\}\}`;
  const regex = new RegExp(str_declare_fragment, "ig");
  return regex.test(content);
};
cases(
  "_replaceFragment",
  (opts) => {
    expect(
      _isFragmentExit(_replaceFragment(opts.content, opts.lang))
    ).toStrictEqual(opts.res);
  },
  [
    {
      content: fs
        .readFileSync(getAbsPath("/test/en/compose_fragment.md"))
        .toString(),
      lang: "en",
      res: false,
    },
  ]
);
