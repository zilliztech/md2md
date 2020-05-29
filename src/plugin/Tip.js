const fs = require("fs");
const { getLanguage, parseJsonFile } = require("../helpers/File");
const { getRootPath } = require("../helpers/Path");
const { name_dir_from } = require("../Consts");
const mark = "Tip";
const parseTip = (path_from, content) => {
  // get tips
  const path_tips = `${getRootPath()}/${name_dir_from}/${getLanguage(
    path_from
  )}/Tips.json`;
  if (fs.existsSync(path_tips)) {
    const Tips = parseJsonFile(path_tips);
    // get matches
    const regex_tip = /\{\{.{0,10000}\:\:tips\..{0,10000}\}\}/gi;
    const matches = content.match(regex_tip);
    // replace matches
    if (matches && matches.length) {
      matches.forEach((match) => {
        const [header, keyChain] = match
          .substring(2, match.length - 2)
          .split("::tips.");
        const arr_key = keyChain.split(".");
        let tip;
        if (Array.isArray(arr_key)) {
          let i = 0;
          tip = Tips[arr_key[i]];
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

module.exports = { mark, fn: parseTip };
