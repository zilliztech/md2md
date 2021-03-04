const parseTab = require('./Tab');
const parseGlossary = require('./Glossary');
const parseImagePath = require('./ImageDestination');
const updateElasticSearch = require('./ElasticSearch');

module.exports = {
  parseTab,
  parseGlossary,
  parseImagePath,
  updateElasticSearch,
};
