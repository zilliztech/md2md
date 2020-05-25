const cases = require("jest-in-case");
const fs = require("fs");
const {
  _getMarkdownVariable,
  _getVariable,
  getLanguage,
  _getFragment,
} = require("./File.js");

const getAbsPath = (relativePath) => process.cwd() + relativePath;
cases(
  "_getMarkdownVariable",
  (opts) => {
    expect(_getMarkdownVariable(opts.path_abs)).toStrictEqual(opts.res);
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
  "_getMarkdownVariable",
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

cases(
  "_getFragment",
  (opts) => {
    expect(_getFragment(opts.path_abs)).toStrictEqual(opts.res);
  },
  [
    {
      path_abs: getAbsPath("/test/en/test_fragment.md"),
      res: {
        [getAbsPath("/test/en/fragment/head.md")]: fs
          .readFileSync(getAbsPath("/test/en/fragment/head.md"))
          .toString(),
        [getAbsPath("/test/en/fragment/tail.md")]: fs
          .readFileSync(getAbsPath("/test/en/fragment/tail.md"))
          .toString(),
      },
    },
  ]
);
