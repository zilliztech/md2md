const parseTab = require("./Tab");
const parseGlossary = require("./Glossary");
const parseImagePath = require("./ImageDestination");
const elasticsearch = require("./ElasticSearch");

module.exports = {
  parseTab,
  parseGlossary,
  parseImagePath,
  elasticsearch,
};
