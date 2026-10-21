const path = require("path");

// The original helper tests use test/en, independently of the production config.
if (expect.getState().testPath === path.resolve(__dirname, "../../src/helpers/File.test.js")) {
  process.env.name_dir_from = "test";
}
