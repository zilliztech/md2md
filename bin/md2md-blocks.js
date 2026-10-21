#!/usr/bin/env node

const { checkDirectory, formatError } = require("../src/blocks/files");

const [command, directory, ...extra] = process.argv.slice(2);
if (command !== "check" || !directory || extra.length) {
  console.error("Usage: md2md-blocks check <directory>");
  process.exitCode = 1;
} else {
  try {
    const result = checkDirectory(directory);
    for (const error of result.errors) console.error(formatError(error));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
