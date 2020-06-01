const fs = require("fs");
const { getLanguage, parseJsonFile } = require("../helpers/File");
const { getRootPath } = require("../helpers/Path");
const { name_dir_from } = require("../Consts");
const mark = "Glossary";
const parseGlossary = (path_from, content) => {
  // get tips
  const path_glossary = `${getRootPath()}/${name_dir_from}/${getLanguage(
    path_from
  )}/${mark}.json`;
  if (fs.existsSync(path_glossary)) {
    const Glossary = parseJsonFile(path_glossary);
    // get matches
    const regex_tip = /\{\{.{0,10000}\:\:glossary\..{0,10000}\}\}/gi;
    const matches = content.match(regex_tip);
    // replace matches
    if (matches && matches.length) {
      matches.forEach((match) => {
        const [header, keyChain] = match
          .substring(2, match.length - 2)
          .split("::glossary.");
        const arr_key = keyChain.split(".");
        let tip;
        if (Array.isArray(arr_key)) {
          let i = 0;
          tip = Glossary[arr_key[i]];
          i++;
          while (i < arr_key.length && tip) {
            tip = tip[arr_key[i]];
            i++;
          }
          const content_replace = `<span class="tip" data-tip="${
            tip || ""
          }">${header}</span>`;
          content = content.replace(match, content_replace);
        }
      });
    }
  }
  return content;
};

module.exports = { mark, fn: parseGlossary };
